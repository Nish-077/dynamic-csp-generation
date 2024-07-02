const axios = require('axios');
const readline = require('readline');

const API_KEY = 'ade438eac0902326a67a0f37b51ce371ebdfd1b2b2957cb1e65dff6d7eafb10c';

var malicious = [];
var good = [];


async function getReport(apiKey, url) {
    const apiUrl = 'https://www.virustotal.com/vtapi/v2/url/report';
    const params = {
        apikey: apiKey,
        resource: url,
        allinfo: 'true',
    };

   
        const response = await axios.get(apiUrl, { params });
        return response.data;
    
}

function countMaliciousVendors(report) {
    if (report.response_code !== 1) {
        return 0;
    }
    const positives = report.positives || 0;
    return positives;
}

async function checkUrl(url) {
    // await new Promise(resolve => setTimeout(resolve, 25000));

    const report = await getReport(API_KEY, url);
    const maliciousCount = countMaliciousVendors(report);
    if (maliciousCount > 0) {
        console.log(`The URL ${url} is flagged as malicious by ${maliciousCount} security vendors.`);
        malicious.push(url);
        // return 0;
    } else {
        // console.log(`The URL ${url} is not flagged as malicious by any security vendors.`);
        good.push(url);
        // return 1;
    }
}

async function checkUrls(urls) {
    for (const url of urls) {
        await checkUrl(url);
    }

    return good;
    // console.log('Malicious sites are:', malicious);
    // console.log('Good sites are:', good);
}

function getUserInput() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter URLs separated by commas: ', (answer) => {
        const urlsToCheck = answer.split(',').map(url => url.trim());
        checkUrls(urlsToCheck).then(() => rl.close());
    });
}

// getUserInput();

module.exports = {
    checkUrls
}
