// ============================================
// USER AUTH + ACCOUNT — backed by Supabase Auth + Postgres
// ------------------------------------------------
// currentUser (cached in memory, refreshed after every auth action):
//   { id, email, fullName, role, createdAt }
//
// Real security, for real this time:
// - Passwords are hashed and checked by Supabase Auth, never by us.
// - Sessions are real JWTs, stored by the Supabase client, auto-refreshed.
// - "role" (customer/admin) lives in the `profiles` table and is only
//   ever changeable by an admin via Row Level Security — not by editing
//   this page's JavaScript.
// - Every order/profile read below is filtered server-side by RLS, so a
//   customer physically cannot fetch another customer's data even if
//   they tamper with the client code.
// ============================================

let currentUser = null;

function getCurrentUser(){ return currentUser; }

// Reloads currentUser from the live Supabase session + profile row.
// Call this after sign in / sign up / sign out / profile edits.
async function loadCurrentUser(){
  const { data: { session } } = await sb.auth.getSession();
  if (!session){ currentUser = null; return null; }

  const { data: profile, error } = await sb
    .from('profiles')
    .select('full_name, role, created_at')
    .eq('id', session.user.id)
    .single();

  if (error || !profile){ currentUser = null; return null; }

  currentUser = {
    id: session.user.id,
    email: session.user.email,
    fullName: profile.full_name,
    role: profile.role,
    createdAt: profile.created_at
  };
  return currentUser;
}

function mapOrderRow(o){
  return {
    id: o.id,
    userId: o.user_id,
    items: o.items,
    address: o.address,
    paymentMethod: o.payment_method,
    transactionId: o.transaction_id,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    promoCode: o.promo_code,
    tax: Number(o.tax),
    delivery: Number(o.delivery),
    total: Number(o.total),
    status: o.status,
    createdAt: o.created_at
  };
}

// Admins see every order (RLS allows it); everyone else gets an empty set.
async function getAllOrders(){
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error){ console.error('getAllOrders', error); return []; }
  return data.map(mapOrderRow);
}

// Strict isolation point, enforced server-side by RLS: this can only
// ever return orders whose user_id = the currently signed-in user.
async function getOrdersForUser(userId){
  if (!userId) return [];
  const { data, error } = await sb
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error){ console.error('getOrdersForUser', error); return []; }
  return data.map(mapOrderRow);
}

async function saveOrder(order){
  const { error } = await sb.from('orders').insert({
    id: order.id,
    user_id: order.userId,
    items: order.items,
    address: order.address,
    payment_method: order.paymentMethod,
    transaction_id: order.transactionId,
    subtotal: order.subtotal,
    discount: order.discount,
    promo_code: order.promoCode,
    tax: order.tax,
    delivery: order.delivery,
    total: order.total,
    status: order.status
  });
  if (error){ console.error('saveOrder', error); return false; }
  return true;
}

async function signUp({ fullName, email, password }){
  const { error } = await sb.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: fullName.trim() } }
  });
  if (error) return { success: false, reason: error.message };
  await loadCurrentUser();
  return { success: true, user: currentUser };
}

async function signIn({ email, password }){
  const { error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });
  if (error) return { success: false, reason: 'Incorrect email or password.' };
  await loadCurrentUser();
  return { success: true, user: currentUser };
}

async function signOutUser(){
  await sb.auth.signOut();
  currentUser = null;
}

// ---------- NAV STATE ----------
function refreshAccountUI(){
  const user = getCurrentUser();
  const label = document.getElementById('navAccountLabel');
  if (label) label.textContent = user ? user.fullName.split(' ')[0] : 'Account';

  const isAdmin = !!(user && user.role === 'admin');
  const navAdmin = document.getElementById('navLinkAdmin');
  const mobileAdmin = document.getElementById('mobileAdminBtn');
  if (navAdmin) navAdmin.style.display = isAdmin ? 'inline' : 'none';
  if (mobileAdmin) mobileAdmin.style.display = isAdmin ? 'block' : 'none';
}

async function openAccountEntry(){
  const user = getCurrentUser();
  if (user) openDashboard();
  else openAuthOverlay();
}

