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

// Se as chaves não existirem, logamos um aviso mas não quebramos a aplicação imediatamente.
// Isso permite que a UI carregue para debugging.
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL e Key não encontradas. Verifique o arquivo .env e reinicie o servidor.");
}

// Cria o client se as chaves existirem, senão cria um mock que falhará nas requisições mas não no boot
export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : createClient('https://setup-missing.supabase.co', 'missing-key');
