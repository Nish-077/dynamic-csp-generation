const currentScript = document.currentScript;
const nonce = currentScript.getAttribute('data-nonce');
const csp = currentScript.getAttribute('data-csp');

const scriptSrcList = csp.match(/script-src\s+([^;]+)/)[1].split(/\s+/);

if (nonce && csp) {
    const isWhitelisted = (url) => {
        if (url === 'inline') {
          return true;
        }
        const link = document.createElement('a');
        link.href = url;
        return scriptSrcList.includes(link.origin) || scriptSrcList.includes("'self'") && link.origin === window.location.origin;
      };
      

      const setNonce = (element) => {
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
          if (isWhitelisted(element.src || element.href)) {
            element.setAttribute('nonce', nonce);
          } else {
            console.warn(`Blocked attempt to add a script or style from a non-whitelisted source: ${element.src || element.href || 'inline'}`);
          }
        }
      };
      

    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function (element) {
        setNonce(element);
        return originalAppendChild.call(this, element);
    };

    const originalInsertBefore = Element.prototype.insertBefore;
    Element.prototype.insertBefore = function (newNode, referenceNode) {
        setNonce(newNode);
        return originalInsertBefore.call(this, newNode, referenceNode);
    };

    const originalReplaceChild = Element.prototype.replaceChild;
    Element.prototype.replaceChild = function (newChild, oldChild) {
        setNonce(newChild);
        return originalReplaceChild.call(this, newChild, oldChild);
    };

    const originalWrite = document.write;
    document.write = function (content) {
        if (typeof content === 'string' && (content.includes('<script') || content.includes('<style'))) {
            const div = document.createElement('div');
            div.innerHTML = content;
            div.querySelectorAll('script, style').forEach(setNonce);
            content = div.innerHTML;
        }
        return originalWrite.apply(this, arguments);
    };

    const originalWriteln = document.writeln;
    document.writeln = function (content) {
        if (typeof content === 'string' && (content.includes('<script') || content.includes('<style'))) {
            const div = document.createElement('div');
            div.innerHTML = content;
            div.querySelectorAll('script, style').forEach(setNonce);
            content = div.innerHTML;
        }
        return originalWriteln.apply(this, arguments);
    };
}
else{
    console.error('nonce\csp is not available');
}