document.getElementById('navAccountBtn').addEventListener('click', (e) => { e.preventDefault(); openAccountEntry(); });
document.getElementById('navLinkAccount').addEventListener('click', (e) => { e.preventDefault(); openAccountEntry(); });
document.getElementById('mobileAccountBtn').addEventListener('click', (e) => { e.preventDefault(); openAccountEntry(); });
document.getElementById('footerSignInBtn').addEventListener('click', (e) => { e.preventDefault(); openAccountEntry(); });

// ---------- AUTH OVERLAY ----------
const authOverlay = document.getElementById('authOverlay');
const signinForm = document.getElementById('signinForm');
const signupForm = document.getElementById('signupForm');

function openAuthOverlay(){
  authOverlay.classList.add('open');
  authOverlay.setAttribute('aria-hidden', 'false');
}
function closeAuthOverlay(){
  authOverlay.classList.remove('open');
  authOverlay.setAttribute('aria-hidden', 'true');
}
document.getElementById('authClose').addEventListener('click', closeAuthOverlay);

authOverlay.querySelectorAll('[data-auth-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.authTab;
    authOverlay.querySelectorAll('[data-auth-tab]').forEach(t => {
      t.classList.toggle('active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    signinForm.style.display = target === 'signin' ? 'block' : 'none';
    signupForm.style.display = target === 'signup' ? 'block' : 'none';
    document.getElementById('signinError').style.display = 'none';
    document.getElementById('signupError').style.display = 'none';
  });
});

signinForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signinEmail').value;
  const password = document.getElementById('signinPassword').value;
  const errEl = document.getElementById('signinError');
  const btn = signinForm.querySelector('button[type="submit"]');

  if (btn) btn.disabled = true;
  const result = await signIn({ email, password });
  if (btn) btn.disabled = false;

  if (!result.success){
    errEl.textContent = result.reason;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  signinForm.reset();
  refreshAccountUI();
  closeAuthOverlay();
  openDashboard();
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirm = document.getElementById('signupConfirm').value;
  const errEl = document.getElementById('signupError');

  if (password.length < 6){
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (password !== confirm){
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  const btn = signupForm.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  const result = await signUp({ fullName, email, password });
  if (btn) btn.disabled = false;

  if (!result.success){
    errEl.textContent = result.reason;
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  signupForm.reset();

  if (!result.user){
    // Supabase project has "confirm email" turned on — there's no session yet.
    closeAuthOverlay();
    showToast('Account created — check your email to confirm, then sign in.');
    return;
  }

  refreshAccountUI();
  closeAuthOverlay();
  openDashboard();
});

// ---------- PROFILE DASHBOARD ----------
const dashboardOverlay = document.getElementById('dashboardOverlay');

async function openDashboard(){
  const user = getCurrentUser();
  if (!user){ openAuthOverlay(); return; }

  document.getElementById('dashAvatar').textContent = user.fullName.trim().charAt(0).toUpperCase() || '?';
  document.getElementById('dashName').textContent = user.fullName;
  document.getElementById('dashEmail').textContent = user.email;
  const joined = new Date(user.createdAt);
  document.getElementById('dashMeta').textContent = 'Member since ' + joined.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

  document.getElementById('settingsFullName').value = user.fullName;
  document.getElementById('settingsCurrentPassword').value = '';
  document.getElementById('settingsNewPassword').value = '';
  document.getElementById('settingsConfirmPassword').value = '';
  document.getElementById('nameUpdateError').style.display = 'none';
  document.getElementById('passwordUpdateError').style.display = 'none';
  document.getElementById('passwordUpdateSuccess').style.display = 'none';

  dashboardOverlay.classList.add('open');
  dashboardOverlay.setAttribute('aria-hidden', 'false');

  const grid = document.getElementById('orderHistoryGrid');
  const empty = document.getElementById('orderHistoryEmpty');
  grid.innerHTML = '<p style="opacity:.6;">Loading your orders…</p>';
  grid.style.display = 'block';
  empty.style.display = 'none';

  await renderOrderHistory(user.id);
}
function closeDashboard(){
  dashboardOverlay.classList.remove('open');
  dashboardOverlay.setAttribute('aria-hidden', 'true');
}
document.getElementById('dashboardClose').addEventListener('click', closeDashboard);

async function renderOrderHistory(userId){
  const orders = await getOrdersForUser(userId);
  const grid = document.getElementById('orderHistoryGrid');
  const empty = document.getElementById('orderHistoryEmpty');

  if (orders.length === 0){
    grid.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }
  grid.style.display = 'flex';
  empty.style.display = 'none';

  grid.innerHTML = orders.map(o => `
    <div class="order-row">
      <span class="order-row-id">#${o.id}</span>
      <span class="order-row-date">${new Date(o.createdAt).toLocaleDateString()}</span>
      <span class="order-row-total">${formatMoney(o.total)}</span>
      <span class="order-row-status">${o.status || 'Processing'}</span>
      <div class="order-row-items">${o.items.map(i => `${i.title} × ${i.qty}`).join(' · ')}${o.promoCode ? ` · Promo: ${o.promoCode} (-${formatMoney(o.discount || 0)})` : ''}</div>
    </div>
  `).join('');
}

document.getElementById('signOutBtn').addEventListener('click', async () => {
  await signOutUser();
  refreshAccountUI();
  closeDashboard();
});

document.getElementById('orderHistoryEmptyLink').addEventListener('click', () => {
  closeDashboard();
});

// ============================================
// ACCOUNT SETTINGS — update name / change password
// Available to any signed-in account, including the admin.
// ============================================
document.getElementById('updateNameBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('nameUpdateError');
  const user = getCurrentUser();
  if (!user) return;

  const newName = document.getElementById('settingsFullName').value.trim();
  if (!newName){
    errEl.textContent = 'Enter a name.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('updateNameBtn');
  const original = btn.textContent;
  btn.disabled = true;

  const { error } = await sb.from('profiles').update({ full_name: newName }).eq('id', user.id);

  btn.disabled = false;

  if (error){
    errEl.textContent = 'Could not update your name — try again.';
    errEl.style.display = 'block';
    return;
  }

  errEl.style.display = 'none';
  await loadCurrentUser();
  document.getElementById('dashName').textContent = newName;
  document.getElementById('dashAvatar').textContent = newName.charAt(0).toUpperCase() || '?';
  refreshAccountUI();

  btn.textContent = 'Saved ✓';
  setTimeout(() => { btn.textContent = original; }, 1200);
});

document.getElementById('updatePasswordBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('passwordUpdateError');
  const successEl = document.getElementById('passwordUpdateSuccess');
  errEl.style.display = 'none';
  successEl.style.display = 'none';

  const user = getCurrentUser();
  if (!user) return;

  const currentPassword = document.getElementById('settingsCurrentPassword').value;
  const newPassword = document.getElementById('settingsNewPassword').value;
  const confirmPassword = document.getElementById('settingsConfirmPassword').value;

  if (newPassword.length < 6){
    errEl.textContent = 'New password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (newPassword !== confirmPassword){
    errEl.textContent = 'New password and confirmation do not match.';
    errEl.style.display = 'block';
    return;
  }

  const btn = document.getElementById('updatePasswordBtn');
  btn.disabled = true;

  // Re-verify the current password by attempting a real sign-in with it,
  // since Supabase Auth doesn't need it to update a password once you
  // already have a session — we ask for it anyway as a safety check.
  const { error: verifyError } = await sb.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });
  if (verifyError){
    btn.disabled = false;
    errEl.textContent = 'Current password is incorrect.';
    errEl.style.display = 'block';
    return;
  }

  const { error } = await sb.auth.updateUser({ password: newPassword });
  btn.disabled = false;

  if (error){
    errEl.textContent = error.message || 'Could not update your password.';
    errEl.style.display = 'block';
    return;
  }

  document.getElementById('settingsCurrentPassword').value = '';
  document.getElementById('settingsNewPassword').value = '';
  document.getElementById('settingsConfirmPassword').value = '';
  successEl.textContent = 'Password updated.';
  successEl.style.display = 'block';
});
