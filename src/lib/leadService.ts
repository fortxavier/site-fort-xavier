// src/lib/leadService.ts

interface LeadData {
    nome?: string;
    email?: string;
    telefone?: string;
    assunto?: string;
    mensagem?: string;
    pagina_origem?: string;
    imovel_id?: string;
  }
  
  interface LeadResponse {
    success: boolean;
    message: string;
    error?: string;
    lead?: any;
  }
  
  /**
   * Função utilitária para enviar leads de qualquer formulário
   * Envia apenas os campos que estão preenchidos
   */
  export async function enviarLead(dados: LeadData): Promise<LeadResponse> {
    try {
      // Filtrar apenas campos preenchidos
      const dadosLimpos: LeadData = {};
      
      if (dados.nome?.trim()) dadosLimpos.nome = dados.nome.trim();
      if (dados.email?.trim()) dadosLimpos.email = dados.email.trim();
      if (dados.telefone?.trim()) dadosLimpos.telefone = dados.telefone.trim();
      if (dados.mensagem?.trim()) dadosLimpos.mensagem = dados.mensagem.trim();
      if (dados.pagina_origem?.trim()) dadosLimpos.pagina_origem = dados.pagina_origem.trim();
      if (dados.imovel_id?.trim()) dadosLimpos.imovel_id = dados.imovel_id.trim();
  
      // Se não tiver página de origem, usar a atual
      if (!dadosLimpos.pagina_origem && typeof window !== 'undefined') {
        dadosLimpos.pagina_origem = window.location.pathname;
      }
  
      console.log('Enviando lead:', dadosLimpos);
  
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosLimpos),
      });
  
      const result = await response.json();
  
      if (response.ok) {
        console.log('Lead enviado com sucesso:', result);
        return {
          success: true,
          message: result.message || 'Lead enviado com sucesso!',
          lead: result.lead
        };
      } else {
        console.error('Erro ao enviar lead:', result);
        return {
          success: false,
          message: 'Erro ao enviar lead',
          error: result.error || 'Erro desconhecido'
        };
      }
  
    } catch (error) {
      console.error('Erro de conexão ao enviar lead:', error);
      return {
        success: false,
        message: 'Erro de conexão',
        error: 'Verifique sua conexão com a internet'
      };
    }
  }
  
  /**
   * Hook React para usar o serviço de leads
   */
  export function useLeadService() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
  
    const enviar = async (dados: LeadData) => {
      setLoading(true);
      setError('');
      setSuccess('');
  
      const result = await enviarLead(dados);
  
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.error || result.message);
      }
  
      setLoading(false);
      return result;
    };
  
    const limparMensagens = () => {
      setError('');
      setSuccess('');
    };
  
    return {
      enviar,
      loading,
      error,
      success,
      limparMensagens
    };
  }
  
  /**
   * Função para capturar dados de um formulário HTML e enviar como lead
   */
  export async function enviarFormularioComoLead(
    formElement: HTMLFormElement,
    dadosAdicionais?: Partial<LeadData>
  ): Promise<LeadResponse> {
    const formData = new FormData(formElement);
    
    const dados: LeadData = {
      nome: formData.get('nome')?.toString(),
      email: formData.get('email')?.toString(),
      telefone: formData.get('telefone')?.toString(),
      mensagem: formData.get('mensagem')?.toString(),
      ...dadosAdicionais
    };
  
    return enviarLead(dados);
  }
  
  // Importar useState se não estiver disponível
  import { useState } from 'react';
  
  