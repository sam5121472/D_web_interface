// ============================================
// ADMIN DASHBOARD — backed by Supabase
// ------------------------------------------------
// Access control: the Admin link only appears for role === 'admin' in
// refreshAccountUI() (account.js), but that's just UI polish. The real
// enforcement is server-side: every insert/update/delete below goes
// through Postgres Row Level Security, which checks the signed-in
// user's row in `profiles` on every single request. Editing this page's
// JavaScript cannot grant anyone admin access — only the database can.
// ============================================

const LOW_STOCK_THRESHOLD = 5;

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

async function openAdminDashboard(){
  const user = getCurrentUser();
  if (!user){
    showToast('Sign in as an admin to view the dashboard.');
    openAuthOverlay();
    return;
  }
  if (user.role !== 'admin'){
    showToast('Access restricted — admin accounts only.');
    return;
  }
  adminOverlay.classList.add('open');
  adminOverlay.setAttribute('aria-hidden', 'false');

  await Promise.all([
    renderAdminMetrics(),
    renderAdminOrders(),
    renderInventory(),
    renderAdminPromoCodes(),
    renderDeliverySettings()
  ]);
}

function closeAdminDashboard(){
  adminOverlay.classList.remove('open');
  adminOverlay.setAttribute('aria-hidden', 'true');
}

document.getElementById('navLinkAdmin').addEventListener('click', (e) => { e.preventDefault(); openAdminDashboard(); });
document.getElementById('mobileAdminBtn').addEventListener('click', (e) => { e.preventDefault(); openAdminDashboard(); });
document.getElementById('adminClose').addEventListener('click', closeAdminDashboard);

// ---------- METRICS ----------
let cachedOrders = [];

async function renderAdminMetrics(){
  cachedOrders = await getAllOrders();
  const revenue = cachedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const lowStockCount = liveProducts.filter(p => p.stock <= LOW_STOCK_THRESHOLD).length;

  document.getElementById('metricRevenue').textContent = formatMoney(revenue);
  document.getElementById('metricOrders').textContent = cachedOrders.length;
  document.getElementById('metricLowStock').textContent = lowStockCount;
}

// ---------- ORDER MANAGEMENT ----------
// Customer names come from the order's own snapshot address (order.address.fullName)
// rather than a join to profiles, since a real admin dashboard shouldn't need
// broad read access to every customer's profile just to label an order.
function customerLabelFor(order){
  if (!order.userId) return 'Guest';
  return (order.address && order.address.fullName) || 'Registered customer';
}

async function renderAdminOrders(){
  const orders = cachedOrders.length ? cachedOrders : await getAllOrders();
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
      <td>${customerLabelFor(o)}</td>
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

async function updateOrderStatus(orderId, newStatus){
  const { error } = await sb.from('orders').update({ status: newStatus }).eq('id', orderId);
  if (error){
    showToast('Could not update that order — try again.');
    return;
  }
  const order = cachedOrders.find(o => o.id === orderId);
  if (order) order.status = newStatus;
  showToast(`Order #${orderId} marked as ${newStatus}.`);
}

// ---------- INVENTORY (products table) ----------
function refreshCategoryDatalist(){
  const dl = document.getElementById('categoryOptions');
  if (!dl) return;
  dl.innerHTML = getCategories().map(c => `<option value="${c}"></option>`).join('');
}

async function renderInventory(){
  refreshCategoryDatalist();
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
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const priceInput = list.querySelector(`.inv-price-input[data-id="${id}"]`);
      const stockInput = list.querySelector(`.inv-stock-input[data-id="${id}"]`);
      const newPrice = Math.max(0, parseFloat(priceInput.value) || 0);
      const newStock = Math.max(0, parseInt(stockInput.value, 10) || 0);

      btn.disabled = true;
      const { error } = await sb.from('products')
        .update({ price_value: newPrice, stock: newStock })
        .eq('id', id);
      btn.disabled = false;

      if (error){
        showToast('Could not save that product — try again.');
        return;
      }

      await refreshCatalog();
      await renderInventory();
      await renderAdminMetrics();
      renderDrawer();

      showToast('Product updated.');
    });
  });

  list.querySelectorAll('.inv-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.id);
      const product = liveProducts.find(p => p.id === id);
      if (!product) return;
      if (!confirm(`Remove "${product.title}" from the store? This can't be undone.`)) return;

      btn.disabled = true;
      const { error } = await sb.from('products').delete().eq('id', id);
      btn.disabled = false;

      if (error){
        showToast('Could not remove that product — try again.');
        return;
      }

      await refreshCatalog();
      await renderInventory();
      await renderAdminMetrics();
      renderDrawer();
      showToast(`Removed "${product.title}" from the catalog.`);
    });
  });
}

