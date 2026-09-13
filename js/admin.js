// ============================================
  // ADMIN DASHBOARD
  // ------------------------------------------------
  // Access control: only a signed-in user with role === 'admin' can open
  // this panel. Non-admins (including guests) are safely redirected away —
  // the Admin nav link is also hidden entirely unless an admin is signed in.
  // NOTE: this check runs in the browser, same as everything else in this
  // demo. Real admin-only access must ALSO be enforced server-side (every
  // API call re-checked against the session), since a client-side check
  // alone can be bypassed by anyone editing the page's own JavaScript.
  // ============================================

  const LOW_STOCK_THRESHOLD = 5;

  // Small toast for access-denied feedback
  function showToast(message){
    let toast = document.getElementById('appToast');
    if (!toast){
      toast = document.createElement('div');
      toast.id = 'appToast';
      toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:var(--bg-raised);border:1px solid var(--rule-strong);color:var(--ink);padding:14px 22px;font-size:13px;font-family:var(--body);z-index:500;opacity:0;pointer-events:none;transition:opacity .3s ease;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2600);
  }

  const adminOverlay = document.getElementById('adminOverlay');

  function openAdminDashboard(){
    const user = getCurrentUser();
    if (!user){
      showToast('Sign in as an admin to view the dashboard.');
      openAuthOverlay();
      return;
    }
    if (user.role !== 'admin'){
      // Safely redirect non-admin accounts away — don't open the panel.
      showToast('Access restricted — admin accounts only.');
      return;
    }
    renderAdminMetrics();
    renderAdminOrders();
    renderInventory();
    renderAdminPromoCodes();
    renderDeliverySettings();
    adminOverlay.classList.add('open');
    adminOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeAdminDashboard(){
    adminOverlay.classList.remove('open');
    adminOverlay.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('navLinkAdmin').addEventListener('click', (e) => { e.preventDefault(); openAdminDashboard(); });
  document.getElementById('mobileAdminBtn').addEventListener('click', (e) => { e.preventDefault(); openAdminDashboard(); });
  document.getElementById('adminClose').addEventListener('click', closeAdminDashboard);

  // ---------- METRICS ----------
  function renderAdminMetrics(){
    const orders = getAllOrders();
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const lowStockCount = liveProducts.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length;

    document.getElementById('metricRevenue').textContent = formatMoney(revenue);
    document.getElementById('metricOrders').textContent = orders.length;
    document.getElementById('metricLowStock').textContent = lowStockCount;
  }

  // ---------- ORDER MANAGEMENT ----------
  function customerLabelFor(userId){
    if (!userId) return 'Guest';
    const user = getUsers().find(u => u.id === userId);
    return user ? user.fullName : 'Deleted account';
  }

  function renderAdminOrders(){
    const orders = getAllOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const tbody = document.getElementById('adminOrdersBody');
    const empty = document.getElementById('adminOrdersEmpty');
    const table = tbody.closest('table');

    if (orders.length === 0){
      table.style.display = 'none';
      empty.style.display = 'block';
      return;
    }
    table.style.display = 'table';
    empty.style.display = 'none';

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td class="order-id-cell">#${o.id}</td>
        <td>${customerLabelFor(o.userId)}</td>
        <td>${new Date(o.createdAt).toLocaleDateString()}</td>
        <td>${formatMoney(o.total)}</td>
        <td>
          <select class="status-select" data-order-id="${o.id}">
            <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => {
        updateOrderStatus(sel.dataset.orderId, sel.value);
      });
    });
  }

  function updateOrderStatus(orderId, newStatus){
    const orders = getAllOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    order.status = newStatus;
    writeJSON(DB_ORDERS_KEY, orders);
    showToast(`Order #${orderId} marked as ${newStatus}.`);
  }

  // ---------- INVENTORY TRACKING ----------
  function renderInventory(){
    const list = document.getElementById('inventoryList');
    list.innerHTML = liveProducts.map(p => {
      const statusClass = p.stock === 0 ? 'out-of-stock' : (p.stock <= LOW_STOCK_THRESHOLD ? 'low-stock' : 'in-stock');
      const statusLabel = p.stock === 0 ? 'Out of stock' : (p.stock <= LOW_STOCK_THRESHOLD ? 'Low stock' : 'In stock');
      return `
        <div class="inventory-row" data-id="${p.id}">
          <img class="inv-thumb" src="${p.imageUrl}" alt="${p.title}">
          <div>
            <div class="inv-title">${p.title}</div>
            <div class="inv-category">${p.category}</div>
            <div class="inv-fields">
              <label class="inv-field">
                <span>Price (Rs.)</span>
                <input type="number" min="0" step="1" class="inv-price-input" data-id="${p.id}" value="${p.priceValue}">
              </label>
              <label class="inv-field">
                <span>Stock</span>
                <input type="number" min="0" step="1" class="inv-stock-input" data-id="${p.id}" value="${p.stock}">
              </label>
              <button class="inv-save-btn" type="button" data-id="${p.id}">Save</button>
              <button class="inv-delete-btn" type="button" data-id="${p.id}">Remove</button>
            </div>
            <div class="inv-status-line ${statusClass}">${statusLabel}</div>
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.inv-save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const priceInput = list.querySelector(`.inv-price-input[data-id="${id}"]`);
        const stockInput = list.querySelector(`.inv-stock-input[data-id="${id}"]`);
        const newPrice = Math.max(0, parseFloat(priceInput.value) || 0);
        const newStock = Math.max(0, parseInt(stockInput.value, 10) || 0);

        const product = liveProducts.find(p => p.id === id);
        if (!product) return;
        product.priceValue = newPrice;
        product.price = formatMoney(newPrice);
        product.stock = newStock;
        persistLiveProducts();

        // Refresh everything that depends on product data
        renderInventory();
        renderAdminMetrics();
        const activeFilter = document.querySelector('.filter-pill.active');
        renderProducts(activeFilter ? activeFilter.dataset.filter : 'all');
        renderDrawer();

        btn.classList.add('saved');
        btn.textContent = 'Saved ✓';
        setTimeout(() => { btn.classList.remove('saved'); btn.textContent = 'Save'; }, 1000);
      });
    });

    list.querySelectorAll('.inv-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.id);
        const product = liveProducts.find(p => p.id === id);
        if (!product) return;
        if (!confirm(`Remove "${product.title}" from the store? This can't be undone.`)) return;

        liveProducts = liveProducts.filter(p => p.id !== id);
        persistLiveProducts();

        renderInventory();
        renderAdminMetrics();
        const activeFilter = document.querySelector('.filter-pill.active');
        renderProducts(activeFilter ? activeFilter.dataset.filter : 'all');
        renderDrawer();
        showToast(`Removed "${product.title}" from the catalog.`);
      });
    });
  }

  // ---------- ADD NEW PRODUCT ----------
  document.getElementById('createProductBtn').addEventListener('click', () => {
    const title = document.getElementById('newProductTitle').value.trim();
    const description = document.getElementById('newProductDesc').value.trim();
    const category = document.getElementById('newProductCategory').value;
    const priceValue = Math.max(0, parseFloat(document.getElementById('newProductPrice').value) || 0);
    const stock = Math.max(0, parseInt(document.getElementById('newProductStock').value, 10) || 0);
    const imageUrl = document.getElementById('newProductImage').value.trim();
    const errEl = document.getElementById('productCreateError');

    if (!title){
      errEl.textContent = 'Enter a product title.';
      errEl.style.display = 'block';
      return;
    }
    if (!priceValue){
      errEl.textContent = 'Enter a price greater than 0.';
      errEl.style.display = 'block';
      return;
    }
    if (!imageUrl){
      errEl.textContent = 'Enter an image URL (a local asset path or a full https:// link).';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    const nextId = liveProducts.length ? Math.max(...liveProducts.map(p => p.id)) + 1 : 1;
    liveProducts.push({
      id: nextId,
      title,
      description: description || 'No description added yet.',
      price: formatMoney(priceValue),
      priceValue,
      category,
      imageUrl,
      stock
    });
    persistLiveProducts();

    ['newProductTitle','newProductDesc','newProductPrice','newProductStock','newProductImage'].forEach(id => {
      document.getElementById(id).value = '';
    });

    renderInventory();
    renderAdminMetrics();
    const activeFilter = document.querySelector('.filter-pill.active');
    renderProducts(activeFilter ? activeFilter.dataset.filter : 'all');
    showToast(`"${title}" added to the catalog.`);
  });

  // ============================================
  // MOCK DATA SEEDING (runs once, for demo purposes)
  // ------------------------------------------------
  // Seeds one admin account, a few customer accounts, and a handful of
  // orders so the Admin Dashboard has something to show immediately.
  // ============================================
  (function seedMockData(){
    if (localStorage.getItem('de_seeded_v1')) return;

    const seedIds = ['u_admin_seed', 'u_seed_1', 'u_seed_2', 'u_seed_3'];
    const users = getUsers().filter(u => !seedIds.includes(u.id));

    const adminUser = {
      id: 'u_admin_seed',
      fullName: 'Store Admin',
      email: 'samzyhassan7@gmail.com',
      passwordHash: toyHash('admin123'),
      role: 'admin',
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
    };

    const mockCustomers = [
      { id: 'u_seed_1', fullName: 'Ayesha Raza', email: 'ayesha@example.com', passwordHash: toyHash('password123'), role: 'customer', createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
      { id: 'u_seed_2', fullName: 'Bilal Ahmed', email: 'bilal@example.com', passwordHash: toyHash('password123'), role: 'customer', createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
      { id: 'u_seed_3', fullName: 'Fatima Noor', email: 'fatima@example.com', passwordHash: toyHash('password123'), role: 'customer', createdAt: new Date(Date.now() - 20 * 86400000).toISOString() }
    ];

    saveUsers([...users, adminUser, ...mockCustomers]);

    const seedOrders = [
      { id: 'DE-100201', userId: 'u_seed_1', items: [{ productId: 1, title: 'Himalayan Shilajit Resin — 20g', qty: 1, lineTotal: 3500 }], address: { fullName: 'Ayesha Raza', address: '12 Jinnah Road', city: 'Skardu', postal: '16100', country: 'Pakistan', phone: '03001234567', email: 'ayesha@example.com' }, paymentMethod: 'jazzcash', transactionId: 'TXN-100200111', subtotal: 3500, total: 3500, status: 'Delivered', daysAgo: 21 },
      { id: 'DE-100202', userId: 'u_seed_2', items: [{ productId: 3, title: 'Sea Buckthorn Dried Berries', qty: 2, lineTotal: 4400 }], address: { fullName: 'Bilal Ahmed', address: '45 Airport Road', city: 'Gilgit', postal: '15100', country: 'Pakistan', phone: '03451234567', email: 'bilal@example.com' }, paymentMethod: 'card', transactionId: 'TXN-100200222', subtotal: 4400, total: 4400, status: 'Shipped', daysAgo: 9 },
      { id: 'DE-100203', userId: 'u_seed_3', items: [{ productId: 2, title: 'Shilajit Resin — Twin Jar Set', qty: 1, lineTotal: 6500 }], address: { fullName: 'Fatima Noor', address: '8 Alamdar Chowk', city: 'Skardu', postal: '16100', country: 'Pakistan', phone: '03211234567', email: 'fatima@example.com' }, paymentMethod: 'easypaisa', transactionId: 'TXN-100200333', subtotal: 6500, total: 6500, status: 'Processing', daysAgo: 3 },
      { id: 'DE-100204', userId: 'u_seed_1', items: [{ productId: 4, title: 'Wild Sea Buckthorn — Whole Berries', qty: 1, lineTotal: 2500 }], address: { fullName: 'Ayesha Raza', address: '12 Jinnah Road', city: 'Skardu', postal: '16100', country: 'Pakistan', phone: '03001234567', email: 'ayesha@example.com' }, paymentMethod: 'raast', transactionId: 'TXN-100200444', subtotal: 2500, total: 2500, status: 'Delivered', daysAgo: 33 },
      { id: 'DE-100205', userId: null, items: [{ productId: 1, title: 'Himalayan Shilajit Resin — 20g', qty: 2, lineTotal: 7000 }], address: { fullName: 'Guest Checkout', address: 'N/A', city: 'Karachi', postal: '74000', country: 'Pakistan', phone: '03331234567', email: 'guest@example.com' }, paymentMethod: 'card', transactionId: 'TXN-100200555', subtotal: 7000, total: 7000, status: 'Shipped', daysAgo: 6 },
      { id: 'DE-100206', userId: 'u_seed_2', items: [{ productId: 3, title: 'Sea Buckthorn Dried Berries', qty: 1, lineTotal: 2200 }], address: { fullName: 'Bilal Ahmed', address: '45 Airport Road', city: 'Gilgit', postal: '15100', country: 'Pakistan', phone: '03451234567', email: 'bilal@example.com' }, paymentMethod: 'jazzcash', transactionId: 'TXN-100200666', subtotal: 2200, total: 2200, status: 'Processing', daysAgo: 1 }
    ].map(o => {
      const { daysAgo, ...rest } = o;
      return { ...rest, createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString() };
    });

    writeJSON(DB_ORDERS_KEY, seedOrders);

    // Nudge a couple of products into low-stock / out-of-stock states for the demo
    const p2 = liveProducts.find(p => p.id === 2);
    const p4 = liveProducts.find(p => p.id === 4);
    if (p2) p2.stock = 4;
    if (p4) p4.stock = 0;
    persistLiveProducts();

    localStorage.setItem('de_seeded_v1', '1');
  })();

  // One-time, surgical migration for anyone who already ran an earlier
  // build: fixes the seeded admin's email without touching orders,
  // stock levels, or anything else that may have been edited since.
  (function fixAdminEmail(){
    if (localStorage.getItem('de_admin_email_fixed_v1')) return;
    const users = getUsers();
    const admin = users.find(u => u.id === 'u_admin_seed');
    if (admin && admin.email !== 'samzyhassan7@gmail.com'){
      admin.email = 'samzyhassan7@gmail.com';
      saveUsers(users);
    }
    localStorage.setItem('de_admin_email_fixed_v1', '1');
  })();

  // ============================================
  // PROMO CODE MANAGEMENT (Admin Dashboard)
  // ============================================
  function renderAdminPromoCodes(){
    const tbody = document.getElementById('adminPromoBody');
    const codes = getPromoCodes().slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (codes.length === 0){
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--slate-faint);">No promo codes yet — create one below.</td></tr>`;
      return;
    }

    tbody.innerHTML = codes.map(p => `
      <tr>
        <td class="order-id-cell">${p.code}</td>
        <td>${p.type === 'percentage' ? 'Percentage' : 'Flat'}</td>
        <td>${p.type === 'percentage' ? p.value + '%' : formatMoney(p.value)}</td>
        <td>
          <button type="button" class="promo-status-toggle ${p.active ? 'is-active' : 'is-inactive'}" data-code="${p.code}">
            ${p.active ? 'Active' : 'Inactive'}
          </button>
        </td>
        <td></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.promo-status-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        togglePromoActive(btn.dataset.code);
        renderAdminPromoCodes();
        showToast(`Promo ${btn.dataset.code} is now ${btn.classList.contains('is-active') ? 'inactive' : 'active'}.`);
      });
    });
  }

  document.getElementById('createPromoBtn').addEventListener('click', () => {
    const code = document.getElementById('newPromoCode').value;
    const type = document.getElementById('newPromoType').value;
    const value = document.getElementById('newPromoValue').value;
    const errEl = document.getElementById('promoCreateError');

    const result = createPromoCode({ code, type, value });
    if (!result.success){
      errEl.textContent = result.reason;
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    document.getElementById('newPromoCode').value = '';
    document.getElementById('newPromoValue').value = '';
    renderAdminPromoCodes();
    showToast(`Promo code created.`);
  });

  // ============================================
  // DELIVERY & TAX SETTINGS (Admin Dashboard)
  // ============================================
  let selectedDeliveryMode = 'flat';

  function renderDeliverySettings(){
    const settings = getSettings();
    selectedDeliveryMode = settings.deliveryMode;

    document.querySelectorAll('.delivery-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === selectedDeliveryMode);
    });

    const chargeField = document.getElementById('deliveryChargeField');
    chargeField.classList.toggle('disabled', selectedDeliveryMode === 'free');

    document.getElementById('deliveryChargeInput').value = settings.deliveryCharge;
    document.getElementById('taxRateInput').value = settings.taxRate;
  }

  document.querySelectorAll('.delivery-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedDeliveryMode = btn.dataset.mode;
      document.querySelectorAll('.delivery-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('deliveryChargeField').classList.toggle('disabled', selectedDeliveryMode === 'free');
    });
  });

  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    const deliveryCharge = Math.max(0, parseFloat(document.getElementById('deliveryChargeInput').value) || 0);
    const taxRate = Math.min(100, Math.max(0, parseFloat(document.getElementById('taxRateInput').value) || 0));

    saveSettings({
      deliveryMode: selectedDeliveryMode,
      deliveryCharge,
      taxRate
    });

    showToast('Delivery and tax settings saved.');
  });

