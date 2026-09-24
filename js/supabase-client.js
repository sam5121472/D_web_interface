// ============================================
// SUPABASE CLIENT
// ------------------------------------------------
// This is the one and only backend connection for the whole site.
// The URL + anon key below are PUBLIC by design — they identify which
// project to talk to, they are not a secret. Real access control is
// enforced on the server by Postgres Row Level Security policies (see
// /supabase/*.sql), not by hiding this key. Anyone can see this key by
// viewing source; that is expected and safe as long as RLS is on for
// every table (it is — see 02_security.sql).
// ============================================

const SUPABASE_URL = 'https://viqequtaazonfywilqvh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpcWVxdXRhYXpvbmZ5d2lscXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzgxODUsImV4cCI6MjEwMzk1NDE4NX0.9DhHn5AVQi-Pp9puCpq-S5FMKHXlhnoO5L0-vRpsX6w';

// `supabase` here is the global from the CDN script tag loaded in
// index.html just before this file. We name our client `sb` so it never
// collides with that global.
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
