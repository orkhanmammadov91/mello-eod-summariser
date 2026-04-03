const https = require('https');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  if (!ANTHROPIC_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
    return;
  }

  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => {
        data += chunk.toString();
      });
      proxyRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.status(proxyRes.statusCode).json(parsed);
        } catch (e) {
          res.status(500).json({ error: 'Failed to parse API response', raw: data });
        }
      });
    });

    proxyReq.on('error', (err) => {
      res.status(500).json({ error: err.message });
    });

    proxyReq.write(body);
    proxyReq.end();
  });
}
