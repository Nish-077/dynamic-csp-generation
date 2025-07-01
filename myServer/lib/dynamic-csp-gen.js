/**
 * @license
 * Copyright (c) 2024-2025 Nishant Banakar, Manish P
 * This source code is licensed under the ISC license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs').promises;
const path = require('path');
// --- REMOVE direct dependency on checkUrls ---
// const { checkUrls } = require('./url_checking.js'); 
// --- ADD the new queue manager ---
const { queueUrlForChecking } = require('./url_queue_manager.js');
const crypto = require('crypto');

const cspHeaderFilePath = path.join(__dirname, '..', 'csp-header.txt');
const issuesFilePath = path.join(__dirname, '..', 'issues.txt');

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
        await fs.writeFile(cspHeaderFilePath, data, 'utf8');
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
        const reportData = reqBody['csp-report'];
        if (!reportData) return;

        // Initialize default CSP if file is empty or doesn't exist
        let cspHeader;
        try {
            const data = await fs.readFile(cspHeaderFilePath, 'utf8');
            cspHeader = data ? JSON.parse(data) : null;
        } catch (error) {
            console.log('CSP header file empty or not found, initializing defaults');
            cspHeader = null;
        }

        if (!cspHeader) {
            cspHeader = {
                'default-src': "'self'",
                // --- FIX: Remove 'unsafe-inline' from the default policy ---
                'script-src': "'self' 'report-sample'",
                'style-src': "'self' 'report-sample'",
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

        const violatedDirective = reportData['violated-directive'];
        const blockedUri = reportData['blocked-uri']?.trim();
        const documentUri = reportData['document-uri'];
        const scriptSample = reportData['script-sample'];
        
        if (!violatedDirective || !blockedUri) return;

        const directive = violatedDirective.replace('-elem', '').replace('-attr', '');

        // Handle inline violations by generating a hash or adding 'unsafe-hashes'
        if (blockedUri === 'inline' || blockedUri === 'eval') {
            let policyWasModified = false;
            const currentSources = cspHeader[directive]?.split(' ') || [];

            // Case 1: We have a script sample, so we can generate a hash.
            if (scriptSample) {
                const hash = crypto.createHash('sha256').update(scriptSample).digest('base64');
                const sourceToAdd = `'sha256-${hash}'`;
                if (!currentSources.includes(sourceToAdd)) {
                    currentSources.push(sourceToAdd);
                    policyWasModified = true;
                }
            }

            if (policyWasModified) {
                if (currentSources.includes("'none'")) {
                    const index = currentSources.indexOf("'none'");
                    currentSources.splice(index, 1);
                }
                cspHeader[directive] = [...new Set(currentSources)].join(' ');
                await writeToFile(JSON.stringify(cspHeader, null, 2), directive, 'inline-policy-update');
            }
            return;
        }

        let sourceToAdd;
        try {
            const resourceOrigin = new URL(blockedUri).origin;
            const documentOrigin = new URL(documentUri).origin;

            // --- FIX: Check if the resource is from the same origin ---
            if (resourceOrigin === documentOrigin) {
                sourceToAdd = "'self'";
            } else {
                sourceToAdd = resourceOrigin;
            }
        } catch (e) {
            // --- FIX: Correctly handle 'data:' and 'blob:' schemes as valid sources ---
            if (blockedUri === 'data' || blockedUri === 'blob') {
                sourceToAdd = `${blockedUri}:`; // Set the source to 'data:' or 'blob:'
            } else {
                console.warn(`Could not process invalid URI: ${blockedUri}`);
                return; // Still exit for other invalid URIs
            }
        }

        const currentSources = cspHeader[directive]?.split(' ') || [];
        if (!currentSources.includes(sourceToAdd)) {
            // If the policy is 'none', replace it. Otherwise, add to it.
            let newSources = currentSources[0] === "'none'" ? [] : currentSources;
            
            // Add the new source and filter for uniqueness
            newSources.push(sourceToAdd);

            // --- FIX: Ensure 'self' is always present in any updated directive ---
            if (!newSources.includes("'self'")) {
                newSources.push("'self'");
            }
            
            cspHeader[directive] = [...new Set(newSources)].join(' ');
            
            // --- REFACTOR: Write to file first, then queue the check ---
            await writeToFile(JSON.stringify(cspHeader, null, 2), directive, sourceToAdd);

            // For external domains, queue a background security check
            // if (sourceToAdd !== "'self'" && sourceToAdd.startsWith('http')) {
            //      queueUrlForChecking(directive, sourceToAdd);
            // }
        }
    } catch (error) {
        console.error('Error in dynamicCspGenerator:', error);
    }
}

module.exports = { dynamicCspGenerator };