require('dotenv').config();
const axios = require('axios');
const fs = require('fs')
const readline = require('readline');
const {checkJasonpUrls} = require('./jsonp_checking.js');

const API_KEY = process.env.VIRUSTOTAL_APIKEY;

var maliciousUrls = [];
var goodUrls = [];


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

async function checkUrl(url, directive, good) {
    const report = await getReport(API_KEY, url);
    const maliciousCount = countMaliciousVendors(report);
    if (maliciousCount > 0) {
        console.log(`The URL ${url} is flagged as malicious by ${maliciousCount} security vendors.`);
        const issue = `Malicious URL found: ${url} in directive: ${directive}`;
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
        maliciousUrls.push(url);
    } else {
        good.add(url);
        goodUrls.push(url);
    }
}

async function checkUrls(directive, urls) {
    let good = new Set();
    for (const url of urls) {
        if (url !== 'self') {
            await checkUrl(url, directive, good);
        }
    }
    await checkJasonpUrls(directive, Array.from(good));
    return Array.from(good);
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
