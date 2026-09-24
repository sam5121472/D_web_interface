// ============================================
// PRODUCT DETAIL VIEW + "RECOMMENDED FOR YOU"
// ------------------------------------------------
// Note on the recommendation engine: this runs entirely in the browser
// and matches products by shared category tags (with a category-crossing
// fallback so a page can also surface other categories, to encourage
// larger baskets). It is NOT a live call to any AI model — the loading
// state below simulates that lookup so the UI reads as "intelligent"
// recommendations without pretending to be a live model call.
// ============================================

const productOverlay = document.getElementById('productOverlay');
let currentDetailId = null;

function openProductDetail(id){
  const product = liveProducts.find(p => p.id === id);
  if (!product) return;
  currentDetailId = id;

  document.getElementById('pdImage').src = product.imageUrl;
  document.getElementById('pdImage').alt = product.title;
  document.getElementById('pdCategory').textContent = product.category;
  document.getElementById('pdTitle').textContent = product.title;
  document.getElementById('pdDesc').textContent = product.description;
  document.getElementById('pdPrice').textContent = product.price;
  document.getElementById('pdStock').textContent = product.stock === 0 ? 'Out of stock' : product.stock + ' in stock';
  document.getElementById('pdOosBadge').style.display = product.stock === 0 ? 'block' : 'none';

  const addBtn = document.getElementById('pdAddBtn');
  addBtn.disabled = product.stock === 0;
  addBtn.querySelector('.btn-pay-label').textContent = product.stock === 0 ? 'Out of Stock' : 'Add to Cart';
  addBtn.classList.toggle('db-add-btn-disabled', product.stock === 0);
  addBtn.style.opacity = product.stock === 0 ? '0.45' : '1';
  addBtn.style.cursor = product.stock === 0 ? 'not-allowed' : 'pointer';

  // Reset recommendations to loading state every time a new product opens
  document.getElementById('recoLoading').style.display = 'flex';
  document.getElementById('recoGrid').style.display = 'none';

  renderReviews(id);

  productOverlay.classList.add('open');
  productOverlay.setAttribute('aria-hidden', 'false');

  // Simulate the recommendation lookup so the loading state is visible
  setTimeout(() => renderRecommendations(product), 1100);
}

function closeProductDetail(){
  productOverlay.classList.remove('open');
  productOverlay.setAttribute('aria-hidden', 'true');
  currentDetailId = null;
}

document.getElementById('productClose').addEventListener('click', closeProductDetail);

document.getElementById('pdAddBtn').addEventListener('click', () => {
  if (currentDetailId === null) return;
  const product = liveProducts.find(p => p.id === currentDetailId);
  if (!product || product.stock === 0) return;
  addToCart(currentDetailId);
  const label = document.querySelector('#pdAddBtn .btn-pay-label');
  const original = label.textContent;
  label.textContent = 'Added ✓';
  setTimeout(() => { label.textContent = original; }, 900);
});

// ---- Recommendation matching: category tags first, cross-category fallback ----
function getRecommendations(product, count){
  const others = liveProducts.filter(p => p.id !== product.id);
  const sameCategory = others.filter(p => p.category === product.category);
  const otherCategory = others.filter(p => p.category !== product.category);
  return [
    ...sameCategory.map(p => ({ product: p, matchReason: 'Same Category' })),
    ...otherCategory.map(p => ({ product: p, matchReason: 'Pairs Well' }))
  ].slice(0, count);
}

function renderRecommendations(product){
  const picks = getRecommendations(product, 3);
  const grid = document.getElementById('recoGrid');
  const loading = document.getElementById('recoLoading');

  grid.innerHTML = picks.map(({product: p, matchReason}, i) => `
    <div class="reco-card card-fade-in" data-id="${p.id}" style="--fade-delay:${i * 0.08}s">
      <div class="reco-card-media">
        <span class="reco-match-tag">${matchReason}</span>
        <img src="${p.imageUrl}" alt="${p.title}" loading="lazy">
      </div>
      <div class="reco-card-info">
        <div class="reco-card-title">${p.title}</div>
        <div class="reco-card-foot">
          <span class="reco-price">${p.price}</span>
          <button class="reco-add-btn" type="button" data-id="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.reco-card').forEach(card => {
    card.addEventListener('click', () => openProductDetail(Number(card.dataset.id)));
  });
  grid.querySelectorAll('.reco-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      addToCart(id);
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      setTimeout(() => {
        btn.textContent = 'Add to Cart';
        btn.classList.remove('added');
      }, 900);
    });
  });

  loading.style.display = 'none';
  grid.style.display = 'grid';
}

// ============================================
// CUSTOMER REVIEWS
// ============================================
let selectedRating = 0;

function renderStars(rating){
  const full = Math.round(rating);
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

async function renderReviews(productId){
  const list = document.getElementById('reviewList');
  list.innerHTML = `<div class="customer-review-row"><p class="review-comment" style="opacity:.6;">Loading reviews…</p></div>`;

  const reviews = await getReviewsForProduct(productId);
  const avg = getAverageRatingFrom(reviews);
  const badge = document.getElementById('reviewAvgBadge');
  const ratingLine = document.getElementById('pdRatingLine');

  if (avg === null){
    badge.textContent = 'No reviews yet';
    ratingLine.innerHTML = '';
  } else {
    badge.textContent = `${avg.toFixed(1)} ★ (${reviews.length} review${reviews.length === 1 ? '' : 's'})`;
    ratingLine.innerHTML = `<span class="stars">${renderStars(avg)}</span><span class="count">${avg.toFixed(1)} out of 5 · ${reviews.length} review${reviews.length === 1 ? '' : 's'}</span>`;
  }

  if (reviews.length === 0){
    list.innerHTML = `<div class="customer-review-row"><p class="review-comment">No reviews yet — be the first to share your experience with this product.</p></div>`;
  } else {
    list.innerHTML = reviews.map(r => `
      <div class="customer-review-row">
        <div class="review-row-head">
          <span class="review-stars">${renderStars(r.rating)}</span>
          <span class="review-author">${r.userName}</span>
          <span class="review-date">${new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
        <p class="review-comment">${r.comment}</p>
      </div>
    `).join('');
  }

  // Reset the review form for the newly opened product
  selectedRating = 0;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('reviewComment').value = '';
  document.getElementById('reviewError').style.display = 'none';
}

document.querySelectorAll('.star-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedRating = Number(btn.dataset.star);
    document.querySelectorAll('.star-btn').forEach(b => {
      b.classList.toggle('selected', Number(b.dataset.star) <= selectedRating);
    });
  });
});

document.getElementById('submitReviewBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('reviewError');
  const user = getCurrentUser();

  if (!user){
    errEl.textContent = 'Sign in to leave a review.';
    errEl.style.display = 'block';
    openAuthOverlay();
    return;
  }
  if (currentDetailId === null) return;

  const comment = document.getElementById('reviewComment').value;
  const btn = document.getElementById('submitReviewBtn');
  btn.disabled = true;

  const result = await addReview({
    productId: currentDetailId,
    userId: user.id,
    userName: user.fullName,
    rating: selectedRating,
    comment
  });

  btn.disabled = false;

  if (!result.success){
    errEl.textContent = result.reason;
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  await renderReviews(currentDetailId);
  showToast('Thanks — your review has been posted.');
});
