import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''
const useSupabase = process.env.REACT_APP_USE_SUPABASE === 'true'

export const hasSupabaseConfig =
  useSupabase && Boolean(supabaseUrl) && Boolean(supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null