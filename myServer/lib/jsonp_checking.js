const fs = require('fs').promises;

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

        // Content type check
        if (contentType?.includes('application/javascript') || contentType?.includes('text/javascript')) {
            results.reasons.push('JavaScript content type detected');
        }

        // Function call pattern check
        const functionCallPattern = /^[\w$]+\s*\({.*}\)/;
        const variableAssignmentPattern = /^var\s+\w+\s*=\s*{.*}/;
        if (functionCallPattern.test(text) || variableAssignmentPattern.test(text)) {
            results.reasons.push('Potential callback pattern detected');
        }

        // Common callback parameter check
        const commonCallbacks = ['callback', 'jsonp', 'cb', 'json'];
        if (commonCallbacks.some(name => text.startsWith(`${name}(`))) {
            results.reasons.push('Common JSONP callback name detected');
        }

        // Dynamic function detection
        if (text.includes('new Function(') || text.includes('eval(')) {
            results.reasons.push('Dynamic code execution detected');
        }

        // JSON array wrapping check
        if (/^\[.*\]$/.test(text.trim())) {
            results.reasons.push('JSON array wrapping detected');
        }

        // Script tag injection check
        if (text.includes('<script') || text.includes('document.write')) {
            results.reasons.push('Script injection attempt detected');
        }

        results.isPotentialJSONP = results.reasons.length > 0;
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
                
                try {
                    const data = await fs.readFile('./issues.txt', 'utf8');
                    if (!data.includes(issue)) {
                        await fs.appendFile('./issues.txt', `\n${issue}`);
                        console.log('Issue logged:', issue);
                    }
                    issues.push(url);
                } catch (err) {
                    console.error('Error updating issues file:', err.message);
                }
            }
        } catch (err) {
            console.error(`Error checking URL ${url}:`, err.message);
        }
    }
    return issues;
}

module.exports = { checkJsonpUrls };