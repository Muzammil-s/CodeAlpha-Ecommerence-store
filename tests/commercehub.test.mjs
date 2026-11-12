import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createAppServer } = require('../backend/server.js');

function startTestServer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commercehub-test-'));
  const dataFilePath = path.join(tmpDir, 'store.json');
  const server = createAppServer({ dataFilePath, jwtSecret: 'test-secret-key' });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => {
              fs.rmSync(tmpDir, { recursive: true, force: true });
              done();
            });
          })
      });
    });
  });
}

test('health endpoint returns ok', async () => {
  const srv = await startTestServer();
  try {
    const res = await fetch(`${srv.baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  } finally {
    await srv.close();
  }
});

test('auth signup, login, and me sanitize passwordHash', async () => {
  const srv = await startTestServer();
  try {
    const signup = await fetch(`${srv.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Muzammil', email: 'test@example.com', password: 'Password123' })
    });
    assert.equal(signup.status, 201);
    const signupData = await signup.json();
    assert.ok(signupData.token);
    assert.equal(signupData.user.email, 'test@example.com');
    assert.equal(signupData.user.passwordHash, undefined);

    const login = await fetch(`${srv.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123' })
    });
    assert.equal(login.status, 200);
    const loginData = await login.json();
    assert.ok(loginData.token);
    assert.equal(loginData.user.passwordHash, undefined);

    const me = await fetch(`${srv.baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginData.token}` }
    });
    assert.equal(me.status, 200);
    const meData = await me.json();
    assert.equal(meData.user.username, 'Muzammil');
    assert.equal(meData.user.passwordHash, undefined);
  } finally {
    await srv.close();
  }
});

test('authenticated product CRUD and filter/sort queries', async () => {
  const srv = await startTestServer();
  try {
    const unauthCreate = await fetch(`${srv.baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Item', price: 20 })
    });
    assert.equal(unauthCreate.status, 401);

    const signup = await fetch(`${srv.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Seller', email: 'seller@example.com', password: 'Password123' })
    });
    const { token } = await signup.json();

    const created = await fetch(`${srv.baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: 'Mechanical Keyboard', category: 'Apparel', price: 110, stock: 5, description: 'Tactile keyboard' })
    });
    assert.equal(created.status, 201);
    const { product } = await created.json();
    assert.equal(product.name, 'Mechanical Keyboard');

    const listRes = await fetch(`${srv.baseUrl}/api/products?q=Mechanical`);
    const listData = await listRes.json();
    assert.equal(listData.products.length, 1);

    const del = await fetch(`${srv.baseUrl}/api/products/${product.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(del.status, 200);
  } finally {
    await srv.close();
  }
});

test('order checkout decrements stock, applies SAVE10 promo, and saves user order history', async () => {
  const srv = await startTestServer();
  try {
    const signup = await fetch(`${srv.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Buyer', email: 'buyer@example.com', password: 'Password123' })
    });
    const { token } = await signup.json();

    const beforeRes = await fetch(`${srv.baseUrl}/api/products/tshirt1`);
    const beforeProd = (await beforeRes.json()).product;

    const orderRes = await fetch(`${srv.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        customerName: 'Buyer One',
        shippingAddress: '42 Clifton Rd, Karachi',
        paymentMethod: 'Card',
        promoCode: 'SAVE10',
        items: [{ productId: 'tshirt1', qty: 2 }]
      })
    });
    assert.equal(orderRes.status, 201);
    const { order } = await orderRes.json();
    assert.equal(order.subtotal, 58);
    assert.equal(order.discount, 5.8);
    assert.equal(order.shipping, 8);
    assert.equal(order.total, 60.2);

    const afterRes = await fetch(`${srv.baseUrl}/api/products/tshirt1`);
    const afterProd = (await afterRes.json()).product;
    assert.equal(afterProd.stock, beforeProd.stock - 2);

    const mineRes = await fetch(`${srv.baseUrl}/api/orders/mine`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(mineRes.status, 200);
    const mineData = await mineRes.json();
    assert.equal(mineData.orders.length, 1);
    assert.equal(mineData.orders[0].id, order.id);
  } finally {
    await srv.close();
  }
});
