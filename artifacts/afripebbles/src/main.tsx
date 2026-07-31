import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import { supabase } from './admin/lib/supabaseClient';

import './index.css';

// Every generated API hook attaches this token when present. Harmless on
// public pages (no header is sent when there's no session); this is what
// lets every /api/admin/* call carry the signed-in admin's bearer token.
setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

createRoot(document.getElementById('root')!).render(<App />);
