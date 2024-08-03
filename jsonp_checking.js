async function analyzeJSONP(url) {

	const response = await fetch(url);
	const contentType = response.headers.get('Content-Type');
	const text = await response.text();

	const results = {
		url,
		isPotentialJSONP: false,
		contentTypeCheck: false,
		patternMatching: false,
		functionNames: [],
		structureAnalysis: false,
		dynamicFunctionDetection: false,
		jsonArrayWrapping: false,
		scriptTagInjection: false
	};

	const contentTypeCheck = contentType.includes('application/javascript') || contentType.includes('text/javascript');
	const functionCallPattern = /^[\w$]+\s*\({.*}\)/;
	const variableAssignmentPattern = /^var\s+\w+\s*=\s*{.*}/;
	const patternMatching = functionCallPattern.test(text) || variableAssignmentPattern.test(text);
	const commonCallbacks = ['callback', 'jsonp', 'cb', 'json'];
	const hasFunctionNames = commonCallbacks.some(name => text.startsWith(`${name}(`));
	const structureAnalysis = /^[\w$]+\s*\(\s*{[\s\S]*}\s*\)\s*;?\s*$/.test(text);
	const dynamicFunctionDetection = /^\/\*\*\/\s*{/.test(text) || /^\/\*\*\/\s*[\w$]+\d+_\d+\s*\(/.test(text);
	const jsonArrayWrapping = /^\s*\(\s*\[[\s\S]*\]\s*\)\s*$/.test(text);
	const scriptTagInjection = /<script[\s\S]*?>[\s\S]*?<\/script>/.test(text);

	const isPotentialJSONP = contentTypeCheck || patternMatching || hasFunctionNames || structureAnalysis || dynamicFunctionDetection || jsonArrayWrapping || scriptTagInjection;

	return { url, isPotentialJSONP };

}

const urlsToCheck = [
	'https://www.google.com',
	'https://cdn.jsdelivr.net',
	'https://www.youtube.com',
	'https://d3e54v103j8qbb.cloudfront.net',
	'https://cdn.prod.website-files.com'
];

async function checkJasonpUrls(urls) {
	const noJsonp = new Set();
	for (const url of urls) {
		if (url !== 'self') {
			try {
				const result = await analyzeJSONP(url);
				if (result.isPotentialJSONP) {
					console.log("Potential JSONP URL: ", url);
				}
			}
			catch (err) {
				console.error("Invalid URL. Got =>", url);
			}
		}
	}
	return Array.from(noJsonp);
}

async function runAnalysis() {
	await checkJasonpUrls(urlsToCheck);
}
// runAnalysis();

module.exports = {
	checkJasonpUrls,
}