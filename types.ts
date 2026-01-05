import React from 'react';

export interface ClientFormData {
  // Identificação
  nome: string;
  sobrenome: string;
  dataNascimento: string;
  sexo: string;
  cpf: string;
  rg: string;
  ufRg: string;
  passaporte: string;

  // Endereço e Contato
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  complemento: string;
  cidade: string;
  estado: string;
  pais: string;
  celular: string;
  email: string;

  // Observações
  observacoes: string;
  
  // Assinatura
  assinatura: string | null; // Base64 string
}

// Extends FormData to include Database fields
export interface Client extends ClientFormData {
  id: string | number; // Alterado para aceitar UUID (string) ou ID numérico
  created_at: string;
  protocolo: string;
  rg_url?: string;
  passaporte_url?: string;
}

export interface Trip {
  id: number;
  created_at?: string;
  nome_viagem: string;
  origem: string;
  destino: string;
  data_ida: string;
  hora_ida: string;
  data_volta: string;
  hora_volta: string;
  roteiro: string;
  km_total: number | string;
  dias_total: number | string;
  
  // Financeiro
  valor_diaria?: number | string;
  valor_km?: number | string;
  valor_guia?: number | string;
  
  // Responsável
  contratante_id?: number | string | null;
}

export interface AirGroup {
  id: number;
  created_at?: string;
  nome_grupo: string;
  roteiro: string;
  origem?: string;
  destino?: string;
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  className?: string;
  error?: string;
};

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: { value: string; label: string }[];
  className?: string;
};