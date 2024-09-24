const express = require('express');
const fs = require('fs');
const http2 = require('http2');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
const got = require('got'); // Replacing axios with got for HTTP/2 support
const { Pool } = require('pg');
const path = require('path');
const http2Express = require('http2-express-bridge');

const app = http2Express(express);

// Use environment variables for the OAuth configuration
const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;
const callbackUrl = process.env.CALLBACK_URL;
const domain = process.env.CERTIFICATE_URL;

// Step 1: OAuth setup
const oauth = OAuth({
    consumer: {
        key: consumerKey,
        secret: consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
});

// Load server settings from server.json
const config = JSON.parse(fs.readFileSync('./server.json', 'utf8'));
const port = config.port || 3000;

// PostgreSQL pool setup
const db = new Pool({
    host: config.host,
    port: config.peer,
    database: config.database,
    user: config.username,
    password: config.password
});

// Function to log messages to nohup.out
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${message}`);
}

// Step 2: Initiate OAuth (POST Request to get the Token)
app.post('/auth/init', async (req, res) => {
    const request_data = {
        url: 'https://api.x.com/oauth/request_token',
        method: 'POST',
        data: { oauth_callback: callbackUrl }
    };

    const token = { key: '', secret: '' };

    try {
        log('Sending request for OAuth token...');
        const response = await got.post(request_data.url, {
            headers: oauth.toHeader(oauth.authorize(request_data, token)),
            http2: true, // Enable HTTP/2
        });

        log('Received response for OAuth token.');
        const requestTokenData = new URLSearchParams(response.body);
        const requestToken = requestTokenData.get('oauth_token');
        const requestTokenSecret = requestTokenData.get('oauth_token_secret');

        // Store tokens in the database
        await db.query('INSERT INTO tokens (oauth_token, oauth_token_secret) VALUES ($1, $2)', [requestToken, requestTokenSecret]);

        // Respond with success and token
        log('Stored OAuth token successfully.');
        res.json({ oauth_token: requestToken });
    } catch (error) {
        log(`Error triggering /auth/init: ${error.message}`);
        res.status(500).send('Failed to initiate OAuth process.');
    }
});

// Step 3: Landing page (GET request)
app.get('/auth/start', async (req, res) => {
    try {
        log('Initiating OAuth process from /auth/start...');
        const response = await got.post(`https://${domain}:${port}/auth/init`, { http2: true });
        const { oauth_token } = JSON.parse(response.body);

        // Send the token to the authorization form as a hidden field
        res.send(`
            <h1>Success!</h1>
            <p>Your OAuth Token: ${oauth_token}</p>
            <form action="/auth/authorize" method="GET">
                <input type="hidden" name="oauth_token" value="${oauth_token}" />
                <button type="submit">Authorize</button>
            </form>
        `);
    } catch (error) {
        log(`Error triggering /auth/init from /auth/start: ${error.message}`);
        res.status(500).send('Failed to start the OAuth process.');
    }
});

// Step 4: Authorization page
app.get('/auth/authorize', async (req, res) => {
    log('Redirecting to OAuth authorization page...');
    const oauth_token = req.query.oauth_token;  // Get token from the form submission

    // Now use the oauth_token passed from /auth/start
    const requestToken = await db.query('SELECT oauth_token FROM tokens WHERE oauth_token = $1', [oauth_token]);

    if (requestToken.rows.length > 0) {
        const token = requestToken.rows[0].oauth_token;

        // Redirect to the authorization URL with the correct token
        res.redirect(`https://api.x.com/oauth/authorize?oauth_token=${token}`);
    } else {
        res.status(404).send('OAuth token not found.');
    }
});

// Step 5: Handle callback and exchange Request Token for Access Token
app.get('/auth/callback', async (req, res) => {
    const { oauth_token, oauth_verifier } = req.query;

    log('Handling callback to exchange Request Token for Access Token...');
    // Update the token with the verifier
    await db.query('UPDATE tokens SET oauth_verifier = $1 WHERE oauth_token = $2', [oauth_verifier, oauth_token]);

    const request_data = {
        url: 'https://api.x.com/oauth/access_token',
        method: 'POST',
        data: {
            oauth_token: oauth_token,
            oauth_verifier: oauth_verifier
        }
    };

    const token = { key: oauth_token, secret: '' };

    try {
        const response = await got.post(request_data.url, {
            headers: oauth.toHeader(oauth.authorize(request_data, token)),
            http2: true,
        });

        log('Successfully fetched access token.');
        const accessTokenData = new URLSearchParams(response.body);
        const accessToken = accessTokenData.get('oauth_token');
        const accessTokenSecret = accessTokenData.get('oauth_token_secret');

        await db.query('UPDATE tokens SET oauth_token = $1, oauth_token_secret = $2 WHERE oauth_token = $3', [accessToken, accessTokenSecret, oauth_token]);

        res.json({ message: 'Authorized' });
    } catch (error) {
        log(`Error fetching access token: ${error.message}`);
        res.status(500).json({ message: 'Not Authorized' });
    }
});

// Options for http2.createSecureServer
const serverOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl/privkey.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl/fullchain.pem'))
};

// Create HTTP/2 secure server
const server = http2.createSecureServer(serverOptions, app);

server.listen(port, () => {
    log(`App running on https://localhost:${port}`);
});
