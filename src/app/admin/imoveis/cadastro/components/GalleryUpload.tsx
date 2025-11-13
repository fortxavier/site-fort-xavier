import React, { useState, useRef } from 'react';
import { Upload, X, Plus, GripVertical, Image as ImageIcon } from 'lucide-react';
import { GalleryImage } from '../types';

interface GalleryUploadProps {
  label: string;
  galleryName: string;
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  maxImages?: number;
  maxSize?: number; // em MB
  disabled?: boolean;
}

export default function GalleryUpload({
  label,
  galleryName,
  value = [],
  onChange,
  maxImages = 10,
  maxSize = 5,
  disabled = false
}: GalleryUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string>('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
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

  const removeImage = (id: string) => {
    const updatedImages = value
      .filter(img => img.id !== id)
      .map((img, index) => ({ ...img, ordem: index }));
    
    onChange(updatedImages);
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

        {/* Grid de imagens */}
        {value.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 font-medium">
              Galeria: {galleryName}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {value.map((image, index) => (
                <div
                  key={image.id}
                  className={`
                    relative group border rounded-lg overflow-hidden bg-white shadow-sm
                    ${draggedIndex === index ? 'opacity-50' : ''}
                  `}
                  draggable={!disabled}
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
                    
                    {/* Overlay com controles */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                        {/* Botão de arrastar */}
                        <div className="bg-white rounded p-1 cursor-move">
                          <GripVertical className="h-4 w-4 text-gray-600" />
                        </div>
                        
                        {/* Botão de remover */}
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="bg-red-500 text-white rounded p-1 hover:bg-red-600 transition-colors"
                          disabled={disabled}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Número da ordem */}
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-gray-500">
              💡 Arraste as imagens para reordenar
            </div>
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

