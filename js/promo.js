// ============================================
// PROMO CODE "DATABASE" (persisted client-side, localStorage-backed)
// Fields: code, type ('percentage' | 'flat'), value, active, createdAt
// ------------------------------------------------
// Same caveat as the rest of this project: this lives in localStorage,
// not a real database. A production build would move this table to a
// real backend so codes can't be edited by anyone poking at devtools.
// ============================================

const PROMO_KEY = 'de_promocodes';

function getPromoCodes(){
  try {
    const raw = localStorage.getItem(PROMO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function savePromoCodes(codes){
  try { localStorage.setItem(PROMO_KEY, JSON.stringify(codes)); } catch (e) {}
}

function findActivePromo(codeStr){
  const norm = (codeStr || '').trim().toUpperCase();
  if (!norm) return null;
  return getPromoCodes().find(p => p.code === norm && p.active) || null;
}

function createPromoCode({ code, type, value }){
  const codes = getPromoCodes();
  const norm = (code || '').trim().toUpperCase();

  if (!norm) return { success: false, reason: 'Enter a code.' };
  if (!/^[A-Z0-9_-]{3,20}$/.test(norm)) return { success: false, reason: 'Use 3–20 letters/numbers, no spaces.' };
  if (codes.some(p => p.code === norm)) return { success: false, reason: 'That code already exists.' };
  if (type !== 'percentage' && type !== 'flat') return { success: false, reason: 'Choose a discount type.' };

  const numValue = Number(value);
  if (!numValue || numValue <= 0) return { success: false, reason: 'Enter a value greater than 0.' };
  if (type === 'percentage' && numValue > 100) return { success: false, reason: 'Percentage discounts can\'t exceed 100.' };

  codes.push({
    code: norm,
    type,
    value: numValue,
    active: true,
    createdAt: new Date().toISOString()
  });
  savePromoCodes(codes);
  return { success: true };
}

function togglePromoActive(code){
  const codes = getPromoCodes();
  const promo = codes.find(p => p.code === code);
  if (!promo) return;
  promo.active = !promo.active;
  savePromoCodes(codes);
}

// Discount amount for a given subtotal — never discounts past $0.
function calculateDiscount(subtotal, promo){
  if (!promo) return 0;
  const raw = promo.type === 'percentage' ? subtotal * (promo.value / 100) : promo.value;
  return Math.min(Math.max(raw, 0), subtotal);
}

// Seed a few starter codes once, so the feature is visible immediately.
(function seedPromoCodes(){
  if (localStorage.getItem('de_promo_seeded_v1')) return;
  savePromoCodes([
    { code: 'WELCOME10', type: 'percentage', value: 10, active: true, createdAt: new Date().toISOString() },
    { code: 'FLAT500', type: 'flat', value: 500, active: true, createdAt: new Date().toISOString() },
    { code: 'OLDPROMO', type: 'percentage', value: 15, active: false, createdAt: new Date().toISOString() }
  ]);
  localStorage.setItem('de_promo_seeded_v1', '1');
})();
