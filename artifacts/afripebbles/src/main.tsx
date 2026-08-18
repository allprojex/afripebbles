import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// Every generated API hook attaches this token when present, on every
// route — public pages fire plenty of their own fetches (products,
// homepage-summary, site-settings...). The Supabase client must therefore
// stay out of the reach of an eager static import here: it's only ever
// dynamically imported (and only ever initializes/talks to Supabase Auth)
// once a request is actually made from within /admin.
setAuthTokenGetter(async () => {
  if (!window.location.pathname.startsWith('/admin')) return null;
  const { supabase } = await import('./admin/lib/supabaseClient');
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

createRoot(document.getElementById('root')!).render(<App />);
