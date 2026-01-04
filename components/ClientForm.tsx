import React, { useState, useEffect } from 'react';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import Select from './ui/Select';
import SignaturePad from './SignaturePad';
import { Camera, Upload, CheckCircle, Loader2, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import { supabase, isSupabaseConfigured, configError } from '../db/database';
import { Client, ClientFormData } from '../types';

// Interface para resposta do ViaCEP
interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

interface ClientFormProps {
  initialData?: Client | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  isAdmin?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSuccess, onCancel, isAdmin = false }) => {
  // Gera o protocolo visualmente: YYYYMM-XXXX
  const generateProtocol = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${year}${month}-${random}`;
  };

  const [protocolNumber, setProtocolNumber] = useState(initialData?.protocolo || generateProtocol());

  // Estado para controlar a re-renderização do SignaturePad ao limpar
  const [signatureKey, setSignatureKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para controlar qual arquivo está sendo processado (comprimido)
  const [processingFile, setProcessingFile] = useState<'arquivoRg' | 'arquivoPassaporte' | null>(null);
  
  const initialFormData: ClientFormState = {
    nome: '',
    sobrenome: '',
    dataNascimento: '',
    sexo: '',
    cpf: '',
    rg: '',
    ufRg: '',
    passaporte: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    complemento: '',
    cidade: '',
    estado: '',
    pais: 'Brasil',
    celular: '',
    email: '',
    observacoes: '',
    assinatura: null,
    arquivoRg: null,
    arquivoPassaporte: null,
  };

  interface ClientFormState extends ClientFormData {
    arquivoRg: File | null;
    arquivoPassaporte: File | null;
  }

  // Se houver initialData (Modo Edição), popula o form
  const getInitialState = (): ClientFormState => {
    if (initialData) {
      return {
        ...initialFormData, // Defaults
        ...initialData, // Database values
        arquivoRg: null, // Files reset on edit unless re-uploaded
        arquivoPassaporte: null
      };
    }
    return initialFormData;
  };

  const [formData, setFormData] = useState<ClientFormState>(getInitialState);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Reinicia o form se mudar de "Novo" para "Editar" ou vice-versa
  useEffect(() => {
    setFormData(getInitialState());
    setProtocolNumber(initialData?.protocolo || generateProtocol());
    setSignatureKey(prev => prev + 1);
  }, [initialData]);

  // --- Validações e Formatações ---

  const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    if (!/^\d{11}$/.test(cleanCPF) || /^(\d)\1+$/.test(cleanCPF)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').substring(0, 11);
    return cleanValue
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d)(\d{4})$/, '$1-$2');
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

  const formatDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  // --- Handlers ---

  const fetchAddressByCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setLoadingAddress(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      const data = await response.json() as ViaCepResponse;

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          estado: data.uf,
          pais: 'Brasil'
        }));
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.cep;
            return newErrors;
        });
      } else {
        setErrors(prev => ({ ...prev, cep: 'CEP não encontrado.' }));
        setFormData(prev => ({ ...prev, endereco: '', bairro: '', cidade: '', estado: '' }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP.' }));
    } finally {
        setLoadingAddress(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'cpf') newValue = formatCPF(value);
    if (name === 'celular') newValue = formatPhone(value);
    if (name === 'cep') {
      newValue = formatCEP(value);
      if (newValue === '') {
        setFormData(prev => ({ ...prev, [name]: newValue, endereco: '', bairro: '', cidade: '', estado: '' }));
        return;
      }
    }
    if (name === 'dataNascimento') newValue = formatDate(value);
    if (['ufRg', 'nome', 'sobrenome', 'passaporte'].includes(name)) newValue = value.toUpperCase();

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData(prev => ({ ...prev, [name as keyof ClientFormState]: newValue }));
  };

  const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Validação de CPF (Formato e Banco de Dados)
    if (name === 'cpf') {
      // 1. Validação de Formato
      if (value && !validateCPF(value)) {
        setErrors(prev => ({ ...prev, cpf: 'CPF inválido.' }));
        return;
      }

      // 2. Validação de Duplicidade no Banco (Instantânea)
      if (value && isSupabaseConfigured && supabase) {
        try {
          let query = supabase
            .from('clientes')
            .select('id', { count: 'exact', head: true })
            .eq('cpf', value);

          // Se estiver editando, exclui o próprio ID da verificação (para não dar erro no próprio cadastro)
          if (initialData?.id) {
            query = query.neq('id', initialData.id);
          }

          const { count, error } = await query;

          if (!error && count !== null && count > 0) {
             setErrors(prev => ({ ...prev, cpf: 'CPF já cadastrado.' }));
             alert("Este CPF já consta em nosso banco de dados.\n\nPara alterações ou dúvidas, entre em contato com o número (41) 99813-6567 - Neto Almudi.");
          }
        } catch (err) {
          console.error("Erro ao verificar CPF:", err);
        }
      }
    }

    if (name === 'cep') fetchAddressByCEP(value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'arquivoRg' | 'arquivoPassaporte') => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingFile(fieldName);
      try {
        // Redimensiona a imagem para no máximo 1MB
        const compressedFile = await compressImage(file, 1);
        setFormData(prev => ({ ...prev, [fieldName]: compressedFile }));
      } catch (error) {
        console.error("Erro ao processar imagem", error);
        // Em caso de erro, salva o original
        setFormData(prev => ({ ...prev, [fieldName]: file }));
      } finally {
        setProcessingFile(null);
      }
    }
  };

  const handleSignature = (sig: string | null) => {
    setFormData(prev => ({ ...prev, assinatura: sig }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setSignatureKey(prev => prev + 1);
    const newProtocol = generateProtocol();
    setProtocolNumber(newProtocol);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os campos do formulário?")) {
      resetForm();
    }
  };

  // Função auxiliar para upload de arquivos
  const uploadFile = async (file: File, folder: string) => {
    if (!isSupabaseConfigured || !supabase) return null;

    const fileExt = file.name.split('.').pop();
    // Nome único para evitar sobrescrita
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documentos-clientes') // Nome do bucket criado no passo anterior
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('documentos-clientes')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Bloqueia envio se houver erro de configuração
    if (configError) {
      alert("Corrija os erros de configuração no arquivo .env antes de enviar.");
      return;
    }

    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    // Validações básicas
    if (!formData.cpf) { newErrors.cpf = 'CPF é obrigatório.'; isValid = false; }
    else if (!validateCPF(formData.cpf)) { newErrors.cpf = 'CPF inválido.'; isValid = false; }
    // Se o erro de duplicidade já foi setado no onBlur, ele persistirá aqui se o usuário não mudar o CPF
    if (errors.cpf === 'CPF já cadastrado.') { isValid = false; }

    if (!formData.celular) { newErrors.celular = 'Celular é obrigatório.'; isValid = false; }
    else if (formData.celular.length < 14) { newErrors.celular = 'Celular incompleto.'; isValid = false; }

    if (!formData.email) { newErrors.email = 'E-mail é obrigatório.'; isValid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { newErrors.email = 'E-mail inválido.'; isValid = false; }

    if (!isValid) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      
      // Se já sabemos que o CPF é duplicado, mostramos o alerta novamente para garantir
      if (errors.cpf === 'CPF já cadastrado.' || newErrors.cpf === 'CPF já cadastrado.') {
         alert("Este CPF já consta em nosso banco de dados.\n\nPara alterações ou dúvidas, entre em contato com o número (41) 99813-6567 - Neto Almudi.");
      }

      const firstErrorField = Object.keys(newErrors)[0] || (errors.cpf ? 'cpf' : '');
      if (firstErrorField) {
        const element = document.getElementsByName(firstErrorField)[0];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // MOCK: Se o Supabase não estiver configurado (Modo Demo), simula o sucesso
      if (!isSupabaseConfigured || !supabase) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simula delay de rede
        alert(`[MODO DEMONSTRAÇÃO]\nCadastro ${initialData ? 'atualizado' : 'realizado'} com sucesso!`);
        if (onSuccess) onSuccess();
        else resetForm();
        return;
      }

      // Revalidação final de duplicidade (segurança extra contra race conditions)
      // ... (código existente de verificação mantido abaixo, apenas por segurança)
      let cpfQuery = supabase
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq('cpf', formData.cpf);

      if (initialData?.id) {
        cpfQuery = cpfQuery.neq('id', initialData.id);
      }

      const { count, error: countError } = await cpfQuery;

      if (!countError && count !== null && count > 0) {
        setIsSubmitting(false);
        setErrors(prev => ({ ...prev, cpf: 'CPF já cadastrado.' }));
        alert("Este CPF já consta em nosso banco de dados.\n\nPara alterações ou dúvidas, entre em contato com o número (41) 99813-6567 - Neto Almudi.");
        return;
      }
      
      // ... Resto do código de upload e salvamento
      
      let rgUrl = initialData?.rg_url || null;
      let passaporteUrl = initialData?.passaporte_url || null;

      if (formData.arquivoRg) {
         rgUrl = await uploadFile(formData.arquivoRg, 'rg');
      }
      if (formData.arquivoPassaporte) {
         passaporteUrl = await uploadFile(formData.arquivoPassaporte, 'passaporte');
      }

      const payload = {
        protocolo: protocolNumber,
        nome: formData.nome,
        sobrenome: formData.sobrenome,
        data_nascimento: formData.dataNascimento,
        sexo: formData.sexo,
        cpf: formData.cpf,
        rg: formData.rg,
        uf_rg: formData.ufRg,
        passaporte: formData.passaporte,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        complemento: formData.complemento,
        cidade: formData.cidade,
        estado: formData.estado,
        pais: formData.pais,
        celular: formData.celular,
        email: formData.email,
        observacoes: formData.observacoes,
        assinatura: formData.assinatura,
        rg_url: rgUrl,
        passaporte_url: passaporteUrl
      };

      if (initialData && initialData.id) {
        const { error: updateError } = await supabase
          .from('clientes')
          .update(payload)
          .eq('id', initialData.id);

        if (updateError) throw updateError;
        alert('Cadastro atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('clientes')
          .insert([payload]);

        if (insertError) throw insertError;
        alert(`Cadastro realizado com sucesso! Protocolo: ${protocolNumber}`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        resetForm();
      }

    } catch (error: any) {
      console.error("Erro ao enviar formulário:", error);
      alert('Erro ao realizar operação: ' + (error.message || 'Ocorreu um erro inesperado.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white shadow-sm sm:rounded-lg border border-gray-100 mt-6 mb-12 relative">
      
      {/* Botão de Voltar (Apenas Admin Mode) */}
      {isAdmin && onCancel && (
        <button 
          onClick={onCancel}
          className="absolute top-8 left-8 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          title="Voltar"
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {/* Header */}
      <div className={`flex flex-col md:flex-row justify-between items-center border-b-2 border-primary pb-6 mb-8 gap-4 ${isAdmin ? 'pl-12' : ''}`}>
        <div className="flex flex-col items-center md:items-start">
             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isAdmin ? 'Área Administrativa' : 'Neto Almudi Viagens'}
             </h1>
             <h2 className="text-lg sm:text-xl font-medium text-primary">
                {initialData ? 'Editar Cadastro' : 'Cadastro de Cliente'}
             </h2>
        </div>
        
        <div className="bg-gray-100 px-4 py-2 rounded-full border border-gray-200 shadow-sm">
          <span className="font-bold text-gray-800">Protocolo: </span>
          <span className="font-mono text-primary font-medium">{protocolNumber}</span>
        </div>
      </div>

      {/* ERROR BANNER (Invalid Config) */}
      {configError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3">
          <XCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Erro de Configuração</p>
            <p className="text-sm">{configError}</p>
            <p className="text-xs mt-1 text-red-600">Verifique o arquivo <code>.env</code> na raiz do projeto.</p>
          </div>
        </div>
      )}

      {/* DEMO BANNER (Missing Config - Demo Mode) */}
      {!isSupabaseConfigured && !configError && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Modo de Demonstração</p>
            <p className="text-sm">O banco de dados não está configurado. Os dados preenchidos serão apenas simulados.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className={configError ? 'opacity-50 pointer-events-none' : ''}>
        
        {/* IDENTIFICAÇÃO */}
        <SectionHeader title="Identificação" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Input label="Nome" name="nome" placeholder="Ex: João" value={formData.nome} onChange={handleChange} className="md:col-span-1" />
          <Input label="Sobrenome" name="sobrenome" placeholder="Ex: Silva" value={formData.sobrenome} onChange={handleChange} className="md:col-span-1" />
          <Input label="Data de Nascimento" name="dataNascimento" type="tel" placeholder="DD/MM/AAAA" value={formData.dataNascimento} onChange={handleChange} maxLength={10} className="md:col-span-1" />
          <Select label="Sexo" name="sexo" options={[{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]} value={formData.sexo} onChange={handleChange} className="md:col-span-1" />
          
          <Input label="CPF*" name="cpf" placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} onBlur={handleBlur} error={errors.cpf} required maxLength={14} className="md:col-span-1" />
          <Input label="RG" name="rg" value={formData.rg} onChange={handleChange} className="md:col-span-1" />
          <Input label="UF RG" name="ufRg" placeholder="Ex: SESP-PR" value={formData.ufRg} onChange={handleChange} className="md:col-span-1" />
          <Input label="Passaporte" name="passaporte" placeholder="Ex: FA123456" value={formData.passaporte} onChange={handleChange} className="md:col-span-1" />
        </div>

        {/* ENDEREÇO E CONTATO */}
        <SectionHeader title="Endereço e Contato" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Input label="CEP" name="cep" placeholder="00000-000" value={formData.cep} onChange={handleChange} onBlur={handleBlur} error={errors.cep} maxLength={9} className="md:col-span-1" disabled={loadingAddress} />
          <Input label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} className="md:col-span-2" />
          <Input label="Número" name="numero" value={formData.numero} onChange={handleChange} className="md:col-span-1" />
          <Input label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} className="md:col-span-1" />
          <Input label="Complemento" name="complemento" value={formData.complemento} onChange={handleChange} className="md:col-span-1" />
          <Input label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} className="md:col-span-1" />
          <Input label="Estado" name="estado" value={formData.estado} onChange={handleChange} className="md:col-span-1" />
          <Input label="País" name="pais" value={formData.pais} onChange={handleChange} className="md:col-span-1" />
          <Input label="Celular*" name="celular" placeholder="(00) 00000-0000" value={formData.celular} onChange={handleChange} error={errors.celular} required maxLength={15} className="md:col-span-1" />
          <Input label="E-mail*" name="email" type="email" placeholder="cliente@email.com" value={formData.email} onChange={handleChange} error={errors.email} required className="md:col-span-2" />
        </div>

        {/* DOCUMENTOS */}
        <SectionHeader title="Documentos" />

        <div className="flex flex-col sm:flex-row gap-4">
          {/* RG UPLOAD */}
          <label htmlFor="arquivoRg" className={`flex items-center justify-center gap-2 px-6 py-4 border border-dashed rounded cursor-pointer transition w-full sm:w-auto relative overflow-hidden ${formData.arquivoRg || initialData?.rg_url ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-opacity-80'}`}>
            {processingFile === 'arquivoRg' ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : formData.arquivoRg ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : initialData?.rg_url ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Camera className="w-5 h-5 text-blue-500" />
            )}
            <div className="flex flex-col items-center sm:items-start z-10">
              <span className="text-sm font-medium">
                {processingFile === 'arquivoRg' 
                  ? 'Processando...' 
                  : formData.arquivoRg 
                    ? 'Novo Arquivo Selecionado' 
                    : initialData?.rg_url 
                      ? 'Arquivo já enviado (clique para alterar)'
                      : 'Foto RG/CPF/CNH'}
              </span>
            </div>
            <input id="arquivoRg" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'arquivoRg')} onClick={(e) => (e.target as HTMLInputElement).value = ''} disabled={!!processingFile} />
          </label>

          {/* PASSAPORTE UPLOAD */}
          <label htmlFor="arquivoPassaporte" className={`flex items-center justify-center gap-2 px-6 py-4 border border-dashed rounded cursor-pointer transition w-full sm:w-auto relative overflow-hidden ${formData.arquivoPassaporte || initialData?.passaporte_url ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-opacity-80'}`}>
            {processingFile === 'arquivoPassaporte' ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : formData.arquivoPassaporte ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : initialData?.passaporte_url ? (
               <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <Upload className="w-5 h-5 text-blue-500" />
            )}
            <div className="flex flex-col items-center sm:items-start z-10">
               <span className="text-sm font-medium">
                 {processingFile === 'arquivoPassaporte' 
                   ? 'Processando...' 
                   : formData.arquivoPassaporte 
                     ? 'Novo Arquivo Selecionado' 
                     : initialData?.passaporte_url 
                       ? 'Arquivo já enviado (clique para alterar)'
                       : 'Foto Passaporte'}
               </span>
            </div>
            <input id="arquivoPassaporte" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'arquivoPassaporte')} onClick={(e) => (e.target as HTMLInputElement).value = ''} disabled={!!processingFile} />
          </label>
        </div>

        {/* OBSERVAÇÕES */}
        <SectionHeader title="Observações" />
        <div className="w-full">
          <textarea name="observacoes" rows={4} className="w-full border border-gray-300 rounded p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm bg-white" placeholder="Informações adicionais" value={formData.observacoes} onChange={handleChange}></textarea>
        </div>

        {/* ASSINATURA DIGITAL */}
        <SectionHeader title="Assinatura Digital" />
        <div className="mb-8">
            {initialData?.assinatura && !formData.assinatura ? (
                <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center bg-gray-50 mb-4">
                    <p className="text-sm text-gray-500 mb-2">Assinatura Atual:</p>
                    <img src={initialData.assinatura} alt="Assinatura Cliente" className="h-16 mx-auto object-contain"/>
                    <p className="text-xs text-gray-400 mt-2">Assine abaixo apenas se desejar substituir a assinatura atual.</p>
                </div>
            ) : null}
           <SignaturePad key={signatureKey} onEnd={handleSignature} />
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 gap-4">
            {onCancel && (
              <button type="button" onClick={onCancel} className="bg-white hover:bg-gray-100 text-gray-700 font-bold py-3 px-8 rounded shadow-sm border border-gray-300 transition duration-200" disabled={isSubmitting}>
                Cancelar
              </button>
            )}
            
            {!onCancel && (
              <button type="button" onClick={handleClear} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 px-8 rounded shadow-sm border border-gray-300 transition duration-200" disabled={isSubmitting || !!processingFile || !!configError}>
                Limpar
              </button>
            )}

            <button type="submit" className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow-lg transition duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting || !!processingFile || !!configError}>
              {isSubmitting ? 'Salvando...' : initialData ? 'Atualizar Cadastro' : 'Enviar'}
            </button>
        </div>

      </form>
    </div>
  );
};

export default ClientForm;