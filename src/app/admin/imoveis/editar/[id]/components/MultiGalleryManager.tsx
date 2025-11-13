import React, { useState } from 'react';
import { Plus, X, Edit2, Trash2, AlertCircle } from 'lucide-react';
import GalleryUpload from './GalleryUpload';
import { GalleryImage, Gallery } from '../types';

interface MultiGalleryManagerProps {
  value: Gallery[];
  onChange: (galleries: Gallery[]) => void;
  onDeleteGallery?: (galleryName: string) => Promise<boolean>; // Função assíncrona para deletar galeria existente
  onRemoveImage?: (imageUrl: string, galleryName: string) => Promise<boolean>; // Nova função para remover imagem individual
  maxGalleries?: number;
  maxImagesPerGallery?: number;
  disabled?: boolean;
}

export default function MultiGalleryManager({
  value = [],
  onChange,
  onDeleteGallery,
  onRemoveImage,
  maxGalleries = 5,
  maxImagesPerGallery = 10,
  disabled = false
}: MultiGalleryManagerProps) {
  const [newGalleryName, setNewGalleryName] = useState('');
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');
  const [deletingGalleries, setDeletingGalleries] = useState<Set<string>>(new Set());

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const validateGalleryName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Nome da galeria é obrigatório';
    }
    
    if (name.length < 2) {
      return 'Nome deve ter pelo menos 2 caracteres';
    }
    
    if (name.length > 50) {
      return 'Nome deve ter no máximo 50 caracteres';
    }
    
    // Verificar se já existe uma galeria com esse nome
    const existingGallery = value.find(gallery => 
      gallery.name.toLowerCase() === name.toLowerCase() && 
      gallery.id !== editingGalleryId
    );
    
    if (existingGallery) {
      return 'Já existe uma galeria com este nome';
    }
    
    return null;
  };

  const addGallery = () => {
    if (disabled || value.length >= maxGalleries) return;

    const validationError = validateGalleryName(newGalleryName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newGallery: Gallery = {
      id: generateId(),
      name: newGalleryName.trim(),
      images: []
    };

    onChange([...value, newGallery]);
    setNewGalleryName('');
    setError('');
  };

  const removeGallery = async (galleryId: string) => {
    const gallery = value.find(g => g.id === galleryId);
    if (!gallery) return;
    
    // Se a galeria tem imagens existentes (não apenas novas), chama a função de deletar
    const hasExistingImages = gallery.images.some(img => img.url && !img.file);
    
    if (hasExistingImages && onDeleteGallery) {
      setDeletingGalleries(prev => new Set(prev).add(galleryId));
      setError('');
      
      try {
        const success = await onDeleteGallery(gallery.name);
        
        if (success) {
          // Remover da lista local apenas se a remoção do servidor foi bem-sucedida
          const updatedGalleries = value.filter(g => g.id !== galleryId);
          onChange(updatedGalleries);
        } else {
          setError(`Erro ao deletar galeria "${gallery.name}" do servidor`);
        }
      } catch (err) {
        setError(`Erro ao deletar galeria "${gallery.name}"`);
        console.error('Erro ao deletar galeria:', err);
      } finally {
        setDeletingGalleries(prev => {
          const newSet = new Set(prev);
          newSet.delete(galleryId);
          return newSet;
        });
      }
    } else {
      // Galeria apenas local (sem imagens existentes) - remove imediatamente
      const updatedGalleries = value.filter(g => g.id !== galleryId);
      onChange(updatedGalleries);
    }
  };

  const updateGalleryImages = (galleryId: string, images: GalleryImage[]) => {
    const updatedGalleries = value.map(gallery =>
      gallery.id === galleryId
        ? { ...gallery, images }
        : gallery
    );
    onChange(updatedGalleries);
  };

  const handleRemoveImage = async (imageUrl: string, galleryName: string): Promise<boolean> => {
    if (onRemoveImage) {
      try {
        return await onRemoveImage(imageUrl, galleryName);
      } catch (err) {
        console.error('Erro ao remover imagem:', err);
        return false;
      }
    }
    return false;
  };

  const startEditingGalleryName = (gallery: Gallery) => {
    setEditingGalleryId(gallery.id);
    setEditingName(gallery.name);
    setError('');
  };

  const saveGalleryName = () => {
    if (!editingGalleryId) return;

    const validationError = validateGalleryName(editingName);
    if (validationError) {
      setError(validationError);
      return;
    }

    const updatedGalleries = value.map(gallery =>
      gallery.id === editingGalleryId
        ? { ...gallery, name: editingName.trim() }
        : gallery
    );

    onChange(updatedGalleries);
    setEditingGalleryId(null);
    setEditingName('');
    setError('');
  };

  const cancelEditingGalleryName = () => {
    setEditingGalleryId(null);
    setEditingName('');
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      if (action === 'add') {
        addGallery();
      } else {
        saveGalleryName();
      }
    } else if (e.key === 'Escape' && action === 'edit') {
      cancelEditingGalleryName();
    }
  };

  // Separar galerias existentes das novas
  const existingGalleries = value.filter(gallery => 
    gallery.images.some(img => img.url && !img.file)
  );
  const newGalleries = value.filter(gallery => 
    !gallery.images.some(img => img.url && !img.file) || gallery.images.length === 0
  );

  return (
    <div className="gallery-manager">
      {/* Mensagem de erro global */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Galerias Existentes */}
      {existingGalleries.length > 0 && (
        <div className="existing-galleries-section mb-6">
          <h4 className="section-subtitle mb-4 flex items-center gap-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
              Existentes
            </span>
            Galerias Salvas ({existingGalleries.length})
          </h4>
          <div className="galleries-grid space-y-4">
            {existingGalleries.map((gallery) => (
              <div 
                key={gallery.id} 
                className={`
                  gallery-card existing border-2 border-green-200 rounded-lg p-4 bg-green-50
                  ${deletingGalleries.has(gallery.id) ? 'opacity-50' : ''}
                `}
              >
                <div className="gallery-header mb-3">
                  <div className="gallery-info">
                    {editingGalleryId === gallery.id ? (
                      <div className="edit-name-container flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'edit')}
                          className="gallery-name-input flex-1 px-3 py-2 border border-gray-300 rounded"
                          autoFocus
                          maxLength={50}
                          disabled={disabled}
                        />
                        <div className="edit-actions flex gap-1">
                          <button
                            type="button"
                            onClick={saveGalleryName}
                            className="save-btn bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            disabled={disabled}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingGalleryName}
                            className="cancel-btn bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                            disabled={disabled}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="gallery-name-container flex items-center justify-between">
                        <div>
                          <h5 className="gallery-name text-lg font-medium text-gray-800">{gallery.name}</h5>
                          <span className="image-count text-sm text-gray-600">
                            {gallery.images.length} {gallery.images.length === 1 ? 'imagem' : 'imagens'}
                          </span>
                        </div>
                        
                        <div className="gallery-actions flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingGalleryName(gallery)}
                            className="action-btn edit-btn p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            disabled={disabled || deletingGalleries.has(gallery.id)}
                            title="Editar nome"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGallery(gallery.id)}
                            className="action-btn delete-btn p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            disabled={disabled || deletingGalleries.has(gallery.id)}
                            title="Deletar galeria"
                          >
                            {deletingGalleries.has(gallery.id) ? (
                              <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview das imagens existentes */}
                {gallery.images.length > 0 && (
                  <div className="gallery-preview mb-3">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {gallery.images.slice(0, 6).map((image, index) => (
                        <div key={image.id} className="preview-image flex-shrink-0">
                          <img
                            src={image.preview || image.url}
                            alt={`${gallery.name} ${index + 1}`}
                            className="preview-thumb w-16 h-16 object-cover rounded border"
                          />
                        </div>
                      ))}
                      {gallery.images.length > 6 && (
                        <div className="more-images flex items-center justify-center w-16 h-16 bg-gray-100 rounded border text-xs text-gray-600">
                          +{gallery.images.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload de novas imagens para galeria existente */}
                <GalleryUpload
                  label=""
                  galleryName={gallery.name}
                  value={gallery.images}
                  onChange={(images) => updateGalleryImages(gallery.id, images)}
                  onRemoveExistingImage={(imageUrl) => handleRemoveImage(imageUrl, gallery.name)}
                  maxImages={maxImagesPerGallery}
                  disabled={disabled || deletingGalleries.has(gallery.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seção para adicionar novas galerias */}
      <div className="new-galleries-section">
        <div className="section-header mb-4">
          <h4 className="section-subtitle mb-3 flex items-center gap-2">
            {existingGalleries.length > 0 ? (
              <>
                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                  Novas
                </span>
                Adicionar Nova Galeria
              </>
            ) : (
              'Galerias de Imagens'
            )}
          </h4>
          
          {/* Adicionar nova galeria */}
          {value.length < maxGalleries && (
            <div className="add-gallery-container mb-4">
              <div className="add-gallery-form flex gap-2">
                <input
                  type="text"
                  value={newGalleryName}
                  onChange={(e) => setNewGalleryName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'add')}
                  placeholder="Nome da nova galeria (ex: Área Externa, Cozinha, Quartos)"
                  className="gallery-name-input flex-1 px-3 py-2 border border-gray-300 rounded"
                  disabled={disabled}
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={addGallery}
                  disabled={disabled || !newGalleryName.trim()}
                  className="add-gallery-btn bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Informações */}
          <div className="gallery-info-text text-sm text-gray-600">
            {value.length}/{maxGalleries} galerias criadas
          </div>
        </div>

        {/* Novas galerias */}
        {newGalleries.length > 0 && (
          <div className="galleries-grid space-y-4">
            {newGalleries.map((gallery) => (
              <div key={gallery.id} className="gallery-card new border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                <div className="gallery-header mb-3">
                  <div className="gallery-info">
                    {editingGalleryId === gallery.id ? (
                      <div className="edit-name-container flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'edit')}
                          className="gallery-name-input flex-1 px-3 py-2 border border-gray-300 rounded"
                          autoFocus
                          maxLength={50}
                          disabled={disabled}
                        />
                        <div className="edit-actions flex gap-1">
                          <button
                            type="button"
                            onClick={saveGalleryName}
                            className="save-btn bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            disabled={disabled}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingGalleryName}
                            className="cancel-btn bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                            disabled={disabled}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="gallery-name-container flex items-center justify-between">
                        <div>
                          <h5 className="gallery-name text-lg font-medium text-gray-800">{gallery.name}</h5>
                          <span className="gallery-status text-sm text-orange-600 font-medium">Nova galeria</span>
                        </div>
                        
                        <div className="gallery-actions flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingGalleryName(gallery)}
                            className="action-btn edit-btn p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            disabled={disabled}
                            title="Editar nome"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGallery(gallery.id)}
                            className="action-btn delete-btn p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            disabled={disabled}
                            title="Remover galeria"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload de imagens da nova galeria */}
                <GalleryUpload
                  label=""
                  galleryName={gallery.name}
                  value={gallery.images}
                  onChange={(images) => updateGalleryImages(gallery.id, images)}
                  maxImages={maxImagesPerGallery}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mensagem quando não há galerias */}
      {value.length === 0 && (
        <div className="empty-state text-center py-8 text-gray-500">
          <div className="empty-message text-lg mb-2">Nenhuma galeria criada</div>
          <div className="empty-hint text-sm">
            Adicione uma galeria acima para começar a organizar as imagens do imóvel
          </div>
        </div>
      )}
    </div>
  );
}

