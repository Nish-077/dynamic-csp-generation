const {JSDOM} = require('jsdom')

function getSrcFromScripts(htmlBody, baseURL){
    const scriptURLS = []
    const dom = new JSDOM(htmlBody)
    const scriptElements = dom.window.document.querySelectorAll('script')

    for(const scriptElement of scriptElements){
        if (scriptElement.src.slice(0,1) === '/') {
            //relative
            try{
                const urlObj = new URL(`${baseURL}${scriptElement.src}`)
                scriptURLS.push(urlObj.href)
            } catch(err){
                console.log(`error with relative URL: ${err.message}`)
            }   
        }
        else{
            //absolute
            try{
                const urlObj = new URL(scriptElement.src)
                scriptURLS.push(urlObj.href)
            } catch(err){
                console.log(`error with absolute URL: ${err.message}`)
            }   
        }
    }
    return scriptURLS
}

module.exports = {
    getSrcFromScripts
}