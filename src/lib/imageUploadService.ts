import { supabase } from "./supabase";


export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface ImageData {
  imovel_id: string;
  url: string;
  tipo: 'card' | 'capa' | 'galeria';
  ordem?: number;
  nome_galeria?: string;
}

/**
 * Converte arquivo para WebP e redimensiona se necessário
 */
const convertToWebP = async (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calcular dimensões mantendo proporção
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Desenhar imagem redimensionada
      ctx?.drawImage(img, 0, 0, width, height);

      // Converter para WebP
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(webpFile);
          } else {
            reject(new Error('Erro ao converter imagem para WebP'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => reject(new Error('Erro ao carregar imagem'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Faz upload de uma imagem principal (card ou capa)
 */
export const uploadMainImage = async (
  file: File,
  imovelId: string,
  tipo: 'card' | 'capa'
): Promise<UploadResult> => {
  try {
    // Converter para WebP
    const webpFile = await convertToWebP(file, tipo === 'card' ? 800 : 1920, 0.85);
    
    // Definir nome do arquivo
    const fileName = `imagem_${tipo}.webp`;
    const filePath = `${imovelId}/${fileName}`;

    // Fazer upload para o Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('imagens-imoveis')
      .upload(filePath, webpFile, {
        cacheControl: '3600',
        upsert: true // Substitui se já existir
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return { success: false, error: uploadError.message };
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from('imagens-imoveis')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Salvar/atualizar no banco de dados
    const { error: dbError } = await supabase
      .from('fx_property_images')
      .upsert({
        imovel_id: imovelId,
        url: imageUrl,
        tipo: tipo,
        ordem: 0,
        nome_galeria: null
      }, {
        onConflict: 'imovel_id,tipo,ordem,nome_galeria'
      });

    if (dbError) {
      console.error('Erro ao salvar no banco:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true, url: imageUrl };

  } catch (error) {
    console.error('Erro no upload da imagem principal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};

/**
 * Faz upload de múltiplas imagens de uma galeria
 */
export const uploadGalleryImages = async (
  files: File[],
  imovelId: string,
  nomeGaleria: string
): Promise<{ success: boolean; results: UploadResult[]; error?: string }> => {
  try {
    const results: UploadResult[] = [];
    const imageDataList: ImageData[] = [];

    // Processar cada arquivo
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Converter para WebP
        const webpFile = await convertToWebP(file, 1920, 0.8);
        
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const fileName = `foto_${timestamp}_${randomId}.webp`;
        const filePath = `${imovelId}/galerias/${nomeGaleria}/${fileName}`;

        // Fazer upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imagens-imoveis')
          .upload(filePath, webpFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          results.push({ success: false, error: uploadError.message });
          continue;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('imagens-imoveis')
          .getPublicUrl(filePath);

        const imageUrl = urlData.publicUrl;

        // Adicionar à lista para salvar no banco
        imageDataList.push({
          imovel_id: imovelId,
          url: imageUrl,
          tipo: 'galeria',
          ordem: i,
          nome_galeria: nomeGaleria
        });

        results.push({ success: true, url: imageUrl });

      } catch (fileError) {
        console.error(`Erro ao processar arquivo ${i}:`, fileError);
        results.push({ 
          success: false, 
          error: fileError instanceof Error ? fileError.message : 'Erro ao processar arquivo' 
        });
      }
    }

    // Salvar todas as imagens no banco de dados
    if (imageDataList.length > 0) {
      const { error: dbError } = await supabase
        .from('fx_property_images')
        .insert(imageDataList);

      if (dbError) {
        console.error('Erro ao salvar galeria no banco:', dbError);
        return { 
          success: false, 
          results, 
          error: `Erro ao salvar no banco: ${dbError.message}` 
        };
      }
    }

    const successCount = results.filter(r => r.success).length;
    return { 
      success: successCount > 0, 
      results 
    };

  } catch (error) {
    console.error('Erro no upload da galeria:', error);
    return { 
      success: false, 
      results: [], 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};

/**
 * Remove uma imagem do Storage e do banco de dados
 */
export const deleteImage = async (
  imovelId: string,
  imageUrl: string,
  tipo: 'card' | 'capa' | 'galeria',
  nomeGaleria?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Extrair o caminho do arquivo da URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    console.log(nomeGaleria,' ', tipo)
    let filePath: string;
    if (tipo === 'galeria' && nomeGaleria) {
      console.log(fileName)
      filePath = `${imovelId}/galerias/${nomeGaleria}/${fileName}`;
    } else {
      filePath = `${imovelId}/imagem_${tipo}.webp`;
    }

    const { data: list, error: listError } = await supabase.storage
    .from('imagens-imoveis')
    .list(imovelId); // ou `${imovelId}/galerias/${nomeGaleria}`

    console.log('Arquivos na pasta:', list);

    console.log('Tentando deletar:', filePath);

    const { data: user } = await supabase.auth.getUser();
    console.log(user);
    // Remover do Storage
    const { error: storageError } = await supabase.storage
      .from('imagens-imoveis')
      .remove([filePath]);

    if (storageError) {
      console.error('Erro ao remover do storage:', storageError);
    }
    
    // Remover do banco de dados
    const { error: dbError } = await supabase
      .from('fx_property_images')
      .delete()
      .eq('imovel_id', imovelId)
      .eq('url', imageUrl);

    if (dbError) {
      console.error('Erro ao remover do banco:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };

  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};

/**
 * Remove todas as imagens de uma galeria
 */
export const deleteGallery = async (
  imovelId: string,
  nomeGaleria: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Buscar todas as imagens da galeria
    const { data: images, error: fetchError } = await supabase
      .from('fx_property_images')
      .select('url')
      .eq('imovel_id', imovelId)
      .eq('tipo', 'galeria')
      .eq('nome_galeria', nomeGaleria);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    // Remover cada imagem
    if (images && images.length > 0) {
      for (const image of images) {
        await deleteImage(imovelId, image.url, 'galeria', nomeGaleria);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Erro ao deletar galeria:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};

/**
 * Busca todas as imagens de um imóvel
 */
export const getPropertyImages = async (imovelId: string) => {
  try {
    const { data, error } = await supabase
      .from('fx_property_images')
      .select('*')
      .eq('imovel_id', imovelId)
      .order('tipo')
      .order('nome_galeria')
      .order('ordem');

    if (error) {
      console.error('Erro ao buscar imagens:', error);
      return { success: false, error: error.message, data: null };
    }

    // Organizar por tipo
    const organized = {
      card: data?.find(img => img.tipo === 'card')?.url || null,
      capa: data?.find(img => img.tipo === 'capa')?.url || null,
      galerias: {} as Record<string, Array<{ url: string; ordem: number }>>
    };

    // Organizar galerias
    data?.filter(img => img.tipo === 'galeria').forEach(img => {
      if (!organized.galerias[img.nome_galeria || 'default']) {
        organized.galerias[img.nome_galeria || 'default'] = [];
      }
      organized.galerias[img.nome_galeria || 'default'].push({
        url: img.url,
        ordem: img.ordem || 0
      });
    });

    // Ordenar imagens dentro de cada galeria
    Object.keys(organized.galerias).forEach(galleryName => {
      organized.galerias[galleryName].sort((a, b) => a.ordem - b.ordem);
    });

    return { success: true, data: organized, error: null };

  } catch (error) {
    console.error('Erro ao buscar imagens do imóvel:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      data: null 
    };
  }
};


// Cache de imagens para melhor performance
const imageCache = new Map<string, any>();
const cacheExpiry = new Map<string, number>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca imagens de múltiplas propriedades com cache otimizado
 * Para usar na listagem de empreendimentos
 */
export const getMultiplePropertyImages = async (propertyIds: string[]) => {
  try {
    // Verificar cache primeiro
    const now = Date.now();
    const cachedResults: Record<string, any> = {};
    const uncachedIds: string[] = [];

    propertyIds.forEach(id => {
      const cached = imageCache.get(id);
      const expiry = cacheExpiry.get(id);
      
      if (cached && expiry && now < expiry) {
        cachedResults[id] = cached;
      } else {
        uncachedIds.push(id);
      }
    });

    // Se todos estão em cache, retornar
    if (uncachedIds.length === 0) {
      console.log('Todas as imagens carregadas do cache');
      return { success: true, data: cachedResults, error: null };
    }

    console.log(`Buscando imagens para ${uncachedIds.length} propriedades`);

    // Buscar imagens não cacheadas
    const { data: images, error } = await supabase
      .from('fx_property_images')
      .select('*')
      .in('imovel_id', uncachedIds)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Erro ao buscar imagens:', error);
      return { success: false, error: error.message, data: null };
    }

    // Organizar imagens por property ID
    const imagesByProperty: Record<string, any> = { ...cachedResults };
    
    // Inicializar arrays vazios para propriedades sem imagens
    uncachedIds.forEach(id => {
      imagesByProperty[id] = {
        card: null,
        capa: null,
        galerias: {}
      };
    });

    // Organizar imagens retornadas
    images?.forEach(img => {
      if (!imagesByProperty[img.imovel_id]) {
        imagesByProperty[img.imovel_id] = {
          card: null,
          capa: null,
          galerias: {}
        };
      }

      const property = imagesByProperty[img.imovel_id];

      if (img.tipo === 'card') {
        property.card = img.url;
      } else if (img.tipo === 'capa') {
        property.capa = img.url;
      } else if (img.tipo === 'galeria') {
        const galleryName = img.nome_galeria || 'default';
        if (!property.galerias[galleryName]) {
          property.galerias[galleryName] = [];
        }
        property.galerias[galleryName].push({
          url: img.url,
          ordem: img.ordem || 0
        });
      }
    });

    // Ordenar galerias e atualizar cache
    uncachedIds.forEach(id => {
      const property = imagesByProperty[id];
      Object.keys(property.galerias).forEach(galleryName => {
        property.galerias[galleryName].sort((a: any, b: any) => a.ordem - b.ordem);
      });
      
      // Atualizar cache
      imageCache.set(id, property);
      cacheExpiry.set(id, now + CACHE_DURATION);
    });

    console.log(`Imagens organizadas para ${Object.keys(imagesByProperty).length} propriedades`);
    return { success: true, data: imagesByProperty, error: null };

  } catch (err) {
    console.error('Erro ao buscar imagens das propriedades:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      data: null 
    };
  }
};

/**
 * Obtém a melhor imagem para exibição em card
 * Prioridade: card > capa > primeira galeria > padrão
 */
export const getCardImageUrl = (propertyImages: any): string => {
  const defaultImage = "/assets/temporario tela.png";

  if (!propertyImages) {
    return defaultImage;
  }

  // Prioridade 1: Imagem de card
  if (propertyImages.card) {
    return propertyImages.card;
  }

  // Prioridade 2: Imagem de capa
  if (propertyImages.capa) {
    return propertyImages.capa;
  }

  // Prioridade 3: Primeira imagem de qualquer galeria
  const galleries = propertyImages.galerias || {};
  for (const galleryName of Object.keys(galleries)) {
    const gallery = galleries[galleryName];
    if (gallery && gallery.length > 0) {
      return gallery[0].url;
    }
  }

  // Fallback: imagem padrão
  return defaultImage;
};

/**
 * Limpa o cache de imagens
 */
export const clearImageCache = (): void => {
  imageCache.clear();
  cacheExpiry.clear();
  console.log('Cache de imagens limpo');
};

/**
 * Obtém estatísticas do cache
 */
export const getCacheStats = (): { size: number; entries: string[] } => {
  return {
    size: imageCache.size,
    entries: Array.from(imageCache.keys())
  };
};

/**
 * Pré-carrega imagens para melhor performance
 */
export const preloadImages = (urls: string[]): void => {
  urls.forEach(url => {
    if (url && url.startsWith('http')) {
      const img = new Image();
      img.src = url;
    }
  });
};

