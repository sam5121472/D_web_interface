// ============================================
// CUSTOMER REVIEWS "DATABASE" (persisted client-side, localStorage-backed)
// Fields: id, productId, userId, userName, rating (1-5), comment, createdAt
// ------------------------------------------------
// Same caveat as everything else here: this lives in localStorage, not a
// real database, so reviews are local to this browser. Anyone signed in
// can currently review any product (no purchase verification) — a real
// backend build would typically restrict reviews to verified buyers.
// ============================================

const REVIEWS_KEY = 'de_reviews';

function getAllReviews(){
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveAllReviews(reviews){
  try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews)); } catch (e) {}
}

function getReviewsForProduct(productId){
  return getAllReviews()
    .filter(r => r.productId === productId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getAverageRating(productId){
  const reviews = getReviewsForProduct(productId);
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return sum / reviews.length;
}

function addReview({ productId, userId, userName, rating, comment }){
  if (!rating || rating < 1 || rating > 5){
    return { success: false, reason: 'Choose a star rating from 1 to 5.' };
  }
  if (!comment || !comment.trim()){
    return { success: false, reason: 'Write a short review before submitting.' };
  }

  const reviews = getAllReviews();
  reviews.push({
    id: 'rev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    productId,
    userId,
    userName,
    rating,
    comment: comment.trim(),
    createdAt: new Date().toISOString()
  });
  saveAllReviews(reviews);
  return { success: true };
}

// Seed a handful of realistic reviews so the feature isn't empty on first load.
(function seedReviews(){
  if (localStorage.getItem('de_reviews_seeded_v1')) return;

  saveAllReviews([
    { id: 'rev_seed_1', productId: 1, userId: 'u_seed_1', userName: 'Ayesha Raza', rating: 5, comment: 'Genuinely the real thing — texture and smell match what my grandfather used to bring back from the mountains. Will reorder.', createdAt: new Date(Date.now() - 18 * 86400000).toISOString() },
    { id: 'rev_seed_2', productId: 1, userId: 'u_seed_2', userName: 'Bilal Ahmed', rating: 4, comment: 'Good quality, packaging could be sturdier for shipping but the product itself is excellent.', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    { id: 'rev_seed_3', productId: 3, userId: 'u_seed_3', userName: 'Fatima Noor', rating: 5, comment: 'Great tart flavor, I add a spoon to my morning smoothie. Noticeably fresher than what I found locally.', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
    { id: 'rev_seed_4', productId: 2, userId: 'u_seed_1', userName: 'Ayesha Raza', rating: 5, comment: 'Ordered the twin set as a gift for my father — he says it is stronger than anything he has tried before.', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() }
  ]);

  localStorage.setItem('de_reviews_seeded_v1', '1');
})();
