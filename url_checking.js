require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { checkJasonpUrls } = require('./jsonp_checking.js');

const API_KEY = process.env.VIRUSTOTAL_APIKEY;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for URL analysis results
const urlCache = new Map();
const pendingScans = new Map();

// Rate limiting for VirusTotal API
const RATE_LIMIT = 4; // requests per minute
let lastScanTime = 0;

async function updateUrlStatus(url, status, directive) {
    try {
        const urlsFilePath = path.join(__dirname, 'myServer', 'urls.json');
        let urlData = {};
        
        try {
            const data = await fs.readFile(urlsFilePath, 'utf8');
            urlData = JSON.parse(data);
        } catch (err) {
            // File doesn't exist or is empty, start with empty object
        }

        urlData[url] = {
            ...status,
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
        const detections = Object.entries(report.scans)
            .filter(([, scan]) => scan.detected)
            .map(([vendor, scan]) => `${vendor}: ${scan.result}`)
            .join(', ');

        const issue = `Malicious URL found: ${url} in directive: ${directive} (Detected by ${vendorCount} vendors - ${detections})`;
        
        const data = await fs.readFile('./issues.txt', 'utf8').catch(() => '');
        if (!data.includes(issue)) {
            await fs.appendFile('./issues.txt', `\n${issue}`);
            console.log('Malicious URL logged:', url);
        }
    } catch (err) {
        console.error('Error logging malicious URL:', err);
    }
}

async function getReport(apiKey, url) {
    if (!apiKey) {
        console.warn('VirusTotal API key not found');
        return null;
    }

    // Basic rate limiting without delay
    const now = Date.now();
    if (now - lastScanTime < (60000 / RATE_LIMIT)) {
        return null; // Skip if we're exceeding rate limit
    }
    lastScanTime = now;

    try {
        // Check if scan is already pending
        if (pendingScans.has(url)) {
            return await pendingScans.get(url);
        }

        const scanPromise = (async () => {
            const analysisResponse = await axios.post(
                'https://www.virustotal.com/vtapi/v2/url/scan',
                `apikey=${apiKey}&url=${encodeURIComponent(url)}`,
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
            );

            if (analysisResponse.data.response_code !== 1) {
                throw new Error('URL scan failed');
            }

            const reportResponse = await axios.get(
                'https://www.virustotal.com/vtapi/v2/url/report',
                { params: { apikey: apiKey, resource: url }}
            );

            if (reportResponse.data.response_code !== 1) {
                throw new Error('Failed to get report');
            }

            return reportResponse.data;
        })();

        pendingScans.set(url, scanPromise);
        const result = await scanPromise;
        pendingScans.delete(url);
        return result;
    } catch (error) {
        console.error(`Error analyzing URL ${url}:`, error.message);
        pendingScans.delete(url);
        return null;
    }
}

function countMaliciousVendors(report) {
    if (!report || !report.scans) return 0;
    return Object.values(report.scans).filter(scan => scan.detected).length;
}

async function checkUrl(url, directive) {
    // Check cache first
    const cacheKey = `${url}:${directive}`;
    const cached = urlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.result;
    }

    // Skip analysis for special URLs and self references
    if (url === "'self'" || url === "'none'" || url.startsWith("'") || 
        url === "data:" || url === "blob:" || url === "filesystem:") {
        await updateUrlStatus(url, { safe: true, status: 'special' }, directive);
        return { safe: true, status: 'special' };
    }

    try {
        let status = { safe: null, status: 'pending' };

        // Check for JSONP vulnerabilities first
        if (directive === 'script-src') {
            const jsonpResults = await checkJasonpUrls(directive, [url]);
            if (jsonpResults.length > 0) {
                status = { safe: false, status: 'jsonp_vulnerable' };
                await updateUrlStatus(url, status, directive);
                urlCache.set(cacheKey, { result: status, timestamp: Date.now() });
                return status;
            }
        }

        // Perform VirusTotal analysis
        if (API_KEY) {
            const report = await getReport(API_KEY, url);
            if (report === null) {
                status = { safe: null, status: 'unknown' };
            } else {
                const maliciousCount = countMaliciousVendors(report);
                status = { 
                    safe: maliciousCount < 3,
                    status: maliciousCount < 3 ? 'safe' : 'malicious',
                    detections: maliciousCount
                };

                if (!status.safe) {
                    await logMaliciousUrl(url, directive, maliciousCount, report);
                }
            }
        } else {
            status = { safe: null, status: 'no_api_key' };
        }

        // Update URL status and cache
        await updateUrlStatus(url, status, directive);
        urlCache.set(cacheKey, { result: status, timestamp: Date.now() });
        return status;
    } catch (error) {
        console.error(`Error checking URL ${url}:`, error.message);
        const status = { safe: null, status: 'error' };
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
    
    // Process URLs in parallel
    const results = await Promise.all(uniqueUrls.map(url => checkUrl(url, directive)));
    
    // Only include URLs that are explicitly marked as safe
    const safeUrls = uniqueUrls.filter((url, index) => results[index].safe === true);

    return safeUrls.length > 0 ? safeUrls : ["'none'"];
}

module.exports = { checkUrls };
