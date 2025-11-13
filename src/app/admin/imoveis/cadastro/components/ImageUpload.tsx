import React, { useState, useRef } from 'react';
import { Upload, X, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (file: File | null) => void;
  onDelete?: () => void; // Nova prop para deletar imagem existente
  accept?: string;
  maxSize?: number; // em MB
  preview?: boolean;
  required?: boolean;
  disabled?: boolean;
}

export default function ImageUpload({
  label,
  value,
  onChange,
  onDelete,
  accept = "image/*",
  maxSize = 5,
  preview = true,
  required = false,
  disabled = false
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [error, setError] = useState<string>('');
  const [newFileSelected, setNewFileSelected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função utilitária para adicionar cache busting
  const addCacheBuster = (url: string): string => {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  };

  // Atualizar preview quando value mudar
  React.useEffect(() => {
    if (value && !newFileSelected) {
      setPreviewUrl(addCacheBuster(value));
    }
  }, [value, newFileSelected]);

  const validateFile = (file: File): string | null => {
    // Verificar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      return 'Por favor, selecione apenas arquivos de imagem.';
    }

    // Verificar tamanho do arquivo
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `O arquivo deve ter no máximo ${maxSize}MB.`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    onChange(file);
    setNewFileSelected(true);

    if (preview) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
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
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError('');
    setNewFileSelected(false);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteExisting = () => {
    if (onDelete) {
      onDelete();
      setPreviewUrl(null);
      setNewFileSelected(false);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="space-y-3">
        {/* Preview da imagem existente ou nova */}
        {preview && previewUrl && (
          <div className="existing-image-container">
            <div className="existing-image-preview-small">
              <img
                src={previewUrl}
                alt="Preview"
                className="image-preview-small"
              />
              <div className="image-actions-overlay">
                {/* Botão para remover nova imagem selecionada */}
                {newFileSelected && (
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="action-btn remove-btn"
                    disabled={disabled}
                    title="Remover nova imagem"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                
                {/* Botão para deletar imagem existente */}
                {!newFileSelected && value && onDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteExisting}
                    className="action-btn delete-btn"
                    disabled={disabled}
                    title="Deletar imagem existente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="image-info-small">
              <span className="image-status">
                {newFileSelected ? 'Nova imagem selecionada' : 'Imagem atual'}
              </span>
            </div>
          </div>
        )}

        {/* Área de upload */}
        <div
          className={`
            upload-area-compact
            ${dragActive ? 'drag-active' : ''}
            ${disabled ? 'disabled' : ''}
            ${error ? 'error' : ''}
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
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="upload-content-compact">
            <Upload className="h-5 w-5 text-gray-400" />
            <div className="upload-text-compact">
              <span className="upload-action">
                {previewUrl ? 'Substituir imagem' : 'Adicionar imagem'}
              </span>
            </div>
            <div className="upload-hint">
              PNG, JPG, WEBP até {maxSize}MB
            </div>
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

