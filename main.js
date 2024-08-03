const { crawlPage, normalizeURL } = require('./crawl.js');
const { csp_generator } = require('./csp_gen.js');


async function main(url) {
    
    let baseURL = url;
    const protocol = new URL(baseURL).protocol.toString();
    const hostpath = normalizeURL(baseURL);
    const port = new URL(baseURL).port.toString();
    baseURL = `${protocol}//${hostpath}:${port}`;

    console.log(`Starting crawl of ${baseURL}\n`);
    const pages = new Object();
    const scriptList = [];
    const styleList = [];
    const prefetchList = [];
    const imgList = [];
    const mediaList = [];
    const formActionList = [];
    const frameList = [];
    const baseList = [];
    const objectList = [];

    const urlList = await crawlPage(baseURL, baseURL, { pages, scriptList, styleList, prefetchList, imgList, mediaList, formActionList, frameList, baseList, objectList });
    console.log('\nCrawling Finished...\n');
    return await csp_generator(baseURL, urlList);
}

if (require.main === module) {
    if (process.argv.length < 3) {
        console.log("No website provided to crawl.");
        process.exit(1);
    }
    if (process.argv.length > 3) {
        console.log("Too many command line args. Provide single website to crawl");
        process.exit(1);
    }
    main(process.argv[2]);
}

module.exports = {
    main
}