const { JSDOM } = require('jsdom');

async function crawlPage(baseURL, currentURL, urlList) {
    const currentURLObj = new URL(currentURL);
    const baseURLObj = new URL(baseURL);

    if (baseURLObj.hostname !== currentURLObj.hostname) {
        return urlList;
    }

    const normalizedCurrentURL = normalizeURL(currentURL);

    if (urlList.pages[normalizedCurrentURL] > 0) {
        urlList.pages[normalizedCurrentURL]++;
        return urlList;
    }

    urlList.pages[normalizedCurrentURL] = 1;
    console.log(`actively crawling: ${currentURL}`);

    try {
        const resp = await fetch(currentURL);

        if (resp.status > 399) {
            console.log(`error in fetch with status code: ${resp.status} on page: ${currentURL}`);
            return urlList;
        }

        const contentType = resp.headers.get("content-type");
        if (!contentType.includes("text/html")) {
            console.log(`non html content recieved, content type: ${contentType}, on page: ${currentURL}`);
            return urlList;
        }

        const htmlBody = await resp.text();
        const nextURLs = getURLsFromHTML(htmlBody, baseURL);
        const scriptURLs = getSrcFromScripts(htmlBody, baseURL);
        const linkURLs = getSrcFromLinks(htmlBody, baseURL);
        const imgURLs = getSrcFromImages(htmlBody, baseURL);
        const mediaURLs = getSrcFromMedia(htmlBody, baseURL);
        const formActionURLs = getSrcFromFormAction(htmlBody, baseURL);
        const frameURLs = getSrcFromFrames(htmlBody, baseURL);
        const baseURLs = getSrcFromBase(htmlBody, baseURL);
        const objectURLs = getSrcFromObjects(htmlBody, baseURL);

        scriptURLs.forEach(url => {
            if (!urlList.scriptList.includes(url)) {
                urlList.scriptList.push(url);
            }
        });
        Object.entries(linkURLs).forEach(([key, value]) => {
            if (!urlList[key]) {
                urlList[key] = [];
            }
            value.forEach(url => {
                if (!urlList[key].includes(url)) {
                    urlList[key].push(url);
                }
            });
        });
        imgURLs.forEach(url => {
            if (!urlList.imgList.includes(url)) {
                urlList.imgList.push(url);
            }
        });
        mediaURLs.forEach(url => {
            if (!urlList.mediaList.includes(url)) {
                urlList.mediaList.push(url);
            }
        });
        formActionURLs.forEach(url => {
            if (!urlList.formActionList.includes(url)) {
                urlList.formActionList.push(url);
            }
        });
        frameURLs.forEach(url => {
            if (!urlList.frameList.includes(url)) {
                urlList.frameList.push(url);
            }
        });
        baseURLs.forEach(url => {
            if (!urlList.baseList.includes(url)) {
                urlList.baseList.push(url);
            }
        });
        objectURLs.forEach(url => {
            if (!urlList.objectList.includes(url)) {
                urlList.objectList.push(url);
            }
        });

        for (const nextURL of nextURLs) {
            urlList = await crawlPage(baseURL, nextURL, urlList);
        }

    } catch (err) {
        console.log(`error in fetch: ${err.message}, on page: ${currentURL}`);
    }

    return urlList;
}

function normalizeURL(urlString) {
    const urlObj = new URL(urlString);
    const hostPath = `${urlObj.hostname}${urlObj.pathname}`;
    if (hostPath.length > 0 && hostPath.slice(-1) === '/') {
        return hostPath.slice(0, -1);
    }
    return hostPath;
}

