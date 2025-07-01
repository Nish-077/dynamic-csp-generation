const fs = require('fs').promises;
const path = require('path');
const { checkUrls } = require('./url_checking.js');

const cspHeaderFilePath = path.join(__dirname, '..', 'csp-header.txt');
const urlQueue = [];
let isProcessing = false;

// A simple lock to prevent race conditions when modifying the CSP file
let cspWriteLock = false;

async function removeFromCsp(directive, urlToRemove) {
    while (cspWriteLock) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    cspWriteLock = true;

    try {
        const data = await fs.readFile(cspHeaderFilePath, 'utf8');
        const cspHeader = JSON.parse(data);

        if (cspHeader[directive]) {
            let sources = cspHeader[directive].split(' ');
            const initialLength = sources.length;
            sources = sources.filter(source => source !== urlToRemove);

            // If the policy changed, write it back
            if (sources.length < initialLength) {
                console.log(`[WORKER] Malicious URL found and removed from CSP: ${urlToRemove}`);
                cspHeader[directive] = sources.length > 0 ? sources.join(' ') : "'none'";
                await fs.writeFile(cspHeaderFilePath, JSON.stringify(cspHeader, null, 2), 'utf8');
            }
        }
    } catch (error) {
        console.error(`[WORKER] Error removing malicious URL ${urlToRemove}:`, error);
    } finally {
        cspWriteLock = false;
    }
}

async function processQueue() {
    if (isProcessing || urlQueue.length === 0) {
        return;
    }
    isProcessing = true;

    const { directive, url } = urlQueue.shift();
    console.log(`[WORKER] Processing URL from queue: ${url}`);

    // The rate limiter inside checkUrls will pause *here*, in the background,
    // not blocking the main server.
    const safeUrls = await checkUrls(directive, [url]);

    // If the URL is NOT in the safe list, it's malicious or problematic.
    if (!safeUrls.includes(url)) {
        await removeFromCsp(directive, url);
    }

    isProcessing = false;
    
    // Immediately check if there's more work to do
    setImmediate(processQueue);
}

function queueUrlForChecking(directive, url) {
    // Avoid adding duplicate URLs to the queue
    if (!urlQueue.some(item => item.url === url && item.directive === directive)) {
        console.log(`[QUEUE] Adding to check queue: ${url}`);
        urlQueue.push({ directive, url });
    }
}

// Start the worker loop
setInterval(processQueue, 5000); // Check the queue every 5 seconds

module.exports = { queueUrlForChecking };