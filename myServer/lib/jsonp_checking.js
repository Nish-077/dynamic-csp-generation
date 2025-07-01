const fs = require('fs').promises;
const path = require('path'); // 1. Import the path module

// 2. Define a reliable path to the issues file
const issuesFilePath = path.join(__dirname, '..', 'issues.txt');

async function analyzeJSONP(url) {
    try {
        const response = await fetch(url);
        const contentType = response.headers.get('Content-Type');
        const text = await response.text();

        const results = {
            url,
            isPotentialJSONP: false,
            reasons: []
        };

        // --- Evidence Gathering ---
        if (contentType?.includes('javascript')) {
            results.reasons.push('JavaScript content type');
        }
        if (/^[\w$]+\s*\(/.test(text)) {
            results.reasons.push('Starts with function call pattern');
        }
        const commonCallbacks = ['callback=', 'jsonp=', 'cb='];
        if (commonCallbacks.some(name => url.includes(name))) {
            results.reasons.push('URL contains common callback parameter');
        }
        if (text.includes('new Function(') || text.includes('eval(')) {
            results.reasons.push('Dynamic code execution (eval/new Function)');
        }
        if (text.includes('<script') || text.includes('document.write')) {
            results.reasons.push('Potential script injection');
        }

        // --- Decision Logic ---
        // Require stronger evidence than just a single weak indicator.
        const strongReasons = [
            'URL contains common callback parameter',
            'Dynamic code execution (eval/new Function)',
            'Potential script injection'
        ];

        const hasStrongReason = results.reasons.some(r => strongReasons.includes(r));
        
        // Flag if there's one strong reason OR at least two weak reasons.
        results.isPotentialJSONP = hasStrongReason || results.reasons.length >= 2;

        return results;
    } catch (err) {
        console.error(`Error analyzing URL ${url}:`, err.message);
        return { url, isPotentialJSONP: false, reasons: ['Analysis failed'] };
    }
}

async function checkJsonpUrls(directive, urls) {
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return [];
    }

    const issues = [];
    for (const url of urls) {
        if (url === 'self') continue;

        try {
            const result = await analyzeJSONP(url);
            if (result.isPotentialJSONP) {
                const issue = `Potential JSONP vulnerability in ${url} (${directive}): ${result.reasons.join(', ')}`;
                
                // 3. Use the robust file writing logic
                try {
                    const data = await fs.readFile(issuesFilePath, 'utf8');
                    if (!data.includes(issue)) {
                        await fs.appendFile(issuesFilePath, `\n${issue}`);
                        console.log('Issue logged:', issue);
                    }
                } catch (err) {
                    // If the file doesn't exist, create it with the first issue.
                    if (err.code === 'ENOENT') {
                        await fs.writeFile(issuesFilePath, issue, 'utf8');
                        console.log('Issue logged:', issue);
                    } else {
                        console.error('Error updating issues file:', err.message);
                    }
                }
                issues.push(url);
            }
        } catch (err) {
            console.error(`Error checking URL ${url}:`, err.message);
        }
    }
    return issues;
}

module.exports = { checkJsonpUrls };