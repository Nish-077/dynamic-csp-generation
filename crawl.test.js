const {getSrcFromScripts, normalizeURL, getSrcFromMedia, getSrcFromLinks} = require('./crawl.js');
const {test, expect} = require('@jest/globals');

test('normalizeURL removing ending slash', () => {
    const urlString = "https://www.httrack.com/";
    const actual = normalizeURL(urlString);
    const expected = "www.httrack.com";
    expect(actual).toEqual(expected);
});

test('getSRCFromScripts list of absolute urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="https://github.com/Nish-077/webcrawler-csp"></script>
        </body>
    </html>
    `;
    const baseURL = "https://github.com";
    const actual = getSrcFromScripts(inputHTMLBody, baseURL);
    const expected = ["https://github.com/Nish-077/webcrawler-csp"];
    expect(actual).toEqual(expected);
});

test('getSRCFromScripts list of relative urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="/Nish-077/webcrawler-csp"></script>
        </body>
    </html>
    `;
    const baseURL = "https://github.com";
    const actual = getSrcFromScripts(inputHTMLBody, baseURL);
    const expected = ["https://github.com/Nish-077/webcrawler-csp"];
    expect(actual).toEqual(expected);
});

test('getSRCFromScripts list of mixed urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="/Nish-077/path1"></script>
            <script src="https://github.com/Nish-077/path2"></script>
        </body>
    </html>
    `;
    const baseURL = "https://github.com";
    const actual = getSrcFromScripts(inputHTMLBody, baseURL);
    const expected = [
        "https://github.com/Nish-077/path1",
        "https://github.com/Nish-077/path2",
    ];
    expect(actual).toEqual(expected);
});

test('getSRCFromScripts with file urls', () => {
    const inputHTMLBody = `
    <html>
        <body>
            <p>this is just a para</p>
            <script src="image.jpg"></script>
            <script src="https://github.com/Nish-077/path2"></script>
        </body>
    </html>
    `;
    const baseURL = "https://github.com";
    const actual = getSrcFromScripts(inputHTMLBody, baseURL);
    const expected = [
        "https://github.com/image.jpg",
        "https://github.com/Nish-077/path2",
    ];
    expect(actual).toEqual(expected);
});

test('getSRCFromStyles relative', () => {
    const inputHTMLBody = `
    <html>
        <head>
            <link rel="stylesheet" href="image.css">
            <link rel="stylesheet" href="/Nish-077/path2">
        </head>
        <body>
            <p>this is just a para</p>
        </body>
    </html>
    `;
    const baseURL = "https://github.com";
    const actual = getSrcFromStyles(inputHTMLBody, baseURL);
    const expected = [
        "https://github.com/image.css",
        "https://github.com/Nish-077/path2",
    ];
    expect(actual).toEqual(expected);
})

test("getSrcFromMedia testing", () => {
    const inputHTMLBody = `
    <html>
        <body>
            <audio src="audio.wav">
            <video src="/Nish-077/video.mp4">
        </body>
    </html>
    `;
    const baseURL = "https://github.com";
    const actual = getSrcFromMedia(inputHTMLBody,baseURL);
    const expected = [
        "https://github.com/audio.wav",
        "https://github.com/Nish-077/video.mp4"
    ];
    expect(actual).toEqual(expected);
});