// ============================================
// APP BOOTSTRAP
// ------------------------------------------------
// Loads the signed-in session (if any) and the store's tax/delivery
// settings once on page load, then keeps the nav/account UI in sync
// whenever the auth state changes (sign in, sign out, token refresh —
// including in another tab).
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadSettings(),
    loadCurrentUser()
  ]);
  refreshAccountUI();
});

sb.auth.onAuthStateChange(async () => {
  await loadCurrentUser();
  refreshAccountUI();
});
