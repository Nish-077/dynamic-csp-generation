/**
 * @license
 * Copyright (c) 2024-2025 Nishant Banakar, Manish P
 * This source code is licensed under the ISC license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { crawlPage, normalizeURL } = require('./crawl.js');
const { csp_generator } = require('./csp_gen.js');

async function main(url) {
    try {
        const urlObj = new URL(url);
        const baseURL = `${urlObj.protocol}//${normalizeURL(url)}:${urlObj.port || ''}`;
        
        console.log(`Starting crawl of ${baseURL}\n`);
        
        const urlList = {
            pages: {},
            scriptList: [],
            styleList: [],
            prefetchList: [],
            imgList: [],
            mediaList: [],
            formActionList: [],
            frameList: [],
            baseList: [],
            objectList: []
        };

        const results = await crawlPage(baseURL, baseURL, urlList);
        console.log('\nCrawling Finished...\n');
        return await csp_generator(baseURL, results);
    } catch (error) {
        console.error('Error in main:', error.message);
        throw error;
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length !== 1) {
        console.error("Please provide exactly one website URL to crawl");
        process.exit(1);
    }
    main(args[0]).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { main };