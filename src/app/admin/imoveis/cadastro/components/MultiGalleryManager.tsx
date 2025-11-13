import React, { useState } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import GalleryUpload from './GalleryUpload';

interface GalleryImage {
  id: string;
  file?: File;
  url?: string;
  ordem: number;
  preview: string;
}

interface Gallery {
  id: string;
  name: string;
  images: GalleryImage[];
}

interface MultiGalleryManagerProps {
  value: Gallery[];
  onChange: (galleries: Gallery[]) => void;
  maxGalleries?: number;
  maxImagesPerGallery?: number;
  disabled?: boolean;
}

export default function MultiGalleryManager({
  value = [],
  onChange,
  maxGalleries = 5,
  maxImagesPerGallery = 10,
  disabled = false
}: MultiGalleryManagerProps) {
  const [newGalleryName, setNewGalleryName] = useState('');
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

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

  const removeGallery = (galleryId: string) => {
    const updatedGalleries = value.filter(gallery => gallery.id !== galleryId);
    onChange(updatedGalleries);
  };

  const updateGalleryImages = (galleryId: string, images: GalleryImage[]) => {
    const updatedGalleries = value.map(gallery =>
      gallery.id === galleryId
        ? { ...gallery, images }
        : gallery
    );
    onChange(updatedGalleries);
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

  return (
    <div className="gallery-manager">
      {/* Seção para adicionar galerias */}
      <div className="new-galleries-section">
        <div className="section-header">
          <h4 className="section-subtitle">Galerias de Imagens</h4>
          
          {/* Adicionar nova galeria */}
          {value.length < maxGalleries && (
            <div className="add-gallery-container">
              <div className="add-gallery-form">
                <input
                  type="text"
                  value={newGalleryName}
                  onChange={(e) => setNewGalleryName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, 'add')}
                  placeholder="Nome da nova galeria (ex: Área Externa, Cozinha, Quartos)"
                  className="gallery-name-input"
                  disabled={disabled}
                  maxLength={50}
                />
                <button
                  type="button"
                  onClick={addGallery}
                  disabled={disabled || !newGalleryName.trim()}
                  className="add-gallery-btn"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Informações */}
          <div className="gallery-info-text">
            {value.length}/{maxGalleries} galerias criadas
          </div>
        </div>

        {/* Galerias criadas */}
        {value.length > 0 && (
          <div className="galleries-grid">
            {value.map((gallery) => (
              <div key={gallery.id} className="gallery-card new">
                <div className="gallery-header">
                  <div className="gallery-info">
                    {editingGalleryId === gallery.id ? (
                      <div className="edit-name-container">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'edit')}
                          className="gallery-name-input"
                          autoFocus
                          maxLength={50}
                        />
                        <div className="edit-actions">
                          <button
                            type="button"
                            onClick={saveGalleryName}
                            className="save-btn"
                            disabled={disabled}
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingGalleryName}
                            className="cancel-btn"
                            disabled={disabled}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="gallery-name-container">
                        <h5 className="gallery-name">{gallery.name}</h5>
                        <span className="gallery-status">Nova galeria</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="gallery-actions">
                    {editingGalleryId !== gallery.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditingGalleryName(gallery)}
                          className="action-btn edit-btn"
                          disabled={disabled}
                          title="Editar nome"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGallery(gallery.id)}
                          className="action-btn delete-btn"
                          disabled={disabled}
                          title="Remover galeria"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Upload de imagens da galeria */}
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
        <div className="empty-state">
          <div className="empty-message">Nenhuma galeria criada</div>
          <div className="empty-hint">
            Adicione uma galeria acima para começar a organizar as imagens do imóvel
          </div>
        </div>
      )}
    </div>
  );
}

