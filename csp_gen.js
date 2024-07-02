const {checkUrls} = require('./url_checking.js');

async function csp_generator(baseURL, scriptList = [], styleList = [], prefetchList = [], imgList = [], mediaList = [], formActionList = [], frameList = [], baseList = [], objectList = []){
    console.log('Generating CSP...');
    
    const csp_list = {
        'default-src': new Set(),
        'script-src': new Set(),
        'style-src': new Set(),
        'prefetch-src': new Set(),
        'img-src': new Set(),
        'media-src': new Set(),
        'form-action': new Set(),
        'frame-src': new Set(),
        'base-uri': new Set(),
        'object-src': new Set(),
        'manifest-src': new Set(),
        'worker-src': new Set()
    };
    
    scriptList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside scriptList, good = ", good);
        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
            
            if (domain === baseURL) {
                csp_list['script-src'].add("'self'");
            } else {
                csp_list['script-src'].add(domain);
            }
        // }
    });

    styleList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside styleList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
    
            if (domain === baseURL) {
                csp_list['style-src'].add("'self'");
            } else {
                csp_list['style-src'].add(domain);
            }
        // }
    });

    prefetchList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside prefetchList, good = ", good);
        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
    
            if (domain === baseURL) {
                csp_list['prefetch-src'].add("'self'");
            } else {
                csp_list['prefetch-src'].add(domain);
            }
        // }
    });

    imgList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside imgList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
    
            if (domain === baseURL) {
                csp_list['img-src'].add("'self'");
            } else {
                csp_list['img-src'].add(domain);
            }
        // }
    });
    
    
    mediaList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside mediaList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
            
            if (domain === baseURL) {
                csp_list['media-src'].add("'self'");
            } else {
                csp_list['media-src'].add(domain);
            }
        // }
    });
    
    formActionList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside formActionList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
            
            if (domain === baseURL) {
                csp_list['form-action'].add("'self'");
            } else {
                csp_list['form-action'].add(domain);
            }
        // }
    });
    
    frameList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside frameList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
            
            if (domain === baseURL) {
                csp_list['frame-src'].add("'self'");
            } else {
                csp_list['frame-src'].add(domain);
            }
        // }
    });
    
    baseList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside baseList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
            
            if (domain === baseURL) {
                csp_list['base-uri'].add("'self'");
            } else {
                csp_list['base-uri'].add(domain);
            }
        // }
    });
    
    objectList.forEach(async url => {
        // const good = await checkUrl(url);
        // // console.log("inside objectList, good = ", good);

        // if (good) {
            const urlObj = new URL(url);
            const domain = `${urlObj.protocol}//${urlObj.hostname}`;
            
            if (domain === baseURL) {
                csp_list['object-src'].add("'self'");
            } else {
                csp_list['object-src'].add(domain);
            }
        // }
    });

    Object.entries(csp_list).forEach(async ([directive,sources]) => {
        csp_list[directive] = await checkUrls(Array.from(sources));
    });

    csp_list['manifest-src'].add("'self'");
    csp_list['worker-src'].add("'self'");
    
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
        "frame-src": Array.from(csp_list['frame-src']).join(' '),
        "base-uri": Array.from(csp_list['base-uri']).join(' '),
        "object-src": Array.from(csp_list['object-src']).join(' '),
        "manifest-src": Array.from(csp_list['manifest-src']).join(' '),
        "worker-src": Array.from(csp_list['worker-src']).join(' ')
    };
    
    let cspHeader = "Content-Security-Policy: " + Object.entries(cspDirectives)
    .filter(([directive, sources]) => {
        const defaultSrcString = Array.from(csp_list['default-src']).join(' ');
        return directive === 'default-src' || sources !== defaultSrcString;
    })
    .map(([directive, sources]) => `${directive} ${sources}`)
    .join('; ');
    cspHeader += ';';
    console.log(cspHeader);
}

module.exports = {
    csp_generator
};