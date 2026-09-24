// ============================================
// CUSTOMER REVIEWS — backed by the Supabase `reviews` table
// ------------------------------------------------
// Anyone can read reviews; only a signed-in user can post one, and only
// under their own user_id — enforced by Row Level Security. There's
// still no purchase-verification check (same as before), just real
// storage and real access control now.
// ============================================

async function getReviewsForProduct(productId){
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error){ console.error('getReviewsForProduct', error); return []; }
  return data.map(r => ({
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    userName: r.user_name,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at
  }));
}

function getAverageRatingFrom(reviews){
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return sum / reviews.length;
}

async function addReview({ productId, userId, userName, rating, comment }){
  if (!userId){
    return { success: false, reason: 'Sign in to leave a review.' };
  }
  if (!rating || rating < 1 || rating > 5){
    return { success: false, reason: 'Choose a star rating from 1 to 5.' };
  }
  if (!comment || !comment.trim()){
    return { success: false, reason: 'Write a short review before submitting.' };
  }

  const { error } = await sb.from('reviews').insert({
    product_id: productId,
    user_id: userId,
    user_name: userName,
    rating,
    comment: comment.trim()
  });

  if (error){ console.error('addReview', error); return { success: false, reason: 'Could not submit your review — try again.' }; }
  return { success: true };
}
