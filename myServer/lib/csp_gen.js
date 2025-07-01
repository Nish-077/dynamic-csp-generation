/**
 * @license
 * Copyright (c) 2024-2025 Nishant Banakar, Manish P
 * This source code is licensed under the ISC license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { checkUrls } = require('./url_checking.js');
const fs = require('fs').promises;
const path = require('path'); // 1. Import the path module

function processUrl(url, baseURL) {
    try {
        const urlObj = new URL(url);
        // The 'origin' property is the safest way to get protocol://hostname:port
        const domain = urlObj.origin; 
        return domain === baseURL ? "'self'" : domain;
    } catch (err) {
        console.error(`Invalid URL: ${url}`);
        return null;
    }
}

async function updateDirective(csp_list, directive, urls, baseURL) {
    const sources = new Set();
    urls.forEach(url => {
        const processed = processUrl(url, baseURL);
        if (processed) sources.add(processed);
    });
    
    // Filter out special keywords like 'self' BEFORE checking
    const urlsToCheck = Array.from(sources).filter(url => !url.startsWith("'"));
    
    const checkedUrls = await checkUrls(directive, urlsToCheck);
    checkedUrls.forEach(url => csp_list[directive].add(url));

    // Add back any special keywords that were filtered out, like 'self'
    Array.from(sources).forEach(url => {
        if (url.startsWith("'")) {
            csp_list[directive].add(url);
        }
    });
}

async function csp_generator(baseURL, urlList) {
    const csp_list = {
        'default-src': new Set(["'self'"]),
        'script-src': new Set(),
        'style-src': new Set(),
        'img-src': new Set(["'self'", "data:"]),
        'media-src': new Set(),
        'form-action': new Set(),
        'font-src': new Set(),
        // --- FIX: Initialize the frame-src directive ---
        'frame-src': new Set(),
        'worker-src': new Set(),
        'manifest-src': new Set(),
        'connect-src': new Set(),
        'object-src': new Set(),
        'base-uri': new Set(["'self'"]),
        'report-uri': new Set(['/csp-report-endpoint'])
    };

    // Process each type of resource
    await Promise.all([
        updateDirective(csp_list, 'script-src', urlList.scriptList, baseURL),
        updateDirective(csp_list, 'style-src', urlList.styleList, baseURL),
        updateDirective(csp_list, 'img-src', urlList.imgList, baseURL),
        updateDirective(csp_list, 'media-src', urlList.mediaList, baseURL),
        updateDirective(csp_list, 'form-action', urlList.formActionList, baseURL),
        updateDirective(csp_list, 'frame-src', urlList.frameList, baseURL),
        updateDirective(csp_list, 'base-uri', urlList.baseList, baseURL),
        updateDirective(csp_list, 'object-src', urlList.objectList, baseURL)
    ]);

    // CRITICAL FIX: Check for empty directives BEFORE adding other defaults.
    Object.entries(csp_list).forEach(([directive, sources]) => {
        if (sources.size === 0 && directive !== 'default-src' && directive !== 'report-uri') {
            sources.add("'none'");
        }
    });

    // --- FIX: Only add 'report-sample' if the directive is not 'none' ---
    if (!csp_list['script-src'].has("'none'")) {
        csp_list['script-src'].add("'report-sample'");
    }
    if (!csp_list['style-src'].has("'none'")) {
        csp_list['style-src'].add("'report-sample'");
    }

    // --- FIX: Ensure 'self' is present in any directive that is not 'none' ---
    Object.entries(csp_list).forEach(([directive, sources]) => {
        // Don't add 'self' to report-uri or directives that should be 'none'.
        if (directive !== 'report-uri' && directive !== 'default-src' && !sources.has("'none'")) {
            sources.add("'self'");
        }
    });


    // Convert Sets to strings
    const cspDirectives = Object.fromEntries(
        Object.entries(csp_list).map(([directive, sources]) => [
            directive,
            Array.from(sources).join(' ')
        ])
    );

    try {
        // 2. Create a reliable path to myServer/csp-header.txt
        const filePath = path.join(__dirname, '..', 'csp-header.txt');
        await fs.writeFile(filePath, JSON.stringify(cspDirectives, null, 2));
        console.log(`CSP header saved to file: ${filePath}`);
    } catch (err) {
        console.error('Error writing CSP header to file:', err);
    }

    return cspDirectives;
}

module.exports = { csp_generator };