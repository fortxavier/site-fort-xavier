'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getMultiplePropertyImages, getCardImageUrl, preloadImages } from '../../../lib/imageUploadService';
import './empreendimento-detalhes.css';
import MapSection from './components/MapSection';
import ImageCarousel from './components/ImageCarousel';
import { useAuth } from '../../../lib/AuthContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { useLeadService } from '@/lib/leadService';

// Interface para tipagem das propriedades conforme tabela exata
interface Property {
  id: string;
  titulo: string;
  titulo_descricao: string;
  descricao: string;
  valor: number;
  slug: number;
  cidade: string;
  estado: string;
  area_texto: string;
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
  banheiros: string[];
  quartos: string[];
  vagas: string[];
  bairro: string;
  iframe_mapa?: string;
}

// Interface para propriedades formatadas para exibição
interface PropertyDisplay {
  id: string;
  title: string;
  neighborhood: string;
  status: string;
  description: string;
  title_description: string;
  price: string;
  area: string;
  bedrooms: string;
  parking: string;
  image: string;
  link: string;
  cidade: string;
  status_empreendimento: string;
  valor: number;
  caracteristicas: string[];
}

export default function EmpreendimentoDetalhesPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [propertyImages, setPropertyImages] = useState<any>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [propertiesData, setPropertiesData] = useState<PropertyDisplay[]>([]);
  const [relatedPropertyImages, setRelatedPropertyImages] = useState<any>(null);
  const [relatedPropertiesWithImages, setRelatedPropertiesWithImages] = useState<PropertyDisplay[]>([]);
  const [contactForm, setContactForm] = useState({
    nome: '',
    email: '',
    telefone: ''
  });
  const { enviar, success, limparMensagens } = useLeadService();

  const { isAuthenticated } = useAuth();
  const params = useParams();
  const slug = params.slug as string;

  function formatArray(arr: string[], adicionalName: string) {
    if (!arr || arr.length === 0) return 'Não informado';
    const uniqueSorted = Array.from(new Set(arr)).sort((a, b) => Number(a) - Number(b));
    if (uniqueSorted.length === 1) return `${uniqueSorted[0]} ${adicionalName}`;
    if (uniqueSorted.length === 2) return `${uniqueSorted[0]} e ${uniqueSorted[1]} ${adicionalName}s`;
    return `${uniqueSorted.slice(0, -1).join(', ')} e ${uniqueSorted[uniqueSorted.length - 1]} ${adicionalName}s`;
  }
  
  // Função melhorada para lidar com erro de carregamento de imagem
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>, propertyId: string) => {
    console.log(`Erro ao carregar imagem para propriedade ${propertyId}`);
    // Remover fallback - deixar imagem vazia em caso de erro
    e.currentTarget.style.display = 'none';
  }, []);

  // Função melhorada para lidar com erro de carregamento da imagem hero
  const handleHeroImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    console.log('Erro ao carregar imagem hero');
    // Remover fallback - deixar espaço vazio
    e.currentTarget.style.display = 'none';
  }, []);
  
  // Carregar propriedades ao montar o componente (para o carrossel de relacionados)
  useEffect(() => {
    fetchProperties();
  }, []);
  
  // Função para buscar propriedades do Supabase
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Iniciando busca de propriedades para Home...');

      // Buscar propriedades que devem aparecer na home ou são destaque
      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .or('home.eq.true,destaque.eq.true')
        .order('data_criacao', { ascending: false })
        .limit(10);

      if (supabaseError) {
        console.error('Erro do Supabase:', supabaseError);
        throw supabaseError;
      }

      console.log(`${data?.length || 0} propriedades encontradas para Home`);

      if (data && data.length > 0) {
        // Formatar propriedades primeiro
        const formattedProperties = data.map(formatPropertyForDisplay);
        setPropertiesData(formattedProperties);

        // Buscar imagens das propriedades usando o serviço existente
        setImagesLoading(true);
        const propertyIds = data.map(property => property.id);
        
        console.log('Buscando imagens para propriedades:', propertyIds);
        
        const imagesResult = await getMultiplePropertyImages(propertyIds);
        
        if (imagesResult.success && imagesResult.data) {
          setRelatedPropertyImages(imagesResult.data);
          console.log('Imagens carregadas:', Object.keys(imagesResult.data).length);

          // Pré-carregar imagens para melhor performance
          const imageUrls: string[] = [];
          Object.values(imagesResult.data).forEach((propertyImages: any) => {
            if (propertyImages.card) imageUrls.push(propertyImages.card);
            if (propertyImages.capa) imageUrls.push(propertyImages.capa);
          });
          
          if (imageUrls.length > 0) {
            preloadImages(imageUrls);
          }
        } else {
          console.error('Erro ao carregar imagens:', imagesResult.error);
        }

        setImagesLoading(false);
        console.log('Propriedades formatadas e prontas para exibição na Home');
      } else {
        console.log('Nenhuma propriedade específica para Home encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar propriedades:', err);
      setError('Erro ao carregar propriedades.');
    } finally {
      setLoading(false);
      setImagesLoading(false);
    }
  };
  
  // Função para converter dados do Supabase para formato de exibição
  const formatPropertyForDisplay = useCallback((property: Property): PropertyDisplay => {
    const bedrooms = formatArrayToString(property.quartos, 'dormitório');
    const parking = formatArrayToString(property.vagas, 'vaga');
    const neighborhood = property.bairro || property.cidade;

    return {
      id: property.id,
      title: property.titulo,
      neighborhood: neighborhood,
      status: property.status_empreendimento,
      description: property.descricao,
      title_description: property.titulo_descricao,
      price: property.valor > 0 ? `R$ ${property.valor.toLocaleString('pt-BR')}` : 'Consulte',
      area: property.area_texto,
      bedrooms: bedrooms,
      parking: parking,
      image: '', // Será preenchido quando as imagens estiverem disponíveis
      link: `/empreendimentos/${property.slug}`,
      cidade: property.cidade,
      status_empreendimento: property.status_empreendimento,
      valor: property.valor,
      caracteristicas: property.caracteristicas
    };
  }, []);

  // Função para formatar arrays em string legível
  const formatArrayToString = useCallback((array: string[], adicionalName: string): string => {
    if (!array || array.length === 0) return 'Consulte';
    
    if (array.length === 1) {
      return `${array[0]} ${adicionalName}s`;
    }
    
    if (array.length === 2) {
      return `${array[0]} e ${array[1]} ${adicionalName}s`;
    }
    
    const lastItem = array[array.length - 1];
    const otherItems = array.slice(0, -1);
    return `${otherItems.join(', ')} e ${lastItem} ${adicionalName}s`;
  }, []);

  // Combinar propriedades com imagens usando useEffect
  useEffect(() => {
    if (propertiesData.length > 0 && relatedPropertyImages) {
      const updatedProperties = propertiesData.map(property => ({
        ...property,
        image: getCardImageUrl(relatedPropertyImages[property.id]) || ''
      }));
      setRelatedPropertiesWithImages(updatedProperties);
    } else {
      // Garante que o estado seja preenchido mesmo sem imagens, para evitar erros
      setRelatedPropertiesWithImages(propertiesData);
    }
  }, [propertiesData, relatedPropertyImages]); // Este efeito será executado quando os dados ou as imagens estiverem prontos

  // Detectar se é mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Buscar propriedade do Supabase (a propriedade principal da página)
  const fetchProperty = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Buscando propriedade com slug:', slug);

      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .eq('slug', slug)
        .single();

      if (supabaseError) {
        console.error('Erro do Supabase:', supabaseError);
        throw supabaseError;
      }

      if (data) {
        setProperty(data);
        console.log('Propriedade encontrada:', data);

        // Buscar imagens da propriedade
        setImagesLoading(true);
        const imagesResult = await getMultiplePropertyImages([data.id]);
        
        if (imagesResult.success && imagesResult.data && imagesResult.data[data.id]) {
          setPropertyImages(imagesResult.data[data.id]);
          console.log('Imagens carregadas:', imagesResult.data[data.id]);
        } else {
          console.error('Erro ao carregar imagens:', imagesResult.error);
        }
        setImagesLoading(false);
      } else {
        setError('Propriedade não encontrada');
      }
    } catch (err) {
      console.error('Erro ao buscar propriedade:', err);
      setError('Erro ao carregar propriedade');
    } finally {
      setLoading(false);
    }
  };

  // Carregar propriedade principal ao montar o componente
  useEffect(() => {
    if (slug) {
      fetchProperty();
    }
  }, [slug]);

  // Fechar menu ao clicar em um link (apenas no mobile)
  const handleLinkClick = useCallback(() => {
    if (isMobile) {
      setMenuOpen(false);
    }
  }, [isMobile]);

  // Função para lidar com mudanças no formulário
  const handleContactFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Atualizar função de submit
  const handleContactFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await enviar({
      nome: contactForm.nome,
      email: contactForm.email,
      telefone: contactForm.telefone,
      imovel_id: property?.id,
      pagina_origem: `/empreendimentos/${slug}`
    });
  
    if (result.success) {
      setContactForm({ nome: '', email: '', telefone: '' });
    }
  }, [contactForm, enviar, property?.id, slug]);

  // Função para formatar preço
  const formatPrice = useCallback((price: number) => {
    return `R$ ${price.toLocaleString('pt-BR')}`;
  }, []);

  // Função para extrair informações das características
  const extractCharacteristic = useCallback((characteristics: string[], keyword: string) => {
    return characteristics.find(c => 
      c.toLowerCase().includes(keyword.toLowerCase())
    ) || 'Consulte';
  }, []);

  // Memoizar imagens do carrossel
  const carouselImages = useMemo(() => {
    if (!propertyImages || !propertyImages.galerias) {
      return {};
    }
  
    const images: { [key: string]: string[] } = {};
    
    Object.keys(propertyImages.galerias).forEach(galeriaName => {
      const galeria = propertyImages.galerias[galeriaName];
      
      if (Array.isArray(galeria) && galeria.length > 0) {
        const sortedImages = galeria
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map(item => item.url)
          .filter(url => url);
        
        if (sortedImages.length > 0) {
          images[galeriaName] = sortedImages;
        }
      }
    });
    
    return images;
  }, [propertyImages]);

  // Memoizar imagem hero SEM FALLBACK
  const heroImage = useMemo(() => {
    return propertyImages?.capa || propertyImages?.card || null;
  }, [propertyImages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="emp-loading-container">
          <div className="loading-screen">
            <img src="/assets/fort-xavier_logo.png" alt="Logo Fort Xavier" className="logo-loader" />
            {/* <p>Carregando empreendimento...</p>
            {imagesLoading && <p className="text-sm text-gray-600">Carregando imagens...</p>} */}
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {error}
          </h1>
          <Link href="/empreendimentos" className="text-blue-600 hover:underline">
            {/* Voltar para empreendimentos */}
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link href="/" className="logo-container">
            <img 
              src="/assets/fort-xavier_logo.png" 
              alt="Logo Fort Xavier" 
              style={{ width: '180px', height: 'auto' }}
              className="sm:w-[220px]"
            />
          </Link>

          <button 
            className="hamburger-btn" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2"
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
              />
            </svg>
          </button>

          <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
            <Link href="/sobre" className="nav-link" onClick={handleLinkClick}>Quem somos</Link>
            <Link href="/empreendimentos" className="nav-link" onClick={handleLinkClick}>Nossas obras</Link>
            <Link href="/contato" className="nav-link" onClick={handleLinkClick}>Fale com a gente</Link>
            {isAuthenticated ? (
              <Link href="/admin" className="client-area-btn" onClick={handleLinkClick}>
                Área do Cliente
              </Link>
            ) : (
              <Link href="/admin" className="client-area-btn" onClick={handleLinkClick}>
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section - Apenas imagem com overlay */}
        <section className="emp-hero-detail-section">
          <div className="emp-hero-image-container">
            <img 
              src={heroImage} 
              alt={property.titulo}
              className="emp-hero-image"
            />
            <div className="emp-hero-overlay">
              <div className="emp-hero-content-detail">
                <div className="emp-hero-info">
                  <div className='emp-div-header-left'>
                      <div className="emp-hero-status-badge">
                        {property.status_empreendimento}
                      </div>
                      <div className="emp-hero-status-text">
                        {formatArray(property.quartos, 'dormitórios')}  
                      </div>
                      <div className="emp-hero-status-text">
                        {formatArray(property.vagas, 'vagas')}
                      </div>
                    </div>
                    
                    {!isMobile && (
                      <div className='emp-div-header-right'>
                        <button className="emp-hero-btn emp-photos-btn" onClick={() => {
                          document.querySelector('.image-carousel-container')?.scrollIntoView({ 
                            behavior: 'smooth' 
                          });
                        }}>
                          <Image src="/assets/svg/camera-solid.svg" alt="Fotos" width={16} height={16} />
                          Fotos
                        </button>
                        <button className="emp-hero-btn emp-map-btn" onClick={() => {
                          document.querySelector('.emp-map-section')?.scrollIntoView({ 
                            behavior: 'smooth' 
                          });
                        }}>
                          <Image src="/assets/svg/map-solid.svg" alt="Mapa" width={16} height={16} />
                          Ver Mapa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          {isMobile && (
            <div style={{ justifyContent: 'center', width: '70%', display: 'flex'}}>
              <button className="emp-hero-btn emp-photos-btn" onClick={() => {
                document.querySelector('.image-carousel-container')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}>
                {/* <Image src="/assets/svg/camera-solid.svg" alt="Fotos" width={16} height={16} style={{fill: '#0066b3'}}/> */}
                Fotos
              </button>
              <button className="emp-hero-btn emp-photos-btn" onClick={() => {
                document.querySelector('.emp-map-section')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}>
                {/* <Image src="/assets/svg/map-solid.svg" alt="Mapa" width={16} height={16} /> */}
                Ver Mapa
              </button>
            </div>
          )}
        </section>

        {/* Property Info Section - Layout principal */}
        <section className="emp-property-info-section">
          <div className="emp-container">
            <div className="emp-property-layout">
              <div className="property-main-content">

                <div className="property-main-info">
                  <h2 className="emp-property-title-main">{property.titulo}</h2>
                  <p className="emp-property-subtitle">{property.bairro}</p>
                  <p className="emp-property-description-full">
                    {property.descricao || property.titulo_descricao}
                  </p>
                  
                  <div className="emp-property-specs">    
                    <div className="emp-spec-item">
                      <Image src="/assets/svg/ico_valor.svg" alt="Valor" width={24} height={24} />
                      <span className="emp-spec-text-value">
                        {property.valor && property.valor > 0
                          ? `R$ ${property.valor.toLocaleString('pt-BR')}`
                          : 'Consulte'}
                      </span>
                    </div>

                    <div className="emp-spec-item">
                      <Image src="/assets/svg/ico_quartos.svg" alt="Dormitórios" width={24} height={24} />
                      <span className="emp-spec-text">
                        {formatArray(property.quartos, 'dormitórios')}
                      </span>
                    </div>

                    <div className="emp-spec-item">
                      <Image src="/assets/svg/ico_area.svg" alt="Área" width={24} height={24} />
                      <span className="emp-spec-text">
                        {property.area_texto}
                      </span>
                    </div>

                    <div className="emp-spec-item">
                      <Image src="/assets/svg/ico_vagas.svg" alt="Vagas" width={24} height={24} />
                      <span className="emp-spec-text">
                        {formatArray(property.vagas, '')}
                      </span>
                    </div>

                  </div>

                  {/* Barras de Progresso (Comentado no original, mantido assim) */}
                  {/* <div className="emp-progress-section">
                    <h3 className="emp-progress-title">Etapas</h3>
                    
                    <div className="emp-progress-item">
                      <div className="emp-progress-label">
                        <span>Fundação</span>
                        <span>95%</span>
                      </div>
                      <div className="emp-progress-bar">
                        <div className="emp-progress-fill fundacao"></div>
                      </div>
                    </div>

                    <div className="emp-progress-item">
                      <div className="emp-progress-label">
                        <span>Estrutura</span>
                        <span>85%</span>
                      </div>
                      <div className="emp-progress-bar">
                        <div className="emp-progress-fill estrutura"></div>
                      </div>
                    </div>

                    <div className="emp-progress-item">
                      <div className="emp-progress-label">
                        <span>Acabamento Interno</span>
                        <span>60%</span>
                      </div>
                      <div className="emp-progress-bar">
                        <div className="emp-progress-fill acabamento-interno"></div>
                      </div>
                    </div>

                    <div className="emp-progress-item">
                      <div className="emp-progress-label">
                        <span>Acabamento Externo</span>
                        <span>40%</span>
                      </div>
                      <div className="emp-progress-bar">
                        <div className="emp-progress-fill acabamento-externo"></div>
                      </div>
                    </div>
                  </div> */}
                </div>
              </div>

              {/* Sidebar com formulário */}
              <div className="property-sidebar">
                <div className="emp-contact-form-hero">
                  <h3 className="emp-form-title">Ficou interessado neste imóvel?</h3>
                  <p className="emp-form-subtitle">Preencha seus dados abaixo, nosso time estará pronto para te atender</p>
                  <form className="emp-contact-form" onSubmit={handleContactFormSubmit}>
                    <input 
                      type="text" 
                      name="nome"
                      placeholder="Coloque seu nome"
                      className="emp-form-input"
                      value={contactForm.nome}
                      onChange={handleContactFormChange}
                      required
                    />
                    <input 
                      type="email" 
                      name="email"
                      placeholder="Coloque seu e-mail"
                      className="emp-form-input"
                      value={contactForm.email}
                      onChange={handleContactFormChange}
                      required
                    />
                    <input 
                      type="tel" 
                      name="telefone"
                      placeholder="Coloque seu telefone"
                      className="emp-form-input"
                      value={contactForm.telefone}
                      onChange={handleContactFormChange}
                      required
                    />
                    <button type="submit" className="emp-form-submit-btn">
                      ENVIAR
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Amenities Section */}
        <section className="emp-amenities-section">
          <div className="flex">
            <h2 className="emp-section-title">Ficha técnica do empreendimento</h2>
            <div className="emp-amenities-grid">
              {property.caracteristicas.map((caracteristica, index) => (
                <div key={index} className="emp-amenity-item">
                  <Image src="/assets/svg/check-solid.svg" alt="Check" width={16} height={16} />
                  {caracteristica}
                </div>
              ))}
            </div>
          </div>
        </section>

        
        {/* Map Section */}
        <section className="emp-map-section">
          <div className="emp-map-container">
            <div className="emp-map-content">
              <div className="emp-iframe-container">
                {property.iframe_mapa ? (
                  <div dangerouslySetInnerHTML={{ __html: property.iframe_mapa }} />
                ) : (
                  <div className="map-placeholder">
                    <h3 className="map-address">
                      {property.endereco || `${property.bairro}, ${property.cidade} - ${property.estado}`}
                    </h3>
                    <p className="map-note">Mapa em breve</p>
                  </div>
                )}
              </div>
              <div className="map-info">
                <h2 className="emp-map-title">Localizado no bairro da {property.bairro}</h2>
                <p className="emp-map-description">
                  {property.texto_localizacao || 
                   `O ${property.titulo} está localizado no bairro ${property.bairro}, uma região privilegiada com fácil acesso a comércios, serviços e principais vias da cidade.`}
                </p>
                <button className="emp-map-cta-btn">
                  AGENDAR UMA VISITA
                </button>
              </div>
              
            </div>
          </div>
        </section>

        {/* Gallery Section */}
        <section className="emp-gallery-section">
          <div className="emp-gallery-container">            
            <div className="image-carousel-container">
              <ImageCarousel images={carouselImages}
              propertyTitle={property.titulo}/>
            </div>
          </div>
        </section>


        {/* Contact CTA Section */}
        <section className="contatct-section">
          <div className="emp-container-cntt">
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, maxWidth: '600px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007DC3', marginBottom: '1rem' }}>
                  Fale com um consultor
                </h2>
                <p style={{ fontSize: '1rem', color: '#666', lineHeight: '1.6' }}>
                  Preencha seus dados abaixo e fale com um especialista da nossa equipe
                </p>
                
                <input 
                    type="text" 
                    placeholder="Coloque seu nome"
                    className="emp-input"
                  />
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Coloque seu nome"
                    style={{ 
                      flex: 1, 
                      padding: '0.8rem', 
                      border: '1px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                  <input 
                    type="tel" 
                    placeholder="Coloque seu telefone"
                    style={{ 
                      flex: 1, 
                      padding: '0.8rem', 
                      border: '1px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
                
                <button 
                  style={{ 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    padding: '0.8rem 2rem', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '0.9rem'
                  }}
                >
                  ENVIAR
                </button>
              </div>
              
              {/* Imagem ao lado */}
            {!isMobile && (
              <div style={{ flex: 1, minWidth: '300px', textAlign: 'center' }}>
                <img
                  src="/assets/img_fale-corretor.png"
                  alt="Consultor"
                  style={{ maxWidth: '485px', height: 'auto' }}
                />
              </div>
            )}
            </div>
          </div>
        </section>

        {/* Properties Grid Section - Imóveis Relacionados */}
        {propertiesData.length > 0 && property && ( // Garante que há propriedades para exibir e a propriedade atual está carregada
          <section className="py-12 bg-white">
            <div className="mx-auto px-4">
              <h2 className="emp-titulo-section">
                Imóveis relacionados
              </h2>
              
              {loading && (
                <div className="emp-loading-container">
                  <div className="emp-loading-spinner"></div>
                  <p>Carregando empreendimentos...</p>
                  {imagesLoading && <p className="text-sm text-gray-600">Carregando imagens...</p>}
                </div>
              )}

              {!loading && relatedPropertiesWithImages.length > 0 && (
                  <Swiper
                    modules={[Navigation, Pagination]}
                    centeredSlides={true}
                    slidesPerView="auto"
                    spaceBetween={12}
                    navigation
                    pagination={{ clickable: true }}
                    className="properties-carousel"
                    breakpoints={{
                      1024: {
                        slidesPerView: 3,
                        centeredSlides: false,
                        spaceBetween: 24,
                      },
                    }}
                  >
                  {relatedPropertiesWithImages
                    .filter(p => p.id !== property.id) // Exclui a propriedade atual da lista de relacionados
                    .slice(0, 6) // Limita a um número razoável de propriedades para o carrossel
                    .map((relatedProperty) => (
                    <SwiperSlide key={relatedProperty.id} className="emp-property-card">
                      <div className="emp-property-image-container">
                          {relatedProperty.image ? (
                            <img 
                              src={relatedProperty.image} 
                              alt={relatedProperty.title} 
                              className="emp-property-image"
                              onError={(e) => handleImageError(e, relatedProperty.id)}
                            />
                          ) : (
                            <div className="emp-image-loading">
                              Carregando imagem...
                            </div>
                          )}
                        <div className="emp-property-status-badge">
                          {relatedProperty.status}
                        </div>
                      </div>

                      <div className="emp-property-content">
                        <div className="emp-property-content-main">
                          <h3 className="emp-property-title">{relatedProperty.title}</h3>
                          <div className="emp-property-neighborhood">
                            {relatedProperty.neighborhood}
                          </div>
                          <div className="property-adress">
                            <Image src="/assets/svg/ico_local.svg" alt="Localização" width={16} height={16} className="emp-property-detail-icon" />
                            {relatedProperty.title}
                          </div>
                          <p className="emp-property-description">{relatedProperty.title_description}</p>

                          <div className="emp-property-details">
                            <div className="emp-property-detail-item">
                              <Image src="/assets/svg/ico_valor.svg" alt="Preço" width={16} height={16} className="emp-property-detail-icon" />
                              <span className="emp-property-price">{relatedProperty.price}</span>
                            </div>
                            <div className="emp-property-detail-item">
                              <Image src="/assets/svg/ico_area.svg" alt="Área" width={16} height={16} className="emp-property-detail-icon" />
                              <span>{relatedProperty.area}</span>
                            </div>
                            <div className="emp-property-detail-item">
                              <Image src="/assets/svg/ico_quartos.svg" alt="Quartos" width={16} height={16} className="emp-property-detail-icon" />
                              <span>{relatedProperty.bedrooms}</span>
                            </div>
                            <div className="emp-property-detail-item">
                              <Image src="/assets/svg/ico_vagas.svg" alt="Vagas" width={16} height={16} className="emp-property-detail-icon" />
                              <span>{relatedProperty.parking}</span>
                            </div>
                          </div>
                        </div>

                        <Link href={relatedProperty.link} className="emp-property-btn">
                          QUERO SABER MAIS
                        </Link>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}

              {error && (
                <div className="error-container">
                  <p className="error-message">{error}</p>
                  <p className="text-sm text-gray-600">Exibindo dados estáticos como alternativa.</p>
                </div>
              )}
            </div>
          </section>
        )}


      </main>
      

      {/* Footer */}
      <footer className="footer">
        <div className="emp-container">
          <div className="footer-grid">
            <div style={{ margin:'0 auto'}}>
              <img 
                alt="Fort Xavier Logo Branco" 
                className="footer-logo"  
                src="/assets/fort-xavier_logo.png"
              />
              <p className="footer-text small">Copyright © 2025 | Fort Xavier</p>
              <p className="footer-text small">Todos os direitos reservados</p>
              {/* <p className="footer-text small">CNPJ XX.XXX.XXX/0001-XX</p> */}
              <div className="social-icons">
                <a className="social-icon-link" href="#">
                  <Image src="/assets/svg/instagram.svg" alt="imagem" width={20} height={20}/>
                </a> 
                <a className="social-icon-link" href="#">
                  <Image src="/assets/svg/facebook.svg" alt="imagem" width={20} height={20}/>
                </a>
                <a className="social-icon-link" href="#">
                  <Image src="/assets/svg/linkedin.svg" alt="imagem" width={20} height={20}/>
                </a>
                <a className="social-icon-link" href="#">
                  <Image src="/assets/svg/youtube.svg" alt="imagem" width={30} height={30}/>
                </a> 
              </div>
            </div>
            <div style={{ margin:'0 auto'}}>
              <h5 className="footer-heading">Entre Em Contato Conosco</h5>
              <ul className="footer-links">
                <li className="footer-link-item">
                  <span className="material-icons footer-text small">Telefone:</span>{' '}
                  <a href="tel:+5511947489217" className="footer-text small">
                    11 94748-9217
                  </a>
                </li>
                {/* <li className="footer-link-item">
                  <p className="material-icons footer-text small">chat: Fale via Chat</p> 
                </li> */}
              </ul>
            </div>
            <div style={{ margin:'0 auto'}}>
              <h5 className="footer-heading">Páginas</h5>
              <ul className="footer-links">
                <li className="footer-link-item">
                  <a className="footer-link" href="#">Home</a></li>
                <li className="footer-link-item">
                  <a className="footer-link" href="#">Empreendimentos</a>
                </li>
                <li className="footer-link-item">
                  <a className="footer-link" href="#">Contato</a>
                  </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
        {/* <div className="emp-whatsapp-float">
          <a 
            href="https://wa.me/5511999999999" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="Falar no WhatsApp"
          >
            <Image 
              src="../assets/whatsapp-icon.png" 
              alt="WhatsApp" 
              width={60} 
              height={60}
            />
          </a>
        </div> */}
    </div>
  );
}

