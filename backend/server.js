const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createStore } = require('./dataStore');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, keyHex] = String(storedHash || '').split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function signJwt(payload, secret, ttlSec = 86400) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSec })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(body);
}

function sanitizeUser(u) {
  return { id: u.id, username: u.username, email: u.email, role: u.role };
}

function createAppServer({ dataFilePath, jwtSecret } = {}) {
  const store = createStore(dataFilePath);
  const secret = jwtSecret || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

  function getAuthUser(req) {
    const hdr = req.headers.authorization || '';
    if (!hdr.startsWith('Bearer ')) return null;
    const claims = verifyJwt(hdr.slice(7), secret);
    if (!claims) return null;
    return store.findUserById(claims.id);
  }

  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { status: 'ok', service: 'CommerceHub API' });
      }

      if ((pathname === '/api/auth/signup' || pathname === '/api/auth/register') && req.method === 'POST') {
        const { username, email, password } = await parseBody(req);
        if (!username || !email || !password || String(password).length < 6) {
          return sendJson(res, 400, { message: 'Username, valid email, and password (min 6 chars) are required.' });
        }
        if (store.findUserByEmail(email)) {
          return sendJson(res, 409, { message: 'An account with this email already exists.' });
        }
        const user = store.createUser({ username, email, passwordHash: hashPassword(password) });
        const token = signJwt({ id: user.id, email: user.email }, secret);
        return sendJson(res, 201, { message: 'Account created.', token, user: sanitizeUser(user) });
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password } = await parseBody(req);
        const user = store.findUserByEmail(email);
        if (!user || !verifyPassword(String(password || ''), user.passwordHash)) {
          return sendJson(res, 401, { message: 'Invalid email or password.' });
        }
        const token = signJwt({ id: user.id, email: user.email }, secret);
        return sendJson(res, 200, { message: 'Login successful.', token, user: sanitizeUser(user) });
      }

      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Unauthorized' });
        return sendJson(res, 200, { user: sanitizeUser(user) });
      }

      if (pathname === '/api/products' && req.method === 'GET') {
        const products = store.getProducts({
          category: parsedUrl.searchParams.get('category'),
          q: parsedUrl.searchParams.get('q'),
          sort: parsedUrl.searchParams.get('sort')
        });
        return sendJson(res, 200, { products });
      }

      if (pathname === '/api/products' && req.method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Authentication required to add products.' });
        const body = await parseBody(req);
        if (!body.name || !(Number(body.price) > 0)) {
          return sendJson(res, 400, { message: 'Product name and positive price are required.' });
        }
        const product = store.createProduct(body);
        return sendJson(res, 201, { product });
      }

      if (pathname.startsWith('/api/products/')) {
        const id = pathname.slice('/api/products/'.length);
        if (req.method === 'GET') {
          const prod = store.getProductById(id);
          return prod ? sendJson(res, 200, { product: prod }) : sendJson(res, 404, { message: 'Product not found' });
        }
        if (req.method === 'PUT') {
          const user = getAuthUser(req);
          if (!user) return sendJson(res, 401, { message: 'Authentication required.' });
          const updated = store.updateProduct(id, await parseBody(req));
          return updated ? sendJson(res, 200, { product: updated }) : sendJson(res, 404, { message: 'Product not found' });
        }
        if (req.method === 'DELETE') {
          const user = getAuthUser(req);
          if (!user) return sendJson(res, 401, { message: 'Authentication required.' });
          return store.deleteProduct(id) ? sendJson(res, 200, { deleted: true }) : sendJson(res, 404, { message: 'Product not found' });
        }
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const user = getAuthUser(req);
        const body = await parseBody(req);
        if (!body.customerName || !body.shippingAddress || !Array.isArray(body.items) || !body.items.length) {
          return sendJson(res, 400, { message: 'Customer name, shipping address, and at least one item are required.' });
        }
        const order = store.createOrder({
          userId: user ? user.id : 'guest',
          customerName: String(body.customerName).trim(),
          shippingAddress: String(body.shippingAddress).trim(),
          paymentMethod: String(body.paymentMethod || 'Card').trim(),
          items: body.items,
          promoCode: String(body.promoCode || '').trim().toUpperCase()
        });
        return sendJson(res, 201, { order });
      }

      if (pathname === '/api/orders/mine' && req.method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { message: 'Login required to view your order history.' });
        return sendJson(res, 200, { orders: store.getOrdersForUser(user.id) });
      }

      if (pathname.startsWith('/api/')) {
        return sendJson(res, 404, { message: 'API route not found' });
      }

      // Serve static frontend files
      const target = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const fullPath = path.resolve(FRONTEND_DIR, target);
      if (!fullPath.startsWith(FRONTEND_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not Found');
      }
      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(fullPath).pipe(res);
    } catch (err) {
      sendJson(res, 400, { message: err.message || 'Bad request' });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`[CommerceHub] Server running on http://127.0.0.1:${port}`);
  });
}

module.exports = { createAppServer };
