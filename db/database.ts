import Dexie, { Table } from 'dexie';

// Define a interface para o registro do cliente no banco de dados
// Estendemos os campos básicos para incluir ID auto-incrementável e timestamp
export interface ClientRecord {
  id?: number;
  protocolo: string;
  createdAt: Date;
  
  // Dados Pessoais
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

  // Extras
  observacoes: string;
  assinatura: string | null;
  
  // Arquivos (IndexedDB suporta Blob/File nativamente)
  arquivoRg: File | null;
  arquivoPassaporte: File | null;
}

class ClientDatabase extends Dexie {
  // Tipagem da tabela 'clients'
  clients!: Table<ClientRecord>;

  constructor() {
    super('NetoAlmudiViagensDB');
    
    // Definição do Schema
    // Apenas campos que serão usados em pesquisas (WHERE) precisam ser indexados aqui.
    // '++id' significa chave primária auto-incrementável.
    (this as any).version(1).stores({
      clients: '++id, protocolo, cpf, email, nome, dataNascimento'
    });
  }
}

// Exporta uma instância única do banco de dados
export const db = new ClientDatabase();