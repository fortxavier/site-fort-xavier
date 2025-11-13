// Interfaces para tipagem dos componentes de upload de imagens

export interface GalleryImage {
  id: string;
  file?: File;
  url?: string;
  ordem: number;
  preview: string;
}

export interface Gallery {
  id: string;
  name: string;
  images: GalleryImage[];
}

// Interface para dados do formulário de propriedade
export interface PropertyFormData {
  titulo: string;
  slug: string;
  titulo_descricao: string;
  descricao: string;
  bairro: string;
  cidade: string;
  estado: string;
  status_empreendimento: string;
  tipo_imovel: string[];
  endereco: string;
  texto_localizacao: string;
  destaque: boolean;
  responsavel_criacao: string;
  responsavel_atualizacao: string;
  aparece_home: boolean;
  iframe_mapa: string;
  video_url: string; // Novo campo para URL do vídeo
}

// Interface para dados da propriedade no banco
export interface PropertyData extends PropertyFormData {
  id?: string;
  data_criacao?: string;
  data_atualizacao?: string;
}

