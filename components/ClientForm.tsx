import React, { useState } from 'react';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import Select from './ui/Select';
import SignaturePad from './SignaturePad';
import { Camera, Upload, ImageOff } from 'lucide-react';

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
  const protocolNumber = "202512-7434"; // Mock protocol
  
  // Safe resolution of logo URL to prevent crashes in environments where import.meta.url is problematic
  const getLogoUrl = () => {
    try {
      // Try to construct URL relative to current module
      if (typeof import.meta !== 'undefined' && import.meta.url) {
        return new URL('./image.png', import.meta.url).href;
      }
      // Fallback if import.meta is missing
      return 'https://raw.githubusercontent.com/oa-79/b95079a4-a151-4f10-b5ef-770c87d603a1/image.png';
    } catch (e) {
      // Fallback on any error (like Invalid URL)
      console.warn('Could not resolve local logo path:', e);
      return 'https://raw.githubusercontent.com/oa-79/b95079a4-a151-4f10-b5ef-770c87d603a1/image.png';
    }
  };

  const logoUrl = getLogoUrl();
  const [imageError, setImageError] = useState(false);

  const [formData, setFormData] = useState<ClientFormState>({
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
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loadingAddress, setLoadingAddress] = useState(false);

  const validateCPF = (cpf: string): boolean => {
    // Remove non-digits
    const cleanCPF = cpf.replace(/[^\d]/g, '');

    // Regex to check if it has 11 digits and is not a sequence of same digits
    if (!/^\d{11}$/.test(cleanCPF) || /^(\d)\1+$/.test(cleanCPF)) {
      return false;
    }

    // Checksum validation algorithm
    let sum = 0;
    let remainder;

    // Validate first digit
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;

    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

    // Validate second digit
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;

    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

    return true;
  };

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '') // Replace non-digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1'); // Limit to 11 digits formatted
  };

  const formatPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').substring(0, 11);
    return cleanValue
      .replace(/^(\d{2})(\d)/g, '($1) $2') // (XX) X...
      .replace(/(\d)(\d{4})$/, '$1-$2'); // ...X-XXXX
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };

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
        // Clear fields on error
        setFormData(prev => ({
          ...prev,
          endereco: '',
          bairro: '',
          cidade: '',
          estado: ''
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      setErrors(prev => ({ ...prev, cep: 'Erro ao buscar CEP.' }));
      // Clear fields on error
      setFormData(prev => ({
          ...prev,
          endereco: '',
          bairro: '',
          cidade: '',
          estado: ''
      }));
    } finally {
        setLoadingAddress(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    // Apply mask to CPF
    if (name === 'cpf') {
      newValue = formatCPF(value);
    }

    // Apply mask to Celular
    if (name === 'celular') {
      newValue = formatPhone(value);
    }

    // Apply mask to CEP
    if (name === 'cep') {
      newValue = formatCEP(value);
      // Clear fields if CEP is cleared
      if (newValue === '') {
        setFormData(prev => ({
            ...prev,
            [name]: newValue,
            endereco: '',
            bairro: '',
            cidade: '',
            estado: ''
        }));
        // Also clear error immediately if cleared
        setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.cep;
            return newErrors;
        });
        return;
      }
    }

    // Generic error clearing: if the user types in a field that has an error, clear that error
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Use type assertion to tell TypeScript that `name` is a valid key
    setFormData(prev => ({ ...prev, [name as keyof ClientFormState]: newValue }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      if (value && !validateCPF(value)) {
        setErrors(prev => ({ ...prev, cpf: 'CPF inválido.' }));
      }
      // Note: we don't clear error here on success because handleChange already clears it when typing, 
      // and we want to keep it clear.
    }

    if (name === 'cep') {
        fetchAddressByCEP(value);
    }
  };

  const handleSignature = (sig: string | null) => {
    setFormData(prev => ({ ...prev, assinatura: sig }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { [key: string]: string } = {};
    let isValid = true;

    // Validate Required Fields
    if (!formData.cpf) {
      newErrors.cpf = 'CPF é obrigatório.';
      isValid = false;
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido.';
      isValid = false;
    }

    if (!formData.celular) {
      newErrors.celular = 'Celular é obrigatório.';
      isValid = false;
    } else if (formData.celular.length < 14) { // Simple length check for (XX) XXXXX-XXXX
        newErrors.celular = 'Celular incompleto.';
        isValid = false;
    }

    if (!formData.email) {
      newErrors.email = 'E-mail é obrigatório.';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'E-mail inválido.';
        isValid = false;
    }

    if (!isValid) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      
      // Find the first error field to scroll to (optional user experience enhancement)
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementsByName(firstErrorField)[0];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      
      return;
    }

    console.log("Form Submitted:", formData);
    alert("Dados salvos com sucesso! Verifique o console para detalhes.");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white shadow-sm sm:rounded-lg border border-gray-100 mt-6 mb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-primary pb-6 mb-8 gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {!imageError ? (
              <img 
                src={logoUrl} 
                alt="Neto Almudi Viagens" 
                className="h-28 w-auto object-contain transition-transform hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex items-center gap-2 text-primary">
                 <ImageOff className="w-10 h-10 opacity-50" />
                 <h1 className="text-2xl sm:text-3xl font-bold text-center md:text-left">
                    Neto Almudi Viagens
                 </h1>
              </div>
            )}
            {!imageError && (
              <h1 className="text-2xl sm:text-3xl font-bold text-primary text-center md:text-left">
                Cadastro de Clientes
              </h1>
            )}
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
          <Input 
            label="Nome" 
            name="nome" 
            placeholder="Ex: João" 
            value={formData.nome} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Sobrenome" 
            name="sobrenome" 
            placeholder="Ex: Silva" 
            value={formData.sobrenome} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Data de Nascimento" 
            name="dataNascimento" 
            type="date"
            placeholder="DD/MM/AAAA" 
            value={formData.dataNascimento} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Select 
            label="Sexo" 
            name="sexo" 
            options={[
              { value: 'M', label: 'Masculino' },
              { value: 'F', label: 'Feminino' },
              { value: 'O', label: 'Outro' }
            ]}
            value={formData.sexo}
            onChange={handleChange}
            className="md:col-span-1"
          />
          
          <Input 
            label="CPF*" 
            name="cpf" 
            placeholder="000.000.000-00" 
            value={formData.cpf} 
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.cpf}
            required
            maxLength={14}
            className="md:col-span-1"
          />
          <Input 
            label="RG" 
            name="rg" 
            value={formData.rg} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="UF RG" 
            name="ufRg" 
            placeholder="Ex: SESP-PR" 
            value={formData.ufRg} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Passaporte" 
            name="passaporte" 
            placeholder="Ex: FA123456" 
            value={formData.passaporte} 
            onChange={handleChange}
            className="md:col-span-1"
          />
        </div>

        {/* ENDEREÇO E CONTATO */}
        <SectionHeader title="Endereço e Contato" />

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Input 
            label="CEP" 
            name="cep" 
            placeholder="00000-000" 
            value={formData.cep} 
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.cep}
            maxLength={9}
            className="md:col-span-1"
            disabled={loadingAddress}
          />
          <Input 
            label="Endereço" 
            name="endereco" 
            value={formData.endereco} 
            onChange={handleChange}
            className="md:col-span-2"
          />
          <Input 
            label="Número" 
            name="numero" 
            value={formData.numero} 
            onChange={handleChange}
            className="md:col-span-1"
          />

          <Input 
            label="Bairro" 
            name="bairro" 
            value={formData.bairro} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Complemento" 
            name="complemento" 
            value={formData.complemento} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Cidade" 
            name="cidade" 
            value={formData.cidade} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Estado" 
            name="estado" 
            value={formData.estado} 
            onChange={handleChange}
            className="md:col-span-1"
          />

          <Input 
            label="País" 
            name="pais" 
            value={formData.pais} 
            onChange={handleChange}
            className="md:col-span-1"
          />
          <Input 
            label="Celular*" 
            name="celular" 
            placeholder="(00) 00000-0000" 
            value={formData.celular} 
            onChange={handleChange}
            error={errors.celular}
            required
            maxLength={15}
            className="md:col-span-1"
          />
          <Input 
            label="E-mail*" 
            name="email" 
            type="email"
            placeholder="cliente@email.com" 
            value={formData.email} 
            onChange={handleChange}
            error={errors.email}
            required
            className="md:col-span-2"
          />
        </div>

        {/* DOCUMENTOS */}
        <SectionHeader title="Documentos" />

        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center justify-center gap-2 px-6 py-4 border border-gray-300 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer transition w-full sm:w-auto">
            <Camera className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium">Foto RG/CPF/CNH (Máx 2MB)</span>
            <input type="file" className="hidden" accept="image/*" />
          </label>

          <label className="flex items-center justify-center gap-2 px-6 py-4 border border-dashed border-blue-300 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition w-full sm:w-auto">
            <Upload className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">Foto Passaporte (Máx 2MB)</span>
            <input type="file" className="hidden" accept="image/*" />
          </label>
        </div>

        {/* OBSERVAÇÕES */}
        <SectionHeader title="Observações" />
        
        <div className="w-full">
          <textarea
            name="observacoes"
            rows={4}
            className="w-full border border-gray-300 rounded p-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm bg-white"
            placeholder="Informações adicionais"
            value={formData.observacoes}
            onChange={handleChange}
          ></textarea>
        </div>

        {/* ASSINATURA DIGITAL */}
        <SectionHeader title="Assinatura Digital" />
        
        <div className="mb-8">
           <SignaturePad onEnd={handleSignature} />
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="bg-primary hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow-lg transition duration-200 transform hover:-translate-y-0.5"
            >
              Salvar Cadastro
            </button>
        </div>

      </form>
    </div>
  );
};

export default ClientForm;