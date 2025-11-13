/**
 * Hook personalizado para gerenciar uploads de imagens
 */
import { useState, useCallback } from 'react';
import { 
  uploadMainImage, 
  uploadGalleryImages, 
  deleteImage, 
  deleteGallery,
  getPropertyImages,
  UploadResult 
} from '../imageUploadService';

interface UseImageUploadReturn {
  // Estados
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  
  // Funções para imagens principais
  uploadCardImage: (file: File, imovelId: string) => Promise<UploadResult>;
  uploadCoverImage: (file: File, imovelId: string) => Promise<UploadResult>;
  
  // Funções para galerias
  uploadGallery: (files: File[], imovelId: string, galleryName: string) => Promise<{ success: boolean; results: UploadResult[] }>;
  removeImage: (imovelId: string, imageUrl: string, tipo: 'card' | 'capa' | 'galeria', galleryName?: string) => Promise<boolean>;
  removeGallery: (imovelId: string, galleryName: string) => Promise<boolean>;
  
  // Função para buscar imagens
  fetchPropertyImages: (imovelId: string) => Promise<any>;
  
  // Função para limpar erros
  clearError: () => void;
}

export const useImageUpload = (): UseImageUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const uploadCardImage = useCallback(async (file: File, imovelId: string): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(50);
      const result = await uploadMainImage(file, imovelId, 'card');
      setUploadProgress(100);
      
      if (!result.success) {
        setError(result.error || 'Erro ao fazer upload da imagem de card');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  const uploadCoverImage = useCallback(async (file: File, imovelId: string): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(50);
      const result = await uploadMainImage(file, imovelId, 'capa');
      setUploadProgress(100);
      
      if (!result.success) {
        setError(result.error || 'Erro ao fazer upload da imagem de capa');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  const uploadGallery = useCallback(async (
    files: File[], 
    imovelId: string, 
    galleryName: string
  ): Promise<{ success: boolean; results: UploadResult[] }> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const result = await uploadGalleryImages(files, imovelId, galleryName);
      setUploadProgress(100);
      
      if (!result.success) {
        setError(result.error || 'Erro ao fazer upload da galeria');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return { success: false, results: [] };
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  }, []);

  const removeImage = useCallback(async (
    imovelId: string, 
    imageUrl: string, 
    tipo: 'card' | 'capa' | 'galeria', 
    galleryName?: string
  ): Promise<boolean> => {
    setError(null);

    try {
      const result = await deleteImage(imovelId, imageUrl, tipo, galleryName);
      
      if (!result.success) {
        setError(result.error || 'Erro ao remover imagem');
      }
      
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return false;
    }
  }, []);

  const removeGallery = useCallback(async (imovelId: string, galleryName: string): Promise<boolean> => {
    setError(null);

    try {
      const result = await deleteGallery(imovelId, galleryName);
      
      if (!result.success) {
        setError(result.error || 'Erro ao remover galeria');
      }
      
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return false;
    }
  }, []);

  const fetchPropertyImages = useCallback(async (imovelId: string) => {
    setError(null);

    try {
      const result = await getPropertyImages(imovelId);
      
      if (!result.success) {
        setError(result.error || 'Erro ao buscar imagens');
        return null;
      }
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      return null;
    }
  }, []);

  return {
    isUploading,
    uploadProgress,
    error,
    uploadCardImage,
    uploadCoverImage,
    uploadGallery,
    removeImage,
    removeGallery,
    fetchPropertyImages,
    clearError
  };
};

/**
 * Função utilitária para validar arquivos de imagem
 */
export const validateImageFile = (file: File, maxSizeMB: number = 5): string | null => {
  // Verificar tipo
  if (!file.type.startsWith('image/')) {
    return 'Arquivo deve ser uma imagem';
  }

  // Verificar tamanho
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return `Arquivo deve ter no máximo ${maxSizeMB}MB`;
  }

  // Verificar formatos suportados
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!supportedTypes.includes(file.type)) {
    return 'Formato não suportado. Use JPG, PNG ou WebP';
  }

  return null;
};

/**
 * Função utilitária para redimensionar imagem antes do upload
 */
export const resizeImage = (file: File, maxWidth: number, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Erro ao redimensionar imagem'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};

