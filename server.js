const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_HOST = 'http://44.74.144.227:9000';

// Middleware to handle raw body for PUT requests
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// PUT endpoint handler for /users/:filename
app.put('/users/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Construct the target URL with the same path and query parameters
    const targetUrl = `${TARGET_HOST}/users/${filename}`;
    
    // Forward all query parameters
    const queryString = req.url.split('?')[1] || '';
    const fullTargetUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
    
    console.log(`Proxying PUT request to: ${fullTargetUrl}`);
    
    // Forward the request to the target server
    const response = await axios.put(fullTargetUrl, req.body, {
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/octet-stream',
        'Content-Length': req.headers['content-length']
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });
    
    // Send back the response from the target server
    res.status(response.status).send(response.data);
    console.log(`Request forwarded successfully with status: ${response.status}`);
    
  } catch (error) {
    console.error('Error forwarding request:', error.message);
    
    if (error.response) {
      // The target server responded with an error
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
