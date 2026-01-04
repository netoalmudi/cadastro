import { createClient } from '@supabase/supabase-js';

// Função para obter variáveis de ambiente de forma segura
const getEnv = (key: string) => {
  // Verifica se import.meta.env existe (Padrão Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // Fallback seguro
  return undefined;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Verifica se as credenciais são válidas (não são undefined e não são placeholders)
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http');
const isValidKey = supabaseKey && supabaseKey.length > 0 && supabaseKey !== 'COLE_SUA_ANON_KEY_DO_SUPABASE_AQUI';

export const isSupabaseConfigured = !!(isValidUrl && isValidKey);

// Se as chaves não existirem ou forem inválidas, avisamos que o app rodará em modo local.
if (!isSupabaseConfigured) {
  console.warn("Supabase não configurado corretamente. O app rodará em MODO DEMONSTRAÇÃO (sem salvar dados). Verifique o arquivo .env.");
}

// Cria o client se as chaves existirem, senão cria um mock que falhará nas requisições reais
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://setup-missing.supabase.co', 'missing-key');
