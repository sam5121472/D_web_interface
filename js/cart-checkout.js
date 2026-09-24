// ============================================
  // SHOPPING CART STATE (in-memory, client-side)
  // cart = { [productId]: quantity }
  // ============================================
  const cart = {};

  function findProduct(id){
    return liveProducts.find(p => p.id === id);
  }

  function cartLineItems(){
    return Object.keys(cart)
      .map(id => Number(id))
      .filter(id => cart[id] > 0)
      .map(id => {
        const product = findProduct(id);
        const qty = cart[id];
        return product ? { product, qty, lineTotal: product.priceValue * qty } : null;
      })
      .filter(Boolean); // drop any item whose product was removed from the catalog since it was added
  }

  function cartCount(){
    return Object.values(cart).reduce((sum, q) => sum + q, 0);
  }

  function cartSubtotal(){
    return cartLineItems().reduce((sum, item) => sum + item.lineTotal, 0);
  }

  // ---------- PROMO CODE STATE ----------
  // Shared between the cart drawer and checkout Step 2 — applying it in
  // either place keeps both in sync since they read the same variable.
  let appliedPromo = null;

  function getDiscountAmount(){
    return calculateDiscount(cartSubtotal(), appliedPromo);
  }

  function getCartTotal(){
    return cartSubtotal() - getDiscountAmount();
  }

  // Final chargeable total: subtotal - discount + tax + delivery.
  // This is what actually gets sent to the payment gateway.
  function getTaxAmount(){
    return calculateTax(getCartTotal());
  }

  function getFinalTotal(){
    return getCartTotal() + getTaxAmount() + getDeliveryCharge();
  }

  function formatMoney(n){
    return 'Rs. ' + Math.round(n).toLocaleString('en-PK');
  }

  function addToCart(id){
    const product = findProduct(id);
    if (!product || product.stock <= 0) return;
    const current = cart[id] || 0;
    if (current >= product.stock) return;
    cart[id] = current + 1;
    updateCartBadge();
    renderDrawer();
  }

  function incrementItem(id){
    const product = findProduct(id);
    const current = cart[id] || 0;
    if (product && current >= product.stock) return;
    cart[id] = current + 1;
    updateCartBadge();
    renderDrawer();
  }

  function decrementItem(id){
    if (!cart[id]) return;
    cart[id] = Math.max(1, cart[id] - 1);
    updateCartBadge();
    renderDrawer();
  }

  function removeItem(id){
    delete cart[id];
    updateCartBadge();
    renderDrawer();
  }

  function updateCartBadge(){
    const count = cartCount();
    const badge = document.getElementById('cartCount');
    const toggle = document.getElementById('cartToggle');
    if (badge) badge.textContent = count;
    if (toggle) toggle.setAttribute('aria-label', `Open cart, ${count} item${count === 1 ? '' : 's'}`);
  }

  // ---------- DRAWER ----------
  const cartDrawer = document.getElementById('cartDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerItemsEl = document.getElementById('drawerItems');
  const drawerEmptyEl = document.getElementById('drawerEmpty');
  const drawerFootEl = document.getElementById('drawerFoot');
  const drawerSubtotalEl = document.getElementById('drawerSubtotal');

  function renderDrawer(){
    const items = cartLineItems();

    if (items.length === 0){
      drawerItemsEl.style.display = 'none';
      drawerFootEl.style.display = 'none';
      drawerEmptyEl.style.display = 'flex';
      return;
    }

    drawerItemsEl.style.display = 'block';
    drawerFootEl.style.display = 'block';
    drawerEmptyEl.style.display = 'none';

    drawerItemsEl.innerHTML = items.map(({product, qty, lineTotal}) => `
      <div class="cart-item" data-id="${product.id}">
        <div class="cart-item-media"><img src="${product.imageUrl}" alt="${product.title}"></div>
        <div class="cart-item-info">
          <div class="cart-item-title">${product.title}</div>
          <div class="cart-item-price">${formatMoney(product.priceValue)} · ${formatMoney(lineTotal)} total</div>
          <div class="cart-item-row">
            <div class="qty-control">
              <button type="button" data-action="dec" data-id="${product.id}" aria-label="Decrease quantity">−</button>
              <span>${qty}</span>
              <button type="button" data-action="inc" data-id="${product.id}" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="cart-remove" data-action="remove" data-id="${product.id}">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    drawerSubtotalEl.textContent = formatMoney(cartSubtotal());

    const discount = getDiscountAmount();
    const discountRow = document.getElementById('drawerDiscountRow');
    if (discount > 0){
      discountRow.style.display = 'flex';
      document.getElementById('drawerDiscount').textContent = '-' + formatMoney(discount);
    } else {
      discountRow.style.display = 'none';
    }
    document.getElementById('drawerTotal').textContent = formatMoney(getCartTotal());
    syncPromoUI('cart');

    drawerItemsEl.querySelectorAll('button[data-action]').forEach(btn => {
      const id = Number(btn.dataset.id);
      const action = btn.dataset.action;
      btn.addEventListener('click', () => {
        if (action === 'inc') incrementItem(id);
        if (action === 'dec') decrementItem(id);
        if (action === 'remove') removeItem(id);
      });
    });
  }

  function openDrawer(){
    cartDrawer.classList.add('open');
    drawerBackdrop.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.getElementById('cartToggle').setAttribute('aria-expanded', 'true');
    renderDrawer();
  }

  function closeDrawer(){
    cartDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.getElementById('cartToggle').setAttribute('aria-expanded', 'false');
  }

  document.getElementById('cartToggle').addEventListener('click', () => {
    if (cartDrawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  });
  document.getElementById('cartClose').addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', () => {
    closeDrawer();
    closeCheckout();
  });

  // ---------- PROMO CODE UI (shared: cart drawer + checkout Step 2) ----------
  function syncPromoUI(context){
    const inputId = context === 'cart' ? 'cartPromoInput' : 'reviewPromoInput';
    const box = document.getElementById(inputId).closest('.promo-box');
    const applied = document.getElementById(context === 'cart' ? 'cartPromoApplied' : 'reviewPromoApplied');
    const codeEl = document.getElementById(context === 'cart' ? 'cartPromoCode' : 'reviewPromoCode');
    const savingsEl = document.getElementById(context === 'cart' ? 'cartPromoSavings' : 'reviewPromoSavings');
    const errorEl = document.getElementById(context === 'cart' ? 'cartPromoError' : 'reviewPromoError');

    if (appliedPromo){
      box.style.display = 'none';
      applied.style.display = 'flex';
      codeEl.textContent = appliedPromo.code;
      savingsEl.textContent = formatMoney(getDiscountAmount());
      errorEl.style.display = 'none';
    } else {
      box.style.display = 'flex';
      applied.style.display = 'none';
    }
  }

  function showPromoError(context, msg){
    const errorEl = document.getElementById(context === 'cart' ? 'cartPromoError' : 'reviewPromoError');
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }

  async function applyPromoFromInput(context){
    const input = document.getElementById(context === 'cart' ? 'cartPromoInput' : 'reviewPromoInput');
    const codeStr = input.value.trim();
    if (!codeStr){
      showPromoError(context, 'Enter a promo code.');
      return;
    }
    const promo = await findActivePromo(codeStr);
    if (!promo){
      showPromoError(context, 'Invalid or expired code.');
      return;
    }
    appliedPromo = promo;
    input.value = '';
    renderDrawer();
    renderReview();
  }

  function removeAppliedPromo(){
    appliedPromo = null;
    renderDrawer();
    renderReview();
  }

  document.getElementById('cartPromoApply').addEventListener('click', () => applyPromoFromInput('cart'));
  document.getElementById('cartPromoRemove').addEventListener('click', removeAppliedPromo);
  document.getElementById('cartPromoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){ e.preventDefault(); applyPromoFromInput('cart'); }
  });

  document.getElementById('reviewPromoApply').addEventListener('click', () => applyPromoFromInput('review'));
  document.getElementById('reviewPromoRemove').addEventListener('click', removeAppliedPromo);
  document.getElementById('reviewPromoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter'){ e.preventDefault(); applyPromoFromInput('review'); }
  });

  // ---------- CHECKOUT OVERLAY ----------
  const checkoutOverlay = document.getElementById('checkoutOverlay');
  const stepShipping = document.getElementById('stepShipping');
  const stepReview = document.getElementById('stepReview');
  const stepIndicator1 = document.getElementById('stepIndicator1');
  const stepIndicator2 = document.getElementById('stepIndicator2');
  let shippingData = {};

  function openCheckout(){
    if (cartCount() === 0) return;
    closeDrawer();
    checkoutOverlay.classList.add('open');
    checkoutOverlay.setAttribute('aria-hidden', 'false');
    goToStep(1);
  }

  function closeCheckout(){
    checkoutOverlay.classList.remove('open');
    checkoutOverlay.setAttribute('aria-hidden', 'true');
  }

  function goToStep(step){
    if (step === 1){
      stepShipping.style.display = 'block';
      stepReview.style.display = 'none';
      stepIndicator1.classList.add('active');
      stepIndicator2.classList.remove('active');
    } else {
      stepShipping.style.display = 'none';
      stepReview.style.display = 'block';
      stepIndicator1.classList.remove('active');
      stepIndicator2.classList.add('active');
      renderReview();
    }
    const panel = document.querySelector('.checkout-panel');
    if (panel) panel.scrollTop = 0;
  }

  function renderReview(){
    const addr = document.getElementById('reviewAddress');
    addr.innerHTML = `
      ${shippingData.fullName}<br>
      ${shippingData.address}<br>
      ${shippingData.city}, ${shippingData.postal}<br>
      ${shippingData.country}<br>
      ${shippingData.phone} · ${shippingData.email}
    `;

    const itemsEl = document.getElementById('reviewItems');
    const items = cartLineItems();
    itemsEl.innerHTML = items.map(({product, qty, lineTotal}) => `
      <div class="review-item-row">
        <span><b>${product.title}</b> × ${qty}</span>
        <span>${formatMoney(lineTotal)}</span>
      </div>
    `).join('');

    const subtotal = cartSubtotal();
    const discount = getDiscountAmount();
    const tax = getTaxAmount();
    const delivery = getDeliveryCharge();
    const total = getFinalTotal();

    document.getElementById('reviewSubtotal').textContent = formatMoney(subtotal);
    const discountRow = document.getElementById('reviewDiscountRow');
    if (discount > 0){
      discountRow.style.display = 'flex';
      document.getElementById('reviewDiscount').textContent = '-' + formatMoney(discount);
    } else {
      discountRow.style.display = 'none';
    }

    const taxRow = document.getElementById('reviewTaxRow');
    if (tax > 0){
      taxRow.style.display = 'flex';
      document.getElementById('reviewTax').textContent = formatMoney(tax);
    } else {
      taxRow.style.display = 'none';
    }

    document.getElementById('reviewDelivery').textContent = delivery > 0 ? formatMoney(delivery) : 'Free';
    document.getElementById('reviewTotal').textContent = formatMoney(total);
    document.getElementById('payAmount').textContent = formatMoney(total);
    syncPromoUI('review');
  }

  document.getElementById('proceedCheckout').addEventListener('click', openCheckout);
  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);

  stepShipping.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(stepShipping);
    shippingData = Object.fromEntries(formData.entries());
    goToStep(2);
  });

  document.getElementById('backToShipping').addEventListener('click', () => goToStep(1));

  // ============================================
  // PAYMENT — Pakistan gateway integration layer
  // ------------------------------------------------
  // This front-end is built to plug into a Pakistan-based
  // aggregator sandbox (e.g. PayFast, JazzCash or Easypaisa's
  // hosted checkout / API) that supports cards, JazzCash,
  // Easypaisa and Raast under one integration.
  //
  // IMPORTANT: merchant IDs, integrity salts and secret keys
  // must NEVER live in client-side code — they belong on your
  // server. In production, `chargeViaGatewaySandbox()` below
  // is replaced with a fetch() to your own backend endpoint
  // (e.g. POST /api/payments/charge), which then signs the
  // request server-side and calls the gateway's sandbox API.
  // The function below simulates that round trip so the full
  // UI flow — loading state, success, decline — works today.
  // ============================================

  let selectedPayMethod = 'card';

  const payTabs = document.querySelectorAll('.pay-tab');
  const payPanels = {
    card: document.getElementById('pay-card'),
    jazzcash: document.getElementById('pay-jazzcash'),
    easypaisa: document.getElementById('pay-easypaisa'),
    raast: document.getElementById('pay-raast')
  };

  payTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      selectedPayMethod = tab.dataset.method;
      payTabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      Object.entries(payPanels).forEach(([key, el]) => {
        el.style.display = key === selectedPayMethod ? 'block' : 'none';
      });
      clearPaymentError();
    });
  });

  const cardNumberEl = document.getElementById('cardNumber');
  cardNumberEl.addEventListener('input', () => {
    const digits = cardNumberEl.value.replace(/\D/g, '').slice(0, 16);
    cardNumberEl.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  });
  const cardExpiryEl = document.getElementById('cardExpiry');
  cardExpiryEl.addEventListener('input', () => {
    let digits = cardExpiryEl.value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) digits = digits.slice(0, 2) + '/' + digits.slice(2);
    cardExpiryEl.value = digits;
  });

  function showPaymentError(msg){
    const el = document.getElementById('paymentError');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function clearPaymentError(){
    const el = document.getElementById('paymentError');
    el.style.display = 'none';
    el.textContent = '';
  }

  function resetPaymentFields(){
    ['cardNumber','cardExpiry','cardCvv','cardName','jazzcashNumber','easypaisaNumber','raastId'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    clearPaymentError();
    selectedPayMethod = 'card';
    payTabs.forEach(t => {
      const isCard = t.dataset.method === 'card';
      t.classList.toggle('active', isCard);
      t.setAttribute('aria-selected', String(isCard));
    });
    Object.entries(payPanels).forEach(([key, el]) => {
      el.style.display = key === 'card' ? 'block' : 'none';
    });
  }

  const PK_MOBILE_RE = /^03\d{9}$/;

  function validatePayment(){
    clearPaymentError();

    if (selectedPayMethod === 'card'){
      const number = document.getElementById('cardNumber').value.replace(/\s+/g, '');
      const expiry = document.getElementById('cardExpiry').value.trim();
      const cvv = document.getElementById('cardCvv').value.trim();
      const name = document.getElementById('cardName').value.trim();

      if (!/^\d{16}$/.test(number)){
        showPaymentError('Enter a valid 16-digit test card number.');
        return null;
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)){
        showPaymentError('Enter expiry in MM/YY format.');
        return null;
      }
      if (!/^\d{3,4}$/.test(cvv)){
        showPaymentError('Enter a valid CVV.');
        return null;
      }
      if (!name){
        showPaymentError('Enter the name on the card.');
        return null;
      }
      return { method: 'card', last4: number.slice(-4), fullNumber: number, name };
    }

    if (selectedPayMethod === 'jazzcash' || selectedPayMethod === 'easypaisa'){
      const inputId = selectedPayMethod === 'jazzcash' ? 'jazzcashNumber' : 'easypaisaNumber';
      const number = document.getElementById(inputId).value.trim();
      if (!PK_MOBILE_RE.test(number)){
        showPaymentError('Enter a valid Pakistani mobile number (03XXXXXXXXX).');
        return null;
      }
      return { method: selectedPayMethod, number };
    }

    if (selectedPayMethod === 'raast'){
      const value = document.getElementById('raastId').value.trim();
      const isMobile = PK_MOBILE_RE.test(value);
      const looksLikeIban = /^PK\d{2}[A-Z0-9]{4,}$/i.test(value.replace(/\s+/g, ''));
      if (!isMobile && !looksLikeIban){
        showPaymentError('Enter a valid mobile number (03XXXXXXXXX) or IBAN for Raast.');
        return null;
      }
      return { method: 'raast', value };
    }

    return null;
  }

  // Simulated sandbox round-trip. Swap this out for a real
  // fetch() to your backend in production.
  function chargeViaGatewaySandbox(payload, amount){
    return new Promise((resolve) => {
      setTimeout(() => {
        const declineCard = payload.method === 'card' && payload.fullNumber === '4000000000000002';
        if (declineCard){
          resolve({ success: false, reason: 'Card declined by sandbox gateway.' });
          return;
        }
        resolve({
          success: true,
          transactionId: 'TXN-' + Math.floor(100000000 + Math.random() * 900000000),
          method: payload.method,
          amount
        });
      }, 1600);
    });
  }

  const methodLabels = {
    card: 'Card',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    raast: 'Raast'
  };

  // ---------- PLACE ORDER / CONFIRMATION ----------
  const successOverlay = document.getElementById('successOverlay');
  const payBtn = document.getElementById('placeOrderBtn');

  payBtn.addEventListener('click', async () => {
    const payload = validatePayment();
    if (!payload) return;

    const subtotal = cartSubtotal();
    const discount = getDiscountAmount();
    const tax = getTaxAmount();
    const delivery = getDeliveryCharge();
    const amount = getFinalTotal(); // subtotal - discount + tax + delivery — the real charge
    const snapshotItems = cartLineItems(); // capture before clearing
    const snapshotAddress = { ...shippingData };
    const snapshotPromo = appliedPromo ? { code: appliedPromo.code, type: appliedPromo.type, value: appliedPromo.value } : null;

    payBtn.classList.add('loading');
    payBtn.disabled = true;

    let result;
    try {
      // The gateway is only ever charged the final total — discount applied,
      // tax and delivery added.
      result = await chargeViaGatewaySandbox(payload, amount);
    } catch (err) {
      result = { success: false, reason: 'Network error contacting sandbox gateway.' };
    }

    payBtn.classList.remove('loading');
    payBtn.disabled = false;

    if (!result.success){
      showPaymentError(result.reason || 'Payment failed. Please try again.');
      return;
    }

    // Payment confirmed — only now clear the cart and any applied promo
    Object.keys(cart).forEach(k => delete cart[k]);
    appliedPromo = null;
    updateCartBadge();
    renderDrawer();

    const orderId = 'DE-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('successOrderId').textContent = '#' + orderId;
    document.getElementById('successMethod').textContent = methodLabels[result.method] || result.method;
    document.getElementById('successTxnId').textContent = result.transactionId;
    document.getElementById('successAmount').textContent = formatMoney(result.amount);

    // ---- Persist order record, linked to the signed-in user's ID ----
    // Schema: { id, userId, items, address, paymentMethod, transactionId,
    //           subtotal, discount, promoCode, tax, delivery, total, status, createdAt }
    const currentUser = getCurrentUser();
    await saveOrder({
      id: orderId,
      userId: currentUser ? currentUser.id : null, // null = guest order, not visible in any dashboard
      items: snapshotItems.map(({product, qty, lineTotal}) => ({
        productId: product.id, title: product.title, qty, lineTotal
      })),
      address: snapshotAddress,
      paymentMethod: result.method,
      transactionId: result.transactionId,
      subtotal: subtotal,
      discount: discount,
      promoCode: snapshotPromo ? snapshotPromo.code : null,
      tax: tax,
      delivery: delivery,
      total: result.amount,
      status: 'Processing',
      createdAt: new Date().toISOString()
    });

    document.getElementById('confirmItems').innerHTML = snapshotItems.map(({product, qty, lineTotal}) => `
      <div class="review-item-row">
        <span><b>${product.title}</b> × ${qty}</span>
        <span>${formatMoney(lineTotal)}</span>
      </div>
    `).join('');
    if (tax > 0){
      document.getElementById('confirmItems').innerHTML += `
        <div class="review-item-row">
          <span>Tax</span>
          <span>${formatMoney(tax)}</span>
        </div>
      `;
    }
    document.getElementById('confirmItems').innerHTML += `
      <div class="review-item-row">
        <span>Delivery</span>
        <span>${delivery > 0 ? formatMoney(delivery) : 'Free'}</span>
      </div>
    `;
    if (discount > 0){
      document.getElementById('confirmItems').innerHTML += `
        <div class="review-item-row">
          <span>Promo <b>${snapshotPromo.code}</b> applied</span>
          <span>-${formatMoney(discount)}</span>
        </div>
      `;
    }
    document.getElementById('confirmTotal').textContent = formatMoney(result.amount);
    document.getElementById('confirmAddress').innerHTML = `
      ${snapshotAddress.fullName}<br>
      ${snapshotAddress.address}<br>
      ${snapshotAddress.city}, ${snapshotAddress.postal}<br>
      ${snapshotAddress.country}<br>
      ${snapshotAddress.phone} · ${snapshotAddress.email}
    `;

    closeCheckout();
    successOverlay.classList.add('open');
    successOverlay.setAttribute('aria-hidden', 'false');

    const subNote = document.getElementById('successSubNote');
    subNote.textContent = currentUser
      ? 'Sandbox transaction — no real funds were moved. You can track this order any time from your account.'
      : 'Sandbox transaction — no real funds were moved. Sign in next time to save orders to your account and track them later.';
  });

  document.getElementById('successClose').addEventListener('click', () => {
    successOverlay.classList.remove('open');
    successOverlay.setAttribute('aria-hidden', 'true');
    stepShipping.reset();
    resetPaymentFields();
    document.getElementById('cartPromoInput').value = '';
    document.getElementById('reviewPromoInput').value = '';
    document.getElementById('cartPromoError').style.display = 'none';
    document.getElementById('reviewPromoError').style.display = 'none';
    syncPromoUI('cart');
    syncPromoUI('review');
  });

  // Escape key closes whatever is open
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (successOverlay.classList.contains('open')){
      successOverlay.classList.remove('open');
    } else if (checkoutOverlay.classList.contains('open')){
      closeCheckout();
    } else if (cartDrawer.classList.contains('open')){
      closeDrawer();
    }
  });

  updateCartBadge();
