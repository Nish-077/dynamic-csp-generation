const {test, expect} = require('@jest/globals')
const {checkUrl} = require('./url_checking');

test('checkUrls testing', async () => {
    const url = "http://wagslane.dev";
    const actual = await checkUrl(url);
    const expected = 1;

    expect(actual).toEqual(expected);
});