// ---------- ADD NEW PRODUCT (with optional photo upload) ----------
async function uploadProductImage(file){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;
  const { data } = sb.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

document.getElementById('createProductBtn').addEventListener('click', async () => {
  const title = document.getElementById('newProductTitle').value.trim();
  const description = document.getElementById('newProductDesc').value.trim();
  const category = document.getElementById('newProductCategory').value.trim();
  const priceValue = Math.max(0, parseFloat(document.getElementById('newProductPrice').value) || 0);
  const stock = Math.max(0, parseInt(document.getElementById('newProductStock').value, 10) || 0);
  const imageUrlField = document.getElementById('newProductImage').value.trim();
  const imageFileField = document.getElementById('newProductImageFile');
  const errEl = document.getElementById('productCreateError');
  const btn = document.getElementById('createProductBtn');

  if (!title){
    errEl.textContent = 'Enter a product title.';
    errEl.style.display = 'block';
    return;
  }
  if (!category){
    errEl.textContent = 'Enter a category — type a new name to create a brand-new section.';
    errEl.style.display = 'block';
    return;
  }
  if (!priceValue){
    errEl.textContent = 'Enter a price greater than 0.';
    errEl.style.display = 'block';
    return;
  }
  const hasFile = imageFileField && imageFileField.files && imageFileField.files[0];
  if (!hasFile && !imageUrlField){
    errEl.textContent = 'Upload a photo or enter an image URL.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  btn.disabled = true;
  btn.textContent = 'Adding…';

  try {
    let imageUrl = imageUrlField;
    if (hasFile){
      imageUrl = await uploadProductImage(imageFileField.files[0]);
    }

    const { error } = await sb.from('products').insert({
      title,
      description: description || 'No description added yet.',
      price_value: priceValue,
      category,
      image_url: imageUrl,
      stock
    });
    if (error) throw error;

    ['newProductTitle','newProductDesc','newProductPrice','newProductStock','newProductImage','newProductCategory'].forEach(id => {
      document.getElementById(id).value = '';
    });
    if (imageFileField) imageFileField.value = '';

    await refreshCatalog();
    await renderInventory();
    await renderAdminMetrics();
    showToast(`"${title}" added to the catalog.`);
  } catch (err){
    console.error(err);
    errEl.textContent = 'Could not add that product — try again.';
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Product';
  }
});

// ============================================
// PROMO CODE MANAGEMENT (Admin Dashboard)
// ============================================
async function renderAdminPromoCodes(){
  const tbody = document.getElementById('adminPromoBody');
  const codes = await getPromoCodes();

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
        <button type="button" class="promo-status-toggle ${p.active ? 'is-active' : 'is-inactive'}" data-code="${p.code}" data-active="${p.active}">
          ${p.active ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.promo-status-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wasActive = btn.dataset.active === 'true';
      btn.disabled = true;
      const ok = await togglePromoActive(btn.dataset.code, wasActive);
      btn.disabled = false;
      if (!ok){ showToast('Could not update that code — try again.'); return; }
      await renderAdminPromoCodes();
      showToast(`Promo ${btn.dataset.code} is now ${wasActive ? 'inactive' : 'active'}.`);
    });
  });
}

document.getElementById('createPromoBtn').addEventListener('click', async () => {
  const code = document.getElementById('newPromoCode').value;
  const type = document.getElementById('newPromoType').value;
  const value = document.getElementById('newPromoValue').value;
  const errEl = document.getElementById('promoCreateError');
  const btn = document.getElementById('createPromoBtn');

  btn.disabled = true;
  const result = await createPromoCode({ code, type, value });
  btn.disabled = false;

  if (!result.success){
    errEl.textContent = result.reason;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  document.getElementById('newPromoCode').value = '';
  document.getElementById('newPromoValue').value = '';
  await renderAdminPromoCodes();
  showToast(`Promo code created.`);
});

// ============================================
// DELIVERY & TAX SETTINGS (Admin Dashboard)
// ============================================
let selectedDeliveryMode = 'flat';

async function renderDeliverySettings(){
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

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const deliveryCharge = Math.max(0, parseFloat(document.getElementById('deliveryChargeInput').value) || 0);
  const taxRate = Math.min(100, Math.max(0, parseFloat(document.getElementById('taxRateInput').value) || 0));
  const btn = document.getElementById('saveSettingsBtn');

  btn.disabled = true;
  const ok = await saveSettings({
    deliveryMode: selectedDeliveryMode,
    deliveryCharge,
    taxRate
  });
  btn.disabled = false;

  showToast(ok ? 'Delivery and tax settings saved.' : 'Could not save settings — try again.');
});
