import { createClient } from '@supabase/supabase-js';

interface   PropertyFilters {
  bairro?: string;
  status?: string;
  dormitorios_min?: number;
}

// Estas variáveis devem ser definidas em um arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Criação do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Funções auxiliares para operações comuns
export async function getProperties(filters: PropertyFilters = {}) {
  let query = supabase.from('fx_properties').select('*');

  if (filters.bairro) query = query.eq('bairro', filters.bairro);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.dormitorios_min) query = query.gte('dormitorios_min', filters.dormitorios_min);

  const { data, error } = await query.order('data_criacao', { ascending: false });

  if (error) throw error;
  return data;
}


export async function getPropertyById(id: any) {
  const { data, error } = await supabase
    .from('fx_properties')
    .select(`
      *,
      fx_property_images(*)
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createLead(leadData: any) {
  const { data, error } = await supabase
    .from('fx_leads')
    .insert([leadData]);
  
  if (error) throw error;
  return data;
}

export async function authenticateUser(username: string, password: string) {
  const { data, error } = await supabase
    .rpc('authenticate_user', {
      p_username: username,
      p_password: password
    });

  if (error) {
    console.error('Erro ao autenticar usuário:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}
