// ============================================
// STORE SETTINGS (persisted client-side, localStorage-backed)
// Fields: taxRate (%), deliveryMode ('free' | 'flat'), deliveryCharge (PKR)
// ------------------------------------------------
// Controlled from the Admin Dashboard's "Delivery & Tax" panel.
// Read by the cart/checkout to compute the final chargeable total.
// ============================================

const SETTINGS_KEY = 'de_settings';

const DEFAULT_SETTINGS = {
  taxRate: 0,
  deliveryMode: 'flat',   // 'free' or 'flat'
  deliveryCharge: 200
};

function getSettings(){
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings){
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
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
