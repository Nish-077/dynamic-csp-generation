const { checkUrls } = require('./url_checking.js');
const fs = require('fs').promises;

async function csp_generator(baseURL, urlList) {
    console.log('Generating CSP...');

    const csp_list = {
        'default-src': new Set(),
        'script-src': new Set(),
        'style-src': new Set(),
        'prefetch-src': new Set(),
        'img-src': new Set(),
        'media-src': new Set(),
        'form-action': new Set(),
        'font-src': new Set(),
        'frame-src': new Set(),
        'base-uri': new Set(),
        'object-src': new Set(),
        'connect-src': new Set(),
        'manifest-src': new Set(),
        'worker-src': new Set()
    };

    urlList.scriptList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['script-src'].add("'self'");
        } else {
            csp_list['script-src'].add(domain.slice(0, -1));
        }
    });

    urlList.styleList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['style-src'].add("'self'");
        } else {
            csp_list['style-src'].add(domain.slice(0, -1));
        }
    });

    urlList.prefetchList.forEach(async url => {

        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['prefetch-src'].add("'self'");
        } else {
            csp_list['prefetch-src'].add(domain.slice(0, -1));
        }
    });

    urlList.imgList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['img-src'].add("'self'");
        } else {
            csp_list['img-src'].add(domain.slice(0, -1));
        }
    });


    urlList.mediaList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['media-src'].add("'self'");
        } else {
            csp_list['media-src'].add(domain.slice(0, -1));
        }
    });

    urlList.formActionList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['form-action'].add("'self'");
        } else {
            csp_list['form-action'].add(domain.slice(0, -1));
        }
    });

    urlList.frameList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['frame-src'].add("'self'");
        } else {
            csp_list['frame-src'].add(domain.slice(0, -1));
        }
    });

    urlList.baseList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['base-uri'].add("'self'");
        } else {
            csp_list['base-uri'].add(domain.slice(0, -1));
        }

    });

    urlList.objectList.forEach(async url => {
        const urlObj = new URL(url);
        const domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;

        if (domain === baseURL) {
            csp_list['object-src'].add("'self'");
        } else {
            csp_list['object-src'].add(domain.slice(0, -1));
        }
    });

    Object.entries(csp_list).forEach(async ([directive, sources]) => {
        csp_list[directive] = await checkUrls(directive, Array.from(sources));
    });

    csp_list['script-src'].add("'unsafe-inline'");
    csp_list['style-src'].add("'unsafe-inline'");
    csp_list['base-uri'].add("'self'");
    csp_list['manifest-src'].add("'self'");
    csp_list['connect-src'].add("'self'");
    csp_list['worker-src'].add("'self'");

    csp_list['script-src'].add("'report-sample'");
    csp_list['style-src'].add("'report-sample'");

    Object.entries(csp_list).forEach(([directive, sources]) => {
        if (sources.size === 0) {
            sources.add("'none'");
        }
    });

    const cspDirectives = {
        "default-src": Array.from(csp_list['default-src']).join(' '),
        "script-src": Array.from(csp_list['script-src']).join(' '),
        "style-src": Array.from(csp_list['style-src']).join(' '),
        "prefetch-src": Array.from(csp_list['prefetch-src']).join(' '),
        "img-src": Array.from(csp_list['img-src']).join(' '),
        "media-src": Array.from(csp_list['media-src']).join(' '),
        "form-action": Array.from(csp_list['form-action']).join(' '),
        "font-src": Array.from(csp_list['font-src']).join(' '),
        "frame-src": Array.from(csp_list['frame-src']).join(' '),
        "base-uri": Array.from(csp_list['base-uri']).join(' '),
        "object-src": Array.from(csp_list['object-src']).join(' '),
        "connect-src": Array.from(csp_list['connect-src']).join(' '),
        "manifest-src": Array.from(csp_list['manifest-src']).join(' '),
        "worker-src": Array.from(csp_list['worker-src']).join(' '),
        "report-uri": '/csp-report-endpoint'
    };


    try {
        await fs.writeFile('./csp-header.txt', JSON.stringify(cspDirectives, null, 2));
        console.log('CSP header saved to file.');
    } catch (err) {
        console.error('Error writing CSP header to file: ', err);
    }
    return cspDirectives;
}

module.exports = {
    csp_generator
};