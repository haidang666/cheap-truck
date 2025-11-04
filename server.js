const express = require('express');
const axios = require('axios');
const url = require('url');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_HOST = 'http://44.74.144.227:9000';

// Middleware to handle raw body for PUT requests
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// PUT endpoint handler for /users/:filename
app.put('/users/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Construct the target URL with the same path and query parameters
    const targetUrl = `${TARGET_HOST}/users/${filename}`;
    
    // Forward all query parameters using URLSearchParams for proper encoding
    const parsedUrl = url.parse(req.url);
    const fullTargetUrl = parsedUrl.search ? `${targetUrl}${parsedUrl.search}` : targetUrl;
    
    // Validate that the final URL still points to the intended target host
    const finalUrl = new URL(fullTargetUrl);
    const targetHostUrl = new URL(TARGET_HOST);
    if (finalUrl.hostname !== targetHostUrl.hostname || finalUrl.port !== targetHostUrl.port) {
      return res.status(400).json({ error: 'Invalid target URL' });
    }
    
    console.log(`Proxying PUT request to: ${fullTargetUrl}`);
    
    // Forward the request to the target server
    const response = await axios.put(fullTargetUrl, req.body, {
      headers: {
        'content-type': req.headers['content-type'] || 'application/octet-stream'
      },
      maxBodyLength: 50 * 1024 * 1024, // 50mb
      maxContentLength: 50 * 1024 * 1024 // 50mb
    });
    
    // Send back the response from the target server
    res.status(response.status).send(response.data);
    console.log(`Request forwarded successfully with status: ${response.status}`);
    
  } catch (error) {
    console.error('Error forwarding request:', error.message);
    
    if (error.response) {
      // The target server responded with an error
      // Set content-type to prevent XSS if error contains HTML
      if (error.response.headers['content-type']) {
        res.set('content-type', error.response.headers['content-type']);
      }
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      res.status(502).json({ error: 'Bad Gateway - No response from target server' });
    } else {
      // Something else happened
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Express server listening on port ${PORT}`);
  console.log(`Proxying PUT requests to ${TARGET_HOST}`);
});

module.exports = app;
