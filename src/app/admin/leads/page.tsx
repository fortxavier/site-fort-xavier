// src/app/admin/leads/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Phone, Mail, Calendar, MapPin, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import '../global.css';

interface Lead {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  pagina_origem: string | null;
  imovel_id: string | null;
  status: string;
  data_criacao: string;
  data_atualizacao: string;
  fx_properties?: {
    titulo: string;
    slug: string;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function LeadsAdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Modal de detalhes
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Estados para atualização
  const [updatingLeads, setUpdatingLeads] = useState<Set<string>>(new Set());

  const fetchLeads = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== 'todos') {
        params.append('status', statusFilter);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      console.log(params)
      const response = await fetch(`/api/leads?${params}`);
      const data = await response.json();

      if (response.ok) {
        setLeads(data.leads || []);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Erro ao carregar leads');
      }
    } catch (err) {
      console.log('Erro:', err);
      setError('Erro de conexão ao carregar leads');
      console.error('Erro ao buscar leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdatingLeads(prev => new Set(prev).add(leadId));

    try {
      const response = await fetch('/api/leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: leadId,
          status: newStatus
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Atualizar lead na lista local
        setLeads(prev => prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, status: newStatus, data_atualizacao: new Date().toISOString() }
            : lead
        ));

        // Atualizar lead selecionado se for o mesmo
        if (selectedLead?.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        setError(result.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      setError('Erro de conexão ao atualizar status');
      console.error('Erro ao atualizar status:', err);
    } finally {
      setUpdatingLeads(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'novo':
        return 'badge badge-blue';
      case 'contatado':
        return 'badge badge-yellow';
      case 'convertido':
        return 'badge badge-green';
      case 'arquivado':
        return 'badge';
      default:
        return 'badge badge-blue';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchLeads();
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const openModal = (lead: Lead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedLead(null);
    setShowModal(false);
  };

  // Carregar leads na montagem e quando filtros mudarem
  useEffect(() => {
    fetchLeads();
  }, [pagination.page, statusFilter]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Gerenciar Leads</h1>
        <button 
          onClick={fetchLeads}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} className={loading ? 'loading-spinner-small' : ''} />
          Atualizar
        </button>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem' }}>
        {/* Filtros e busca */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <form onSubmit={handleSearch} className="search-input" style={{ flex: 1, minWidth: '300px' }}>
              <Search style={{ width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} />
              <input 
                type="text" 
                placeholder="Buscar por nome, email ou telefone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none' }}
              />
            </form>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <select 
                className="form-input"
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="todos">Todos os status</option>
                <option value="Novo">Novo</option>
                <option value="Contatado">Contatado</option>
                <option value="Convertido">Convertido</option>
                <option value="Arquivado">Arquivado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estatísticas rápidas */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <div style={{ 
            backgroundColor: '#dbeafe', 
            padding: '1rem', 
            borderRadius: 'var(--border-radius-lg)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e40af' }}>{pagination.total}</div>
            <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>Total de Leads</div>
          </div>
          <div style={{ 
            backgroundColor: '#fef9c3', 
            padding: '1rem', 
            borderRadius: 'var(--border-radius-lg)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#854d0e' }}>
              {leads.filter(l => l.status === 'Novo').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#854d0e' }}>Novos</div>
          </div>
          <div style={{ 
            backgroundColor: '#fed7aa', 
            padding: '1rem', 
            borderRadius: 'var(--border-radius-lg)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#c2410c' }}>
              {leads.filter(l => l.status === 'Contatado').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#c2410c' }}>Contatados</div>
          </div>
          <div style={{ 
            backgroundColor: '#dcfce7', 
            padding: '1rem', 
            borderRadius: 'var(--border-radius-lg)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#166534' }}>
              {leads.filter(l => l.status === 'Convertido').length}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#166534' }}>Convertidos</div>
          </div>
        </div>

        {/* Tabela de leads */}
        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
              <div style={{ color: '#6b7280' }}>Carregando leads...</div>
            </div>
          ) : leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ color: '#6b7280' }}>Nenhum lead encontrado</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Contato</th>
                  <th>Imóvel/Origem</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {lead.nome || 'Não informado'}
                        </div>
                        {lead.mensagem && (
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#6b7280', 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px'
                          }}>
                            {lead.mensagem}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {lead.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <Mail style={{ width: '0.75rem', height: '0.75rem', color: '#9ca3af' }} />
                            <a href={`mailto:${lead.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                              {lead.email}
                            </a>
                          </div>
                        )}
                        {lead.telefone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}>
                            <Phone style={{ width: '0.75rem', height: '0.75rem', color: '#9ca3af' }} />
                            <a href={`tel:${lead.telefone}`} style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>
                              {lead.telefone}
                            </a>
                          </div>
                        )}
                        {!lead.email && !lead.telefone && (
                          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Não informado</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        {lead.fx_properties ? (
                          <div>
                            <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{lead.fx_properties.titulo}</div>
                            {lead.pagina_origem && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.25rem' 
                              }}>
                                <MapPin style={{ width: '0.75rem', height: '0.75rem' }} />
                                {lead.pagina_origem}
                              </div>
                            )}
                          </div>
                        ) : lead.pagina_origem ? (
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: '#4b5563', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem' 
                          }}>
                            <MapPin style={{ width: '0.75rem', height: '0.75rem' }} />
                            {lead.pagina_origem}
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>-</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem', 
                        fontSize: '0.875rem', 
                        color: '#4b5563' 
                      }}>
                        <Calendar style={{ width: '0.75rem', height: '0.75rem', color: '#9ca3af' }} />
                        {formatDate(lead.data_criacao)}
                      </div>
                    </td>
                    <td>
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        disabled={updatingLeads.has(lead.id)}
                        className={getStatusBadgeClass(lead.status)}
                        style={{ 
                          border: 'none', 
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                      >
                        <option value="Novo">Novo</option>
                        <option value="Contatado">Contatado</option>
                        <option value="Convertido">Convertido</option>
                        <option value="Arquivado">Arquivado</option>
                      </select>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => openModal(lead)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: 'var(--primary-color)', 
                          cursor: 'pointer',
                          padding: '0.25rem'
                        }}
                      >
                        <Eye style={{ width: '1rem', height: '1rem' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginTop: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} leads
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page <= 1}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  opacity: pagination.page <= 1 ? 0.5 : 1,
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft style={{ width: '1rem', height: '1rem' }} />
                Anterior
              </button>
              
              <span style={{ 
                padding: '0.5rem 0.75rem', 
                backgroundColor: '#f3f4f6', 
                borderRadius: 'var(--border-radius-md)',
                fontSize: '0.875rem'
              }}>
                {pagination.page} de {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="btn btn-secondary"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem',
                  opacity: pagination.page >= pagination.totalPages ? 0.5 : 1,
                  cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Próximo
                <ChevronRight style={{ width: '1rem', height: '1rem' }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {showModal && selectedLead && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 'var(--border-radius-lg)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '1rem' 
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Detalhes do Lead</h3>
                <button 
                  onClick={closeModal}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <div style={{ fontSize: '1.125rem' }}>{selectedLead.nome || 'Não informado'}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <div>{selectedLead.email || 'Não informado'}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <div>{selectedLead.telefone || 'Não informado'}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Imóvel de Interesse</label>
                  <div>{selectedLead.fx_properties?.titulo || 'Não especificado'}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Página de Origem</label>
                  <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                    {selectedLead.pagina_origem || 'Não informado'}
                  </div>
                </div>

                {selectedLead.mensagem && (
                  <div className="form-group">
                    <label className="form-label">Mensagem</label>
                    <div style={{ 
                      backgroundColor: '#f9fafb', 
                      padding: '0.75rem', 
                      borderRadius: 'var(--border-radius-md)',
                      border: '1px solid #e5e7eb'
                    }}>
                      {selectedLead.mensagem}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Data de Criação</label>
                    <div style={{ fontSize: '0.875rem' }}>{formatDate(selectedLead.data_criacao)}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Última Atualização</label>
                    <div style={{ fontSize: '0.875rem' }}>{formatDate(selectedLead.data_atualizacao)}</div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                    disabled={updatingLeads.has(selectedLead.id)}
                    className="form-input"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Contatado">Contatado</option>
                    <option value="Convertido">Convertido</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button onClick={closeModal} className="btn btn-secondary">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

