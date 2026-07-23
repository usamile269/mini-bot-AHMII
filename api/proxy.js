/**
 * Vercel Serverless Function — API Proxy
 * Forwards all requests to the bot server at 51.75.118.149:20204
 * URL is hardcoded to avoid env var issues
 */

const BOT_SERVER = 'http://51.75.118.149:20204';

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
    // Parse the path from request URL
    // e.g. /api/proxy/code?number=923044975027 -> /code?number=923044975027
    const parsedUrl = new URL(req.url, `http://localhost`);
    const rawPath = parsedUrl.pathname;
    const queryStr = parsedUrl.search;
    
    // Remove /api/proxy prefix
    const targetPath = rawPath.replace('/api/proxy', '') || '/';
    
    const targetUrl = `${BOT_SERVER}${targetPath}${queryStr}`;

    const opts = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MiniAhmad-Proxy/1.0',
      },
      signal: AbortSignal.timeout(30000)
    };

    // Forward body for POST/PUT requests
    if (req.body) {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (bodyStr) {
        opts.body = bodyStr;
        opts.headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
      }
    }

    const response = await fetch(targetUrl, opts);
    const rawText = await response.text();

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }

    res.status(response.status);
    res.json(data);

  } catch (error) {
    res.status(502).json({
      error: 'Proxy Error',
      message: error.message,
      code: error.code || 'UNKNOWN',
      targetServer: BOT_SERVER
    });
  }
};
