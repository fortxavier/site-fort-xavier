import { useState, useCallback, useEffect } from 'react';
import { getMultiplePropertyImages, getCardImageUrl, preloadImages, getPropertyImages } from '../imageUploadService';

interface UsePropertyImagesReturn {
  // Estados
  images: Record<string, any>;
  isLoading: boolean;
  error: string | null;
  loadingStates: Record<string, boolean>;
  
  // Funções
  fetchImages: (propertyIds: string[]) => Promise<void>;
  getImageForProperty: (propertyId: string) => string;
  clearError: () => void;
  refetch: () => Promise<void>;
  
  // Novas funções para lazy loading
  observeProperty: (propertyId: string, element: HTMLElement | null) => (() => void) | undefined;
  preloadCriticalImages: (propertyIds: string[]) => Promise<void>;
}

export const usePropertyImages = (initialPropertyIds: string[] = []): UsePropertyImagesReturn => {
  const [images, setImages] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPropertyIds, setCurrentPropertyIds] = useState<string[]>(initialPropertyIds);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [imageCache, setImageCache] = useState<Map<string, any>>(new Map());
  
  // Implementar intersection observer para lazy loading
  const [visibleProperties, setVisibleProperties] = useState<Set<string>>(new Set());
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Função para observar propriedades com intersection observer
  const observeProperty = useCallback((propertyId: string, element: HTMLElement | null) => {
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setVisibleProperties(prev => new Set(prev).add(propertyId));
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        rootMargin: '100px', // Carregar imagens 100px antes de ficarem visíveis
        threshold: 0.1 
      }
    );

    observer.observe(element);
    
    return () => observer.unobserve(element);
  }, []);

  // Carregar imagens apenas para propriedades visíveis
  const loadImagesForProperty = useCallback(async (propertyId: string) => {
    // Verificar cache primeiro
    if (imageCache.has(propertyId)) {
      setImages(prev => ({ ...prev, [propertyId]: imageCache.get(propertyId) }));
      return;
    }

    setLoadingStates(prev => ({ ...prev, [propertyId]: true }));

    try {
      const result = await getPropertyImages(propertyId);
      
      if (result.success && result.data) {
        // Armazenar no cache
        imageCache.set(propertyId, result.data);
        setImageCache(new Map(imageCache));
        
        setImages(prev => ({ ...prev, [propertyId]: result.data }));
      }
    } catch (err) {
      console.error(`Erro ao carregar imagens da propriedade ${propertyId}:`, err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoadingStates(prev => ({ ...prev, [propertyId]: false }));
    }
  }, [imageCache]);

  // Efeito para carregar imagens de propriedades visíveis
  useEffect(() => {
    visibleProperties.forEach(propertyId => {
      if (!images[propertyId] && !loadingStates[propertyId]) {
        loadImagesForProperty(propertyId);
      }
    });
  }, [visibleProperties, images, loadingStates, loadImagesForProperty]);

  // Função para pré-carregar imagens críticas (como primeira tela)
  const preloadCriticalImages = useCallback(async (propertyIds: string[]) => {
    const criticalPromises = propertyIds.slice(0, 3).map(id => loadImagesForProperty(id));
    await Promise.all(criticalPromises);
  }, [loadImagesForProperty]);

  // Função original fetchImages mantida para compatibilidade
  const fetchImages = useCallback(async (propertyIds: string[]) => {
    if (propertyIds.length === 0) {
      setImages({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPropertyIds(propertyIds);

    try {
      console.log('Buscando imagens para propriedades:', propertyIds);
      
      const result = await getMultiplePropertyImages(propertyIds);
      
      if (result.success && result.data) {
        // Atualizar cache com os dados recebidos
        Object.entries(result.data).forEach(([propertyId, propertyImages]) => {
          imageCache.set(propertyId, propertyImages);
        });
        setImageCache(new Map(imageCache));
        
        setImages(result.data);
        
        // Pré-carregar imagens para melhor performance
        const imageUrls: string[] = [];
        Object.values(result.data).forEach((propertyImages: any) => {
          if (propertyImages.card) imageUrls.push(propertyImages.card);
          if (propertyImages.capa) imageUrls.push(propertyImages.capa);
          
          Object.values(propertyImages.galerias || {}).forEach((gallery: any) => {
            if (Array.isArray(gallery)) {
              gallery.forEach((img: any) => {
                if (img.url) imageUrls.push(img.url);
              });
            }
          });
        });
        
        if (imageUrls.length > 0) {
          preloadImages(imageUrls);
        }
        
        console.log(`Imagens carregadas para ${Object.keys(result.data).length} propriedades`);
      } else {
        setError(result.error || 'Erro ao carregar imagens');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar imagens:', err);
    } finally {
      setIsLoading(false);
    }
  }, [imageCache]);

  const getImageForProperty = useCallback((propertyId: string): string => {
    const propertyImages = images[propertyId];
    return getCardImageUrl(propertyImages);
  }, [images]);

  const refetch = useCallback(async () => {
    if (currentPropertyIds.length > 0) {
      await fetchImages(currentPropertyIds);
    }
  }, [currentPropertyIds, fetchImages]);

  // Carregar imagens iniciais
  useEffect(() => {
    if (initialPropertyIds.length > 0) {
      fetchImages(initialPropertyIds);
    }
  }, [initialPropertyIds.join(','), fetchImages]);

  return {
    images,
    isLoading,
    error,
    loadingStates,
    fetchImages,
    getImageForProperty,
    clearError,
    refetch,
    observeProperty,
    preloadCriticalImages
  };
};

