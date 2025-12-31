// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // readonly API_KEY: string; // Removido se não for usar Gemini diretamente aqui, ou mantenha se necessário
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}