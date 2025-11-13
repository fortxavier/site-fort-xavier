'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import '../../global.css';
import './formularios.css';
import { ArrowLeft, Save, Upload, X, Eye, Home, DollarSign, MapPin, Settings, Star, Image, User } from 'lucide-react';
import Link from 'next/link';
import ImageUpload from './components/ImageUpload';
import MultiGalleryManager from './components/MultiGalleryManager';
import { useImageUpload } from '../../../../lib/hooks/useUploadService';
import { Gallery, GalleryImage } from './types';

interface FormData {
  [key: string]: any;
}

// Lista de características disponíveis
const CARACTERISTICAS_DISPONIVEIS = [
  'Academia',
  'Elevador',
  'Quadra esportiva',
  'Churrasqueira',
  'Piscina',
  'Salão de Festas',
  'Coworking',
  'Piscina coberta',
  'Sauna',
  'Playground',
  'Portaria 24h',
  'Garagem coberta',
  'Área gourmet',
  'Jardim',
  'Varanda',
  'Ar condicionado',
  'Mobiliado',
  'Semi-mobiliado',
  'Pet friendly',
  'Bicicletário',
  'Lavanderia',
  'Depósito',
  'Terraço',
  'Vista para o mar',
  'Vista para a cidade'
];

export default function PropertiesCadastroPage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    slug: '',
    titulo_descricao: '',
    descricao: '',
    valor: '',
    bairro: '',
    area_texto: '',
    cidade: 'São Paulo',
    estado: 'SP',
    status_empreendimento: '',
    tipo_imovel: [] as string[], // Novo campo
    endereco: '',
    texto_localizacao: '',
    valor_condominio: '',
    caracteristicas: [] as string[],
    banheiros: [] as string[], // Volta para array
    quartos: [] as string[], // Volta para array
    vagas: [] as string[], // Volta para array
    areas_disponiveis: [] as string[], // Campo adicionado
    destaque: false,
    responsavel_criacao: '',
    responsavel_atualizacao: '',
    home: false,
    iframe_mapa: ''
  });

  // Estados para imagens
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Hook para upload de imagens
  const {
    isUploading,
    uploadProgress,
    error: uploadError,
    uploadCardImage,
    uploadCoverImage,
    uploadGallery,
    clearError
  } = useImageUpload();

  // Estado e função para áreas disponíveis
  const [novaArea, setNovaArea] = useState('');
  const handleAddArea = () => {
    const valorLimpo = novaArea.trim();
    if (valorLimpo && !formData.areas_disponiveis.includes(valorLimpo)) {
      setFormData(prev => ({
        ...prev,
        areas_disponiveis: [...prev.areas_disponiveis, valorLimpo]
      }));
      setNovaArea('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
  
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      
      // Se o campo é um array (banheiros, quartos, vagas), trata como seleção múltipla
      if (Array.isArray(formData[name])) {
        const currentArray = formData[name] as string[];
        const newValues = checked
          ? [...currentArray, value] // Adiciona se marcado
          : currentArray.filter((v: string) => v !== value); // Remove se desmarcado
  
        setFormData({
          ...formData,
          [name]: newValues,
        });
      } else {
        // Checkbox simples (booleano)
        setFormData({
          ...formData,
          [name]: checked,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Função para toggle de características
  const toggleCaracteristica = (caracteristica: string) => {
    setFormData(prev => ({
      ...prev,
      caracteristicas: prev.caracteristicas.includes(caracteristica)
        ? prev.caracteristicas.filter((c: string) => c !== caracteristica)
        : [...prev.caracteristicas, caracteristica]
    }));
  };

  // Função para gerar slug automaticamente
  const generateSlug = (titulo: string) => {
    return titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  };

  // Auto-gerar slug quando o título mudar
  useEffect(() => {
    if (formData.titulo && !formData.slug) {
      const slug = generateSlug(formData.titulo);
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
  }, [formData.titulo]);

  const uploadImages = async (propertyId: string) => {
    const uploadResults = [];
  
    try {
      // Upload da imagem de card
      if (cardImage) {
        try {
          const cardResult = await uploadCardImage(cardImage, propertyId);
          uploadResults.push({ type: 'card', success: cardResult.success, error: cardResult.error });
        } catch (error) {
          console.error('Erro no upload da imagem de card:', error);
          uploadResults.push({ 
            type: 'card', 
            success: false, 
            error: error instanceof Error ? error.message : 'Erro desconhecido no upload da imagem de card' 
          });
        }
      }
  
      // Upload da imagem de capa
      if (coverImage) {
        try {
          const coverResult = await uploadCoverImage(coverImage, propertyId);
          uploadResults.push({ type: 'capa', success: coverResult.success, error: coverResult.error });
        } catch (error) {
          console.error('Erro no upload da imagem de capa:', error);
          uploadResults.push({ 
            type: 'capa', 
            success: false, 
            error: error instanceof Error ? error.message : 'Erro desconhecido no upload da imagem de capa' 
          });
        }
      }
  
      // Upload das galerias com tratamento de erro melhorado
      for (const gallery of galleries) {
        const newImages = gallery.images.filter(img => img.file);
        if (newImages.length > 0) {
          try {
            const files = newImages
              .map(img => img.file!)
              .sort((a, b) => {
                const aImg = gallery.images.find(img => img.file === a);
                const bImg = gallery.images.find(img => img.file === b);
                return (aImg?.ordem || 0) - (bImg?.ordem || 0);
              });
  
            if (files.length > 0) {
              console.log(`Iniciando upload da galeria "${gallery.name}" com ${files.length} imagens`);
              
              const galleryResult = await uploadGallery(files, propertyId, gallery.name);
              
              if (galleryResult.success) {
                console.log(`Galeria "${gallery.name}" salva com sucesso`);
                uploadResults.push({ 
                  type: 'galeria', 
                  name: gallery.name, 
                  success: true, 
                  results: galleryResult.results 
                });
              } else {
                console.error(`Erro ao salvar galeria "${gallery.name}":`, galleryResult.results);
                uploadResults.push({ 
                  type: 'galeria', 
                  name: gallery.name, 
                  success: false, 
                  error: galleryResult.results || 'Erro desconhecido ao salvar galeria'
                });
              }
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error(`Erro ao salvar galeria "${gallery.name}":`, error);
            
            uploadResults.push({ 
              type: 'galeria', 
              name: gallery.name, 
              success: false, 
              error: `Erro ao salvar galeria "${gallery.name}": ${errorMessage}`
            });
          }
        }
      }
  
      return uploadResults;
    } catch (error) {
      console.error('Erro geral no upload das imagens:', error);
      return [{
        type: 'geral',
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no upload das imagens'
      }];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setMessageType('');
    clearError();

    try {
      // Validação adicional para os novos campos
      if (!formData.bairro.trim()) {
        setMessage('O campo Bairro é obrigatório.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      if (formData.quartos.length === 0) {
        setMessage('Selecione pelo menos uma opção de quartos.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      if (formData.banheiros.length === 0) {
        setMessage('Selecione pelo menos uma opção de banheiros.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      if (formData.vagas.length === 0) {
        setMessage('Selecione pelo menos uma opção de vagas.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      const propertyData = {
        titulo: formData.titulo,
        slug: formData.slug,
        titulo_descricao: formData.titulo_descricao,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor) || 0,
        bairro: formData.bairro,
        area_texto: formData.area_texto,
        cidade: formData.cidade,
        estado: formData.estado,
        status_empreendimento: formData.status_empreendimento,
        tipo_imovel: formData.tipo_imovel, // Novo campo
        endereco: formData.endereco,
        texto_localizacao: formData.texto_localizacao,
        valor_condominio: parseFloat(formData.valor_condominio) || null,
        caracteristicas: formData.caracteristicas,
        banheiros: formData.banheiros, // Mantém como array
        quartos: formData.quartos, // Mantém como array
        vagas: formData.vagas, // Mantém como array
        areas_disponiveis: formData.areas_disponiveis, // Campo adicionado
        destaque: formData.destaque,
        responsavel_criacao: formData.responsavel_criacao,
        responsavel_atualizacao: formData.responsavel_atualizacao,
        home: formData.home,
        iframe_mapa: formData.iframe_mapa,
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString()
      };

      console.log('propertyData:', propertyData);

      const { data, error, status } = await supabase
        .from('fx_properties')
        .insert(propertyData)
        .select();
      
      console.log('status:', status);
      console.log('error:', error);
      
      if (error) {
        console.error('Erro ao criar:', error);
        if (error.code === '23505' && error.details?.includes('slug')) {
          setMessage('Erro: Este subtítulo/descrição já existe. Por favor, use um subtítulo único.');
        } else {
          setMessage(`Erro ao criar propriedade: ${error.message}`);
        }
        setMessageType('error');
        return;
      }

      const propertyId = data[0].id;

      // Upload das imagens se houver novas imagens
      const hasNewImages = cardImage || coverImage || galleries.some(g => g.images.some(img => img.file));
      
      if (hasNewImages) {
        setMessage('Propriedade criada! Fazendo upload das imagens...');
        setMessageType('info');

        const uploadResults = await uploadImages(propertyId);
        
        // Verificar resultados do upload
        const failedUploads = uploadResults.filter(result => !result.success);
        
        if (failedUploads.length > 0) {
          setMessage(`Propriedade criada, mas houve problemas no upload de algumas imagens. Verifique e tente novamente.`);
          setMessageType('warning');
        } else {
          setMessage('Propriedade e imagens criadas com sucesso!');
          setMessageType('success');
        }
      } else {
        setMessage('Propriedade criada com sucesso!');
        setMessageType('success');
      }

      // Redirecionar após sucesso
      setTimeout(() => {
        router.push('/admin/imoveis');
      }, 2000);

    } catch (error) {
      console.error('Erro inesperado:', error);
      setMessage('Erro inesperado ao criar propriedade.');
      setMessageType('error');
    }

    setIsLoading(false);
  };

  return (
    <div className="fade-in property-edit-container">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Cadastrar Nova Propriedade</h1>
        <Link href="/admin/imoveis" className="back-link">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      {/* Mensagens */}
      {message && (
        <div className={`alert alert-${messageType}`}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          minWidth: '250px',
        }}>
          {message}
        </div>
      )}

      {uploadError && (
        <div className="alert alert-error"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          minWidth: '250px',
          marginTop: message ? '60px' : '0' // empurra se já tem outra msg
        }}>
          Erro no upload: {uploadError}
        </div>
      )}

      {isUploading && (
        <div
          className="alert alert-info"
          style={{
            position: 'fixed',
            top: message || uploadError ? '100px' : '20px',
            right: '20px',
            zIndex: 1000,
            minWidth: '300px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="spinner"></div>
            <span>Fazendo upload das imagens... {uploadProgress}%</span>
          </div>
          {uploadProgress > 0 && (
            <div className="progress-bar" style={{ marginTop: '10px' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${uploadProgress}%`,
                  height: '6px',
                  backgroundColor: '#0d6efd',
                  transition: 'width 0.3s ease',
                }}
              ></div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Informações Básicas */}
        <div className="form-card">
          <div className="card-header">
            <Home className="card-icon" />
            <h2 className="card-title">Informações Básicas</h2>
          </div>
          
          <div className="form-grid grid-2">
            <div className="field-group">
              <label className="field-label required">Nome empreendimento</label>
              <input
                type="text"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                className="field-input"
                required
                maxLength={255}
                placeholder="Ex: Apartamento Residencial Jardins"
              />
              <span className="field-help">Nome principal do empreendimento</span>
            </div>
            
            <div className="field-group">
              <label className="field-label required">URL/Rota Empreendimento</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className="field-input"
                required
                maxLength={255}
                placeholder="Ex: apartamento-2-dorms-jardins-sp"
              />
              <span className="field-help">URL amigável (meusite.com/"rota-empreendimento")</span>
            </div>
          </div>
          
          <div className="form-grid grid-3">
            <div className="field-group">
              <label className="field-label required">Status Obra</label>
              <select
                name="status_empreendimento"
                value={formData.status_empreendimento}
                onChange={handleChange}
                className="field-input"
              >
                <option value="">Selecione o status</option>
                <option value="Lançamento">Lançamento</option>
                <option value="Pronto para morar">Pronto para morar</option>
                <option value="Entregue, pronto para morar">Entregue, pronto para morar</option>
              </select>
              <span className="field-help">Status que irá aparecer</span>
            </div>

            <div className="field-group">
              <label className="field-label required">Metragens texto</label>
              <input
                type="text"
                name="area_texto"
                value={formData.area_texto}
                onChange={handleChange}
                className="field-input"
                required
                maxLength={255}
                placeholder="Ex: 27m² a 75m²"
              />
              <span className="field-help">Aparecerá no card do imóvel e na página do empreendimento</span>
            </div>

            <div className="field-group">
              <label className="field-label">Áreas disponíveis (m²)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  value={novaArea}
                  onChange={(e) => setNovaArea(e.target.value)}
                  className="field-input"
                  placeholder="Ex: 33"
                />
                <button
                  type="button"
                  onClick={handleAddArea}
                  className="btn btn-add"
                >
                  +
                </button>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {formData.areas_disponiveis.map((area: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, idx: React.Key | null | undefined) => (
                  <div
                    key={idx}
                    style={{
                      background: '#e0f7fa',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '0.85rem'
                    }}
                  >
                    {area} m²
                  </div>
                ))}
              </div>

              <span className="field-help">Digite e adicione diferentes metragens disponíveis</span>
            </div>

          </div>

          <div className="form-grid grid-1">
            <div className="field-group">
              <label className="field-label required">Titulo Descrição</label>
              <input
                type="text"
                name="titulo_descricao"
                value={formData.titulo_descricao}
                onChange={handleChange}
                className="field-input"
                required
                maxLength={255}
                placeholder="Ex: Apartamento Residencial Jardins"
              />
              <span className="field-help">Titulo para descrição do empreendimento</span>
            </div>
            
          </div>

          <div className="field-group">
            <label className="field-label">Descrição Completa</label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              className="field-input field-textarea"
              rows={4}
              placeholder="Descrição detalhada da propriedade, suas características e diferenciais..."
            />
            <span className="field-help">Descrição que aparecerá na página do imóvel</span>
          </div>
          
          <div className="form-grid grid-4">
            
          <div className="field-group">
              <label className="field-label required">Tipos de Imóveis</label>
              <div className="checkbox-group">
                {['Apartamento', 'Sobrado residencial', 'Studio', 'Duplex'].map((value) => (
                  <label key={value} className="checkbox-inline">
                    <input
                      type="checkbox"
                      name="tipo_imovel"
                      value={value}
                      checked={formData.tipo_imovel.includes(value)}
                      onChange={handleChange}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label required">Banheiros</label>
              <div className="checkbox-group">
                {['1', '2', '3', '4', '5+'].map((value) => (
                  <label key={value} className="checkbox-inline">
                    <input
                      type="checkbox"
                      name="banheiros"
                      value={value}
                      checked={formData.banheiros.includes(value)}
                      onChange={handleChange}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          
            <div className="field-group">
              <label className="field-label required">Dormitórios</label>
              <div className="checkbox-group">
                {['1', '2', '3', '4', '5+'].map((value) => (
                  <label key={value} className="checkbox-inline">
                    <input
                      type="checkbox"
                      name="quartos"
                      value={value}
                      checked={formData.quartos.includes(value)}
                      onChange={handleChange}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
              
            <div className="field-group">
              <label className="field-label required">Vagas</label>
              <div className="checkbox-group">
                {['1', '2', '3', '4', '5+'].map((value) => (
                  <label key={value} className="checkbox-inline">
                    <input
                      type="checkbox"
                      name="vagas"
                      value={value}
                      checked={formData.vagas.includes(value)}
                      onChange={handleChange}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Valores */}
        <div className="form-card">
          <div className="card-header">
            <DollarSign className="card-icon" />
            <h2 className="card-title">Valores</h2>
          </div>
          
          <div className="form-grid grid-2">
            <div className="field-group">
              <label className="field-label required">Valor de Venda</label>
              <div className="currency-field">
                <span className="currency-symbol">R$</span>
                <input
                  type="number"
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  className="field-input currency-input"
                  required
                  placeholder="450000"
                  step="0.01"
                  min="0"
                />
              </div>
              <span className="field-help">Valor principal de venda do imóvel</span>
            </div>
            
            <div className="field-group">
              <label className="field-label">Valor do Condomínio</label>
              <div className="currency-field">
                <span className="currency-symbol">R$</span>
                <input
                  type="number"
                  name="valor_condominio"
                  value={formData.valor_condominio}
                  onChange={handleChange}
                  className="field-input currency-input"
                  placeholder="350"
                  step="0.01"
                  min="0"
                />
              </div>
              <span className="field-help">Valor mensal do condomínio (opcional)</span>
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="form-card">
          <div className="card-header">
            <MapPin className="card-icon" />
            <h2 className="card-title">Localização</h2>
          </div>
          
          <div className="form-grid grid-3">
            <div className="field-group">
              <label className="field-label required">Cidade</label>
              <select
                name="cidade"
                value={formData.cidade}
                onChange={handleChange}
                className="field-input"
                required
              >
                <option value="São Paulo">São Paulo</option>
                <option value="Barueri">Barueri</option>
                <option value="Belo Horizonte">São Caetano</option>
              </select>
            </div>
            
            <div className="field-group">
              <label className="field-label required">Estado</label>
              <select
                name="estado"
                value={formData.estado}
                onChange={handleChange}
                className="field-input"
                required
              >
                <option value="SP">São Paulo</option>
              </select>
            </div>
            
            <div className="field-group">
              <label className="field-label required">Bairro</label>
              <input
                type="text"
                name="bairro"
                value={formData.bairro}
                onChange={handleChange}
                className="field-input"
                required
                maxLength={255}
                placeholder="Ex: Jardins"
              />
              <span className="field-help">Nome do bairro</span>
            </div>
          </div>
                    
          <div className="field-group">
            <label className="field-label">Titulo Descrição</label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleChange}
              className="field-input"
              placeholder="Uma das Melhores Regiões da Zona Sul!"
            />
            <span className="field-help">Titulo para página do empreendimento (abaixo do mapa)</span> 
          </div>
          
          <div className="field-group">
            <label className="field-label">Descrição da Localização</label>
            <textarea
              name="texto_localizacao"
              value={formData.texto_localizacao}
              onChange={handleChange}
              className="field-input field-textarea"
              rows={3}
              placeholder="Descreva a localização, proximidades, facilidades de acesso..."
            />
            <span className="field-help">Informações sobre a localização e região</span>
          </div>
        
          <div className="field-group">
            <label className="field-label required">Cole aqui o Frame do google maps</label>
            <input
              type="text"
              name="iframe_mapa"
              value={formData.iframe_mapa}
              onChange={handleChange}
              className="field-input"
              required
            />
            <span className="field-help">Busque o endereço no google maps (https://www.google.com.br/maps), clique em compartilhar e copie o HTML na opção "Incorporar um mapa"</span>
          </div>
        </div>

        {/* Características */}
        <div className="form-card">
          <div className="card-header">
            <Star className="card-icon" />
            <h2 className="card-title">Características</h2>
          </div>
          
          <div className="caracteristicas-grid">
            {CARACTERISTICAS_DISPONIVEIS.map((caracteristica) => (
              <label key={caracteristica} className="caracteristica-item">
                <input
                  type="checkbox"
                  checked={formData.caracteristicas.includes(caracteristica)}
                  onChange={() => toggleCaracteristica(caracteristica)}
                />
                <span className="caracteristica-label">{caracteristica}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Imagens */}
        <div className="form-card">
          <div className="card-header">
            <Image className="card-icon" />
            <h2 className="card-title">Imagens</h2>
          </div>
          
          {/* Imagem de Card */}
          <div className="images-section">
            <ImageUpload
              label="Imagem de Card (Listagem)"
              value=""
              onChange={setCardImage}
              accept="image/*"
              maxSize={5}
              preview={true}
              required={false}
              disabled={isUploading}
            />
          </div>

          {/* Imagem de Capa */}
          <div className="images-section">
            <ImageUpload
              label="Imagem de Capa (Página do Imóvel)"
              value=""
              onChange={setCoverImage}
              accept="image/*"
              maxSize={5}
              preview={true}
              required={false}
              disabled={isUploading}
            />
          </div>

          {/* Galerias */}
          <div className="images-section">
            <MultiGalleryManager
              value={galleries}
              onChange={setGalleries}
              maxGalleries={8}
              maxImagesPerGallery={15}
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Configurações */}
        <div className="form-card">
          <div className="card-header">
            <Settings className="card-icon" />
            <h2 className="card-title">Configurações</h2>
          </div>
          
          <div className="form-grid grid-2">
            <div className="field-group">
              <label className="field-label">Responsável pela Criação</label>
              <input
                type="text"
                name="responsavel_criacao"
                value={formData.responsavel_criacao}
                onChange={handleChange}
                className="field-input"
                placeholder="Nome do responsável"
              />
              <span className="field-help">Responsável original pela criação</span>
            </div>
            
            <div className="field-group">
              <label className="field-label">Responsável pela Atualização</label>
              <input
                type="text"
                name="responsavel_atualizacao"
                value={formData.responsavel_atualizacao}
                onChange={handleChange}
                className="field-input"
                placeholder="Nome do responsável"
              />
              <span className="field-help">Responsável por esta atualização</span>
            </div>
          </div>
          
          <div className="form-grid grid-2">
            <div className="field-group">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="destaque"
                  checked={formData.destaque}
                  onChange={handleChange}
                />
                <span className="checkbox-label">Propriedade em Destaque</span>
              </label>
              <span className="field-help">Aparecerá em seções especiais do site</span>
            </div>
            
            <div className="field-group">
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="home"
                  checked={formData.home}
                  onChange={handleChange}
                />
                <span className="checkbox-label">Aparece na Home</span>
              </label>
              <span className="field-help">Será exibida na página inicial</span>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="form-actions">
          <Link href="/admin/imoveis" className="btn btn-secondary">
            <ArrowLeft size={16} />
            Cancelar
          </Link>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading || isUploading}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                Criar Propriedade
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

