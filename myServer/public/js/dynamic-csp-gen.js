const fs = require('fs').promises;
const { checkUrls } = require('../../../url_checking.js');
const {downloadWasm} = require('./download-wasm.js');

let writeLock = false;

function waitForLock(){
    return new Promise(resolve => {
        (function waitForUnlock() {
            if (!writeLock) {
                resolve();
            }else{
                setTimeout(waitForLock,500);
            }
        })();
    });
}

async function writeToFile(data){
    await waitForLock();
    writeLock = true;
    try {
        await fs.writeFile('C:/Non-Software/Coding_Things/Cloud_Security/dynamic-csp-generation/csp-header.txt', data, 'utf8');
    } catch (error) {
        console.error('Error writing to file', error);
    } finally{
        writeLock = false;
    }
}


async function dynamicCspGenerator(reqBody) {
    try {
        const data = await fs.readFile('C:/Non-Software/Coding_Things/Cloud_Security/dynamic-csp-generation/csp-header.txt', 'utf8');
        const cspHeader = JSON.parse(data);
        const violatedDirective = reqBody['csp-report']['violated-directive'];
        let directive;
        let url = reqBody['csp-report']['blocked-uri'];
        url = url.trim();
        switch (violatedDirective) {
            case 'script-src-elem':
                directive = 'script-src';
                break;
            case 'style-src-elem':
                directive = 'style-src';
                break;
            default:
                directive = violatedDirective;
                break;
        }

        let domain;
        let urlObj;
        try {
            urlObj = new URL(url);
            domain = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}`;
            if (!cspHeader[directive].includes(domain.slice(0, -1))) {
                const baseURL = reqBody['csp-report']['document-uri'];
                let urlList = cspHeader[directive].split(' ');
                if (urlList[0] === "'none'") {
                    urlList = [];
                }
                if (domain !== baseURL) {
                    urlList.push(domain.slice(0, -1));
                }
                const urlSet = new Set(urlList);
                const newList = await checkUrls(Array.from(urlSet));
                cspHeader[directive] = newList.join(' ');
                
                const newData = JSON.stringify(cspHeader, null, 2);
                
                await writeToFile(newData);
                console.log('adding', domain, ' for directive => ', directive);
                console.log('File has been updated successfully.');
                
            }
        } catch (err) {
            try {
                if (url === 'blob') {
                    url = 'blob:';
                }
                else if ((directive === 'img-src' || directive === 'connect-src') && url === 'data') {
                    url = 'data:';
                }
                // else if (url === 'wasm-eval') {
                //     url = "'unsafe-eval'";
                // }
                else return;
    
                if (!cspHeader[directive].includes(url)) {
                    const urlList = cspHeader[directive].split(' ');
    
                    if (urlList.length === 1 && urlList[0] === 'none') {
                        urlList = [];
                    }
                    urlList.push(url);
                    const urlSet = new Set(urlList);
                    cspHeader[directive] = Array.from(urlSet).join(' ');
    
                    const newData = JSON.stringify(cspHeader, null, 2);
    
                    await writeToFile(newData);
                    console.log('adding', url, ' for directive => ', directive);
                    console.log('File has been updated successfully.');
                }
            } catch (error) {
                console.error("Error updating CSP: ", error);
            }
            
        }
    } catch (error) {
        console.error('Error reading from file', error);
    }
}

module.exports = {
    dynamicCspGenerator,
}