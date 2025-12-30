import React, { useState } from 'react';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import Select from './ui/Select';
import SignaturePad from './SignaturePad';
import { Camera, Upload } from 'lucide-react';

const ClientForm: React.FC = () => {
  const protocolNumber = "202512-7434"; // Mock protocol
  
  const [formData, setFormData] = useState({
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
    assinatura: null as string | null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignature = (sig: string | null) => {
    setFormData(prev => ({ ...prev, assinatura: sig }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form Submitted:", formData);
    alert("Dados salvos com sucesso! Verifique o console para detalhes.");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white shadow-sm sm:rounded-lg border border-gray-100 mt-6 mb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-primary pb-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2 sm:mb-0">
          Cadastro de Clientes
        </h1>
        <div className="bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
          <span className="font-bold text-gray-800">Protocolo: </span>
          <span className="font-mono text-gray-700">{protocolNumber}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        
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
            required
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
            className="md:col-span-1"
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
            required
            className="md:col-span-1"
          />
          <Input 
            label="E-mail*" 
            name="email" 
            type="email"
            placeholder="cliente@email.com" 
            value={formData.email} 
            onChange={handleChange}
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