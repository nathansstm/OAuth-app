const express = require('express');
const { Pool } = require('pg');
const http2 = require('http2');
const path = require('path');
const fs = require('fs');
const http2Express = require('http2-express-bridge'); // Add this

// Load server settings from server.json
const config = JSON.parse(fs.readFileSync('./server.json', 'utf8'));

const db = new Pool({
    host: config.host,
    port: config.peer,  // Correcting this to port instead of peer
    database: config.database,
    user: config.username,
    password: config.password
});

const app = http2Express(express); // Use http2-express-bridge

const port = config.port || 3000;  // Port from server.json

// Test route to verify database connection
app.get('/app/path/here', async (req, res) => {
  try {
    // Simple query to verify connection
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Connection successful', timestamp: result.rows[0].now });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Connection failed', error: error.message });
  }
});

// Options for http2.createSecureServer (use actual paths for key and cert)
const serverOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl/privkey.pem')),    // Key file
  cert: fs.readFileSync(path.join(__dirname, 'ssl/fullchain.pem'))  // Certificate file
};

// Create HTTP/2 secure server
const server = http2.createSecureServer(serverOptions, app);

server.listen(port, () => {
  console.log(`App running on https://localhost:${port}`);
});
