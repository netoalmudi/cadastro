import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente são carregadas do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL e Key são obrigatórios. Verifique seu arquivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
