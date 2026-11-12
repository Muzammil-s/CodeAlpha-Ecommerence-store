const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SEED_PRODUCTS = [
  { id: 'tshirt1', name: 'Classic Cotton Polo', category: 'Apparel', price: 29, stock: 24, rating: 4.7, description: 'Breathable combed cotton polo tailored for everyday wear.', badge: 'Bestseller' },
  { id: 'tshirt2', name: 'Heavyweight Oversized Hoodie', category: 'Apparel', price: 48, stock: 16, rating: 4.8, description: '400gsm brushed fleece hoodie with reinforced seams.', badge: 'New' },
  { id: 'tshirt3', name: 'Minimalist Henley Tee', category: 'Apparel', price: 24, stock: 30, rating: 4.5, description: 'Soft 3-button cotton henley in slate charcoal.', badge: '' },
  { id: 'shoe1', name: 'Stride Pro Running Shoes', category: 'Footwear', price: 78, stock: 14, rating: 4.8, description: 'Responsive EVA midsole with engineered mesh upper.', badge: 'Popular' },
  { id: 'shoe2', name: 'Urban Court Sneakers', category: 'Footwear', price: 86, stock: 11, rating: 4.6, description: 'Low-top leather sneakers with cushioned insole.', badge: '' },
  { id: 'shoe3', name: 'Trail Grip Hiking Boots', category: 'Footwear', price: 112, stock: 9, rating: 4.9, description: 'All-weather lug outsole built for rocky terrain.', badge: 'Top Rated' },
  { id: 'watch1', name: 'Chrono Steel Wristwatch', category: 'Watches', price: 145, stock: 8, rating: 4.9, description: 'Brushed 316L stainless steel case with sapphire crystal.', badge: 'Featured' },
  { id: 'watch2', name: 'Active Pulse Smartwatch', category: 'Watches', price: 165, stock: 13, rating: 4.7, description: 'AMOLED display with workout tracking and 7-day battery.', badge: 'New' },
  { id: 'watch3', name: 'Minimalist Field Watch', category: 'Watches', price: 92, stock: 19, rating: 4.6, description: 'Nylon strap field watch with 50m water resistance.', badge: '' },
  { id: 'bag1', name: 'Commuter 16" Laptop Pack', category: 'Bags', price: 58, stock: 20, rating: 4.8, description: 'Water-resistant ballistic nylon backpack with padded sleeve.', badge: 'Bestseller' },
  { id: 'bag2', name: 'Weekender Travel Duffel', category: 'Bags', price: 74, stock: 12, rating: 4.7, description: 'Cabin-sized travel bag with separate shoe compartment.', badge: '' },
  { id: 'bag3', name: 'Crossbody Tech Sling', category: 'Bags', price: 42, stock: 22, rating: 4.5, description: 'Compact everyday sling with RFID-shielded pocket.', badge: '' }
];

function createStore(dataFilePath) {
  const resolved = dataFilePath || path.join(__dirname, 'data', 'store.json');
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  function read() {
    if (!fs.existsSync(resolved)) {
      const initial = { users: [], products: SEED_PRODUCTS, orders: [] };
      fs.writeFileSync(resolved, JSON.stringify(initial, null, 2));
      return initial;
    }
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  }

  function write(data) {
    fs.writeFileSync(resolved, JSON.stringify(data, null, 2));
  }

  return {
    getProducts({ category, q, sort } = {}) {
      let list = [...read().products];
      if (category && category !== 'all') {
        list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      }
      if (q) {
        const needle = q.toLowerCase();
        list = list.filter((p) =>
          p.name.toLowerCase().includes(needle) ||
          p.description.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle)
        );
      }
      if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
      else if (sort === 'rating') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      return list;
    },
    getProductById(id) {
      return read().products.find((p) => p.id === id) || null;
    },
    createProduct(payload) {
      const db = read();
      const item = {
        id: 'prod-' + crypto.randomBytes(4).toString('hex'),
        name: String(payload.name || '').trim(),
        category: String(payload.category || 'Apparel').trim(),
        price: Number(payload.price),
        stock: Number(payload.stock ?? 10),
        rating: 4.5,
        description: String(payload.description || '').trim(),
        badge: String(payload.badge || 'New').trim(),
        createdAt: new Date().toISOString()
      };
      db.products.unshift(item);
      write(db);
      return item;
    },
    updateProduct(id, updates) {
      const db = read();
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      db.products[idx] = { ...db.products[idx], ...updates, id };
      write(db);
      return db.products[idx];
    },
    deleteProduct(id) {
      const db = read();
      const before = db.products.length;
      db.products = db.products.filter((p) => p.id !== id);
      if (db.products.length === before) return false;
      write(db);
      return true;
    },
    findUserByEmail(email) {
      return read().users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
    },
    findUserById(id) {
      return read().users.find((u) => u.id === id) || null;
    },
    createUser({ username, email, passwordHash, role = 'customer' }) {
      const db = read();
      const user = {
        id: 'usr-' + crypto.randomBytes(4).toString('hex'),
        username: String(username).trim(),
        email: String(email).trim().toLowerCase(),
        passwordHash,
        role,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      write(db);
      return user;
    },
    createOrder({ userId, customerName, shippingAddress, paymentMethod, items, promoCode }) {
      const db = read();
      let subtotal = 0;
      const lineItems = [];
      for (const reqItem of items) {
        const prod = db.products.find((p) => p.id === reqItem.productId);
        if (!prod) throw new Error(`Product ${reqItem.productId} not found`);
        const qty = Math.max(1, Number(reqItem.qty || 1));
        if (prod.stock < qty) throw new Error(`Insufficient stock for ${prod.name}`);
        prod.stock -= qty;
        subtotal += prod.price * qty;
        lineItems.push({ productId: prod.id, name: prod.name, price: prod.price, qty });
      }
      const discount = promoCode === 'SAVE10' ? Number((subtotal * 0.1).toFixed(2)) : 0;
      const shipping = subtotal >= 100 ? 0 : 8;
      const total = Number((subtotal - discount + shipping).toFixed(2));
      const order = {
        id: 'ORD-' + crypto.randomInt(100000, 999999),
        userId: userId || 'guest',
        customerName,
        shippingAddress,
        paymentMethod,
        items: lineItems,
        subtotal,
        discount,
        shipping,
        total,
        status: 'Confirmed',
        createdAt: new Date().toISOString()
      };
      db.orders.unshift(order);
      write(db);
      return order;
    },
    getOrdersForUser(userId) {
      return read().orders.filter((o) => o.userId === userId);
    }
  };
}

module.exports = { createStore, SEED_PRODUCTS };
