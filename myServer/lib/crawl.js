const { JSDOM } = require('jsdom');

function normalizeURL(urlString) {
    try {
        const urlObj = new URL(urlString);
        const hostPath = `${urlObj.hostname}${urlObj.pathname}`;
        return hostPath.endsWith('/') ? hostPath.slice(0, -1) : hostPath;
    } catch (e) {
        return null;
    }
}

function getResourcesFromHTML(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    const document = dom.window.document;
    const resources = {
        nextURLs: new Set(),
        scriptList: new Set(),
        styleList: new Set(),
        imgList: new Set(),
        mediaList: new Set(),
        fontList: new Set(),
        frameList: new Set(),
        objectList: new Set(),
        formActionList: new Set(),
        baseList: new Set()
    };

    const selectors = {
        nextURLs: 'a[href]',
        scriptList: 'script[src]',
        styleList: 'link[rel="stylesheet"]',
        imgList: 'img[src], source[srcset]',
        mediaList: 'video[src], audio[src], source[src]',
        frameList: 'iframe[src], frame[src]',
        objectList: 'object[data], embed[src], applet[code]',
        formActionList: 'form[action]',
        baseList: 'base[href]'
    };

    for (const [list, selector] of Object.entries(selectors)) {
        document.querySelectorAll(selector).forEach(el => {
            const attr = el.hasAttribute('href') ? 'href' : (el.hasAttribute('src') ? 'src' : 'data');
            const rawUrl = el.getAttribute(attr);
            if (rawUrl) {
                try {
                    const absoluteUrl = new URL(rawUrl, baseURL).href;
                    resources[list].add(absoluteUrl);
                } catch (e) {
                    console.error(`[Crawl] Invalid URL found: ${rawUrl}`);
                }
            }
        });
    }

    // Convert Sets to Arrays
    for (const key in resources) {
        resources[key] = Array.from(resources[key]);
    }
    return resources;
}

async function crawlPage(baseURL, currentURL, urlList, visited) {
    const baseURLObj = new URL(baseURL);
    const currentURLObj = new URL(currentURL);

    if (baseURLObj.hostname !== currentURLObj.hostname) {
        return urlList;
    }

    const normalizedCurrentURL = normalizeURL(currentURL);
    if (visited.has(normalizedCurrentURL)) {
        return urlList;
    }

    console.log(`Crawling: ${currentURL}`);
    visited.add(normalizedCurrentURL);

    try {
        const resp = await fetch(currentURL);
        if (!resp.ok) {
            console.log(`Error fetching ${currentURL}: Status ${resp.status}`);
            return urlList;
        }

        const contentType = resp.headers.get("content-type");
        if (!contentType?.includes("text/html")) {
            return urlList;
        }

        const htmlBody = await resp.text();
        const pageResources = getResourcesFromHTML(htmlBody, baseURL);

        // Aggregate all found resources into the main urlList
        for (const key in pageResources) {
            if (urlList[key]) {
                pageResources[key].forEach(url => {
                    if (!urlList[key].includes(url)) {
                        urlList[key].push(url);
                    }
                });
            }
        }

        // Recursively crawl the links found on the page
        for (const nextURL of pageResources.nextURLs) {
            await crawlPage(baseURL, nextURL, urlList, visited);
        }
    } catch (err) {
        console.log(`Error crawling ${currentURL}: ${err.message}`);
    }

    return urlList;
}

module.exports = { crawlPage };