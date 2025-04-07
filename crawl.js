const { JSDOM } = require('jsdom');

function normalizeURL(urlString) {
    try {
        const url = new URL(urlString);
        const hostPath = `${url.hostname}${url.pathname}`;
        return hostPath.replace(/\/$/, '');
    } catch (err) {
        return null;
    }
}

function createURL(src, baseURL) {
    try {
        return src.startsWith('http://') || src.startsWith('https://') ? 
            new URL(src) : new URL(src, baseURL);
    } catch (err) {
        return null;
    }
}

function collectURLs(elements, baseURL, attribute = 'href') {
    const urls = [];
    elements.forEach(element => {
        const src = element[attribute];
        if (!src || src.includes('about:blank')) return;
        
        const url = createURL(src, baseURL);
        if (url && !urls.includes(url.href)) {
            urls.push(url.href);
        }
    });
    return urls;
}

function getURLsFromHTML(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(dom.window.document.querySelectorAll('a'), baseURL);
}

function getSrcFromScripts(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(dom.window.document.querySelectorAll('script'), baseURL, 'src');
}

function getSrcFromLinks(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    const elements = dom.window.document.querySelectorAll('link');
    const styleList = [];
    const prefetchList = [];

    elements.forEach(element => {
        const href = element.href;
        if (!href || href.includes('about:blank')) return;

        const url = createURL(href, baseURL);
        if (!url) return;

        switch (element.rel) {
            case 'stylesheet':
            case 'alternate stylesheet':
                styleList.push(url.href);
                break;
            case 'prefetch':
            case 'preload':
            case 'prerender':
                prefetchList.push(url.href);
                break;
        }
    });

    return { styleList, prefetchList };
}

function getSrcFromImages(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(dom.window.document.querySelectorAll('img'), baseURL, 'src');
}

function getSrcFromMedia(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(
        [...dom.window.document.querySelectorAll('video, audio, source')],
        baseURL,
        'src'
    );
}

function getSrcFromFormAction(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(dom.window.document.querySelectorAll('form'), baseURL, 'action');
}

function getSrcFromFrames(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(
        [...dom.window.document.querySelectorAll('frame, iframe')],
        baseURL,
        'src'
    );
}

function getSrcFromBase(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    return collectURLs(dom.window.document.querySelectorAll('base'), baseURL);
}

function getSrcFromObjects(htmlBody, baseURL) {
    const dom = new JSDOM(htmlBody);
    const urls = [];
    
    dom.window.document.querySelectorAll('object, embed, applet').forEach(element => {
        let src;
        switch (element.tagName.toLowerCase()) {
            case 'embed':
                src = element.src;
                break;
            case 'object':
                src = element.data;
                break;
            case 'applet':
                src = element.code;
                break;
        }
        
        if (!src || src.includes('about:blank')) return;
        
        const url = createURL(src, baseURL);
        if (url && !urls.includes(url.href)) {
            urls.push(url.href);
        }
    });
    
    return urls;
}

async function crawlPage(baseURL, currentURL, urlList) {
    const baseURLObj = new URL(baseURL);
    const currentURLObj = new URL(currentURL);

    if (baseURLObj.hostname !== currentURLObj.hostname) {
        return urlList;
    }

    const normalizedCurrentURL = normalizeURL(currentURL);
    if (!normalizedCurrentURL || urlList.pages[normalizedCurrentURL]) {
        urlList.pages[normalizedCurrentURL] = (urlList.pages[normalizedCurrentURL] || 0) + 1;
        return urlList;
    }

    urlList.pages[normalizedCurrentURL] = 1;
    console.log(`Crawling: ${currentURL}`);

    try {
        const resp = await fetch(currentURL);
        if (resp.status > 399) {
            console.log(`Error fetching ${currentURL}: Status ${resp.status}`);
            return urlList;
        }

        const contentType = resp.headers.get("content-type");
        if (!contentType?.includes("text/html")) {
            console.log(`Skipping non-HTML content: ${contentType}`);
            return urlList;
        }

        const htmlBody = await resp.text();
        const results = {
            nextURLs: getURLsFromHTML(htmlBody, baseURL),
            scriptList: getSrcFromScripts(htmlBody, baseURL),
            ...getSrcFromLinks(htmlBody, baseURL),
            imgList: getSrcFromImages(htmlBody, baseURL),
            mediaList: getSrcFromMedia(htmlBody, baseURL),
            formActionList: getSrcFromFormAction(htmlBody, baseURL),
            frameList: getSrcFromFrames(htmlBody, baseURL),
            baseList: getSrcFromBase(htmlBody, baseURL),
            objectList: getSrcFromObjects(htmlBody, baseURL)
        };

        // Update URL lists
        Object.entries(results).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                if (!urlList[key]) urlList[key] = [];
                value.forEach(url => {
                    if (!urlList[key].includes(url)) {
                        urlList[key].push(url);
                    }
                });
            }
        });

        // Crawl next URLs
        for (const nextURL of results.nextURLs) {
            urlList = await crawlPage(baseURL, nextURL, urlList);
        }
    } catch (err) {
        console.log(`Error crawling ${currentURL}: ${err.message}`);
    }

    return urlList;
}

module.exports = {
    crawlPage,
    normalizeURL,
    getURLsFromHTML,
    getSrcFromScripts,
    getSrcFromLinks,
    getSrcFromImages,
    getSrcFromMedia,
    getSrcFromFormAction,
    getSrcFromFrames,
    getSrcFromBase,
    getSrcFromObjects
};