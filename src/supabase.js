import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      '(copy .env.example to .env locally, or add them as GitHub repository secrets for the deployed site).'
  )
}

// Exported both ways: App.jsx and the test files use the named import,
// so keep it alongside the default export.
export const supabase = createClient(url, anonKey)
export default supabase
