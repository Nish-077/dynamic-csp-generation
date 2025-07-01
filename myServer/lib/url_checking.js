require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { checkJsonpUrls } = require('./jsonp_checking.js');
const { Buffer } = require('buffer');

const API_KEY = process.env.VIRUSTOTAL_APIKEY;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// --- START: Rate Limiting Implementation ---
const apiCallTimestamps = [];
const API_RATE_LIMIT = 4; // 4 calls per minute
const API_RATE_LIMIT_WINDOW = 60 * 1000; // 60 seconds in milliseconds

async function enforceRateLimit() {
    const now = Date.now();

    // Clean up timestamps older than the rate limit window
    while (apiCallTimestamps.length > 0 && now - apiCallTimestamps[0] > API_RATE_LIMIT_WINDOW) {
        apiCallTimestamps.shift();
    }

    if (apiCallTimestamps.length >= API_RATE_LIMIT) {
        const timeSinceOldestCall = now - apiCallTimestamps[0];
        const timeToWait = API_RATE_LIMIT_WINDOW - timeSinceOldestCall;
        
        if (timeToWait > 0) {
            console.log(`[RATE LIMIT] VirusTotal limit reached. Pausing for ${Math.ceil(timeToWait / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, timeToWait));
        }
        // After waiting, the oldest timestamp is now outside the window.
        apiCallTimestamps.shift();
    }
}
// --- END: Rate Limiting Implementation ---

// In-memory cache for URL analysis results
const urlCache = new Map();

// --- File I/O Functions (unchanged) ---
async function updateUrlStatus(url, status, directive) {
    try {
        const urlsFilePath = path.join(__dirname, 'urls.json');
        let urlData = {};
        
        try {
            const data = await fs.readFile(urlsFilePath, 'utf8');
            urlData = JSON.parse(data);
        } catch (err) {
            // File doesn't exist or is empty, start with empty object
        }

        // REFACTORED: Write a cleaner status object
        urlData[url] = {
            status: status.status,
            detections: status.detections || 0,
            directive,
            lastChecked: new Date().toISOString()
        };

        await fs.writeFile(urlsFilePath, JSON.stringify(urlData, null, 2));
    } catch (err) {
        console.error('Error updating URL status:', err);
    }
}

async function logMaliciousUrl(url, directive, vendorCount, report) {
    try {
        const analysisStats = report.data.attributes.last_analysis_results;
        const detections = Object.entries(analysisStats)
            .filter(([, scan]) => scan.category === 'malicious')
            .map(([vendor]) => vendor)
            .join(', ');

        const issue = `Malicious URL found: ${url} in directive: ${directive} (Detected by ${vendorCount} vendors - ${detections})`;
        
        const issuesFilePath = path.join(__dirname, '..', 'issues.txt');
        const data = await fs.readFile(issuesFilePath, 'utf8').catch(() => '');
        if (!data.includes(issue)) {
            await fs.appendFile(issuesFilePath, `\n${issue}`);
            console.log('Malicious URL logged:', url);
        }
    } catch (err) {
        console.error('Error logging malicious URL:', err);
    }
}
// --- End File I/O Functions ---


// --- VirusTotal API v3 Functions (Rewritten) ---
const vt_api = axios.create({
    baseURL: 'https://www.virustotal.com/api/v3',
    headers: {
        'x-apikey': API_KEY,
        'Accept': 'application/json'
    },
    timeout: 20000 // Add a timeout
});

function getUrlId(url) {
    return Buffer.from(url).toString('base64').replace(/=/g, '');
}

async function getReport(url) {
    if (!API_KEY || API_KEY.length < 64) {
        console.error('[DEBUG] VirusTotal API key is missing or invalid. Please check your .env file.');
        return null;
    }

    // --- FIX: Enforce rate limit before making the API call ---
    await enforceRateLimit();

    const urlId = getUrlId(url);
    const requestUrl = `/urls/${urlId}`;
    
    console.log(`[DEBUG] Preparing to fetch VirusTotal report for: ${url}`);
    console.log(`[DEBUG] Requesting URL: ${vt_api.defaults.baseURL}${requestUrl}`);

    try {
        // Add a timestamp right before the call is made
        apiCallTimestamps.push(Date.now());
        const response = await vt_api.get(requestUrl);
        console.log(`[DEBUG] Successfully fetched report for ${url}.`);
        return response.data;
    } catch (error) {
        // --- DEBUG: Detailed Error Logging ---
        console.error(`[DEBUG] Axios request for ${url} failed.`);
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`[DEBUG] Server responded with error status: ${error.response.status}`);
            console.error('[DEBUG] Response data:', JSON.stringify(error.response.data, null, 2));
            if (error.response.status === 404) {
                console.log(`[DEBUG] URL not found in VirusTotal, submitting for analysis: ${url}`);
                try {
                    await vt_api.post('/urls', `url=${encodeURIComponent(url)}`, {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                    });
                } catch (scanError) {
                    console.error(`[DEBUG] Error submitting URL for scanning ${url}:`, scanError.message);
                }
            }
        } else if (error.request) {
            console.error('[DEBUG] No response received from the server. This could be a network issue or DNS failure.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('[DEBUG] Error setting up the request:', error.message);
        }
        // console.error('[DEBUG] Full error config:', error.config);
        return null;
    }
}

function countMaliciousVendors(report) {
    if (!report || !report.data || !report.data.attributes) return 0;
    const stats = report.data.attributes.last_analysis_stats;
    return stats ? stats.malicious : 0;
}
// --- End VirusTotal API v3 Functions ---


async function checkUrl(url, directive) {
    console.log(`[DEBUG] Checking URL: ${url} for directive: ${directive}`);
    const cacheKey = `${url}:${directive}`;
    const cached = urlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[DEBUG] Returning cached result for ${url}`);
        return cached.result;
    }

    if (url === "'self'" || url === "'none'" || url.startsWith("'") || 
        url === "data:" || url === "blob:" || url === "filesystem:") {
        // REFACTORED: Return only status
        return { status: 'special' };
    }

    try {
        // REFACTORED: Status object no longer needs 'safe' property
        let status = { status: 'pending' };

        if (directive === 'script-src') {
            const jsonpResults = await checkJsonpUrls(directive, [url]);
            if (jsonpResults.length > 0) {
                // DEBUGGING: Explicitly log the vulnerable URL
                console.log(`[DEBUG] URL flagged as JSONP vulnerable: ${url}`);
                status = { status: 'jsonp_vulnerable' };
                await updateUrlStatus(url, status, directive);
                urlCache.set(cacheKey, { result: status, timestamp: Date.now() });
                return status;
            }
        }

        const report = await getReport(url);
        if (report) {
            const maliciousCount = countMaliciousVendors(report);
            // REFACTORED: Determine status directly
            status = { 
                status: maliciousCount < 2 ? 'safe' : 'malicious',
                detections: maliciousCount
            };

            if (status.status === 'malicious') {
                await logMaliciousUrl(url, directive, maliciousCount, report);
            }
        } else {
            // REFACTORED: Default status
            status = { status: 'unknown_default_safe' };
        }

        await updateUrlStatus(url, status, directive);
        return status;
    } catch (error) {
        console.error(`[DEBUG] Top-level error in checkUrl for ${url}:`, error.message);
        // REFACTORED: Error status
        const status = { status: 'error' };
        await updateUrlStatus(url, status, directive);
        return status;
    }
}

async function checkUrls(directive, urls) {
    if (!urls || !Array.isArray(urls)) {
        return ["'none'"];
    }

    // Remove duplicates before processing
    const uniqueUrls = [...new Set(urls)];
    const results = [];

    // Process URLs serially for clearer logging
    for (const url of uniqueUrls) {
        const result = await checkUrl(url, directive);
        results.push(result);
    }
    
    // --- CRUCIAL DEBUG LOG ---
    console.log(`[DEBUG] Final results for directive '${directive}' before filtering:`, JSON.stringify(results, null, 2));
    
    // REFACTORED: Filter based on the status string, not the 'safe' boolean
    const safeStatuses = ['safe', 'special', 'unknown_default_safe'];
    const safeUrls = uniqueUrls.filter((url, index) => {
        return results[index] && safeStatuses.includes(results[index].status);
    });

    return safeUrls;
}

module.exports = { checkUrls };
