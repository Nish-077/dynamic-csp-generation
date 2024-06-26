const {getSrcFromScripts} = require('./crawl.js')
const {test, expect} = require('@jest/globals')

test('getSRCFromScripts list of absolute urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="https://github.com/Nish-077/webcrawler-csp"></script>
        </body>
    </html>
    `
    const baseURL = "https://github.com"
    const actual = getSrcFromScripts(inputHTMLBody, baseURL)
    const expected = ["https://github.com/Nish-077/webcrawler-csp"]
    expect(actual).toEqual(expected)
})

test('getSRCFromScripts list of relative urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="/Nish-077/webcrawler-csp"></script>
        </body>
    </html>
    `
    const baseURL = "https://github.com"
    const actual = getSrcFromScripts(inputHTMLBody, baseURL)
    const expected = ["https://github.com/Nish-077/webcrawler-csp"]
    expect(actual).toEqual(expected)
})

test('getSRCFromScripts list of mixed urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="/Nish-077/path1"></script>
            <script src="https://github.com/Nish-077/path2"></script>
        </body>
    </html>
    `
    const baseURL = "https://github.com"
    const actual = getSrcFromScripts(inputHTMLBody, baseURL)
    const expected = [
        "https://github.com/Nish-077/path1",
        "https://github.com/Nish-077/path2",
    ]
    expect(actual).toEqual(expected)
})

test('getSRCFromScripts exclude invalid urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="invalid"></script>
            <script src="https://github.com/Nish-077/path2"></script>
        </body>
    </html>
    `
    const baseURL = "https://github.com"
    const actual = getSrcFromScripts(inputHTMLBody, baseURL)
    const expected = [
        "https://github.com/Nish-077/path2",
    ]
    expect(actual).toEqual(expected)
})