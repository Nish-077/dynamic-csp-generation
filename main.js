const {crawlPage, normalizeURL} = require('./crawl.js');
const {csp_generator} = require('./csp_gen.js');


async function main(){
    if (process.argv.length < 3) {
        console.log("No website provided to crawl.");
        process.exit(1);
    }
    if (process.argv.length > 3) {
        console.log("Too many command line args. Provide single website to crawl");
        process.exit(1);
    }

    let baseURL = process.argv[2];
    const protocol = new URL(baseURL).protocol.toString();
    const hostpath = normalizeURL(baseURL);
    baseURL = `${protocol}//${hostpath}`;

    console.log(`Starting crawl of ${baseURL}\n`);
    const pages = new Object();
    const scriptList = new Array();
    const styleList = new Array();
    const prefetchList = new Array();
    const imgList = new Array();
    const mediaList = new Array();
    const formActionList = new Array();
    const frameList = new Array();
    const baseList = new Array();
    const objectList = new Array();
    
    const urlList = await crawlPage(baseURL, baseURL, {pages,scriptList,styleList,prefetchList,imgList,mediaList,formActionList,frameList,baseList,objectList});
    
    console.log('\nCrawling Finished...\n');

    console.log("scripts => ", scriptList);
    console.log("styles => ", styleList);
    console.log("prefetch => ", prefetchList);
    console.log("images => ", imgList);
    console.log("media => ", mediaList);
    console.log("form-action => ", formActionList);
    console.log("frames => ", frameList);
    console.log("base => ", baseList);
    console.log("objects => ", objectList);
    console.log("\n");

    await csp_generator(baseURL, scriptList,styleList,prefetchList,imgList,mediaList,formActionList,frameList,baseList,objectList);
}

main();