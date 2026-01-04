import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE)
// ==============================================================================
// Para configurar, cole sua URL e KEY diretamente entre as aspas abaixo.
// Não é necessário arquivo .env.

const SUPABASE_URL: string = "https://tggeygqmtgdlsevstbzc.supabase.co"; 
// Exemplo: "https://xkxkxkxkxkxkxk.supabase.co"

const SUPABASE_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZ2V5Z3FtdGdkbHNldnN0YnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDEwMDgsImV4cCI6MjA4MTkxNzAwOH0.Jkoxpey0lnWhQ_SXOnyUAfrVsZdQkzK-ZcgwhtLWDjM"; 
// Exemplo: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// ==============================================================================

const hasUrl = SUPABASE_URL.length > 0;
const hasKey = SUPABASE_KEY.length > 0;

export const isSupabaseConfigured = Boolean(hasUrl && hasKey);

export const configError = isSupabaseConfigured
  ? null
  : "Credenciais ausentes. Abra o arquivo 'db/database.ts' e preencha SUPABASE_URL e SUPABASE_KEY.";

// Cria o cliente se as chaves existirem, caso contrário exporta null
// O ClientForm lidará com o null entrando em Modo Demonstração
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;