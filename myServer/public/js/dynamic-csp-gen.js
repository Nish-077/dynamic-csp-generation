const fs = require('fs').promises;
const { checkUrls } = require('../../../url_checking.js');
const { downloadWasm } = require('./download-wasm.js');

let writeLock = false;

function waitForLock() {
    return new Promise(resolve => {
        (function waitForUnlock() {
            if (!writeLock) {
                resolve();
            } else {
                setTimeout(waitForLock, 500);
            }
        })();
    });
}

async function writeToFile(data) {
    await waitForLock();
    writeLock = true;
    try {
        await fs.writeFile('./csp-header.txt', data, 'utf8');
    } catch (error) {
        console.error('Error writing to file', error);
    } finally {
        writeLock = false;
    }
}


async function dynamicCspGenerator(reqBody) {
    try {
        const data = await fs.readFile('./csp-header.txt', 'utf8');
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
            if (domain.endsWith(':')) {
                domain = domain.slice(0, -1);
            }
            if (!cspHeader[directive].includes(domain)) {
                const baseURL = reqBody['csp-report']['document-uri'];
                let urlList = cspHeader[directive].split(' ');
                if (urlList[0] === "'none'") {
                    urlList = [];
                }
                if (domain !== baseURL) {
                    urlList.push(domain);
                }
                const urlSet = new Set(urlList);
                const newList = await checkUrls(directive, Array.from(urlSet));
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
                else {
                    const issue = `Potential threat found: ${url} in directive: ${directive}`;
                    try {
                        const data = await fs.readFile("./issues.txt", 'utf8');
                
                        if (!data.includes(issue)) {
                            await fs.appendFile('./issues.txt', `\n${issue}`);
                            console.log("Issue added to file");
                        } else {
                            console.log("Issue already registered.");
                        }
                    } catch (err) {
                        console.error("Error handling file:", err);
                    }
                    return;
                }

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