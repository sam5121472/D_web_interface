// ============================================
// PROMO CODES — backed by the Supabase `promo_codes` table
// ------------------------------------------------
// Anyone can read active codes (needed to validate one at checkout);
// only admins can create/edit them — enforced by Row Level Security,
// not just by hiding the admin panel.
// ============================================

async function getPromoCodes(){
  const { data, error } = await sb
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error){ console.error('getPromoCodes', error); return []; }
  return data.map(p => ({
    code: p.code,
    type: p.type,
    value: Number(p.value),
    active: p.active,
    createdAt: p.created_at
  }));
}

async function findActivePromo(codeStr){
  const norm = (codeStr || '').trim().toUpperCase();
  if (!norm) return null;
  const { data, error } = await sb
    .from('promo_codes')
    .select('*')
    .eq('code', norm)
    .eq('active', true)
    .maybeSingle();
  if (error || !data) return null;
  return { code: data.code, type: data.type, value: Number(data.value), active: data.active };
}

async function createPromoCode({ code, type, value }){
  const norm = (code || '').trim().toUpperCase();

  if (!norm) return { success: false, reason: 'Enter a code.' };
  if (!/^[A-Z0-9_-]{3,20}$/.test(norm)) return { success: false, reason: 'Use 3–20 letters/numbers, no spaces.' };
  if (type !== 'percentage' && type !== 'flat') return { success: false, reason: 'Choose a discount type.' };

  const numValue = Number(value);
  if (!numValue || numValue <= 0) return { success: false, reason: 'Enter a value greater than 0.' };
  if (type === 'percentage' && numValue > 100) return { success: false, reason: 'Percentage discounts can\'t exceed 100.' };

  const { error } = await sb.from('promo_codes').insert({
    code: norm, type, value: numValue, active: true
  });

  if (error){
    if (error.code === '23505') return { success: false, reason: 'That code already exists.' };
    return { success: false, reason: 'Could not create the code — try again.' };
  }
  return { success: true };
}

async function togglePromoActive(code, currentlyActive){
  const { error } = await sb.from('promo_codes').update({ active: !currentlyActive }).eq('code', code);
  if (error) console.error('togglePromoActive', error);
  return !error;
}

// Discount amount for a given subtotal — never discounts past $0.
function calculateDiscount(subtotal, promo){
  if (!promo) return 0;
  const raw = promo.type === 'percentage' ? subtotal * (promo.value / 100) : promo.value;
  return Math.min(Math.max(raw, 0), subtotal);
}
