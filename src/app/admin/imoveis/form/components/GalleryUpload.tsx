import React, { useState, useRef } from 'react';
import { Upload, X, Plus, GripVertical, Trash2 } from 'lucide-react';
import { GalleryImage } from '../types';

interface GalleryUploadProps {
  label: string;
  galleryName: string;
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  onRemoveExistingImage?: (imageUrl: string) => Promise<boolean>; // Nova prop para remover imagens existentes
  maxImages?: number;
  maxSize?: number; // em MB
  disabled?: boolean;
}

export default function GalleryUpload({
  label,
  galleryName,
  value = [],
  onChange,
  onRemoveExistingImage,
  maxImages = 10,
  maxSize = 5,
  disabled = false
}: GalleryUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [removingImages, setRemovingImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Por favor, selecione apenas arquivos de imagem.';
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `O arquivo deve ter no máximo ${maxSize}MB.`;
    }

    return null;
  };

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const addImages = (files: FileList) => {
    if (disabled) return;

    const newImages: GalleryImage[] = [];
    const currentCount = value.length;

    for (let i = 0; i < files.length && (currentCount + newImages.length) < maxImages; i++) {
      const file = files[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        continue;
      }

      const preview = URL.createObjectURL(file);
      const newImage: GalleryImage = {
        id: generateId(),
        file,
        ordem: currentCount + newImages.length,
        preview
      };

      newImages.push(newImage);
    }

    if (newImages.length > 0) {
      setError('');
      onChange([...value, ...newImages]);
    }
  };

  const removeImage = async (id: string) => {
    const imageToRemove = value.find(img => img.id === id);
    if (!imageToRemove) return;

    // Se é uma imagem existente (tem URL mas não tem file)
    if (imageToRemove.url && !imageToRemove.file && onRemoveExistingImage) {
      setRemovingImages(prev => new Set(prev).add(id));
      
      try {
        const success = await onRemoveExistingImage(imageToRemove.url);
        
        if (success) {
          // Remover da lista local apenas se a remoção do servidor foi bem-sucedida
          const updatedImages = value
            .filter(img => img.id !== id)
            .map((img, index) => ({ ...img, ordem: index }));
          
          onChange(updatedImages);
          setError('');
        } else {
          setError('Erro ao remover imagem existente do servidor');
        }
      } catch (err) {
        setError('Erro ao remover imagem existente');
        console.error('Erro ao remover imagem:', err);
      } finally {
        setRemovingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } else {
      // Imagem nova (apenas local) - remove imediatamente
      const updatedImages = value
        .filter(img => img.id !== id)
        .map((img, index) => ({ ...img, ordem: index }));
      
      onChange(updatedImages);
    }
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updatedImages = [...value];
    const [movedImage] = updatedImages.splice(fromIndex, 1);
    updatedImages.splice(toIndex, 0, movedImage);
    
    // Reordenar
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      ordem: index
    }));
    
    onChange(reorderedImages);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files) {
      addImages(files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      addImages(files);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveImage(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
  };

  // Separar imagens existentes das novas para melhor organização visual
  const existingImages = value.filter(img => img.url && !img.file);
  const newImages = value.filter(img => img.file);

 
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        <span className="text-sm text-gray-500 ml-2">
          ({value.length}/{maxImages} imagens)
        </span>
      </label>

      <div className="space-y-4">
        {/* Área de upload */}
        {value.length < maxImages && (
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
              ${error ? 'border-red-300 bg-red-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleInputChange}
              className="hidden"
              disabled={disabled}
            />
            
            <div className="flex flex-col items-center space-y-2">
              <Plus className="h-8 w-8 text-gray-400" />
              <div className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">Clique para adicionar</span>
                {' '}ou arraste múltiplas imagens
              </div>
              <div className="text-xs text-gray-500">
                PNG, JPG, WEBP até {maxSize}MB cada
              </div>
            </div>
          </div>
        )}

        {/* TODAS as imagens em grid de 4 colunas */}
        {value.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 font-medium flex items-center gap-2">
              <span className="text-gray-700">Galeria: {galleryName}</span>
              <span className="text-gray-500">({value.length} imagens)</span>
              <div className="flex gap-2 ml-auto">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {value.filter(img => img.url && !img.file).length} Salvas
                </span>
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  {value.filter(img => img.file).length} Novas
                </span>
              </div>
            </div>
            
            {/* Grid fixo de 4 colunas */}
            <div className="grid grid-cols-4 gap-4">
              {value.map((image, index) => {
                const isExisting = image.url && !image.file;
                const isRemoving = removingImages.has(image.id);
                
                return (
                  <div
                    key={image.id}
                    className={`
                      relative group rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-200
                      ${isExisting ? 'border-2 border-green-200' : 'border-2 border-orange-200'}
                      ${draggedIndex === index ? 'opacity-50 scale-105 z-10' : ''}
                      ${isRemoving ? 'opacity-50' : ''}
                      ${!disabled && !isRemoving ? 'hover:shadow-md cursor-move' : ''}
                    `}
                    draggable={!disabled && !isRemoving}
                    onDragStart={(e) => handleImageDragStart(e, index)}
                    onDragOver={(e) => handleImageDragOver(e, index)}
                    onDragEnd={handleImageDragEnd}
                  >
                    {/* Imagem */}
                    <div className="aspect-square relative">
                      <img
                        src={image.preview || image.url}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Botão de remoção SEMPRE VISÍVEL */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="action-btn delete-btn p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full bg-white bg-opacity-90 shadow-sm transition-colors"
                          disabled={disabled || isRemoving}
                          title={isExisting ? "Remover imagem do servidor" : "Remover nova imagem"}
                        > 
                          {isRemoving ? (
                            <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      {/* Indicador de drag no hover */}
                      {!isRemoving && (
                        <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white bg-opacity-90 rounded-full p-1 shadow-sm">
                            <GripVertical className="h-3 w-3 text-gray-600" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Número da ordem */}
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium shadow-sm">
                      {index + 1}
                    </div>
                    
                    {/* Badge diferenciando tipo */}
                    <div className={`absolute bottom-1 left-1 text-white text-xs rounded px-1.5 py-0.5 font-medium shadow-sm ${
                      isExisting ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      {isExisting ? 'Salva' : 'Nova'}
                    </div>

                    {/* Indicador de drag quando arrastando */}
                    {draggedIndex === index && (
                      <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-lg bg-blue-50 bg-opacity-70 flex items-center justify-center">
                        <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Movendo...
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded">
              <GripVertical className="h-3 w-3" />
              <span>Arraste qualquer imagem para reordenar • Botão de lixeira sempre visível</span>
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 flex items-center gap-2">
            <X className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Informações úteis */}
        {value.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-lg">
            <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <div className="font-medium">Nenhuma imagem na galeria "{galleryName}"</div>
            <div className="text-xs mt-1">Adicione imagens usando a área de upload acima</div>
          </div>
        )}
      </div>
    </div>
  );
}
