/**
 * @license
 * Copyright (c) 2024-2025 Nishant Banakar, Manish P
 * This source code is licensed under the ISC license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs').promises;
const { checkUrls } = require('../../../url_checking.js');

let writeLock = false;
const pendingWrites = new Map();

function normalizeUrl(url) {
    return url.replace(/\/$/, '').replace(/^http:\/\//, 'https://');
}

async function writeToFile(data, directive, url) {
    const writeKey = `${directive}:${url}`;
    if (pendingWrites.has(writeKey)) return;
    
    pendingWrites.set(writeKey, true);
    while (writeLock) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    writeLock = true;
    
    try {
        await fs.writeFile('./csp-header.txt', data, 'utf8');
        console.log('adding', url, 'for directive =>', directive);
    } catch (error) {
        console.error('Error writing to file:', error);
    } finally {
        writeLock = false;
        pendingWrites.delete(writeKey);
    }
}

async function dynamicCspGenerator(reqBody) {
    try {
        // Initialize default CSP if file is empty or doesn't exist
        let cspHeader;
        try {
            const data = await fs.readFile('./csp-header.txt', 'utf8');
            cspHeader = data ? JSON.parse(data) : null;
        } catch (error) {
            console.log('CSP header file empty or not found, initializing defaults');
            cspHeader = null;
        }

        if (!cspHeader) {
            cspHeader = {
                'default-src': "'self'",
                'script-src': "'self' 'unsafe-inline' 'report-sample'",
                'style-src': "'self' 'unsafe-inline' 'report-sample'",
                'prefetch-src': "'none'",
                'img-src': "'none'",
                'media-src': "'none'",
                'form-action': "'none'",
                'font-src': "'none'",
                'frame-src': "'none'",
                'worker-src': "'self'",
                'manifest-src': "'self'",
                'connect-src': "'self'",
                'object-src': "'none'",
                'base-uri': "'self'",
                'report-uri': "/csp-report-endpoint"
            };
            await writeToFile(JSON.stringify(cspHeader, null, 2), 'default', 'initial');
        }

        const violatedDirective = reqBody['csp-report']['violated-directive'];
        let url = reqBody['csp-report']['blocked-uri'].trim();
        
        const directive = violatedDirective === 'script-src-elem' ? 'script-src' :
                         violatedDirective === 'style-src-elem' ? 'style-src' :
                         violatedDirective;

        if (url === 'blob') {
            url = 'blob:';
        } else if ((directive === 'img-src' || directive === 'connect-src') && url === 'data') {
            url = 'data:';
        } else {
            try {
                const urlObj = new URL(url);
                url = normalizeUrl(`${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`);
            } catch (err) {
                const issue = `Potential threat found: ${url} in directive: ${directive}`;
                try {
                    const issueData = await fs.readFile("./issues.txt", 'utf8');
                    if (!issueData.includes(issue)) {
                        await fs.appendFile('./issues.txt', `\n${issue}`);
                    }
                } catch (err) {
                    console.error("Error handling file:", err);
                }
                return;
            }
        }

        const currentUrls = cspHeader[directive]?.split(' ') || [];
        const normalizedCurrentUrls = currentUrls.map(normalizeUrl);
        
        if (!normalizedCurrentUrls.includes(url)) {
            const baseURL = normalizeUrl(reqBody['csp-report']['document-uri']);
            let urlList = currentUrls[0] === "'none'" ? [] : currentUrls;
            
            if (url !== baseURL) {
                urlList.push(url);
            }
            
            const newList = await checkUrls(directive, [...new Set(urlList)]);
            cspHeader[directive] = newList.join(' ');
            await writeToFile(JSON.stringify(cspHeader, null, 2), directive, url);
        }
    } catch (error) {
        console.error('Error in dynamicCspGenerator:', error);
    }
}

module.exports = { dynamicCspGenerator };