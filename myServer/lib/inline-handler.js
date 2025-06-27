const currentScript = document.currentScript;
const nonce = currentScript.getAttribute('data-nonce');
const csp = currentScript.getAttribute('data-csp');

if (nonce && csp) {
    const scriptSrcList = csp.match(/script-src\s+([^;]+)/)?.[1]?.split(/\s+/) || [];

    const isWhitelisted = (url) => {
        if (url === 'inline') return true;
        if (!url) return false;
        
        const link = document.createElement('a');
        link.href = url;
        return scriptSrcList.includes(link.origin) || 
               (scriptSrcList.includes("'self'") && link.origin === window.location.origin);
    };

    const setNonce = (element) => {
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
            if (isWhitelisted(element.src || element.href)) {
                element.setAttribute('nonce', nonce);
            } else {
                console.warn(`Blocked non-whitelisted source: ${element.src || element.href || 'inline'}`);
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

    // Handle dynamic content insertion
    const handleHTMLContent = (content) => {
        if (typeof content === 'string' && (content.includes('<script') || content.includes('<style'))) {
            const div = document.createElement('div');
            div.innerHTML = content;
            div.querySelectorAll('script, style').forEach(setNonce);
            return div.innerHTML;
        }
        return content;
    };

    // Patch element manipulation methods
    ['appendChild', 'insertBefore', 'replaceChild'].forEach(method => {
        patchMethod(Element.prototype, method, ([element]) => setNonce(element));
    });

    // Patch document write methods
    ['write', 'writeln'].forEach(method => {
        patchMethod(Document.prototype, method, ([content]) => {
            arguments[0] = handleHTMLContent(content);
        });
    });
} else {
    console.error('nonce/csp is not available');
}
