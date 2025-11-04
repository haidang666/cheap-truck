require('dotenv').config();
const express = require('express');
const axios = require('axios');
const url = require('url');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_HOST =  process.env.TARGET_HOST || 'http://44.74.144.227:9000';

// Middleware to handle raw body for PUT requests
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Mock PNG file data (1x1 pixel transparent PNG)
const fakeFileData = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

const wrapperCall = async (targetHostUrl, headers, fileBuffer, filename, contentType) => {
  let data = new FormData();
  data.append('file', fileBuffer, { filename: filename, contentType: contentType });

  let config = {
    method: 'put',
    maxBodyLength: Infinity,
    url: targetHostUrl,
    headers: { 
      ...data.getHeaders(),
      ...headers
    },
    data : data
  };

  console.log(targetHostUrl);
  console.log(data.getHeaders());

  const result = await axios.request(config)
  .then((response) => {
    console.log("response from faker", response.status);
    return response.status;
  })
  .catch((error) => {
    // console.log(error);
    return 0;
  });

  return result;
}

// PUT endpoint handler for /:bucket/:filename
app.put('/:bucket/:filename', async (req, res) => {
  try {
    const { filename, bucket } = req.params;
    
    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    // Construct the target URL with the same path and query parameters
    const targetUrl = `${TARGET_HOST}/${bucket}/${filename}`;
    
    // Forward all query parameters using URLSearchParams for proper encoding
    const parsedUrl = url.parse(req.url);
    const fullTargetUrl = parsedUrl.search ? `${targetUrl}${parsedUrl.search}` : targetUrl;
    
    // Validate that the final URL still points to the intended target host
    const finalUrl = new URL(fullTargetUrl);
    const targetHostUrl = new URL(TARGET_HOST);
    if (finalUrl.hostname !== targetHostUrl.hostname || finalUrl.port !== targetHostUrl.port) {
      return res.status(400).json({ error: 'Invalid target URL' });
    }

    console.log('Proxying');
    console.log(req.url);

    const headers = {
      ...(req.handlers && {'Content-Type': req.headers['content-type']}),
      ...(req.handlers && {'Content-Length': req.headers['content-length']}),
    }

    // Get the uploaded file from the request body
    const fileBuffer = req.body;
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const result = await wrapperCall(fullTargetUrl, headers, fileBuffer, filename, contentType);
    res.status(200).send(result);
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
