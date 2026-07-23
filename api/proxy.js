export const runtime = 'edge';

const BOT_SERVER = 'http://51.75.118.149:20204';

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }

  try {
    // Parse request URL
    const url = new URL(request.url);
    
    // Get the path after /api/proxy
    let targetPath = url.pathname.replace('/api/proxy', '') || '/';
    const queryStr = url.search;
    
    const targetUrl = `${BOT_SERVER}${targetPath}${queryStr}`;

    // Clone request headers but set proper content-type
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    headers.set('User-Agent', 'MiniAhmad-Edge-Proxy/1.0');
    
    if (request.headers.get('content-type')) {
      headers.set('Content-Type', request.headers.get('content-type'));
    }

    // Build fetch options
    const fetchOpts = {
      method: request.method,
      headers,
      signal: AbortSignal.timeout(30000)
    };

    // Forward body for POST/PUT
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        fetchOpts.body = body;
      }
    }

    // Make request to bot server
    const response = await fetch(targetUrl, fetchOpts);
    
    // Get response as text
    const responseText = await response.text();
    
    // Parse JSON if possible
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    // Return response with CORS headers
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Proxy Error',
      message: error.message,
      code: error.code || 'UNKNOWN'
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
