// ============================================
  // USER AUTH + ACCOUNT DATA SCHEMA
  // ------------------------------------------------
  // Storage (browser localStorage, this device only):
  //   de_users   : User[]   { id, fullName, email, passwordHash, createdAt }
  //   de_orders  : Order[]  { id, userId, items, address, paymentMethod,
  //                           transactionId, subtotal, total, createdAt }
  //   de_session : string   currently signed-in user's id, or null
  //
  // IMPORTANT — this is a front-end demo, not a real auth system:
  // - passwordHash below is a toy, non-cryptographic hash used only so we
  //   never store a plaintext password string. It gives no real security.
  //   A production build needs a real backend that hashes passwords with
  //   bcrypt/Argon2, issues server-side sessions or signed tokens, and
  //   enforces access control server-side.
  // - "Isolation" here means the dashboard only ever reads orders whose
  //   userId matches the signed-in user's id — but because everything
  //   lives in this one browser's localStorage, it isolates *views*, not
  //   data across real separate users on separate devices. Real isolation
  //   requires a server that authorizes every request by session, not by
  //   trusting whatever the client claims its user id is.
  // ============================================

  const DB_USERS_KEY = 'de_users';
  const DB_ORDERS_KEY = 'de_orders';
  const DB_SESSION_KEY = 'de_session';

  function readJSON(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value){
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable — fail silently in this demo */ }
  }

  function getUsers(){ return readJSON(DB_USERS_KEY, []); }
  function saveUsers(users){ writeJSON(DB_USERS_KEY, users); }
  function getAllOrders(){ return readJSON(DB_ORDERS_KEY, []); }
  function saveOrder(order){
    const orders = getAllOrders();
    orders.push(order);
    writeJSON(DB_ORDERS_KEY, orders);
  }
  // Strict isolation point: every read of orders for display MUST filter by userId.
  function getOrdersForUser(userId){
    if (!userId) return [];
    return getAllOrders().filter(o => o.userId === userId);
  }

  // Toy hash — NOT cryptographically secure. Demo-only placeholder.
  function toyHash(str){
    let h = 0;
    for (let i = 0; i < str.length; i++){
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return 'h' + Math.abs(h).toString(36);
  }

  function getCurrentUser(){
    const id = localStorage.getItem(DB_SESSION_KEY);
    if (!id) return null;
    return getUsers().find(u => u.id === id) || null;
  }
  function setSession(userId){
    if (userId) localStorage.setItem(DB_SESSION_KEY, userId);
    else localStorage.removeItem(DB_SESSION_KEY);
  }

  function signUp({ fullName, email, password }){
    const users = getUsers();
    const emailNorm = email.trim().toLowerCase();
    if (users.some(u => u.email === emailNorm)){
      return { success: false, reason: 'An account with this email already exists.' };
    }
    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      fullName: fullName.trim(),
      email: emailNorm,
      passwordHash: toyHash(password),
      role: 'customer', // self-serve sign-up is always a customer account
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    setSession(user.id);
    return { success: true, user };
  }

  function signIn({ email, password }){
    const emailNorm = email.trim().toLowerCase();
    const user = getUsers().find(u => u.email === emailNorm);
    if (!user || user.passwordHash !== toyHash(password)){
      return { success: false, reason: 'Incorrect email or password.' };
    }
    setSession(user.id);
    return { success: true, user };
  }

  function signOutUser(){
    setSession(null);
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

  function openAccountEntry(){
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

  signinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signinEmail').value;
    const password = document.getElementById('signinPassword').value;
    const errEl = document.getElementById('signinError');
    const result = signIn({ email, password });
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

  signupForm.addEventListener('submit', (e) => {
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
    const result = signUp({ fullName, email, password });
    if (!result.success){
      errEl.textContent = result.reason;
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    signupForm.reset();
    refreshAccountUI();
    closeAuthOverlay();
    openDashboard();
  });

  // ---------- PROFILE DASHBOARD ----------
  const dashboardOverlay = document.getElementById('dashboardOverlay');

  function openDashboard(){
    const user = getCurrentUser();
    if (!user){ openAuthOverlay(); return; }

    document.getElementById('dashAvatar').textContent = user.fullName.trim().charAt(0).toUpperCase() || '?';
    document.getElementById('dashName').textContent = user.fullName;
    document.getElementById('dashEmail').textContent = user.email;
    const joined = new Date(user.createdAt);
    document.getElementById('dashMeta').textContent = 'Member since ' + joined.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });

    // Reset the Account Settings form to the current values each time it opens
    document.getElementById('settingsFullName').value = user.fullName;
    document.getElementById('settingsCurrentPassword').value = '';
    document.getElementById('settingsNewPassword').value = '';
    document.getElementById('settingsConfirmPassword').value = '';
    document.getElementById('nameUpdateError').style.display = 'none';
    document.getElementById('passwordUpdateError').style.display = 'none';
    document.getElementById('passwordUpdateSuccess').style.display = 'none';

    renderOrderHistory(user.id);

    dashboardOverlay.classList.add('open');
    dashboardOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeDashboard(){
    dashboardOverlay.classList.remove('open');
    dashboardOverlay.setAttribute('aria-hidden', 'true');
  }
  document.getElementById('dashboardClose').addEventListener('click', closeDashboard);

  function renderOrderHistory(userId){
    // Strictly scoped: only this user's own orders, never the full order table.
    const orders = getOrdersForUser(userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

  document.getElementById('signOutBtn').addEventListener('click', () => {
    signOutUser();
    refreshAccountUI();
    closeDashboard();
  });

  document.getElementById('orderHistoryEmptyLink').addEventListener('click', () => {
    closeDashboard();
  });

  // ============================================
  // ACCOUNT SETTINGS — update name / change password
  // Available to any signed-in account, including the admin — there's
  // no separate "admin settings" path, they use this same form.
  // ============================================
  document.getElementById('updateNameBtn').addEventListener('click', () => {
    const errEl = document.getElementById('nameUpdateError');
    const user = getCurrentUser();
    if (!user) return;

    const newName = document.getElementById('settingsFullName').value.trim();
    if (!newName){
      errEl.textContent = 'Enter a name.';
      errEl.style.display = 'block';
      return;
    }

    const users = getUsers();
    const record = users.find(u => u.id === user.id);
    if (!record) return;
    record.fullName = newName;
    saveUsers(users);

    errEl.style.display = 'none';
    document.getElementById('dashName').textContent = newName;
    document.getElementById('dashAvatar').textContent = newName.charAt(0).toUpperCase() || '?';
    refreshAccountUI();

    const btn = document.getElementById('updateNameBtn');
    const original = btn.textContent;
    btn.textContent = 'Saved ✓';
    setTimeout(() => { btn.textContent = original; }, 1200);
  });

  document.getElementById('updatePasswordBtn').addEventListener('click', () => {
    const errEl = document.getElementById('passwordUpdateError');
    const successEl = document.getElementById('passwordUpdateSuccess');
    errEl.style.display = 'none';
    successEl.style.display = 'none';

    const user = getCurrentUser();
    if (!user) return;

    const currentPassword = document.getElementById('settingsCurrentPassword').value;
    const newPassword = document.getElementById('settingsNewPassword').value;
    const confirmPassword = document.getElementById('settingsConfirmPassword').value;

    const users = getUsers();
    const record = users.find(u => u.id === user.id);
    if (!record) return;

    if (record.passwordHash !== toyHash(currentPassword)){
      errEl.textContent = 'Current password is incorrect.';
      errEl.style.display = 'block';
      return;
    }
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

    record.passwordHash = toyHash(newPassword);
    saveUsers(users);

    document.getElementById('settingsCurrentPassword').value = '';
    document.getElementById('settingsNewPassword').value = '';
    document.getElementById('settingsConfirmPassword').value = '';
    successEl.textContent = 'Password updated.';
    successEl.style.display = 'block';
  });

  // Initialize nav label on load (in case a session already exists)
  refreshAccountUI();
