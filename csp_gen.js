/**
 * @license
 * Copyright (c) 2024-2025 Nishant Banakar, Manish P
 * This source code is licensed under the ISC license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { checkUrls } = require('./url_checking.js');
const fs = require('fs').promises;

function processUrl(url, baseURL) {
    try {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
        return domain === baseURL ? "'self'" : domain.slice(0, -1);
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
    
    const checkedUrls = await checkUrls(directive, Array.from(sources));
    checkedUrls.forEach(url => csp_list[directive].add(url));
}

async function csp_generator(baseURL, urlList) {
    const csp_list = {
        'default-src': new Set(["'self'"]),
        'script-src': new Set(),
        'style-src': new Set(),
        'prefetch-src': new Set(),
        'img-src': new Set(),
        'media-src': new Set(),
        'form-action': new Set(),
        'font-src': new Set(),
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
        updateDirective(csp_list, 'prefetch-src', urlList.prefetchList, baseURL),
        updateDirective(csp_list, 'img-src', urlList.imgList, baseURL),
        updateDirective(csp_list, 'media-src', urlList.mediaList, baseURL),
        updateDirective(csp_list, 'form-action', urlList.formActionList, baseURL),
        updateDirective(csp_list, 'frame-src', urlList.frameList, baseURL),
        updateDirective(csp_list, 'base-uri', urlList.baseList, baseURL),
        updateDirective(csp_list, 'object-src', urlList.objectList, baseURL)
    ]);

    // Add additional security measures
    csp_list['script-src'].add("'unsafe-inline'").add("'report-sample'");
    csp_list['style-src'].add("'unsafe-inline'").add("'report-sample'");
    csp_list['base-uri'].add("'self'");
    csp_list['manifest-src'].add("'self'");
    csp_list['connect-src'].add("'self'");
    csp_list['worker-src'].add("'self'");

    // Set default-src if no sources specified
    Object.entries(csp_list).forEach(([directive, sources]) => {
        if (sources.size === 0) {
            sources.add("'none'");
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
        await fs.writeFile('./csp-header.txt', JSON.stringify(cspDirectives, null, 2));
        console.log('CSP header saved to file.');
    } catch (err) {
        console.error('Error writing CSP header to file:', err);
    }

    return cspDirectives;
}

module.exports = { csp_generator };