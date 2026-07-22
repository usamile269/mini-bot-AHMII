/**
 * Vercel Serverless Function — API Proxy
 * Forwards requests from Vercel (HTTPS) to bot server (HTTP)
 * Fixes mixed content issue
 */

const BOT_SERVER = process.env.BOT_SERVER || 'http://51.75.118.149:20204';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Build the target URL
    // Remove /api/proxy from the path to get the actual endpoint
    let targetPath = req.url.replace(/^\/api\/proxy/, '') || '/';
    
    // Forward query string
    const queryString = req.url.split('?')[1] || '';
    if (queryString) {
      targetPath += '?' + queryString;
    }

    const targetUrl = `${BOT_SERVER}${targetPath}`;

    // Fetch from bot server
    const fetchOpts = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Accept': 'application/json',
      },
    };

    // Forward body for POST/PUT
    if (req.body && (req.method === 'POST' || req.method === 'PUT')) {
      fetchOpts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, {
      ...fetchOpts,
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json().catch(() => ({ 
      error: 'Invalid response from bot server',
      status: response.status 
    }));

    res.status(response.status).json(data);

  } catch (error) {
    res.status(502).json({
      error: 'Cannot reach bot server',
      message: error.message || 'Connection failed',
      server: BOT_SERVER
    });
  }
};
