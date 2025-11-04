# cheap-truck

Express server that proxies PUT requests to S3-compatible storage.

## Overview

This server acts as a proxy for handling PUT requests with AWS S3 signature parameters. It receives PUT requests at the `/users/:filename` endpoint and forwards them to the configured S3-compatible storage server at `http://44.74.144.227:9000`.

## Features

- Handles PUT requests with AWS4-HMAC-SHA256 signed URLs
- Preserves all query parameters (X-Amz-Algorithm, X-Amz-Credential, X-Amz-Date, X-Amz-Expires, X-Amz-SignedHeaders, X-Amz-Signature)
- Forwards request body and content-type headers
- Error handling with appropriate status codes
- Health check endpoint

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

The server will start on port 3000 by default. You can change the port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## API Endpoints

### PUT /users/:filename

Proxies PUT requests to `http://44.74.144.227:9000/users/:filename` with all query parameters preserved.

**Example Request:**
```
PUT /users/eugicafort3thumbnail5wmp8h.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=rustfsadmin%2F20251103%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20251103T083654Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=xxx
Content-Type: image/jpeg
Body: [binary file data]
```

**Response:**
Returns the response from the target S3 server.

### GET /health

Health check endpoint that returns server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-04T07:29:00.000Z"
}
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## Target Server

The server proxies requests to: `http://44.74.144.227:9000`
