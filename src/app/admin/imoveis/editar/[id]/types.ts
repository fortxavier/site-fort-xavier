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
  
  