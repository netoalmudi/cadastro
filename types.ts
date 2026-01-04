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
  id: number;
  created_at: string;
  protocolo: string;
  rg_url?: string;
  passaporte_url?: string;
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