import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation Logic
const isUrlValid = supabaseUrl && supabaseUrl.startsWith('https://');
const isKeyValid = supabaseKey && supabaseKey.length > 20; // Basic length check for JWT/Key

let client: SupabaseClient | null = null;
let error: string | null = null;
let configured = false;

// Determine state
if (!supabaseUrl && !supabaseKey) {
  // Case 1: Both missing -> Clean Demo Mode (No error message, just isSupabaseConfigured = false)
  configured = false;
} else if (!isUrlValid) {
  // Case 2: URL exists but is invalid
  error = "Erro de Configuração: 'VITE_SUPABASE_URL' deve ser uma URL válida começando com https://.";
  configured = false;
} else if (!isKeyValid) {
  // Case 3: Key exists but is invalid/short
  error = "Erro de Configuração: 'VITE_SUPABASE_ANON_KEY' parece inválida ou incompleta.";
  configured = false;
} else {
  // Case 4: Valid Configuration
  try {
    client = createClient(supabaseUrl, supabaseKey);
    configured = true;
  } catch (e: any) {
    error = `Erro Fatal Supabase: ${e.message}`;
    configured = false;
  }
}

export const configError = error;
export const isSupabaseConfigured = configured;

// We export null if not configured to prevent using a client with bad credentials.
// Consumers must check isSupabaseConfigured or configError before using.
export const supabase = client;