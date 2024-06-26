const {default: axios} = require('axios')
const {CookieJar} = require('tough-cookie')
const {wrapper} = require('axios-cookiejar-support')
const cheerio = require('cheerio')

const cookieJar = new CookieJar()

const axiosInstance = wrapper(axios.create({
    jar: cookieJar,
    withCredentials: true
}))

async function accessProtectedPage(protectedUrl) {
    try {
        const response = await axiosInstance.get(protectedUrl);

        if (response.status === 200) {
            console.log('Protected page content:', response.data);
        } else {
            console.log('Failed to access protected page');
        }
    } catch (error) {
        console.error(`Error accessing protected page: ${error.message}`);
    }
}

async function login(loginUrl, credentials) {
    try {
        let loginPageResponse = await axiosInstance.get(loginUrl)
        const $ = cheerio.load(loginPageResponse.data)
        
        const csrfToken = $('input[name="user_token"]').val()

        console.log("CSRF token: ", csrfToken)
        const dataWithCsrf = {
            ...credentials,
            'user_token': csrfToken,
        }

        const response = await axiosInstance.post(loginUrl, new URLSearchParams(dataWithCsrf).toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })

        if (response.status === 200) {
            console.log('Login successful')
        } else {
            console.log('Login failed')
        }

    } catch (error) {
        console.log(`Error during login: ${error.message}`)
    }
}


async function authenticate(currentURL){
    const credentials = {
        username: 'admin',
        password: 'password'
    }
    const Url = new URL(currentURL)
    Url.pathname = 'DVWA/login.php'
    const loginUrl = Url.toString()
    
    // console.log(loginUrl)
    try {
        await login(loginUrl, credentials);
        console.log('Cookies after login:', cookieJar.toJSON());
        await accessProtectedPage(currentURL);
        // return await accessProtectedPage(currentURL);
    } catch (err) {
        console.log(`error occured: ${err.message}`)
    }
}

module.exports = {
    authenticate
}