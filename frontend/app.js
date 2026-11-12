(() => {
  const FALLBACK_PRODUCTS = [
    { id: 'tshirt1', name: 'Classic Cotton Polo', category: 'Apparel', price: 29, stock: 24, rating: 4.7, description: 'Breathable combed cotton polo tailored for everyday wear.', badge: 'Bestseller' },
    { id: 'tshirt2', name: 'Heavyweight Oversized Hoodie', category: 'Apparel', price: 48, stock: 16, rating: 4.8, description: '400gsm brushed fleece hoodie with reinforced seams.', badge: 'New' },
    { id: 'shoe1', name: 'Stride Pro Running Shoes', category: 'Footwear', price: 78, stock: 14, rating: 4.8, description: 'Responsive EVA midsole with engineered mesh upper.', badge: 'Popular' },
    { id: 'shoe2', name: 'Trail Grip Hiking Boots', category: 'Footwear', price: 112, stock: 9, rating: 4.9, description: 'All-weather lug outsole built for rocky terrain.', badge: 'Top Rated' },
    { id: 'watch1', name: 'Chrono Steel Wristwatch', category: 'Watches', price: 145, stock: 8, rating: 4.9, description: 'Brushed 316L stainless steel case with sapphire crystal.', badge: 'Featured' },
    { id: 'watch2', name: 'Active Pulse Smartwatch', category: 'Watches', price: 165, stock: 13, rating: 4.7, description: 'AMOLED display with workout tracking and 7-day battery.', badge: 'New' },
    { id: 'bag1', name: 'Commuter 16" Laptop Pack', category: 'Bags', price: 58, stock: 20, rating: 4.8, description: 'Water-resistant ballistic nylon backpack with padded sleeve.', badge: 'Bestseller' },
    { id: 'bag2', name: 'Weekender Travel Duffel', category: 'Bags', price: 74, stock: 12, rating: 4.7, description: 'Cabin-sized travel bag with separate shoe compartment.', badge: '' }
  ];

  const CATEGORY_SVG = {
    Apparel: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.6"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>',
    Footwear: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="1.6"><path d="M4 16v-3a2 2 0 012-2h2l3-4 4 3 4 2a2 2 0 011 1.7V16a2 2 0 01-2 2H6a2 2 0 01-2-2z"/><path d="M4 18h16"/></svg>',
    Watches: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="1.6"><circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13.5 13.5"/><path d="M9 6V2h6v4M9 18v4h6v-4"/></svg>',
    Bags: '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.6"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7V5a3 3 0 016 0v2"/></svg>'
  };

  let apiOnline = false;
  let products = [];
  let activeCategory = 'all';
  let activePromo = '';
  let authMode = 'login';

  const getToken = () => localStorage.getItem('ch_token');
  const getUser = () => {
    try { return JSON.parse(localStorage.getItem('ch_user') || 'null'); } catch { return null; }
  };
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem('ch_cart') || '[]'); } catch { return []; }
  };
  const saveCart = (cart) => localStorage.setItem('ch_cart', JSON.stringify(cart));

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2400);
  }

  async function apiFetch(url, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  async function loadProducts() {
    const q = document.getElementById('search-input').value.trim();
    const sort = document.getElementById('sort-select').value;
    if (apiOnline) {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.set('category', activeCategory);
      if (q) params.set('q', q);
      if (sort !== 'featured') params.set('sort', sort);
      const data = await apiFetch(`/api/products?${params.toString()}`);
      products = data.products;
    } else {
      const localStored = JSON.parse(localStorage.getItem('ch_demo_products') || 'null') || FALLBACK_PRODUCTS;
      products = localStored.filter((p) => {
        if (activeCategory !== 'all' && p.category !== activeCategory) return false;
        if (q && !(`${p.name} ${p.description} ${p.category}`).toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
      if (sort === 'price-asc') products.sort((a, b) => a.price - b.price);
      if (sort === 'price-desc') products.sort((a, b) => b.price - a.price);
      if (sort === 'rating') products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    document.getElementById('stat-products').textContent = products.length;
    renderProducts();
  }

  function renderProducts() {
    const grid = document.getElementById('product-grid');
    if (!products.length) {
      grid.innerHTML = '<p class="muted">No products match your search criteria.</p>';
      return;
    }
    grid.innerHTML = '';
    const user = getUser();
    products.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-art">
          ${p.badge ? `<span class="card-badge">${p.badge}</span>` : ''}
          ${CATEGORY_SVG[p.category] || CATEGORY_SVG.Apparel}
        </div>
        <div class="card-meta"><span>${p.category}</span><span>★ ${p.rating || 4.6} · Stock: ${p.stock}</span></div>
        <h3></h3>
        <p></p>
        <div class="card-foot">
          <strong class="price">$${Number(p.price).toFixed(2)}</strong>
          <div class="card-actions"></div>
        </div>
      `;
      card.querySelector('h3').textContent = p.name;
      card.querySelector('p').textContent = p.description;
      const actions = card.querySelector('.card-actions');
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-primary';
      addBtn.textContent = p.stock > 0 ? 'Add' : 'Out of Stock';
      addBtn.disabled = p.stock <= 0;
      addBtn.addEventListener('click', () => addToCart(p));
      actions.append(addBtn);

      if (user) {
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-ghost';
        delBtn.textContent = 'Del';
        delBtn.title = 'Remove SKU';
        delBtn.addEventListener('click', () => deleteProduct(p.id));
        actions.append(delBtn);
      }
      grid.append(card);
    });
  }

  function addToCart(product) {
    const cart = getCart();
    const existing = cart.find((i) => i.productId === product.id);
    if (existing) existing.qty += 1;
    else cart.push({ productId: product.id, name: product.name, price: product.price, qty: 1 });
    saveCart(cart);
    renderCart();
    toast(`Added ${product.name} to bag`);
  }

  function renderCart() {
    const cart = getCart();
    const count = cart.reduce((s, i) => s + i.qty, 0);
    document.getElementById('cart-count').textContent = count;

    const list = document.getElementById('cart-items');
    if (!cart.length) {
      list.innerHTML = '<p class="muted">Your bag is empty. Add items from the catalog to check out.</p>';
    } else {
      list.innerHTML = '';
      cart.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'cart-row';
        row.innerHTML = `
          <div><strong></strong><div><small>$${Number(item.price).toFixed(2)} each</small></div></div>
          <div class="qty-box">
            <button class="qty-btn" data-d="-1">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-d="1">+</button>
            <button class="qty-btn" data-rem="1" title="Remove">&times;</button>
          </div>
        `;
        row.querySelector('strong').textContent = item.name;
        row.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
          item.qty = Math.max(1, item.qty + Number(b.dataset.d));
          saveCart(cart);
          renderCart();
        }));
        row.querySelector('[data-rem]').addEventListener('click', () => {
          saveCart(cart.filter((c) => c.productId !== item.productId));
          renderCart();
        });
        list.append(row);
      });
    }

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const discount = activePromo === 'SAVE10' ? subtotal * 0.1 : 0;
    const shipping = subtotal === 0 || subtotal >= 100 ? 0 : 8;
    const total = Math.max(0, subtotal - discount + shipping);

    document.getElementById('sum-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('sum-discount').textContent = `-$${discount.toFixed(2)}`;
    document.getElementById('sum-shipping').textContent = shipping === 0 && subtotal > 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    document.getElementById('sum-total').textContent = `$${total.toFixed(2)}`;
  }

  async function deleteProduct(id) {
    if (apiOnline) {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    } else {
      const list = (JSON.parse(localStorage.getItem('ch_demo_products') || 'null') || FALLBACK_PRODUCTS).filter((p) => p.id !== id);
      localStorage.setItem('ch_demo_products', JSON.stringify(list));
    }
    toast('Product removed');
    loadProducts();
  }

  function updateAuthUI() {
    const user = getUser();
    const btn = document.getElementById('btn-auth');
    btn.textContent = user ? `${user.username} (Sign Out)` : 'Sign In';
  }

  async function init() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        apiOnline = true;
        document.getElementById('api-badge').textContent = 'Express/Node API Connected';
      } else throw new Error();
    } catch {
      apiOnline = false;
      document.getElementById('api-badge').textContent = 'Static Browser Demo Mode';
    }
    updateAuthUI();
    renderCart();
    await loadProducts();
  }

  document.getElementById('category-pills').addEventListener('click', (e) => {
    if (!e.target.dataset.cat) return;
    activeCategory = e.target.dataset.cat;
    document.querySelectorAll('#category-pills .pill').forEach((p) => p.classList.toggle('active', p.dataset.cat === activeCategory));
    loadProducts();
  });
  document.getElementById('search-input').addEventListener('input', loadProducts);
  document.getElementById('sort-select').addEventListener('change', loadProducts);

  document.getElementById('btn-cart').addEventListener('click', () => { document.getElementById('cart-drawer').hidden = false; });
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
    document.getElementById(b.dataset.close).hidden = true;
  }));

  document.getElementById('btn-apply-promo').addEventListener('click', () => {
    activePromo = document.getElementById('promo-input').value.trim().toUpperCase();
    renderCart();
    toast(activePromo === 'SAVE10' ? 'SAVE10 applied (10% off)!' : 'Promo code invalid (try SAVE10)');
  });

  document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cart = getCart();
    const status = document.getElementById('checkout-status');
    if (!cart.length) { status.textContent = 'Add at least one item before checking out.'; return; }

    const payload = {
      customerName: document.getElementById('chk-name').value.trim(),
      shippingAddress: document.getElementById('chk-address').value.trim(),
      paymentMethod: document.getElementById('chk-payment').value,
      promoCode: activePromo,
      items: cart.map((c) => ({ productId: c.productId, qty: c.qty }))
    };

    try {
      let order;
      if (apiOnline) {
        const data = await apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
        order = data.order;
      } else {
        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const discount = activePromo === 'SAVE10' ? subtotal * 0.1 : 0;
        const shipping = subtotal >= 100 ? 0 : 8;
        order = {
          id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
          ...payload,
          items: cart,
          total: Number((subtotal - discount + shipping).toFixed(2)),
          status: 'Confirmed',
          createdAt: new Date().toISOString()
        };
        const saved = JSON.parse(localStorage.getItem('ch_demo_orders') || '[]');
        saved.unshift(order);
        localStorage.setItem('ch_demo_orders', JSON.stringify(saved));
      }
      saveCart([]);
      renderCart();
      await loadProducts();
      status.textContent = `Order ${order.id} confirmed ($${order.total.toFixed(2)})!`;
      toast(`Order ${order.id} placed!`);
    } catch (err) {
      status.textContent = err.message;
    }
  });

  document.getElementById('btn-auth').addEventListener('click', () => {
    if (getUser()) {
      localStorage.removeItem('ch_token');
      localStorage.removeItem('ch_user');
      updateAuthUI();
      renderProducts();
      toast('Signed out');
      return;
    }
    document.getElementById('auth-modal').hidden = false;
  });

  document.getElementById('tab-login').addEventListener('click', () => {
    authMode = 'login';
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-signup').classList.remove('active');
    document.getElementById('auth-username').hidden = true;
    document.getElementById('auth-submit').textContent = 'Sign In';
    document.getElementById('auth-title').textContent = 'Sign In to CommerceHub';
  });

  document.getElementById('tab-signup').addEventListener('click', () => {
    authMode = 'signup';
    document.getElementById('tab-signup').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('auth-username').hidden = false;
    document.getElementById('auth-submit').textContent = 'Create Account';
    document.getElementById('auth-title').textContent = 'Create CommerceHub Account';
  });

  document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value.trim() || email.split('@')[0];
    const msg = document.getElementById('auth-msg');
    try {
      if (apiOnline) {
        const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const data = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ username, email, password }) });
        localStorage.setItem('ch_token', data.token);
        localStorage.setItem('ch_user', JSON.stringify(data.user));
      } else {
        localStorage.setItem('ch_token', 'demo-session');
        localStorage.setItem('ch_user', JSON.stringify({ id: 'demo', username, email }));
      }
      document.getElementById('auth-modal').hidden = true;
      updateAuthUI();
      renderProducts();
      toast(`Welcome, ${username}!`);
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  document.getElementById('btn-manage').addEventListener('click', () => {
    if (!getUser()) {
      document.getElementById('auth-modal').hidden = false;
      toast('Sign in to manage store catalog');
      return;
    }
    document.getElementById('manage-modal').hidden = false;
  });

  document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('new-name').value.trim(),
      category: document.getElementById('new-cat').value,
      price: Number(document.getElementById('new-price').value),
      stock: Number(document.getElementById('new-stock').value),
      description: document.getElementById('new-desc').value.trim()
    };
    try {
      if (apiOnline) {
        await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        const list = JSON.parse(localStorage.getItem('ch_demo_products') || 'null') || [...FALLBACK_PRODUCTS];
        list.unshift({ id: 'prod-' + Date.now(), ...payload, rating: 4.8, badge: 'New' });
        localStorage.setItem('ch_demo_products', JSON.stringify(list));
      }
      e.target.reset();
      document.getElementById('manage-modal').hidden = true;
      await loadProducts();
      toast('Product added to catalog!');
    } catch (err) {
      document.getElementById('manage-msg').textContent = err.message;
    }
  });

  document.getElementById('btn-orders').addEventListener('click', async () => {
    const listEl = document.getElementById('orders-list');
    document.getElementById('orders-modal').hidden = false;
    try {
      let orders = [];
      if (apiOnline) {
        if (!getToken()) { listEl.innerHTML = '<p class="muted">Sign in to view account order history.</p>'; return; }
        const data = await apiFetch('/api/orders/mine');
        orders = data.orders;
      } else {
        orders = JSON.parse(localStorage.getItem('ch_demo_orders') || '[]');
      }
      listEl.innerHTML = orders.length
        ? orders.map((o) => `<div class="order-item"><strong>${o.id}</strong> · ${o.status} · <strong>$${Number(o.total).toFixed(2)}</strong><div>${o.customerName} — ${o.shippingAddress}</div></div>`).join('')
        : '<p class="muted">No orders placed in this session yet.</p>';
    } catch (err) {
      listEl.innerHTML = `<p class="muted">${err.message}</p>`;
    }
  });

  init();
})();
