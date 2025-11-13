'use client'

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { getPropertyImages } from '../../../../lib/imageUploadService';
import '../../global.css';
import './formularios.css';
import { ArrowLeft, Save, Upload, X, Eye, Home, DollarSign, MapPin, Settings, Star, Image, User, Video, CheckCircle, AlertCircle, AlertTriangle, Info, Loader } from 'lucide-react';
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

// Classe auxiliar para rastreamento de progresso
class ProgressTracker {
  private totalTasks: number;
  private completedTasks: number = 0;
  private failedTasks: number = 0;

  constructor(totalTasks: number) {
    this.totalTasks = totalTasks;
  }

  completeTask(taskIndex: number) {
    this.completedTasks++;
    return this.getProgress();
  }

  failTask(taskIndex: number) {
    this.failedTasks++;
    return this.getProgress();
  }

  getProgress(): number {
    return Math.round(((this.completedTasks + this.failedTasks) / this.totalTasks) * 100);
  }
}

// Componente de Alerta Melhorado
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title?: string;
  message: string;
  onClose?: () => void;
  progress?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
  }>;
  dismissible?: boolean;
  compact?: boolean;
}

const Alert: React.FC<AlertProps> = ({ 
  type, 
  title, 
  message, 
  onClose, 
  progress, 
  actions, 
  dismissible = true, 
  compact = false 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
      case 'loading':
        return <Loader size={20} className="animate-spin" />;
      default:
        return <Info size={20} />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'success':
        return 'Sucesso!';
      case 'error':
        return 'Erro';
      case 'warning':
        return 'Atenção';
      case 'info':
        return 'Informação';
      case 'loading':
        return 'Processando...';
      default:
        return 'Notificação';
    }
  };

  return (
    <div className={`alert alert-${type} ${compact ? 'compact' : ''} ${dismissible ? 'dismissible' : ''} ${progress !== undefined ? 'alert-with-progress' : ''}`}>
      <div className="alert-icon">
        {getIcon()}
      </div>
      
      <div className="alert-content">
        <div className="alert-title">
          {getTitle()}
        </div>
        <div className="alert-message">
          {message}
        </div>
        
        {actions && actions.length > 0 && (
          <div className="alert-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`alert-action-btn ${action.primary ? 'primary' : ''}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {dismissible && onClose && (
        <button className="alert-close" onClick={onClose}>
          <X size={16} />
        </button>
      )}

      {progress !== undefined && (
        <div className="alert-progress-container">
          <div 
            className="alert-progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default function PropertyFormPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams?.get('id');
  const isEditing = !!propertyId;

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
    tipo_imovel: [] as string[],
    endereco: '',
    texto_localizacao: '',
    valor_condominio: '',
    caracteristicas: [] as string[],
    banheiros: [] as string[],
    quartos: [] as string[],
    vagas: [] as string[],
    areas_disponiveis: [] as string[],
    destaque: false,
    responsavel_criacao: '',
    responsavel_atualizacao: '',
    home: false,
    iframe_mapa: ''
    // video_url: ''
  });

  // Estados para imagens
  const [cardImage, setCardImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [existingCardImageUrl, setExistingCardImageUrl] = useState<string>('');
  const [existingCoverImageUrl, setExistingCoverImageUrl] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(isEditing);
  
  // Estados melhorados para alertas
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info' | 'loading';
    title?: string;
    message: string;
    progress?: number;
    dismissible?: boolean;
    compact?: boolean;
    actions?: Array<{
      label: string;
      onClick: () => void;
      primary?: boolean;
    }>;
  }>>([]);

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

  const handleRemoveArea = (areaToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      areas_disponiveis: prev.areas_disponiveis.filter((area: string) => area !== areaToRemove)
    }));
  };

  // Hook para upload de imagens
  const {
    isUploading,
    uploadProgress,
    error: uploadError,
    uploadCardImage,
    uploadCoverImage,
    uploadGallery,
    removeImage,
    removeGallery,
    clearError
  } = useImageUpload();

  // Funções para gerenciar alertas
  const addAlert = (alert: Omit<typeof alerts[0], 'id'>) => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { ...alert, id }]);
    
    // Auto-remover alertas de sucesso após 5 segundos
    if (alert.type === 'success' && alert.dismissible !== false) {
      setTimeout(() => {
        removeAlert(id);
      }, 5000);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const updateAlert = (id: string, updates: Partial<typeof alerts[0]>) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === id ? { ...alert, ...updates } : alert
    ));
  };

  // Função utilitária para adicionar cache busting
  const addCacheBuster = (url: string): string => {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  };
  
  // Carregar dados da propriedade para edição
  useEffect(() => {
    if (isEditing) {
      loadPropertyData();
    }
  }, [propertyId]);

  const loadPropertyData = async () => {
    try {
      setIsLoadingData(true);
      
      // Carregar dados da propriedade
      const { data, error } = await supabase
        .from('fx_properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setFormData({
          titulo: data.titulo || '',
          slug: data.slug || '',
          titulo_descricao: data.titulo_descricao || '',
          descricao: data.descricao || '',
          valor: data.valor?.toString() || '',
          bairro: data.bairro || '',
          area_texto: data.area_texto || '',
          cidade: data.cidade || 'São Paulo',
          estado: data.estado || 'SP',
          status_empreendimento: data.status_empreendimento || '',
          tipo_imovel: data.tipo_imovel || [],
          endereco: data.endereco || '',
          texto_localizacao: data.texto_localizacao || '',
          valor_condominio: data.valor_condominio?.toString() || '',
          caracteristicas: data.caracteristicas || [],
          banheiros: data.banheiros || [],
          quartos: data.quartos || [],
          vagas: data.vagas || [],
          areas_disponiveis: data.areas_disponiveis || [],
          destaque: data.destaque || false,
          responsavel_criacao: data.responsavel_criacao || '',
          responsavel_atualizacao: data.responsavel_atualizacao || '',
          home: data.home || false,
          iframe_mapa: data.iframe_mapa || ''
          // video_url: data.video_url || ''
        });

        // Carregar imagens existentes usando o serviço
        await loadExistingImages();
      }
    } catch (error) {
      console.error('Erro ao carregar propriedade:', error);
      clearAlerts();
      addAlert({
        type: 'error',
        title: 'Erro ao carregar',
        message: 'Não foi possível carregar os dados da propriedade. Tente novamente.',
        actions: [
          {
            label: 'Tentar novamente',
            onClick: () => loadPropertyData(),
            primary: true
          },
          {
            label: 'Voltar',
            onClick: () => router.push('/admin/imoveis')
          }
        ]
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadExistingImages = async () => {
    try {
      const result = await getPropertyImages(propertyId!);
      
      if (result.success && result.data) {
        // Definir URLs das imagens principais
        if (result.data.card) {
          setExistingCardImageUrl(result.data.card);
        }
        
        if (result.data.capa) {
          setExistingCoverImageUrl(result.data.capa);
        }

        // Carregar galerias
        const loadedGalleries: Gallery[] = [];
        Object.entries(result.data.galerias).forEach(([galleryName, images]) => {
          if (Array.isArray(images) && images.length > 0) {
            const galleryImages: GalleryImage[] = images.map((img, index) => ({
              id: `existing-${img.url}`,
              url: addCacheBuster(img.url),
              ordem: img.ordem || index,
              preview: addCacheBuster(img.url)
            }));

            loadedGalleries.push({
              id: `gallery-${galleryName}`,
              name: galleryName,
              images: galleryImages
            });
          }
        });

        setGalleries(loadedGalleries);
      }
    } catch (error) {
      console.error('Erro ao carregar imagens existentes:', error);
    }
  };

  // Função para deletar imagem de card
  const handleDeleteCardImage = async () => {
    try {
      addAlert({
        type: 'loading',
        message: 'Deletando imagem de card...',
        dismissible: false
      });

      const success = await removeImage(propertyId!, existingCardImageUrl, 'card');
      
      clearAlerts();
      
      if (success) {
        setExistingCardImageUrl('');
        addAlert({
          type: 'success',
          title: 'Imagem deletada!',
          message: 'A imagem de card foi removida com sucesso.',
        });
      } else {
        addAlert({
          type: 'error',
          title: 'Erro ao deletar',
          message: 'Não foi possível deletar a imagem de card. Tente novamente.',
          actions: [
            {
              label: 'Tentar novamente',
              onClick: handleDeleteCardImage,
              primary: true
            }
          ]
        });
      }
    } catch (error) {
      console.error('Erro ao deletar imagem de card:', error);
      clearAlerts();
      addAlert({
        type: 'error',
        title: 'Erro inesperado',
        message: 'Ocorreu um erro inesperado ao deletar a imagem.',
      });
    }
  };

  // Função para deletar imagem de capa
  const handleDeleteCoverImage = async () => {
    try {
      addAlert({
        type: 'loading',
        message: 'Deletando imagem de capa...',
        dismissible: false
      });

      const success = await removeImage(propertyId!, existingCoverImageUrl, 'capa');
      
      clearAlerts();
      
      if (success) {
        setExistingCoverImageUrl('');
        addAlert({
          type: 'success',
          title: 'Imagem deletada!',
          message: 'A imagem de capa foi removida com sucesso.',
        });
      } else {
        addAlert({
          type: 'error',
          title: 'Erro ao deletar',
          message: 'Não foi possível deletar a imagem de capa. Tente novamente.',
          actions: [
            {
              label: 'Tentar novamente',
              onClick: handleDeleteCoverImage,
              primary: true
            }
          ]
        });
      }
    } catch (error) {
      console.error('Erro ao deletar imagem de capa:', error);
      clearAlerts();
      addAlert({
        type: 'error',
        title: 'Erro inesperado',
        message: 'Ocorreu um erro inesperado ao deletar a imagem.',
      });
    }
  };

  // Função para remoção individual de imagens da galeria
  const handleRemoveGalleryImage = async (imageUrl: string, galleryName: string): Promise<boolean> => {
    try {
      const success = await removeImage(propertyId!, imageUrl, 'galeria', galleryName);
      if (success) {
        // Atualizar estado local removendo a imagem da galeria específica
        setGalleries(prev => prev.map(gallery => {
          if (gallery.name === galleryName) {
            return {
              ...gallery,
              images: gallery.images.filter(img => img.url !== imageUrl)
            };
          }
          return gallery;
        }));
        
        addAlert({
          type: 'success',
          title: 'Imagem removida!',
          message: `Imagem removida da galeria "${galleryName}" com sucesso.`,
          compact: true
        });
        return true;
      } else {
        addAlert({
          type: 'error',
          title: 'Erro ao remover',
          message: `Não foi possível remover a imagem da galeria "${galleryName}".`,
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao remover imagem da galeria:', error);
      addAlert({
        type: 'error',
        title: 'Erro inesperado',
        message: 'Ocorreu um erro inesperado ao remover a imagem.',
      });
      return false;
    }
  };

  // Função handleDeleteGallery para ser assíncrona
  const handleDeleteGallery = async (galleryName: string): Promise<boolean> => {
    try {
      addAlert({
        type: 'loading',
        message: `Deletando galeria "${galleryName}"...`,
        dismissible: false
      });

      const success = await removeGallery(propertyId!, galleryName);
      
      clearAlerts();
      
      if (success) {
        // Remover galeria do estado local
        setGalleries(prev => prev.filter(g => g.name !== galleryName));
        addAlert({
          type: 'success',
          title: 'Galeria deletada!',
          message: `A galeria "${galleryName}" foi removida com sucesso.`,
        });
        return true;
      } else {
        addAlert({
          type: 'error',
          title: 'Erro ao deletar',
          message: `Não foi possível deletar a galeria "${galleryName}". Tente novamente.`,
          actions: [
            {
              label: 'Tentar novamente',
              onClick: () => handleDeleteGallery(galleryName),
              primary: true
            }
          ]
        });
        return false;
      }
    } catch (error) {
      console.error('Erro ao deletar galeria:', error);
      clearAlerts();
      addAlert({
        type: 'error',
        title: 'Erro inesperado',
        message: 'Ocorreu um erro inesperado ao deletar a galeria.',
      });
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
  
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      
      // Se o campo é um array (tipo_imovel, banheiros, quartos, vagas), trata como seleção múltipla
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

  // Auto-gerar slug quando o título mudar (apenas no modo cadastro)
  useEffect(() => {
    if (!isEditing && formData.titulo && !formData.slug) {
      const slug = generateSlug(formData.titulo);
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }
  }, [formData.titulo, isEditing]);

  // Validação de URL de vídeo
  const isValidVideoUrl = (url: string) => {
    if (!url) return true; // Campo opcional
    
    const videoUrlPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
      /^https?:\/\/(www\.)?vimeo\.com\/.+/,
      /^https?:\/\/.+\.(mp4|webm|ogg)$/,
      /^https?:\/\/.+/
    ];
    
    return videoUrlPatterns.some(pattern => pattern.test(url));
  };

  // Implementação de upload paralelo com limite de concorrência
  const uploadImagesParallel = async (propertyId: string) => {
    const uploadTasks: Promise<any>[] = [];
    const results: any[] = [];

    try {
      // Preparar tarefas de upload
      if (cardImage) {
        uploadTasks.push(
          uploadCardImage(cardImage, propertyId).then(result => ({
            type: 'card',
            success: result.success,
            error: result.error
          }))
        );
      }

      if (coverImage) {
        uploadTasks.push(
          uploadCoverImage(coverImage, propertyId).then(result => ({
            type: 'capa',
            success: result.success,
            error: result.error
          }))
        );
      }

      // Processar galerias em lotes para evitar sobrecarga
      const galleryBatches = [];
      for (const gallery of galleries) {
        const newImages = gallery.images.filter(img => img.file);
        if (newImages.length > 0) {
          const files = newImages
            .map(img => img.file!)
            .sort((a, b) => {
              const aImg = gallery.images.find(img => img.file === a);
              const bImg = gallery.images.find(img => img.file === b);
              return (aImg?.ordem || 0) - (bImg?.ordem || 0);
            });

          galleryBatches.push({
            name: gallery.name,
            files: files
          });
        }
      }

      // Adicionar uploads de galeria às tarefas
      galleryBatches.forEach(batch => {
        uploadTasks.push(
          uploadGallery(batch.files, propertyId, batch.name).then(result => ({
            type: 'galeria',
            name: batch.name,
            success: result.success,
            results: result.results
          }))
        );
      });

      // Executar todos os uploads em paralelo com controle de progresso
      const progressTracker = new ProgressTracker(uploadTasks.length);
      let currentProgress = 0;
      
      const taskPromises = uploadTasks.map(async (task, index) => {
        try {
          const result = await task;
          currentProgress = progressTracker.completeTask(index);
          return result;
        } catch (error) {
          currentProgress = progressTracker.failTask(index);
          throw error;
        }
      });

      const uploadResults = await Promise.allSettled(taskPromises);
      
      // Processar resultados
      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            type: 'error',
            index: index,
            error: result.reason
          });
        }
      });

      return results;

    } catch (error) {
      console.error('Erro geral no upload paralelo:', error);
      return [{
        type: 'geral',
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }];
    }
  };

  const uploadImages = async (propertyId: string) => {
    const uploadResults: { type: any; success: any; error?: any; name?: any; results?: any; }[] = [];

    try {
      // Usar upload paralelo em vez de sequencial
      const parallelResults = await uploadImagesParallel(propertyId);
      
      // Processar resultados para manter compatibilidade com o código existente
      parallelResults.forEach(result => {
        if (result.type === 'card' || result.type === 'capa') {
          uploadResults.push({
            type: result.type,
            success: result.success,
            error: result.error
          });
        } else if (result.type === 'galeria') {
          uploadResults.push({
            type: 'galeria',
            name: result.name,
            success: result.success,
            results: result.results
          });
        } else if (result.type === 'error') {
          uploadResults.push({
            type: 'error',
            success: false,
            error: result.error
          });
        }
      });

      // Recarregar imagens existentes se estiver editando
      if (isEditing && uploadResults.some(r => r.success)) {
        await loadExistingImages();
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
    clearAlerts();
    clearError();

    try {
      // Validações básicas
      if (!formData.titulo.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "Nome do empreendimento" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (!formData.slug.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "URL/Rota" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (!formData.titulo_descricao.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "Título Descrição" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (!formData.valor.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "Valor de Venda" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (!formData.bairro.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "Bairro" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (!formData.area_texto.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "Metragens texto" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      if (formData.quartos.length === 0) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'Selecione pelo menos uma opção de quartos.',
        });
        setIsLoading(false);
        return;
      }

      if (formData.banheiros.length === 0) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'Selecione pelo menos uma opção de banheiros.',
        });
        setIsLoading(false);
        return;
      }

      if (formData.vagas.length === 0) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'Selecione pelo menos uma opção de vagas.',
        });
        setIsLoading(false);
        return;
      }

      if (!formData.iframe_mapa.trim()) {
        addAlert({
          type: 'error',
          title: 'Campo obrigatório',
          message: 'O campo "Frame do Google Maps" é obrigatório.',
        });
        setIsLoading(false);
        return;
      }

      // Validação da URL do vídeo
      // if (formData.video_url && !isValidVideoUrl(formData.video_url)) {
      //   addAlert({
      //     type: 'error',
      //     title: 'URL inválida',
      //     message: 'Por favor, insira uma URL de vídeo válida (YouTube, Vimeo, etc.).',
      //   });
      //   setIsLoading(false);
      //   return;
      // }

      addAlert({
        type: 'loading',
        message: `${isEditing ? 'Atualizando' : 'Criando'} propriedade...`,
        dismissible: false
      });

      const propertyData = {
        titulo: formData.titulo,
        slug: formData.slug,
        titulo_descricao: formData.titulo_descricao,
        descricao: formData.descricao || null,
        valor: parseFloat(formData.valor) || 0,
        bairro: formData.bairro,
        area_texto: formData.area_texto,
        cidade: formData.cidade,
        estado: formData.estado,
        status_empreendimento: formData.status_empreendimento,
        tipo_imovel: formData.tipo_imovel,
        endereco: formData.endereco || null,
        texto_localizacao: formData.texto_localizacao || null,
        valor_condominio: parseFloat(formData.valor_condominio) || null,
        caracteristicas: formData.caracteristicas,
        banheiros: formData.banheiros,
        quartos: formData.quartos,
        vagas: formData.vagas,
        areas_disponiveis: formData.areas_disponiveis,
        destaque: formData.destaque,
        responsavel_atualizacao: formData.responsavel_atualizacao || null,
        home: formData.home,
        iframe_mapa: formData.iframe_mapa,
        // video_url: formData.video_url || null,
        data_atualizacao: new Date().toISOString(),
        ...((!isEditing) && {
          responsavel_criacao: formData.responsavel_criacao || null,
          data_criacao: new Date().toISOString()
        })
      };

      // Adicionar responsável_criacao apenas no cadastro

      let resultPropertyId = propertyId;

      if (isEditing) {
        // Atualizar propriedade existente
        const { data, error } = await supabase
          .from('fx_properties')
          .update(propertyData)
          .eq('id', propertyId)
          .select();
        
        if (error) {
          console.error('Erro ao atualizar:', error);
          clearAlerts();
          if (error.code === '23505' && error.details?.includes('slug')) {
            addAlert({
              type: 'error',
              title: 'URL já existe',
              message: 'Esta URL/Rota já está sendo usada por outra propriedade. Por favor, use uma URL única.',
            });
          } else {
            addAlert({
              type: 'error',
              title: 'Erro ao atualizar',
              message: `Não foi possível atualizar a propriedade: ${error.message}`,
            });
          }
          return;
        }
      } else {
        // Criar nova propriedade
        const { data: newProperty, error } = await supabase
          .from('fx_properties')
          .insert(propertyData)
          .select()
          .single();

        if (error) {
          console.error('Erro ao criar:', error);
          clearAlerts();
          if (error.code === '23505' && error.details?.includes('slug')) {
            addAlert({
              type: 'error',
              title: 'URL já existe',
              message: 'Esta URL/Rota já está sendo usada por outra propriedade. Por favor, use uma URL única.',
            });
          } else {
            addAlert({
              type: 'error',
              title: 'Erro ao criar',
              message: `Não foi possível criar a propriedade: ${error.message}`,
            });
          }
          return;
        }

        resultPropertyId = newProperty.id;
      }

      // Upload das imagens se houver
      const hasNewImages = cardImage || coverImage || galleries.some(g => g.images.some(img => img.file));
      
      if (hasNewImages && resultPropertyId) {
        clearAlerts();
        
        addAlert({
          type: 'loading',
          message: `Propriedade ${isEditing ? 'atualizada' : 'criada'}! Fazendo upload das imagens...`,
          progress: 0,
          dismissible: false
        });

        const uploadResults = await uploadImages(resultPropertyId);
        
        // Verificar resultados do upload
        const failedUploads = uploadResults.filter(result => !result.success);
        
        clearAlerts();
        
        if (failedUploads.length > 0) {
          addAlert({
            type: 'warning',
            title: 'Upload parcialmente concluído',
            message: `Propriedade ${isEditing ? 'atualizada' : 'criada'} com sucesso, mas houve problemas no upload de algumas imagens.`,
            actions: [
              {
                label: 'Ver detalhes',
                onClick: () => {
                  // Mostrar detalhes dos erros
                  failedUploads.forEach(upload => {
                    addAlert({
                      type: 'error',
                      title: `Erro no upload - ${upload.type}`,
                      message: upload.error || 'Erro desconhecido',
                      compact: true
                    });
                  });
                }
              }
            ]
          });
        } else {
          addAlert({
            type: 'success',
            title: 'Tudo concluído!',
            message: `Propriedade e todas as imagens foram ${isEditing ? 'atualizadas' : 'criadas'} com sucesso!`,
            actions: [
              {
                label: 'Ver propriedades',
                onClick: () => router.push('/admin/imoveis'),
                primary: true
              }
            ]
          });
        }
      } else {
        clearAlerts();
        addAlert({
          type: 'success',
          title: 'Propriedade salva!',
          message: `Propriedade ${isEditing ? 'atualizada' : 'criada'} com sucesso!`,
          actions: [
            {
              label: 'Ver propriedades',
              onClick: () => router.push('/admin/imoveis'),
              primary: true
            }
          ]
        });
      }

      // Redirecionar após sucesso
      setTimeout(() => {
        router.push('/admin/imoveis');
      }, 3000);

    } catch (error) {
      console.error('Erro inesperado:', error);
      clearAlerts();
      addAlert({
        type: 'error',
        title: 'Erro inesperado',
        message: `Ocorreu um erro inesperado ao ${isEditing ? 'atualizar' : 'criar'} a propriedade. Tente novamente.`,
        actions: [
          {
            label: 'Tentar novamente',
            onClick: () => handleSubmit(e),
            primary: true
          }
        ]
      });
    }

    setIsLoading(false);
  };

  // Efeito para monitorar erros de upload
  useEffect(() => {
    if (uploadError) {
      addAlert({
        type: 'error',
        title: 'Erro no upload',
        message: uploadError,
        actions: [
          {
            label: 'Tentar novamente',
            onClick: clearError,
            primary: true
          }
        ]
      });
    }
  }, [uploadError]);

  // Efeito para monitorar progresso de upload
  useEffect(() => {
    if (isUploading && uploadProgress > 0) {
      // Atualizar alerta de progresso se existir
      const loadingAlert = alerts.find(alert => alert.type === 'loading');
      if (loadingAlert) {
        updateAlert(loadingAlert.id, {
          progress: uploadProgress,
          message: `Fazendo upload das imagens... ${uploadProgress}%`
        });
      }
    }
  }, [isUploading, uploadProgress]);

  if (isLoadingData) {
    return (
      <div className="fade-in property-edit-container">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
          <p>Carregando dados da propriedade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in property-edit-container">
      {/* Container de Alertas - POSICIONAMENTO FIXO */}
      <div className="alerts-container">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            progress={alert.progress}
            onClose={alert.dismissible !== false ? () => removeAlert(alert.id) : undefined}
            actions={alert.actions}
            dismissible={alert.dismissible}
            compact={alert.compact}
          />
        ))}
      </div>

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          {isEditing ? 'Editar Propriedade' : 'Cadastrar Nova Propriedade'}
        </h1>
        <Link href="/admin/imoveis" className="back-link">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

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
                required
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
                {formData.areas_disponiveis.map((area: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      background: '#e0f7fa',
                      padding: '6px 12px',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {area} m²
                    <button
                      type="button"
                      onClick={() => handleRemoveArea(area)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '14px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <span className="field-help">Digite e adicione diferentes metragens disponíveis</span>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label required">Título Descrição</label>
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
            <span className="field-help">Título para descrição do empreendimento</span>
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
                <option value="São Caetano">São Caetano</option>
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
            <label className="field-label">Título Descrição</label>
            <input
              type="text"
              name="endereco"
              value={formData.endereco}
              onChange={handleChange}
              className="field-input"
              placeholder="Uma das Melhores Regiões da Zona Sul!"
            />
            <span className="field-help">Título para página do empreendimento (abaixo do mapa)</span> 
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
            <textarea
              name="iframe_mapa"
              value={formData.iframe_mapa}
              onChange={handleChange}
              className="field-input field-textarea"
              rows={3}
              required
              placeholder="Cole aqui o código iframe do Google Maps..."
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

        {/* Imagens e Vídeo */}
        <div className="form-card">
          <div className="card-header">
            <Image className="card-icon" />
            <h2 className="card-title">Imagens e Vídeo</h2>
          </div>
          
          {/* Campo de Vídeo */}
          {/* <div className="field-group">
            <label className="field-label">
              <Video size={16} style={{ marginRight: '8px' }} />
              URL do Vídeo do Empreendimento
            </label>
            <input
              type="url"
              name="video_url"
              value={formData.video_url}
              onChange={handleChange}
              className="field-input"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <span className="field-help">
              URL do vídeo do empreendimento (YouTube, Vimeo, etc.). Este vídeo poderá ser usado em outras partes do site.
            </span>
          </div> */}

          {/* Imagem de Card */}
          <div className="images-section">
            <ImageUpload
              label="Imagem de Card (Listagem)"
              value={existingCardImageUrl}
              onChange={setCardImage}
              onDelete={existingCardImageUrl ? handleDeleteCardImage : undefined}
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
              value={existingCoverImageUrl}
              onChange={setCoverImage}
              onDelete={existingCoverImageUrl ? handleDeleteCoverImage : undefined}
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
              onDeleteGallery={isEditing ? handleDeleteGallery : undefined}
              onRemoveImage={isEditing ? handleRemoveGalleryImage : undefined}
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
          
          {!isEditing && (
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
              <span className="field-help">Responsável pela criação da propriedade</span>
            </div>
          )}
          
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
            <span className="field-help">Responsável por futuras atualizações</span>
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
                {isEditing ? 'Atualizar Propriedade' : 'Criar Propriedade'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

