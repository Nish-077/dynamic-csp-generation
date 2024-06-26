const {JSDOM} = require('jsdom')

async function crawlPage(currentURL){
    console.log(`actively crawling: ${currentURL}`)

    try{
        const resp = await fetch(currentURL)

        if (resp.status > 399) {
            console.log(`error in fetch with status code: ${resp.status} on page: ${currentURL}`)
            return
        }
        
        const contentType = resp.headers.get("content-type")
        if (!contentType.includes("text/html")) {
            console.log(`non html content recieved, content type: ${contentType}, on page: ${currentURL}`)
        }

        console.log(await resp.text())
    } catch (err) {
        console.log(`error in fetch: ${err.message}, on page: ${currentURL}`)
    }
} 

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
    getSrcFromScripts,
    crawlPage
}