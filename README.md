# OAuth-app

This project is a simple Node.js-based implementation of a 3-legged OAuth workflow, designed specifically for the X Developer API (formerly Twitter API). It demonstrates how to handle OAuth authentication for third-party access, securely requesting and storing access tokens using PostgreSQL as the database. The app runs an HTTP/2 server with SSL/TLS for secure connections and features a set of routes to facilitate the OAuth process.

## Features
- **3-legged OAuth Workflow**: Implements the OAuth 1.0a flow to authenticate users through the X API, managing tokens and secrets securely.
- **HTTP/2 Support**: Uses SSL/TLS for secure communication with a high-performance HTTP/2 server.
- **Token Management**: Stores OAuth tokens and secrets in a PostgreSQL database, allowing for secure retrieval and verification.
- **Simple API Routes**:
    - /auth/start: Initiates the OAuth flow by obtaining a request token from X API.
    - /auth/callback: Handles the callback from X API and completes the OAuth flow by exchanging the request token for an access token.

## Prerequisites
- **Node.js (v14 or later)**: Ensure you have Node.js installed to run this application.
- **PostgreSQL**: The database used to store OAuth tokens and secrets.
- **SSL/TLS Certificates**: You will need SSL certificate files (`privkey.pem` and `fullchain.pem`) to secure the server with HTTPS.
- **Git**: For cloning and managing the repository.

## Routes Overview
This application handles the following routes to support the OAuth process using a 3-Step or 3-Legged model that may be considered as POST GET POST and could be abstracted to more or fewer actual application routes that should really be viewed as simply begin, authorize, end it’s really that simple:

- /auth/init: Initializes the OAuth process, storing the tokens in the PostgreSQL database. This route is handled internally to request a token and begins the OAuth workflow.
- /auth/start: Initiates the OAuth request through an internal route presenting the token and a simple form for the next route and redirecting the user to the X API’s authorization page.
- /auth/authorize: Returns the OAuth token recently stored according to the X developer portal recommendation and performs the actual redirection to the X API’s authorization page.
- /auth/callback: Handles the callback from the X API after the user has authorized the app and exchanges the request token for an access token.

## Usage

After cloning the repository, you can use the OAuth app server as follows:

1. **Start the Server**:  
   To start the server, navigate to the project directory and run:  
   `node server.js`

   The server will listen on port 3000. This is an unprivileged port, meaning you won't need root privileges to run it.

2. **Environment Variables**:  
   Set up the required environment variables before running the application. These variables are critical for authenticating with the X Developer API and configuring database access and the provided `.env` file is included only for reference these can and should be securely set from terminal but if you wish to use the file consider `npm install dot-env` and require:

## Configure Environment Variables

CONSUMER_KEY: Your X API consumer key.

CONSUMER_SECRET: Your X API consumer secret.

CALLBACK_URL: The URL where the X API redirects after authorization (e.g., https://yourdomain.com:3000/auth/callback).

CERTIFICATE_URL: The FQDN of your SSL certificate.


Set the following environment variables on your system:

`export CONSUMER_KEY="your_consumer_key_value"`
`export CONSUMER_SECRET="your_consumer_secret_value"`
`export CALLBACK_URL="https://localhost:3000/auth/callback"`
`export CERTIFICATE_URL="localhost"`

You can add them to your `.bashrc` or `.bash_profile` for persistent use.

3. **Database Setup**:  
   Ensure you have a PostgreSQL database set up with the following configuration:

   - Database: app
   - Username: app
   - Password: app

The app.sql file included in the project contains the necessary schema for the tokens table used to store OAuth credentials.

Run the `app.sql` file to create the required table:

`CREATE TABLE IF NOT EXISTS tokens (  
    id SERIAL PRIMARY KEY,                  -- Auto-incremented primary key  
    oauth_token VARCHAR(255) NOT NULL,      -- OAuth token  
    oauth_token_secret VARCHAR(255) NOT NULL,  -- OAuth token secret  
    oauth_verifier VARCHAR(255)             -- OAuth verifier (NULL initially, populated after callback)  
);`

Grant necessary privileges to the app user:

`GRANT ALL PRIVILEGES ON SEQUENCE tokens_id_seq TO app;`
`GRANT ALL PRIVILEGES ON TABLE tokens TO app;`

4. **Start Server with OAuth Flow**:  
   Start the Node.js server and begin the OAuth process by visiting:  
   `https://localhost:3000/auth/start`


## Recommendations

- Know your SSL setup this is crucial and intentionally requires some attention with a cheap or free virtual machine free ddns and free SSL available there is every option available to you for a proper secure http2 request exchange

- Check your firewall and network ensure your network stack has dual-stack support check if your network interfaces are correctly configured for IPv4 and IPv6 mapping `ip addr show` and check the test route `/app/path/here` using `npm run test`

- Make use of `nohup` output logging and when you encounter a critical task check your SSL setup and your firewall because while simple this node app is made for http2 and https that means valid domains and http2 with https are expected and required




## Required Modules

This app requires the following Node.js modules:

- express: Simplifies route handling and middleware in Node.js.

- fs: File system module for handling SSL certificate files.

- http2: Node's HTTP/2 support for serving secure connections.

- oauth-1.0a: OAuth 1.0a signature and token management.

- crypto: For secure token handling.

- got: Handles one HTTP request internally and you must make sure to use got@11 for the first release of this app

- pg: PostgreSQL client for querying and storing OAuth data.

- path: Path management for assets and files.

- http2-express-bridge: Bridges HTTP/2 functionality with the Express framework.

You can install them by running:

`npm install`

## License

This project is licensed under the [Apache 2.0 License](LICENSE).
