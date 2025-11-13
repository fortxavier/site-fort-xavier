'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import '../global.css';
import './lista-imoveis.css';

// Interface para tipagem das propriedades
interface Property {
  id: string;
  titulo: string;
  titulo_descricao: string;
  descricao?: string;
  valor?: number;
  cidade: string;
  estado: string;
  status_empreendimento: string;
  endereco?: string;
  texto_localizacao?: string;
  valor_condominio?: number;
  caracteristicas: string[];
  destaque: boolean;
  data_criacao: string;
  data_atualizacao: string;
  responsavel_criacao?: string;
  responsavel_atualizacao?: string;
  home?: boolean;
}

// Componente de Modal de Confirmação
interface DeleteModalProps {
  property: Property | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteModalProps> = ({
  property,
  isDeleting,
  onConfirm,
  onCancel
}) => {
  // Fechar modal com ESC
  const handleEscKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      onCancel();
    }
  }, [isDeleting, onCancel]);

  useEffect(() => {
    if (property) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'unset';
      };
    }
  }, [property, handleEscKey]);

  if (!property) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-icon">
            <AlertTriangle />
          </div>
          <h3 className="modal-title">Confirmar Exclusão</h3>
        </div>

        <div className="modal-content">
          <p>
            Tem certeza que deseja excluir permanentemente este empreendimento? 
            Esta ação não pode ser desfeita.
          </p>
          
          <div className="modal-property-info">
            <div className="modal-property-title">{property.titulo}</div>
            <div className="modal-property-subtitle">
              {property.titulo_descricao} • {property.cidade}, {property.estado}
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>
            ⚠️ Todas as imagens e dados relacionados também serão removidos.
          </p>
        </div>

        <div className="modal-actions">
          <button
            onClick={onCancel}
            className="modal-btn modal-btn-cancel"
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="modal-btn modal-btn-delete"
            disabled={isDeleting}
          >
            {isDeleting && <div className="loading-spinner"></div>}
            {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de Toast de Sucesso
interface ToastProps {
  message: string;
  onClose: () => void;
}

const SuccessToast: React.FC<ToastProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="toast-success">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckCircle size={20} />
        {message}
      </div>
    </div>
  );
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Função para buscar propriedades
  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      setProperties(data || []);
      setFilteredProperties(data || []);
    } catch (err) {
      console.error('Erro ao buscar propriedades:', err);
      setError('Erro ao carregar propriedades. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para excluir propriedade - OTIMIZADA
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm?.id) return;
    
    const propertyId = deleteConfirm.id;
    const propertyTitle = deleteConfirm.titulo;
    
    console.log(`[DELETE] Iniciando exclusão: ${propertyTitle} (ID: ${propertyId})`);
    setIsDeleting(true);
    setError('');

    try {
      // 1. Deletar imagens relacionadas
      console.log('[DELETE] Removendo imagens associadas...');
      const { error: imageDeleteError } = await supabase
        .from('fx_property_images')
        .delete()
        .eq('imovel_id', propertyId);

      if (imageDeleteError) {
        throw new Error(`Erro ao deletar imagens: ${imageDeleteError.message}`);
      }

      // 2. Deletar a propriedade
      console.log('[DELETE] Removendo propriedade...');
      const { error: propertyDeleteError } = await supabase
        .from('fx_properties')
        .delete()
        .eq('id', propertyId);

      if (propertyDeleteError) {
        throw new Error(`Erro ao deletar propriedade: ${propertyDeleteError.message}`);
      }

      // 3. Atualizar estado local
      console.log('[DELETE] Atualizando interface...');
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setFilteredProperties(prev => prev.filter(p => p.id !== propertyId));
      
      // 4. Mostrar feedback de sucesso
      setShowSuccessToast(true);
      console.log(`[DELETE] Sucesso: ${propertyTitle} foi excluído`);
      
    } catch (err: any) {
      console.error('[DELETE] Erro:', err);
      setError(err.message || 'Erro ao excluir propriedade. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm]);

  // Função para filtrar propriedades
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredProperties(properties);
    } else {
      const filtered = properties.filter(property =>
        property.titulo.toLowerCase().includes(term.toLowerCase()) ||
        property.cidade.toLowerCase().includes(term.toLowerCase()) ||
        property.status_empreendimento.toLowerCase().includes(term.toLowerCase()) ||
        property.endereco?.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredProperties(filtered);
    }
  }, [properties]);

  // Função para extrair informações das características
  const extractFromCaracteristicas = useCallback((caracteristicas: string[], type: 'area' | 'dormitorios' | 'vagas') => {
    if (!caracteristicas || caracteristicas.length === 0) return 'Consulte';
    
    const searchTerms = {
      area: ['m²', 'metro', 'área'],
      dormitorios: ['dorm', 'quarto', 'dormitório'],
      vagas: ['vaga', 'garagem']
    };
    
    const found = caracteristicas.find(c => 
      searchTerms[type].some(term => c.toLowerCase().includes(term))
    );
    
    return found || 'Consulte';
  }, []);

  // Função para abrir modal de confirmação
  const handleDeleteClick = useCallback((property: Property) => {
    setDeleteConfirm(property);
  }, []);

  // Função para cancelar exclusão
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Função para fechar toast
  const handleCloseToast = useCallback(() => {
    setShowSuccessToast(false);
  }, []);

  // Carregar propriedades ao montar o componente
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Renderizar badge de status
  const renderStatusBadge = useCallback((status: string) => {
    const badgeClass = status === 'lançamento' 
      ? 'badge-blue' 
      : status === 'em obra'
      ? 'badge-yellow'
      : 'badge-green';
    
    return (
      <span className={`badge ${badgeClass}`}>
        {status}
      </span>
    );
  }, []);

  // Renderizar linha da tabela
  const renderPropertyRow = useCallback((property: Property) => (
    <tr key={property.id} className="table-row">
      <td>
        <div>
          <div className="font-medium">{property.titulo}</div>
          <div className="text-sm text-gray-500">{property.titulo_descricao}</div>
        </div>
      </td>
      <td>{property.cidade}, {property.estado}</td>
      <td>{renderStatusBadge(property.status_empreendimento)}</td>
      <td>
        {property.valor != null ? `R$ ${property.valor.toLocaleString('pt-BR')}` : 'Consulte'}
      </td>
      <td>{extractFromCaracteristicas(property.caracteristicas, 'area')}</td>
      <td>{extractFromCaracteristicas(property.caracteristicas, 'dormitorios')}</td>
      <td>{extractFromCaracteristicas(property.caracteristicas, 'vagas')}</td>
      <td className="text-right">
        <div className="action-buttons">
          <Link 
            href={`/admin/imoveis/form?id=${property.id}`}
            className="btn-icon btn-icon-blue"
            title="Editar propriedade"
          >
            <Edit className="h-4 w-4" />
          </Link>
          <button 
            onClick={() => handleDeleteClick(property)}
            className="btn-icon btn-icon-red"
            title="Excluir propriedade"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  ), [extractFromCaracteristicas, renderStatusBadge, handleDeleteClick]);

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="page-title">Gerenciar Propriedades</h1>
        <Link 
          href="/admin/imoveis/form" 
          className="btn btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Adicionar Propriedade
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="card p-6 mb-8">
        <div className="search-input mb-4">
          <Search className="h-5 w-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar propriedades por título, cidade, status ou endereço..." 
            className="flex-1 outline-none"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando propriedades...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cidade</th>
                  <th>Status</th>
                  <th>Preço</th>
                  <th>Área</th>
                  <th>Dormitórios</th>
                  <th>Vagas</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      {properties.length === 0 
                        ? 'Nenhuma propriedade cadastrada ainda.' 
                        : 'Nenhuma propriedade encontrada com os termos de busca.'}
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map(renderPropertyRow)
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <DeleteConfirmationModal
        property={deleteConfirm}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={handleCancelDelete}
      />

      {/* Toast de Sucesso */}
      {showSuccessToast && (
        <SuccessToast
          message="Propriedade excluída com sucesso!"
          onClose={handleCloseToast}
        />
      )}
    </div>
  );
}

