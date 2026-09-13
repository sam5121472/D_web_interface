// ============================================
  // PRODUCT CATALOG "DATABASE" (persisted client-side, localStorage-backed)
  // Fields: id, title, description, price, priceValue, category, imageUrl, stock
  // PRODUCTS_SEED is the initial fixture; liveProducts is the mutable store
  // that the Admin Dashboard's Inventory panel reads and writes. Everything
  // else in the app (catalog grid, cart, checkout) reads from liveProducts
  // so admin edits show up immediately across the storefront.
  // ============================================
  const PRODUCTS_SEED = [
    {
      id: 1,
      title: "Himalayan Shilajit Resin — 20g",
      description: "Purified mineral-organic resin, hand-collected above 12,000 feet and slow-processed with no fillers.",
      price: "Rs. 3,500",
      priceValue: 3500,
      category: "Shilajit",
      imageUrl: "assets/images/product-shilajit.jpg",
      stock: 24
    },
    {
      id: 2,
      title: "Shilajit Resin — Twin Jar Set",
      description: "Two 20g jars of our purified Himalayan shilajit, photographed here at sunset on the Haramosh massif.",
      price: "Rs. 6,500",
      priceValue: 6500,
      category: "Shilajit",
      imageUrl: "assets/images/hero.jpg",
      stock: 12
    },
    {
      id: 3,
      title: "Sea Buckthorn Dried Berries",
      description: "Sun-dried, hand-ground golden berries naturally rich in vitamin C, carotenoids and characteristic fatty acids.",
      price: "Rs. 2,200",
      priceValue: 2200,
      category: "Sea Buckthorn",
      imageUrl: "assets/images/product-seabuckthorn.jpg",
      stock: 40
    },
    {
      id: 4,
      title: "Wild Sea Buckthorn — Whole Berries",
      description: "Untouched sea buckthorn straight from the shrub, harvested across the high-altitude shrublands of Gilgit-Baltistan.",
      price: "Rs. 2,500",
      priceValue: 2500,
      category: "Sea Buckthorn",
      imageUrl: "assets/images/berries-branch.jpg",
      stock: 18
    }
  ];

  // ---- Mutable, persisted product store (Admin Dashboard writes here) ----
  const PRODUCTS_KEY = 'de_products';
  let liveProducts;
  (function initLiveProducts(){
    try {
      const raw = localStorage.getItem(PRODUCTS_KEY);
      liveProducts = raw ? JSON.parse(raw) : PRODUCTS_SEED.map(p => ({...p}));
    } catch (e) {
      liveProducts = PRODUCTS_SEED.map(p => ({...p}));
    }
    if (!localStorage.getItem(PRODUCTS_KEY)) persistLiveProducts();
  })();
  function persistLiveProducts(){
    try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(liveProducts)); } catch (e) {}
  }

  function renderProducts(filter) {
    const grid = document.getElementById('dbGrid');
    if (!grid) return;
    const items = filter === 'all' ? liveProducts : liveProducts.filter(p => p.category === filter);
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

  document.addEventListener('DOMContentLoaded', () => {
    renderProducts('all');
    const pills = document.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => { p.classList.remove('active'); p.setAttribute('aria-selected', 'false'); });
        pill.classList.add('active');
        pill.setAttribute('aria-selected', 'true');
        renderProducts(pill.dataset.filter);
      });
    });
  });
