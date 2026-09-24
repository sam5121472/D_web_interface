// ============================================
// STORE SETTINGS — backed by the Supabase `settings` table (one row)
// ------------------------------------------------
// Anyone can read settings (checkout needs to compute the total);
// only admins can update them — enforced by Row Level Security.
//
// cachedSettings is loaded once on page load (see app-init.js) and kept
// in sync after every admin save, so the cart/checkout math (which runs
// synchronously as the person types/clicks) can read it instantly
// without an extra network round trip on every keystroke.
// ============================================

const DEFAULT_SETTINGS = {
  taxRate: 0,
  deliveryMode: 'flat',
  deliveryCharge: 200
};

let cachedSettings = { ...DEFAULT_SETTINGS };

async function loadSettings(){
  const { data, error } = await sb.from('settings').select('*').eq('id', true).maybeSingle();
  if (error || !data){
    cachedSettings = { ...DEFAULT_SETTINGS };
    return cachedSettings;
  }
  cachedSettings = {
    taxRate: Number(data.tax_rate),
    deliveryMode: data.delivery_mode,
    deliveryCharge: Number(data.delivery_charge)
  };
  return cachedSettings;
}

function getSettings(){
  return { ...cachedSettings };
}

async function saveSettings(settings){
  const { error } = await sb.from('settings').update({
    tax_rate: settings.taxRate,
    delivery_mode: settings.deliveryMode,
    delivery_charge: settings.deliveryCharge,
    updated_at: new Date().toISOString()
  }).eq('id', true);

  if (!error) cachedSettings = { ...settings };
  return !error;
}

function getDeliveryCharge(){
  const s = getSettings();
  return s.deliveryMode === 'free' ? 0 : Math.max(0, s.deliveryCharge);
}

function getTaxRate(){
  return Math.max(0, getSettings().taxRate);
}

// Tax is applied to the discounted subtotal (subtotal minus promo discount),
// not to the delivery charge.
function calculateTax(amountAfterDiscount){
  return amountAfterDiscount * (getTaxRate() / 100);
}