function getURLsFromHTML(htmlBody, baseURL) {
    const URLs = [];
    const dom = new JSDOM(htmlBody);
    const urlElements = dom.window.document.querySelectorAll('a');

    for (const urlElement of urlElements) {
        // console.log(urlElement.href)
        try {
            let url;
            if (urlElement.href.startsWith('http://') || urlElement.href.startsWith('https://')) {
                url = new URL(urlElement.href);
            }
            else {
                url = new URL(urlElement.href, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                URLs.push(url.href);
            }
        } catch (err) {
            if (!urlElement.href.includes("about:blank")) {
                console.log(`error with URL: ${err.message}, on page: ${urlElement.href}`);
            }
        }
    }
    return URLs;
}

function getSrcFromScripts(htmlBody, baseURL) {
    const scriptURLs = [];
    const dom = new JSDOM(htmlBody);
    const scriptElements = dom.window.document.querySelectorAll('script');

    for (const scriptElement of scriptElements) {
        try {
            let url;
            if (scriptElement.src.startsWith('http://') || scriptElement.src.startsWith('https://')) {
                url = new URL(scriptElement.src);
            }
            else {
                url = new URL(scriptElement.src, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                scriptURLs.push(url.href);
            }
        } catch (err) {
            if (!scriptElement.src.includes("about:blank")) {
                console.log(`error ${err.message} with URL: ${scriptElement.src}`);
            }
        }
    }
    return scriptURLs;
}


function getSrcFromLinks(htmlBody, baseURL) {
    const styleList = [];
    const prefetchList = [];
    const dom = new JSDOM(htmlBody);
    const styleElements = dom.window.document.querySelectorAll('link');
    for (const styleElement of styleElements) {
        try {
            let url;
            if (styleElement.href.startsWith('http://') || styleElement.href.startsWith('https://')) {
                url = new URL(styleElement.href);
            }
            else {
                url = new URL(styleElement.href, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                const rel = styleElement.rel;
                switch (rel) {
                    case "stylesheet":
                    case "alternate stylesheet":
                        styleList.push(url.href);
                        break;
                    case "prefetch":
                    case "preload":
                    case "prerender":
                        prefetchList.push(url.href);
                        break;
                }
            }
        } catch (err) {
            if (!styleElement.href.includes("about:blank")) {
                console.log(`error ${err.message} with URL: ${styleElement.href}`);
            }
        }
    }
    return { styleList, prefetchList };
}

function getSrcFromImages(htmlBody, baseURL) {
    const imgURLs = [];
    const dom = new JSDOM(htmlBody);
    const imgElements = dom.window.document.querySelectorAll('img');

    for (const imgElement of imgElements) {
        try {
            let url;
            if (imgElement.src.startsWith('http://') || imgElement.src.startsWith('https://')) {
                url = new URL(imgElement.src);
            }
            else {
                url = new URL(imgElement.src, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                imgURLs.push(url.href);
            }
        } catch (err) {
            if (!imgElement.src.includes("about:blank")) {
                console.log(`error ${err.message} with URL: ${imgElement.src}`);
            }
        }
    }
    return imgURLs;
}

function getSrcFromMedia(htmlBody, baseURL) {
    const mediaURLs = [];
    const dom = new JSDOM(htmlBody);
    const mediaElements = dom.window.document.querySelectorAll('audio, video');

    for (const mediaElement of mediaElements) {
        try {
            let url;
            if (mediaElement.src.startsWith('http://') || mediaElement.src.startsWith('https://')) {
                url = new URL(mediaElement.src);
            } else {
                url = new URL(mediaElement.src, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                mediaURLs.push(url.href);
            }
        } catch (err) {
            if (!mediaElement.src.includes("about:blank")) {
                console.log(`Error ${err.message} with URL: ${mediaElement.src}`);
            }
        }
    }
    return mediaURLs;
}

function getSrcFromFormAction(htmlBody, baseURL) {
    const formActionURLs = [];
    const dom = new JSDOM(htmlBody);
    const formElements = dom.window.document.querySelectorAll('form');

    for (const formElement of formElements) {
        try {
            let url;
            if (formElement.action.startsWith('http://') || formElement.action.startsWith('https://')) {
                url = new URL(formElement.action);
            }
            else {
                url = new URL(formElement.action, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                formActionURLs.push(url.href);
            }
        } catch (err) {
            if (!formElement.action.includes("about:blank")) {
                console.log(`error ${err.message} with URL: ${formElement.action}`);
            }
        }
    }
    return formActionURLs;
}

function getSrcFromFrames(htmlBody, baseURL) {
    const frameURLs = [];
    const dom = new JSDOM(htmlBody);
    const frameElements = dom.window.document.querySelectorAll('iframe, frame');

    for (const frameElement of frameElements) {
        try {
            let url;
            if (frameElement.src.startsWith('http://') || frameElement.src.startsWith('https://')) {
                url = new URL(frameElement.src);
            }
            else {
                url = new URL(frameElement.src, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                frameURLs.push(url.href);
            }
        } catch (err) {
            if (!frameElement.src.includes("about:blank")) {
                console.log(`error ${err.message} with URL: ${frameElement.src}`);
            }
        }

    }
    return frameURLs;
}

function getSrcFromBase(htmlBody, baseURL) {
    const baseURLs = [];
    const dom = new JSDOM(htmlBody);
    const baseElements = dom.window.document.querySelectorAll('base');

    for (const baseElement of baseElements) {
        try {
            let url;
            if (baseElement.href.startsWith('http://') || baseElement.href.startsWith('https://')) {
                url = new URL(baseElement.href);
            }
            else {
                url = new URL(baseElement.href, baseURL);
            }
            if (!url.href.includes("about:blank")) {
                baseURL.push(url.href);
            }
        } catch (err) {
            if (!baseElement.href.includes("about:blank")) {
                console.log(`error ${err.message} with URL: ${scriptElement.href}`);
            }
        }

    }
    return baseURLs;
}

function getSrcFromObjects(htmlBody, baseURL) {
    const objectURLs = [];
    const dom = new JSDOM(htmlBody);
    const objectElements = dom.window.document.querySelectorAll('object, embed, applet');

    for (const objectElement of objectElements) {
        const tagName = objectElement.tagName.toLowerCase();
        try {
            let url;
            switch (tagName) {
                case 'embed':
                    if (objectElement.src.startsWith('http://') || objectElement.src.startsWith('https://')) {
                        url = new URL(objectElement.src);
                    }
                    else {
                        url = new URL(objectElement.src, baseURL);
                    }
                    break;
                case 'object':
                    if (objectElement.data.startsWith('http://') || objectElement.data.startsWith('https://')) {
                        url = new URL(objectElement.data);
                    }
                    else {
                        url = new URL(objectElement.data, baseURL);
                    }
                    break;
                case 'applet':
                    if (objectElement.compareDocumentPosition.startsWith('http://') || objectElement.code.startsWith('https://')) {
                        url = new URL(objectElement.code);
                    }
                    else {
                        url = new URL(objectElement.code, baseURL);
                    }
                    break;
            }
            if (!url.href.includes("about:blank")) {
                objectURLs.push(url.href);
            }
        } catch (err) {
            console.log(`error with relative URL: ${err.message}`);
        }
    }
    return objectURLs;
}

module.exports = {
    crawlPage,
    getSrcFromScripts,
    getSrcFromLinks,
    getSrcFromImages,
    getSrcFromFrames,
    getSrcFromBase,
    getSrcFromFormAction,
    getSrcFromMedia,
    getSrcFromObjects,
    normalizeURL
};