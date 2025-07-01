const currentScript = document.currentScript;
const nonce = currentScript.getAttribute('data-nonce');
const csp = currentScript.getAttribute('data-csp');

if (nonce && csp) {
    // FIX: Get both script and style whitelists from the CSP string
    const scriptSrcList = csp.match(/script-src\s+([^;]+)/)?.[1]?.split(/\s+/) || [];
    const styleSrcList = csp.match(/style-src\s+([^;]+)/)?.[1]?.split(/\s+/) || [];

    // FIX: A more robust whitelisting function that accepts the correct directive list
    const isWhitelisted = (url, directiveList) => {
        if (!url || !directiveList) return false;
        
        try {
            const link = new URL(url, window.location.origin);
            return directiveList.includes(link.origin) || 
                   (directiveList.includes("'self'") && link.origin === window.location.origin);
        } catch (e) {
            console.error("Could not parse URL for whitelisting:", url);
            return false;
        }
    };

    // FIX: The core logic to handle different element types correctly
    const setNonce = (element) => {
        if (element.tagName === 'SCRIPT') {
            const sourceUrl = element.src;
            if (sourceUrl) { // External script
                if (isWhitelisted(sourceUrl, scriptSrcList)) {
                    element.setAttribute('nonce', nonce);
                } else {
                    console.warn(`Blocked non-whitelisted SCRIPT source: ${sourceUrl}`);
                }
            } else { // Inline script
                element.setAttribute('nonce', nonce);
            }
        } else if (element.tagName === 'STYLE' || (element.tagName === 'LINK' && element.rel === 'stylesheet')) {
            const sourceUrl = element.href;
            if (sourceUrl) { // External stylesheet
                if (isWhitelisted(sourceUrl, styleSrcList)) {
                    element.setAttribute('nonce', nonce);
                } else {
                    console.warn(`Blocked non-whitelisted STYLE source: ${sourceUrl}`);
                }
            } else { // Inline style
                element.setAttribute('nonce', nonce);
            }
        }
    };

    // Patch DOM manipulation methods
    const patchMethod = (proto, method, handler) => {
        const original = proto[method];
        proto[method] = function(...args) {
            handler(args);
            return original.apply(this, args);
        };
    };

    // Handle dynamic content insertion from strings (e.g., innerHTML)
    const handleHTMLContent = (content) => {
        if (typeof content === 'string' && (content.includes('<script') || content.includes('<style'))) {
            const div = document.createElement('div');
            div.innerHTML = content;
            div.querySelectorAll('script, style, link[rel="stylesheet"]').forEach(setNonce);
            return div.innerHTML;
        }
        return content;
    };

    // Patch element manipulation methods
    ['appendChild', 'insertBefore', 'replaceChild'].forEach(method => {
        patchMethod(Element.prototype, method, ([element]) => {
            if (element) {
                setNonce(element);
                // Also check for any children if a fragment is being added
                if (element.querySelectorAll) {
                    element.querySelectorAll('script, style, link[rel="stylesheet"]').forEach(setNonce);
                }
            }
        });
    });

    // Patch document write methods
    ['write', 'writeln'].forEach(method => {
        patchMethod(Document.prototype, method, (args) => {
            args[0] = handleHTMLContent(args[0]);
        });
    });

} else {
    console.error('nonce/csp is not available for inline-handler');
}
