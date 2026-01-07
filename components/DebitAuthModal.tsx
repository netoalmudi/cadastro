import React, { useState, useEffect } from 'react';
import { X, Printer, User, CheckSquare, Square, Upload, Image as ImageIcon, CreditCard } from 'lucide-react';
import { Client, AirGroup } from '../types';
import { supabase } from '../db/database';

interface DebitAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: AirGroup | null;
}

const DebitAuthModal: React.FC<DebitAuthModalProps> = ({ isOpen, onClose, group }) => {
  const [passengers, setPassengers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [titularId, setTitularId] = useState<string>('manual');
  const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);
  
  // Image States (URL or Base64)
  const [imgDoc, setImgDoc] = useState<string>('');
  const [imgCardFront, setImgCardFront] = useState<string>('');
  const [imgCardBack, setImgCardBack] = useState<string>('');

  const [formData, setFormData] = useState({
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    cartaoTipo: '',
    numeroCartao: '',
    bancoEmissor: '',
    validadeCartao: '',
    codigoSeguranca: '',
    
    // Titular
    nomeTitular: '',
    cpfTitular: '',
    rgTitular: '',
    dataNascimentoTitular: '',
    telefoneTitular: '',
    
    // Viagem
    ciaAerea: '',
    trecho: '',
    dataViagem: '',
    codAut: '',
    dataAuth: '',
    
    // Valores
    moeda: 'BRL', // BRL ou USD
    valorTotal: '',
    valorTaxas: '',
    valorParcela: '',
    numParcelas: '',
  });

  // Carregar passageiros do grupo ao abrir
  useEffect(() => {
    if (isOpen && group) {
      fetchPassengers();
      // Preencher dados padrões do grupo
      setFormData(prev => ({
        ...prev,
        trecho: `${group.origem || ''} / ${group.destino || ''}`,
        dataEmissao: new Date().toLocaleDateString('pt-BR')
      }));
      setTitularId('manual');
      setSelectedTravelers([]);
      setImgDoc('');
      setImgCardFront('');
      setImgCardBack('');
    }
  }, [isOpen, group]);

  const fetchPassengers = async () => {
    if (!group || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('grupo_aereo_clientes')
      .select('cliente_id, clientes(*)')
      .eq('grupo_id', group.id);

    if (data && !error) {
      // Mapeia os dados e ordena por nome
      const formatted = data
        .map((d: any) => ({
             ...d.clientes,
             dataNascimento: d.clientes.data_nascimento || d.clientes.dataNascimento,
             ufRg: d.clientes.uf_rg || d.clientes.ufRg
        }))
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      setPassengers(formatted);
    }
    setLoading(false);
  };

  const handleTitularChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setTitularId(id);

    if (id === 'manual') {
      setFormData(prev => ({
        ...prev,
        nomeTitular: '',
        cpfTitular: '',
        rgTitular: '',
        dataNascimentoTitular: '',
        telefoneTitular: ''
      }));
      setImgDoc('');
      setImgCardFront('');
      setImgCardBack('');
    } else {
      const passenger = passengers.find(p => p.id.toString() === id);
      if (passenger) {
        setFormData(prev => ({
          ...prev,
          nomeTitular: `${passenger.nome} ${passenger.sobrenome}`.toUpperCase(),
          cpfTitular: passenger.cpf,
          rgTitular: passenger.rg || '',
          dataNascimentoTitular: passenger.dataNascimento || '',
          telefoneTitular: passenger.celular
        }));

        // Lógica para carregar as imagens do banco
        // Verifica primeiro rg_url, se não tiver, tenta passaporte_url
        const docImage = passenger.rg_url || passenger.passaporte_url || '';
        const cardFront = passenger.cartao_credito_frente_url || '';
        const cardBack = passenger.cartao_credito_verso_url || '';

        setImgDoc(docImage);
        setImgCardFront(cardFront);
        setImgCardBack(cardBack);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Processar upload de imagem local para Base64 (para exibição na impressão)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setImage: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTraveler = (name: string) => {
    if (selectedTravelers.includes(name)) {
      setSelectedTravelers(prev => prev.filter(t => t !== name));
    } else {
      if (selectedTravelers.length >= 6) {
        alert("Máximo de 6 viajantes permitidos.");
        return;
      }
      setSelectedTravelers(prev => [...prev, name]);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=900,height=1000');
    if (!printWindow) return;

    // Definição da cor Azul
    const BLUE_COLOR = '#0056b3';

    // Helper para checkbox visual - Usando 'X' para marcar
    const CheckBox = (checked: boolean, label: string) => `
      <div style="display: flex; align-items: center; gap: 5px; margin-right: 15px;">
        <div style="width: 18px; height: 18px; border: 2px solid ${BLUE_COLOR}; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; color: ${BLUE_COLOR}; line-height: 1;">
          ${checked ? 'X' : '&nbsp;'}
        </div>
        <span style="font-weight: bold; font-size: 12px;">${label}</span>
      </div>
    `;

    // Helper para Input visual
    const InputBox = (label: string, value: string, width: string = '100%') => `
      <div style="display: flex; flex-direction: row; align-items: flex-end; width: ${width}; margin-bottom: 5px;">
        <span style="font-weight: bold; font-size: 11px; white-space: nowrap; margin-right: 5px;">${label}</span>
        <div style="border: 2px solid ${BLUE_COLOR}; padding: 2px 5px; flex-grow: 1; min-height: 18px; font-size: 12px; font-family: monospace;">
          ${value || '&nbsp;'}
        </div>
      </div>
    `;

    // Gera lista de viajantes (preenche linhas vazias se < 6)
    let travelersRows = '';
    for (let i = 0; i < 6; i++) {
      const name = selectedTravelers[i] || '';
      travelersRows += `
        <tr>
          <td style="border: 1px solid #000; padding: 2px 5px; width: 20px; text-align: center;">${i + 1}.</td>
          <td style="border: 1px solid #000; padding: 2px 5px; height: 18px; border: 2px solid ${BLUE_COLOR};">${name.toUpperCase()}</td>
        </tr>
      `;
    }

    // HTML da Segunda Página (Anexos)
    const attachmentsPage = `
      <div class="page-break"></div>
      <div class="header">
        ANEXOS - DOCUMENTOS COMPROBATÓRIOS
      </div>
      <div style="padding: 20px; text-align: center;">
        
        <div style="margin-bottom: 30px;">
           <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;">Documento de Identificação do Titular</h3>
           ${imgDoc ? `<img src="${imgDoc}" style="max-width: 90%; max-height: 350px; border: 1px solid #ddd; display: block; margin: 0 auto;" />` : '<p style="color: #999;">[Nenhum documento anexado]</p>'}
        </div>

        <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 20px;">
           <div style="flex: 1; min-width: 300px;">
              <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;">Cartão de Crédito - Frente</h3>
              ${imgCardFront ? `<img src="${imgCardFront}" style="max-width: 100%; max-height: 250px; border: 1px solid #ddd; display: block; margin: 0 auto;" />` : '<p style="color: #999;">[Nenhuma imagem anexada]</p>'}
           </div>
           <div style="flex: 1; min-width: 300px;">
              <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;">Cartão de Crédito - Verso</h3>
              ${imgCardBack ? `<img src="${imgCardBack}" style="max-width: 100%; max-height: 250px; border: 1px solid #ddd; display: block; margin: 0 auto;" />` : '<p style="color: #999;">[Nenhuma imagem anexada]</p>'}
           </div>
        </div>

      </div>
    `;

    const htmlContent = `
      <html>
        <head>
          <title>Autorização de Débito</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .header { background-color: #333; color: white; text-align: center; padding: 8px; font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .row { display: flex; width: 100%; gap: 10px; align-items: flex-end; margin-bottom: 4px; }
            .section-title { background-color: #333; color: white; padding: 4px 8px; font-weight: bold; font-size: 11px; margin-top: 15px; margin-bottom: 10px; }
            .attention { background-color: #333; color: white; text-align: center; font-weight: bold; padding: 2px; margin-top: 15px; margin-bottom: 5px; }
            .legal-text { font-size: 10px; text-align: justify; line-height: 1.3; margin-bottom: 15px; }
            .footer-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .footer-box { border: 1px solid #000; padding: 10px; vertical-align: top; }
            .colored-border { border: 2px solid ${BLUE_COLOR}; }
            
            @media print {
              .page-break { page-break-before: always; }
              img { max-width: 100% !important; }
            }
          </style>
        </head>
        <body>
          
          <!-- PAGINA 1: FORMULÁRIO -->
          <div class="header">
            Autorização de Débito - Serviços de Viagens
          </div>

          <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 20px;">
            <span style="font-weight: bold; margin-right: 5px;">Data de emissão:</span>
            <div style="border: 2px solid ${BLUE_COLOR}; width: 150px; padding: 3px; text-align: center;">${formData.dataEmissao}</div>
          </div>

          <div style="display: flex; justify-content: center; margin-bottom: 20px;">
            ${CheckBox(formData.cartaoTipo === 'Visa', 'Visa')}
            ${CheckBox(formData.cartaoTipo === 'Amex', 'American Express')}
            ${CheckBox(formData.cartaoTipo === 'Diners', 'Diners')}
            ${CheckBox(formData.cartaoTipo === 'Master', 'MasterCard')}
          </div>

          <div class="section-title">
            Autorizo e reconheço o débito em minha conta do cartão de crédito abaixo:
          </div>

          <div class="row">
            ${InputBox('Cartão de crédito nº:', formData.numeroCartao, '50%')}
            ${InputBox('Banco emissor do cartão:', formData.bancoEmissor, '50%')}
          </div>

          <div class="row">
            ${InputBox('Nome do titular do cartão (Igual CPF):', formData.nomeTitular)}
          </div>

          <div class="row">
            ${InputBox('Validade cartão:', formData.validadeCartao, '25%')}
            ${InputBox('CPF:', formData.cpfTitular, '35%')}
            ${InputBox('RG:', formData.rgTitular, '40%')}
          </div>

          <div class="row">
            ${InputBox('Código de segurança (três últimos digitos no verso do cartão):', formData.codigoSeguranca, '50%')}
          </div>

          <div class="row">
            ${InputBox('Data de Nascimento (Titular do cartão):', formData.dataNascimentoTitular, '40%')}
            ${InputBox('Telefone fixo para contato:', formData.telefoneTitular, '60%')}
          </div>

          <div class="row">
            ${InputBox('Cia. Aérea:', formData.ciaAerea, '30%')}
            ${InputBox('Trecho aéreo:', formData.trecho, '70%')}
          </div>

          <div class="row">
            ${InputBox('Cód. Aut.:', formData.codAut, '30%')}
            ${InputBox('Data:', formData.dataViagem, '30%')}
          </div>

          <div class="row">
            <div style="display: flex; align-items: center; width: 30%;">
               <span style="font-weight: bold; margin-right: 10px;">Moeda</span>
               ${CheckBox(formData.moeda === 'BRL', 'R$ - Real')}
               ${CheckBox(formData.moeda === 'USD', 'US$ - Dólar')}
            </div>
            ${InputBox('Nº de parcelas', formData.numParcelas, '70%')}
          </div>

          <div class="row">
            ${InputBox('Valor Total:', formData.valorTotal, '33%')}
            ${InputBox('Valor das taxas:', formData.valorTaxas, '33%')}
            ${InputBox('Valor de cada parcela:', formData.valorParcela, '34%')}
          </div>

          <div class="attention">ATENÇÃO</div>

          <div class="legal-text">
            <p><strong>Regras</strong></p>
            <p>Qualquer transação realizada fora dos padrões contratuais das Administradoras implicará em sanções legais, tanto para o portador como para à agência.</p>
            <p>Ao autorizar o debito no cartão de crédito, titular e Agência declaram estar cientes e concordam com as seguintes condições:</p>
            <p>1 - Questionamentos ou cancelamentos dos serviços adquiridos devem ser resolvidos entre as partes - Agência e titular.</p>
            <p>2 - A Agência é responsável pela correta aceitação do cartão, conferindo em sua apresentação a data de validade, autenticidade e assinatura do Titular nos termos do Contrato de Afiliação.</p>
            <p>3 - Esta autorização é válida por 15 dias e sua transmissão por fax é permitida apenas para agilizar o processo de venda. Em caso de contestação por parte do titular, Agência é responsável pela apresentação deste original devidamente preenchido e assinado, copia frente e verso do cartão, cópia de um documento oficial (emitido por um Órgão Federal/Estadual/Municipal) que comprove a identidade do Portador, cópia dos bilhetes/vouchers e cópia do Comprovante de Venda emitido pelo terminal POS ou POS Autorizador. Esses documentos podem ser solicitados a qualquer momento e devem ser apresentados de maneira legível.</p>
            <p>4 - Caso os serviços sejam prestados em nome de outras pessoas, além do titular do cartão, seus nomes deverão ser relacionados abaixo, para maior segurança do titular, ressaltando que a assinatura do Portador do cartão neste documento é obrigatória.</p>
            <p>Obs.: Esse novo procedimento so se aplica a transações efetuadas com cartões emitidos no Brasil. Por estabelecimento, entende-se agencia de viagens.</p>
          </div>

          <table class="footer-table">
            <tr>
              <td class="footer-box" style="width: 50%;">
                <div style="text-align: center; font-size: 12px; line-height: 1.6;">
                  <strong>NETO ALMUDI</strong><br>
                  CNPJ: 28.623.289/0001-14<br>
                  RUA PRES. CASTELO BRANCO, 983<br>
                  CEP 86160-000 – PORECATU – PR<br>
                  FONE 41 9 98136567<br>
                  EMAIL: almudineto@gmail.com
                </div>
              </td>
              <td class="footer-box" style="width: 50%; padding: 0;">
                <div style="background-color: #333; color: white; font-weight: bold; text-align: center; padding: 2px;">VIAJANTES</div>
                <table style="width: 100%; border-collapse: collapse;">
                  ${travelersRows}
                </table>
              </td>
            </tr>
          </table>

          <!-- PAGINA 2: ANEXOS (Se houver alguma imagem) -->
          ${(imgDoc || imgCardFront || imgCardBack) ? attachmentsPage : ''}

          <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Autorização de Débito</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* COLUNA ESQUERDA - DADOS DO TITULAR E CARTÃO */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><User size={18}/> Titular do Cartão</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preencher com dados de:</label>
              <select 
                className="w-full border rounded p-2"
                value={titularId}
                onChange={handleTitularChange}
              >
                <option value="manual">Preenchimento Manual</option>
                <optgroup label="Passageiros do Grupo">
                  {passengers.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} {p.sobrenome}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <input 
                 className="border rounded p-2 text-sm" 
                 placeholder="Nome Completo (Titular)" 
                 name="nomeTitular" 
                 value={formData.nomeTitular} 
                 onChange={handleInputChange} 
               />
               <input 
                 className="border rounded p-2 text-sm" 
                 placeholder="CPF" 
                 name="cpfTitular" 
                 value={formData.cpfTitular} 
                 onChange={handleInputChange} 
               />
            </div>
            <div className="grid grid-cols-3 gap-3">
               <input 
                 className="border rounded p-2 text-sm" 
                 placeholder="RG" 
                 name="rgTitular" 
                 value={formData.rgTitular} 
                 onChange={handleInputChange} 
               />
               <input 
                 className="border rounded p-2 text-sm" 
                 placeholder="Data Nasc." 
                 name="dataNascimentoTitular" 
                 value={formData.dataNascimentoTitular} 
                 onChange={handleInputChange} 
               />
               <input 
                 className="border rounded p-2 text-sm" 
                 placeholder="Telefone" 
                 name="telefoneTitular" 
                 value={formData.telefoneTitular} 
                 onChange={handleInputChange} 
               />
            </div>

            {/* SEÇÃO DE IMAGEM DO DOCUMENTO */}
            <div className="bg-gray-50 p-2 rounded border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-600 flex items-center gap-1">
                        <ImageIcon size={12}/> Documento Titular
                    </label>
                    {imgDoc ? (
                        <span className="text-xs text-green-600 flex items-center gap-1"><CheckSquare size={12}/> Anexado</span>
                    ) : (
                        <span className="text-xs text-gray-400">Pendente</span>
                    )}
                </div>
                {!imgDoc ? (
                     <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-white transition-colors text-xs text-gray-500">
                        <Upload size={14} /> Carregar Imagem
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setImgDoc)} />
                     </label>
                ) : (
                     <div className="relative group">
                        <img src={imgDoc} className="h-20 w-auto object-contain mx-auto border bg-white" alt="Doc" />
                        <button onClick={() => setImgDoc('')} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={12} />
                        </button>
                     </div>
                )}
            </div>

            <h3 className="font-bold text-gray-700 border-b pb-2 mt-6">Dados do Cartão</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bandeira</label>
              <div className="flex gap-4 text-sm">
                {['Visa', 'Amex', 'Diners', 'Master'].map(type => (
                  <label key={type} className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="cartaoTipo" 
                      value={type} 
                      checked={formData.cartaoTipo === type} 
                      onChange={handleInputChange}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded p-2 text-sm" placeholder="Número do Cartão" name="numeroCartao" value={formData.numeroCartao} onChange={handleInputChange} />
              <input className="border rounded p-2 text-sm" placeholder="Banco Emissor" name="bancoEmissor" value={formData.bancoEmissor} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded p-2 text-sm" placeholder="Validade (MM/AA)" name="validadeCartao" value={formData.validadeCartao} onChange={handleInputChange} />
              <input className="border rounded p-2 text-sm" placeholder="Cód. Segurança" name="codigoSeguranca" value={formData.codigoSeguranca} onChange={handleInputChange} />
            </div>

            {/* SEÇÃO DE IMAGENS DO CARTÃO */}
            <div className="grid grid-cols-2 gap-2">
                 {/* FRENTE */}
                 <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-600 flex items-center gap-1"><CreditCard size={12}/> Frente</label>
                    </div>
                    {!imgCardFront ? (
                        <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-white transition-colors text-xs text-gray-500 h-16">
                            <Upload size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setImgCardFront)} />
                        </label>
                    ) : (
                        <div className="relative group">
                            <img src={imgCardFront} className="h-16 w-full object-contain bg-white border" alt="Frente" />
                            <button onClick={() => setImgCardFront('')} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={12} />
                            </button>
                        </div>
                    )}
                 </div>

                 {/* VERSO */}
                 <div className="bg-gray-50 p-2 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-gray-600 flex items-center gap-1"><CreditCard size={12}/> Verso</label>
                    </div>
                    {!imgCardBack ? (
                        <label className="flex items-center justify-center gap-2 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:bg-white transition-colors text-xs text-gray-500 h-16">
                            <Upload size={14} />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setImgCardBack)} />
                        </label>
                    ) : (
                        <div className="relative group">
                            <img src={imgCardBack} className="h-16 w-full object-contain bg-white border" alt="Verso" />
                            <button onClick={() => setImgCardBack('')} className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <X size={12} />
                            </button>
                        </div>
                    )}
                 </div>
            </div>
          </div>

          {/* COLUNA DIREITA - DADOS DA COMPRA E VIAJANTES */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 border-b pb-2">Dados da Compra</h3>
            
            <div className="grid grid-cols-2 gap-3">
               <input className="border rounded p-2 text-sm" placeholder="Cia. Aérea" name="ciaAerea" value={formData.ciaAerea} onChange={handleInputChange} />
               <input className="border rounded p-2 text-sm" placeholder="Data da Viagem" name="dataViagem" value={formData.dataViagem} onChange={handleInputChange} />
            </div>
            <input className="border rounded p-2 text-sm w-full" placeholder="Trecho Aéreo" name="trecho" value={formData.trecho} onChange={handleInputChange} />

            <div className="grid grid-cols-3 gap-3">
               <select className="border rounded p-2 text-sm" name="moeda" value={formData.moeda} onChange={handleInputChange}>
                 <option value="BRL">Real (R$)</option>
                 <option value="USD">Dólar (US$)</option>
               </select>
               <input className="border rounded p-2 text-sm" placeholder="Nº Parcelas" name="numParcelas" value={formData.numParcelas} onChange={handleInputChange} />
               <input className="border rounded p-2 text-sm" placeholder="Valor Parcela" name="valorParcela" value={formData.valorParcela} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-2 gap-3">
               <input className="border rounded p-2 text-sm" placeholder="Valor Total (s/ taxa)" name="valorTotal" value={formData.valorTotal} onChange={handleInputChange} />
               <input className="border rounded p-2 text-sm" placeholder="Valor Taxas" name="valorTaxas" value={formData.valorTaxas} onChange={handleInputChange} />
            </div>

            <h3 className="font-bold text-gray-700 border-b pb-2 mt-6 flex justify-between items-center">
              <span>Selecionar Viajantes ({selectedTravelers.length}/6)</span>
              <span className="text-xs font-normal text-gray-500">Marque para incluir</span>
            </h3>
            
            <div className="bg-gray-50 border rounded p-2 h-48 overflow-y-auto">
              {loading ? <p className="text-sm text-center">Carregando...</p> : 
               passengers.length === 0 ? <p className="text-sm text-center text-gray-500">Nenhum passageiro no grupo.</p> :
               passengers.map(p => {
                 const fullName = `${p.nome} ${p.sobrenome}`;
                 const isSelected = selectedTravelers.includes(fullName);
                 return (
                   <div key={p.id} 
                        onClick={() => toggleTraveler(fullName)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${isSelected ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}`}>
                      {isSelected ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-400"/>}
                      <span className="truncate">{fullName}</span>
                   </div>
                 );
               })
              }
            </div>
            
            <p className="text-xs text-gray-500">
              * Selecione até 6 viajantes para aparecerem na lista lateral do formulário impresso.
            </p>
          </div>

        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Printer size={18} />
            Imprimir Autorização
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebitAuthModal;
