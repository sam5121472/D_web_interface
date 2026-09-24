// ============================================
// PRODUCT CATALOG — backed by the Supabase `products` table
// ------------------------------------------------
// liveProducts is loaded from the database on page load and re-loaded
// after any admin add/edit/delete, so the storefront, cart, and admin
// panel are always looking at the same live data.
//
// Categories are NOT hardcoded anywhere — the filter pills below are
// generated from whatever categories currently exist in the database.
// Add a product with a brand-new category in the Admin Dashboard and a
// new pill/section appears here automatically; remove the last product
// in a category and its pill disappears. That's what makes "add/remove
// sections for new products" work without touching any code.
// ============================================

let liveProducts = [];

function mapProductRow(p){
  return {
    id: p.id,
    title: p.title,
    description: p.description || 'No description added yet.',
    price: formatMoney(Number(p.price_value)),
    priceValue: Number(p.price_value),
    category: p.category,
    imageUrl: p.image_url,
    stock: p.stock
  };
}

async function loadProducts(){
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });
  if (error){
    console.error('loadProducts', error);
    liveProducts = [];
    return;
  }
  liveProducts = data.map(mapProductRow);
}

function getCategories(){
  return [...new Set(liveProducts.map(p => p.category))].sort();
}

// Rebuilds the filter pill row from whatever categories currently exist.
// Keeps whichever pill was active if it still exists, otherwise falls
// back to "All".
function renderFilterPills(){
  const wrap = document.querySelector('.filter-pills');
  if (!wrap) return;
  const active = wrap.querySelector('.filter-pill.active');
  const activeFilter = active ? active.dataset.filter : 'all';
  const categories = getCategories();
  const stillExists = activeFilter === 'all' || categories.includes(activeFilter);
  const nextActive = stillExists ? activeFilter : 'all';

  wrap.innerHTML = `
    <button class="filter-pill${nextActive === 'all' ? ' active' : ''}" data-filter="all" role="tab" aria-selected="${nextActive === 'all'}">All</button>
    ${categories.map(cat => `
      <button class="filter-pill${nextActive === cat ? ' active' : ''}" data-filter="${cat}" role="tab" aria-selected="${nextActive === cat}">${cat}</button>
    `).join('')}
  `;

  wrap.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      wrap.querySelectorAll('.filter-pill').forEach(p => { p.classList.remove('active'); p.setAttribute('aria-selected', 'false'); });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      renderProducts(pill.dataset.filter);
    });
  });

  return nextActive;
}

function renderProducts(filter) {
  const grid = document.getElementById('dbGrid');
  if (!grid) return;
  const items = filter === 'all' ? liveProducts : liveProducts.filter(p => p.category === filter);

  if (items.length === 0){
    grid.innerHTML = `<p style="opacity:.6;padding:24px 0;">No products in this category yet.</p>`;
    return;
  }

  grid.innerHTML = items.map((p, i) => `
    <article class="db-card card-fade-in" data-id="${p.id}" style="--fade-delay:${Math.min(i, 5) * 0.06}s">
      <div class="db-card-media">
        <span class="db-card-tag">${p.category}</span>
        <img src="${p.imageUrl}" alt="${p.title}" loading="lazy">
        ${p.stock === 0 ? '<span class="oos-badge">Out of Stock</span>' : ''}
      </div>
      <div class="db-card-info">
        <h3 class="db-card-title">${p.title}</h3>
        <p class="db-card-desc">${p.description}</p>
        <div class="db-card-foot">
          <span class="db-price">${p.price}</span>
          <button class="db-view-btn" type="button" data-id="${p.id}">View Details</button>
        </div>
        <div class="db-stock-line">${p.stock === 0 ? 'Out of stock' : p.stock + ' in stock'}</div>
        <button class="db-add-btn" type="button" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</button>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.db-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openProductDetail(Number(btn.dataset.id));
    });
  });

  grid.querySelectorAll('.db-card').forEach(card => {
    card.addEventListener('click', () => {
      openProductDetail(Number(card.dataset.id));
    });
  });

  grid.querySelectorAll('.db-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.id));
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('added');
      }, 900);
    });
  });
}

// Re-fetches products from the database and re-renders the catalog +
// filter pills. Called after any admin create/edit/delete.
async function refreshCatalog(){
  await loadProducts();
  const activeFilter = renderFilterPills();
  renderProducts(activeFilter || 'all');
}

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('dbGrid');
  if (grid) grid.innerHTML = `<p style="opacity:.6;padding:24px 0;">Loading products…</p>`;
  await loadProducts();
  renderFilterPills();
  renderProducts('all');
});
