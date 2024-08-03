const puppeteer = require("puppeteer");
const fs = require("fs");

async function measureLoadTime(url) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();
	const startTime = Date.now();
	await page.goto(url);
	const loadTime = Date.now() - startTime;
	await browser.close();
	return loadTime;
}

let withCSPArray = [], withoutCSPArray = [];

async function load_page() {
	const withCSP = await measureLoadTime("http://localhost:6969/");
	const withoputCSP = await measureLoadTime("http://localhost:6969/page2");
	console.log("withCSP =", withCSP);
	console.log("withoutCSP =", withoputCSP);
	withCSPArray.push(withCSP);
	withoutCSPArray.push(withoputCSP);
}

async function callback() {
	for (let i = 0; i < 6; i++) {
		await load_page();
	}
	const headers = ['Load-Time', 'CSP'];
	const rowsWithCSP = withCSPArray.map(time => [time, 'With CSP']);
	const rowsWithoutCSP = withoutCSPArray.map(time => [time, 'Without CSP']);

	const rows = [...rowsWithCSP, ...rowsWithoutCSP];
	const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
	fs.writeFileSync(
		"C:/Non-Software/Coding_Things/Cloud_Security/dynamic-csp-generation/myServer/load_time.csv",
		csvContent
	);
}

callback();
