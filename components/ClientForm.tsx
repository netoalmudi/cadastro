import React, { useState } from 'react';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import Select from './ui/Select';
import SignaturePad from './SignaturePad';
import { Camera, Upload, CheckCircle } from 'lucide-react';

// Interface para o estado do formulário
interface ClientFormState {
  nome: string;
  sobrenome: string;
  dataNascimento: string;
  sexo: string;
  cpf: string;
  rg: string;
  ufRg: string;
  passaporte: string;
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
  observacoes: string;
  assinatura: string | null;
  // Campos de arquivo (apenas armazenados no estado local por enquanto)
  arquivoRg: File | null;
  arquivoPassaporte: File | null;
}

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

const ClientForm: React.FC = () => {
  // Gera o protocolo visualmente: YYYYMM-XXXX
  const generateProtocol = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${year}${month}-${random}`;
  };

  const [protocolNumber, setProtocolNumber] = useState(generateProtocol());

  // Estado para controlar a re-renderização do SignaturePad ao limpar
  const [signatureKey, setSignatureKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

  const [formData, setFormData] = useState<ClientFormState>(initialFormData);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loadingAddress, setLoadingAddress] = useState(false);

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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      if (value && !validateCPF(value)) setErrors(prev => ({ ...prev, cpf: 'CPF inválido.' }));
    }
    if (name === 'cep') fetchAddressByCEP(value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'arquivoRg' | 'arquivoPassaporte') => {
    const file = e.target.files?.[0];
    if (file) {
      // Apenas salva o arquivo no estado local, sem compressão
      setFormData(prev => ({ ...prev, [fieldName]: file }));
    }
  };

  const handleSignature = (sig: string | null) => {
    setFormData(prev => ({ ...prev, assinatura: sig }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setSignatureKey(prev => prev + 1);
    setProtocolNumber(generateProtocol());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    if (window.confirm("Tem certeza que deseja limpar todos os campos do formulário?")) {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    // Validações básicas
    if (!formData.cpf) { newErrors.cpf = 'CPF é obrigatório.'; isValid = false; }
    else if (!validateCPF(formData.cpf)) { newErrors.cpf = 'CPF inválido.'; isValid = false; }

    if (!formData.celular) { newErrors.celular = 'Celular é obrigatório.'; isValid = false; }
    else if (formData.celular.length < 14) { newErrors.celular = 'Celular incompleto.'; isValid = false; }

    if (!formData.email) { newErrors.email = 'E-mail é obrigatório.'; isValid = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { newErrors.email = 'E-mail inválido.'; isValid = false; }

    if (!isValid) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    setIsSubmitting(true);

    // SIMULAÇÃO DE ENVIO
    setTimeout(() => {
      console.log("=== DADOS DO FORMULÁRIO (SIMULAÇÃO) ===");
      console.log(formData);
      console.log("Arquivos prontos para upload:", {
        rg: formData.arquivoRg?.name,
        passaporte: formData.arquivoPassaporte?.name
      });
      
      alert(`Cadastro simulado com sucesso! Protocolo: ${protocolNumber}\n\n(Nenhum dado foi salvo no banco de dados)`);
      
      resetForm();
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white shadow-sm sm:rounded-lg border border-gray-100 mt-6 mb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-primary pb-6 mb-8 gap-4">
        <div className="flex flex-col items-center md:items-start">
             <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Neto Almudi Viagens
             </h1>
             <h2 className="text-lg sm:text-xl font-medium text-primary">
                Cadastro de Cliente
             </h2>
        </div>
        
        <div className="bg-gray-100 px-4 py-2 rounded-full border border-gray-200 shadow-sm">
          <span className="font-bold text-gray-800">Protocolo: </span>
          <span className="font-mono text-primary font-medium">{protocolNumber}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        
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
          <label htmlFor="arquivoRg" className={`flex items-center justify-center gap-2 px-6 py-4 border border-dashed rounded cursor-pointer transition w-full sm:w-auto relative overflow-hidden ${formData.arquivoRg ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-opacity-80'}`}>
            {formData.arquivoRg ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Camera className="w-5 h-5 text-blue-500" />}
            <div className="flex flex-col items-center sm:items-start z-10">
              <span className="text-sm font-medium">{formData.arquivoRg ? 'Arquivo RG Selecionado' : 'Foto RG/CPF/CNH'}</span>
              {formData.arquivoRg && <span className="text-xs opacity-75 max-w-[200px] truncate">{formData.arquivoRg.name}</span>}
            </div>
            <input id="arquivoRg" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'arquivoRg')} onClick={(e) => (e.target as HTMLInputElement).value = ''} />
          </label>

          {/* PASSAPORTE UPLOAD */}
          <label htmlFor="arquivoPassaporte" className={`flex items-center justify-center gap-2 px-6 py-4 border border-dashed rounded cursor-pointer transition w-full sm:w-auto relative overflow-hidden ${formData.arquivoPassaporte ? 'border-green-500 bg-green-50 text-green-700' : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-opacity-80'}`}>
            {formData.arquivoPassaporte ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Upload className="w-5 h-5 text-blue-500" />}
            <div className="flex flex-col items-center sm:items-start z-10">
               <span className="text-sm font-medium">{formData.arquivoPassaporte ? 'Arquivo Passaporte Selecionado' : 'Foto Passaporte'}</span>
               {formData.arquivoPassaporte && <span className="text-xs opacity-75 max-w-[200px] truncate">{formData.arquivoPassaporte.name}</span>}
            </div>
            <input id="arquivoPassaporte" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e, 'arquivoPassaporte')} onClick={(e) => (e.target as HTMLInputElement).value = ''} />
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
           <SignaturePad key={signatureKey} onEnd={handleSignature} />
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 gap-4">
            <button type="button" onClick={handleClear} className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 px-8 rounded shadow-sm border border-gray-300 transition duration-200" disabled={isSubmitting}>
              Limpar
            </button>
            <button type="submit" className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow-lg transition duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando (Simulado)...' : 'Enviar'}
            </button>
        </div>

      </form>
    </div>
  );
};

export default ClientForm;