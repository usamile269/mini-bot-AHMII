/**
 * Vercel Serverless Function — API Proxy
 * Forwards requests from Vercel (HTTPS) to bot server (HTTP)
 * Uses Node.js native http module for reliable HTTP forwarding
 */

const BOT_SERVER = process.env.BOT_SERVER || 'http://51.75.118.149:20204';

module.exports = async (req, res) => {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse the path: /api/proxy/code -> /code
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let targetPath = urlObj.pathname.replace(/^\/api\/proxy/, '') || '/';
    const queryString = urlObj.search || '';
    const targetUrl = `${BOT_SERVER}${targetPath}${queryString}`;

    // Build fetch options
    const fetchOpts = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Vercel-Proxy/1.0'
      }
    };

    // Forward body
    if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
      fetchOpts.body = typeof req.body === 'object' 
        ? JSON.stringify(req.body) 
        : req.body;
    }

    // Make the request to bot server
    const response = await fetch(targetUrl, {
      ...fetchOpts,
      signal: AbortSignal.timeout(30000)
    });

    // Get response as text first (safer than json)
    const rawText = await response.text();
    
    // Try to parse as JSON
    let responseData;
    try {
      responseData = JSON.parse(rawText);
    } catch (parseErr) {
      responseData = { raw: rawText, note: 'Non-JSON response from bot' };
    }

    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('Proxy Error:', error.message, error.stack);
    res.status(502).json({
      error: 'Proxy connection failed',
      message: error.message,
      hint: 'Check BOT_SERVER env var and bot server status'
    });
  }
};
