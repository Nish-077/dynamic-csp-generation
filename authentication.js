const {default: axios} = require('axios');
const {CookieJar} = require('tough-cookie');
const {wrapper} = require('axios-cookiejar-support');
const cheerio = require('cheerio');

const cookieJar = new CookieJar();
const axiosInstance = wrapper(axios.create({
    jar: cookieJar,
    withCredentials: true
}));

async function handleError(action, error) {
    console.error(`Error during ${action}: ${error.message}`);
    throw error;
}

async function accessProtectedPage(protectedUrl) {
    try {
        const response = await axiosInstance.get(protectedUrl);
        if (response.status === 200) {
            return response.data;
        }
        throw new Error('Failed to access protected page');
    } catch (error) {
        await handleError('protected page access', error);
    }
}

async function login(loginUrl, credentials) {
    try {
        const loginPageResponse = await axiosInstance.get(loginUrl);
        const $ = cheerio.load(loginPageResponse.data);
        const csrfToken = $('input[name="user_token"]').val();

        const response = await axiosInstance.post(
            loginUrl, 
            new URLSearchParams({
                ...credentials,
                user_token: csrfToken
            }).toString(),
            {
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }
        );

        if (response.status !== 200) {
            throw new Error('Login failed');
        }
    } catch (error) {
        await handleError('login', error);
    }
}

async function authenticate(currentURL) {
    const credentials = {
        username: 'admin',
        password: 'password'
    };
    
    const loginUrl = new URL('DVWA/login.php', currentURL).toString();
    
    try {
        await login(loginUrl, credentials);
        return await accessProtectedPage(currentURL);
    } catch (error) {
        await handleError('authentication', error);
    }
}

module.exports = { authenticate };