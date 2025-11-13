"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { getMultiplePropertyImages, getCardImageUrl, preloadImages } from '../lib/imageUploadService';
import './home.css'
import { useAuth } from '../lib/AuthContext';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { useLeadService } from '@/lib/leadService';

// Hook personalizado para animações de scroll
const useScrollAnimation = () => {
  useEffect(() => {
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-visible');
        } else {
          // Remove a classe para permitir re-animação ao fazer scroll para cima
          entry.target.classList.remove('animate-visible');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1, // Elemento precisa estar 10% visível
      rootMargin: '0px 0px -50px 0px' // Margem para triggerar antes do elemento estar totalmente visível
    });

    // Observar todos os elementos com classe animate-element
    const animateElements = document.querySelectorAll('.animate-element');
    animateElements.forEach((element) => observer.observe(element));

    // Cleanup
    return () => {
      animateElements.forEach((element) => observer.unobserve(element));
    };
  }, []);
};

// Interface para tipagem das propriedades conforme tabela exata
interface Property {
  id: string;
  titulo: string;
  titulo_descricao: string;
  descricao: string;
  valor: number;
  slug: string; // Alterado de number para string
  cidade: string;
  estado: string;
  area_texto: string;
  status_empreendimento: string;
  endereco?: string;
  texto_localizacao?: string;
  valor_condominio?: number;
  tipo_imovel: string[];
  caracteristicas: string[];
  areas_disponiveis: number[];
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
  tipo: string[];
  caracteristicas: string[];
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const [bairros, setBairros] = useState<string[]>([]);

  // Estados para os filtros de busca
  const [searchFilters, setSearchFilters] = useState({
    bairro: '',
    estagio: '',
    tipo: [] as string[],
    dormitorios: '',
    area: '',
    vagas: '',
    banheiros: '',
    valor_min: '',
    valor_max: ''
  });

  // Estados para propriedades dinâmicas
  const [propertiesData, setPropertiesData] = useState<PropertyDisplay[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<PropertyDisplay[]>([]); // Mudança: array para múltiplos destaques
  const [specificProperty, setSpecificProperty] = useState<PropertyDisplay | null>(null); // Nova: propriedade específica por slug
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [propertyImages, setPropertyImages] = useState<Record<string, any>>({});
  const [imagesLoading, setImagesLoading] = useState(false);

  // Estado para o formulário de newsletter - MODIFICADO
  const [newsletterForm, setNewsletterForm] = useState({
    nome: '',
    email: ''
  });
  const { enviar, success, limparMensagens } = useLeadService();

  // Inicializar animações de scroll
  useScrollAnimation();

  // Função para formatar arrays em string legível
  const formatArrayToString = (array: string[], adicionalName: string): string => {
    if (!array || array.length === 0) return 'Consulte';
    
    if (array.length === 1) {
      return `${array[0]} ${adicionalName}s`;
    }
    
    if (array.length === 2) {
      return `${array[0]} e ${array[1]} ${adicionalName}s`;
    }
    
    // Para 3 ou mais itens: "1, 2 e 3"
    const lastItem = array[array.length - 1];
    const otherItems = array.slice(0, -1);
    return `${otherItems.join(', ')} e ${lastItem} ${adicionalName}s`;
  };
  
  // Função para converter dados do Supabase para formato de exibição
  const formatPropertyForDisplay = (property: Property): PropertyDisplay => {
    // console.log('Segue propriedade:')
    // console.log(property)
    // Usar os novos campos específicos da interface Property
    const bedrooms = formatArrayToString(property.quartos, 'dormitório');
    const parking = formatArrayToString(property.vagas, 'vaga');
    const bathrooms = formatArrayToString(property.banheiros, 'banheiro');

    // Extrair área das características como fallback
    const area = property.caracteristicas.find(c => 
      c.toLowerCase().includes('m²') || c.toLowerCase().includes('metro')
    ) || 'Consulte';

    // Usar o campo bairro específico, com fallback para cidade
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
      image: getCardImageUrl(propertyImages[property.id]),
      link: `/empreendimentos/${property.slug}`,
      cidade: property.cidade,
      status_empreendimento: property.status_empreendimento,
      valor: property.valor,
      tipo: property.tipo_imovel,
      caracteristicas: property.caracteristicas
    };
  };

  // Função para buscar propriedades para a Home (home = true)
  const fetchHomeProperties = async () => {
    try {
      setLoading(true);
      setError('');

      // Buscar propriedades que devem aparecer na home
      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .eq('home', true)
        .order('data_criacao', { ascending: false })
        .limit(20);

      if (supabaseError) {
        throw supabaseError;
      }

      if (data && data.length > 0) {
        // console.log(`Encontradas ${data.length} propriedades para a Home`);
        
        // Buscar imagens para todas as propriedades
        setImagesLoading(true);
        const propertyIds = data.map(property => property.id);
        const imagesResult = await getMultiplePropertyImages(propertyIds);
        
        if (imagesResult.success && imagesResult.data) {
          setPropertyImages(prev => ({ ...prev, ...imagesResult.data }));
          // console.log('Imagens carregadas com sucesso para propriedades da Home');
        } else {
          console.error('Erro ao carregar imagens:', imagesResult.error);
        }
        setImagesLoading(false);

        const formattedProperties = data.map(formatPropertyForDisplay);
        setPropertiesData(formattedProperties.slice(0, 6)); // Limita a 6 para o grid
      } else {
        // console.log('Nenhuma propriedade para a Home encontrada.');
        setPropertiesData([]);
      }
    } catch (err) {
      console.error('Erro ao buscar propriedades da Home:', err);
      setError('Erro ao carregar propriedades.');
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar propriedades em Destaque (destaque = true)
  const fetchFeaturedProperties = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .eq('destaque', true)
        .order('data_criacao', { ascending: false })
        .limit(10); // Buscar até 10 propriedades em destaque

      if (supabaseError) {
        if (supabaseError.code !== 'PGRST116') {
          throw supabaseError;
        }
      }

      if (data && data.length > 0) {
        // console.log(`Encontradas ${data.length} propriedades em destaque`);
        
        // Buscar imagens para propriedades em destaque
        const propertyIds = data.map(property => property.id);
        const imagesResult = await getMultiplePropertyImages(propertyIds);
        
        if (imagesResult.success && imagesResult.data) {
          setPropertyImages(prev => ({ ...prev, ...imagesResult.data }));
          // console.log('Imagens carregadas com sucesso para propriedades em destaque');
        }

        const formattedProperties = data.map(formatPropertyForDisplay);
        setFeaturedProperties(formattedProperties);
      } else {
        console.log('Nenhuma propriedade em destaque encontrada.');
        setFeaturedProperties([]);
      }

    } catch (err) {
      console.error('Erro ao buscar propriedades em destaque:', err);
    }
  };

  // Nova função para buscar propriedade específica por slug
  const fetchSpecificProperty = async (slug: string) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .eq('slug', slug)
        .single();

      console.log('sucesso', data)
      console.log('erro', error)

      if (supabaseError) {
        if (supabaseError.code !== 'PGRST116') {
          throw supabaseError;
        }
        console.log(`Propriedade com slug '${slug}' não encontrada.`);
        return;
      }

      if (data) {
        // console.log(`Propriedade específica encontrada: ${data.titulo}`);
        
        // Buscar imagem para a propriedade específica
        const imagesResult = await getMultiplePropertyImages([data.id]);
        
        if (imagesResult.success && imagesResult.data) {
          setPropertyImages(prev => ({ ...prev, ...imagesResult.data }));
          // console.log('Imagem carregada com sucesso para propriedade específica');
        }

        const formattedProperty = formatPropertyForDisplay(data);
        setSpecificProperty(formattedProperty);
      }

    } catch (err) {
      console.error('Erro ao buscar propriedade específica:', err);
    }
  };

  // Detectar se é mobile para aplicar estilos específicos
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Verificar no carregamento inicial
    checkIfMobile();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Carregar propriedades ao montar o componente
  useEffect(() => {
    fetchHomeProperties();
    fetchFeaturedProperties();
    fetchSpecificProperty('residencial-amorim'); // Buscar propriedade específica por slug
  }, []);

  // Reprocessar propriedades quando as imagens mudarem
  useEffect(() => {
    if (Object.keys(propertyImages).length > 0) {
      // console.log('Reprocessando propriedades com novas imagens...');
      
      // Atualizar propriedades da home
      if (propertiesData.length > 0) {
        const updatedProperties = propertiesData.map(property => ({
          ...property,
          image: getCardImageUrl(propertyImages[property.id]) || property.image
        }));
        setPropertiesData(updatedProperties);
      }

      // Atualizar propriedades em destaque
      if (featuredProperties.length > 0) {
        const updatedFeatured = featuredProperties.map(property => ({
          ...property,
          image: getCardImageUrl(propertyImages[property.id]) || property.image
        }));
        setFeaturedProperties(updatedFeatured);
      }

      // Atualizar propriedade específica
      if (specificProperty) {
        setSpecificProperty({
          ...specificProperty,
          image: getCardImageUrl(propertyImages[specificProperty.id]) || specificProperty.image
        });
      }
    }
  }, [propertyImages]);

  useEffect(() => {
    const fetchBairros = async () => {
      try {
        const result = await getUniqueBairros();
        setBairros(result);
      } catch (error) {
        console.error('Erro ao carregar bairros:', error);
      }
    };
  
    fetchBairros();
  }, []);

  // Fechar menu ao clicar em um link (apenas no mobile)
  const handleLinkClick = () => {
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  // Função para realizar a busca
  const handleSearch = () => {
    // Criar parâmetros de URL baseados nos filtros selecionados
    const params = new URLSearchParams();
    
    if (searchFilters.bairro) params.set('bairro', searchFilters.bairro);
    if (searchFilters.estagio) params.set('estagio', searchFilters.estagio); 
    if (searchFilters.tipo.length > 0) params.set('tipo', searchFilters.tipo.join(','));
    if (searchFilters.dormitorios) params.set('dormitorios', searchFilters.dormitorios);
    if (searchFilters.area) params.set('area', searchFilters.area);
    if (searchFilters.vagas) params.set('vagas', searchFilters.vagas);
    if (searchFilters.banheiros) params.set('banheiros', searchFilters.banheiros);
    if (searchFilters.valor_min) params.set('valor_min', searchFilters.valor_min);
    if (searchFilters.valor_max) params.set('valor_max', searchFilters.valor_max);

    // Navegar para a página de empreendimentos com os parâmetros
    const queryString = params.toString();
    const url = queryString ? `/empreendimentos?${queryString}` : '/empreendimentos';
    
    router.push(url);
  };

  // Função para atualizar filtros de busca
  const handleSearchFilterChange = (filterType: string, value: string | string[]) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // NOVA FUNÇÃO: Função para lidar com a mudança do filtro de tipo (multi-select)
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  
  
  // Obter opções únicas para os filtros
  const getUniqueBairros = async () => {
    const { data, error } = await supabase
    .from('fx_properties')
    .select('bairro');

    if (error) {
      console.error('Erro ao buscar bairros:', error.message);
      throw error;
    }

    // Criar Set para garantir unicidade
    const bairrosSet = new Set<string>();

    data?.forEach((item) => {
      if (item.bairro) {
        bairrosSet.add(item.bairro.trim());
      }
    });

    // Converter para array, remover falsos, ordenar
    return Array.from(bairrosSet).filter(Boolean).sort();
  };

  const getUniqueEstagios = () => {
    return [...new Set(propertiesData.map(prop => prop.status_empreendimento))].filter(Boolean).sort();
  };

  // Função para lidar com a mudança do filtro de tipo (multi-select via checkboxes)
  const toggleTipoOption = (tipo: string) => {
    setSearchFilters(prev => { // Usar setSearchFilters aqui
      const alreadySelected = prev.tipo.includes(tipo);
      const updated = alreadySelected
        ? prev.tipo.filter(t => t !== tipo)
        : [...prev.tipo, tipo];
      return { ...prev, tipo: updated };
    });
  };
  
  // ATUALIZADO: Obter tipos únicos do campo 'tipo' (que vem de tipo_imovel)
  // Esta função agora coleta os tipos das propriedades carregadas na home
  const getUniqueTipos = () => {
    const tipos = new Set<string>();
    // Adiciona tipos das propriedades regulares
    propertiesData.forEach(prop => {
      if (Array.isArray(prop.tipo)) {
        prop.tipo.forEach(t => {
          if (t) {
            tipos.add(t);
          }
        });
      }
    });
    // Adiciona tipos das propriedades em destaque
    featuredProperties.forEach(prop => {
      if (Array.isArray(prop.tipo)) {
        prop.tipo.forEach(t => {
          if (t) {
            tipos.add(t);
          }
        });
      }
    });
    // Adiciona tipos da propriedade específica, se houver
    if (specificProperty && Array.isArray(specificProperty.tipo)) {
      specificProperty.tipo.forEach(t => {
        if (t) {
          tipos.add(t);
        }
      });
    }
    return Array.from(tipos).sort();
  };

  // Função para lidar com erro de carregamento de imagem
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, propertyId: string) => {
    console.log(`Erro ao carregar imagem para propriedade ${propertyId}`);
    e.currentTarget.src = "/assets/temporario tela.png";
  };

  // NOVA FUNÇÃO: Função para lidar com mudanças no formulário de newsletter
  const handleNewsletterFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewsletterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // NOVA FUNÇÃO: Função para enviar o formulário de newsletter
  const handleNewsletterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const result = await enviar({
      nome: newsletterForm.nome,
      email: newsletterForm.email,
      telefone: '',
      assunto: 'Newsletter',
      mensagem: 'newsletter',
      imovel_id: '',
      pagina_origem: `/`
    });
  
    if (result.success) {
      setNewsletterForm({ nome: '', email: '' });
    }
  };

  const { isAuthenticated } = useAuth();

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

      {/* Hero Section */}
      <section
        className="hero-section"
        style={{ backgroundImage: "url('/assets/bg_home.svg')" }}
      >
        <div className="hero-content form-grid grid-1">

          <div className={`filters-container fade-in ${isMobile ? 'mobile-filters' : ''}`}>
            {isMobile ? (
              // Layout Mobile - Filtros empilhados
              <>
              <h1 className="hero-title animate-element animate-fade-up">
                Encontre seu imóvel ideal aqui e agora.
              </h1>
              <div className="mobile-div-items">
                {/* Bairro */}
                <div className="mobile-filter-item">
                  <div className="filter-item">
                    <Image 
                      src="/assets/icones/ico_local.png" 
                      alt="Ícone Bairro" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    <select 
                      className="filter-select"
                      value={searchFilters.bairro}
                      onChange={(e) => handleSearchFilterChange('bairro', e.target.value)}
                    >
                      <option value="">Bairro</option>
                      {bairros.map((bairro) => (
                        <option key={bairro} value={bairro}>
                          {bairro}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estágio da Obra */}
                <div className="mobile-filter-item">
                  <div className="filter-item">
                    <Image 
                      src="/assets/icones/ico_estagio.png" 
                      alt="Ícone Estágio" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    <select 
                      className="filter-select"
                      value={searchFilters.estagio}
                      onChange={(e) => handleSearchFilterChange('estagio', e.target.value)}
                    >
                      <option value="">Estágio da Obra</option>
                      <option value="Lançamento">Lançamento</option>
                      <option value="Entregue, pronto para morar">Entregue, pronto para morar</option>
                      <option value="Pronto para morar">Pronto para morar</option>
                    </select>
                  </div>
                </div>

                {/* Tipo do Imóvel */}
                <div className="mobile-filter-item">
                  <div className="filter-item tipo-dropdown">
                    <Image 
                      src="/assets/icones/ico_tipo.png" 
                      alt="Ícone Tipo" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    
                    <div className="dropdown-wrapper" onClick={() => setShowTipoDropdown(!showTipoDropdown)}>
                      <div className="filter-select custom-select">
                        {searchFilters.tipo.length > 0 ? searchFilters.tipo.join(', ') : 'Tipo do Imóvel'}
                      </div>
                      <Image
                        src="/assets/icones/arrow.png"
                        width={14}
                        height={14}
                        alt="arrow"
                        className={`dropdown-arrow ${showTipoDropdown ? 'open' : ''}`}
                      />

                      {showTipoDropdown && (
                        <div className="dropdown-options">
                          {getUniqueTipos().map(tipo => (
                            <label key={tipo} className="dropdown-option">
                              <input
                                type="checkbox"
                                checked={searchFilters.tipo.includes(tipo)}
                                onChange={() => toggleTipoOption(tipo)}
                              />
                              {tipo}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dormitórios */}
                <div className="mobile-filter-item">
                  <div className="filter-item">
                    <Image 
                      src="/assets/icones/ico_quartos.png" 
                      alt="Ícone Dormitórios" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    <select 
                      className="filter-select"
                      value={searchFilters.dormitorios}
                      onChange={(e) => handleSearchFilterChange('dormitorios', e.target.value)}
                    >
                      <option value="">Dormitórios</option>
                      <option value="Studio">Studio</option>
                      <option value="1">1 Dormitório</option>
                      <option value="2">2 Dormitórios</option>
                      <option value="3">3 ou mais</option>
                    </select>
                  </div>
                </div>

                <button className="search-btn mobile-search-btn" onClick={handleSearch}>
                  Buscar
                </button>

              </div>
              </>
            ) : (
              // Layout Desktop - Filtros em duas linhas
              <>
              <h1 className="hero-title slide-in">
                Encontre aqui seu imóvel ideal.
              </h1>
                {/* Segunda linha - Estágio, Tipo e Dormitórios */}
                <div className="filters-row">
                  <div className="filter-item-secundario">
                    <Image 
                      src="/assets/svg/ico_local.svg" 
                      alt="Ícone Bairro" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    <select 
                      className="filter-select"
                      value={searchFilters.bairro}
                      onChange={(e) => handleSearchFilterChange('bairro', e.target.value)}
                    >
                      <option value="">Bairro</option>
                      {bairros.map((bairro) => (
                        <option key={bairro} value={bairro}>
                          {bairro}
                        </option>
                      ))}
                    </select>

                  </div>
                  <div className="filter-item-secundario" style={{ borderRadius: '35px 0 0 35px', marginLeft: '30px' }}>
                    <Image 
                      src="/assets/svg/ico_estagio.svg" 
                      alt="Ícone Estágio" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    <select 
                      className="filter-select"
                      value={searchFilters.estagio}
                      onChange={(e) => handleSearchFilterChange('estagio', e.target.value)}
                    >
                      <option value="">Estágio da Obra</option>
                      <option value="Lançamento">Lançamento</option>
                      <option value="Entregue, pronto para morar">Entregue, pronto para morar</option>
                      <option value="Pronto para morar">Pronto para morar</option>
                    </select>
                  </div>
                  
                  <div className="filter-item tipo-dropdown">
                    <Image 
                      src="/assets/svg/ico_tipo.svg" 
                      alt="Ícone Tipo" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />

                    <div className="dropdown-wrapper" onClick={() => setShowTipoDropdown(!showTipoDropdown)}>
                      <div className="filter-select custom-select">
                        {searchFilters.tipo.length > 0 ? searchFilters.tipo.join(', ') : 'Tipo do Imóvel'}
                      </div>
                      <Image
                        src="/assets/icones/arrow.png"
                        width={14}
                        height={14}
                        alt="arrow"
                        className={`dropdown-arrow ${showTipoDropdown ? 'open' : ''}`}
                      />

                      {showTipoDropdown && (
                        <div className="dropdown-options">
                          {getUniqueTipos().map(tipo => (
                            <label key={tipo} className="dropdown-option">
                              <input
                                type="checkbox"
                                checked={searchFilters.tipo.includes(tipo)} // Usar searchFilters aqui
                                onChange={() => toggleTipoOption(tipo)} // Chamar toggleTipoOption aqui
                              />
                              {tipo}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="filter-item-secundario">
                    <Image 
                      src="/assets/svg/ico_quartos.svg" 
                      alt="Ícone Dormitórios" 
                      width={20} 
                      height={20} 
                      className="filter-icon" 
                    />
                    <select 
                      className="filter-select"
                      value={searchFilters.dormitorios}
                      onChange={(e) => handleSearchFilterChange('dormitorios', e.target.value)}
                    >
                      <option value="">Dormitórios</option>
                      <option value="Studio">Studio</option>
                      <option value="1">1 Dormitório</option>
                      <option value="2">2 Dormitórios</option>
                      <option value="3">3 ou mais</option>
                    </select>

                  </div>
                  <button className="search-btn" style={{ borderRadius: '0 17px 17px 0' }} onClick={handleSearch}>
                    Buscar
                  </button>

                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Properties Grid Section - Propriedades com home=true */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="titulo-section animate-element animate-fade-up">
            Seu futuro apartamento está aqui
          </h2>
          
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Carregando empreendimentos...</p>
              {imagesLoading && <p className="text-sm text-gray-600">Carregando imagens...</p>}
            </div>
          )}

          {!loading && propertiesData.length > 0 && (
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
                    centeredSlides: false, // remove centralização no desktop
                    spaceBetween: 24,
                  },
                }}
              >
              {propertiesData.map((property) => (
                <SwiperSlide key={property.id} className="property-card animate-element animate-scale">
                  <div className="property-image-container">
                    <img 
                      src={property.image} 
                      alt={property.title} 
                      className="property-image"
                      onError={(e) => handleImageError(e, property.id)}
                    />
                    <div className="property-status-badge">
                      {property.status}
                    </div>
                  </div>

                  <div className="property-content">
                    <div className="property-content-main">
                      <h3 className="property-title">{property.title}</h3>
                      <div className="property-neighborhood">
                        {property.neighborhood}
                      </div>
                      <div className="property-adress">
                        <Image src="/assets/svg/ico_local.svg" alt="Localização" width={16} height={16} className="property-detail-icon" />
                        {property.title}
                      </div>
                      <p className="property-description">{property.title_description}</p>

                      <div className="property-details">
                        <div className="property-detail-item">
                          <Image src="/assets/svg/ico_valor.svg" alt="Preço" width={16} height={16} className="property-detail-icon" />
                          <span className="property-price">{property.price}</span>
                        </div>
                        <div className="property-detail-item">
                          <Image src="/assets/svg/ico_area.svg" alt="Área" width={16} height={16} className="property-detail-icon" />
                          <span>{property.area}</span>
                        </div>
                        <div className="property-detail-item">
                          <Image src="/assets/svg/ico_quartos.svg" alt="Quartos" width={16} height={16} className="property-detail-icon" />
                          <span>{property.bedrooms}</span>
                        </div>
                        <div className="property-detail-item">
                          <Image src="/assets/svg/ico_vagas.svg" alt="Vagas" width={16} height={16} className="property-detail-icon" />
                          <span>{property.parking}</span>
                        </div>
                      </div>
                    </div>

                    <Link href={property.link} className="property-btn">
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

      {/* Content 3 - Propriedade específica por slug */}
      {specificProperty && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="titulo-section animate-element animate-fade-up">
              Imóvel em destaque especial
            </h2>
            
            <div className={`featured-property ${isMobile ? 'mobile-layout' : 'desktop-layout'}`}>
              {!isMobile ? (
                // Layout Desktop - Horizontal
                <>
                  <div className="featured-content">
                    <div className="featured-header">
                      <h3 className="featured-title">{specificProperty.title}</h3>
                    </div>
                    
                    <p className="featured-neighborhood text-[#3498db] text-lg mb-4">{specificProperty.neighborhood}</p>
                    <p className="featured-description text-gray-700 mb-6">{specificProperty.description}</p>
                    
                    <div className="featured-details">
                      <div className="detail-row">
                        <div className="detail-item">
                          <Image src="/assets/svg/ico_valor.svg" alt="Preço" width={24} height={24} />
                          <span className="detail-value text-[#2563eb] font-semibold text-lg">{specificProperty.price}</span>
                        </div>
                        <div className="detail-item">
                          <Image src="/assets/svg/ico_area.svg" alt="Área" width={24} height={24} />
                          <span className="detail-value">{specificProperty.area}</span>
                        </div> 
                      </div>
                      <div className="detail-row">
                        <div className="detail-item">
                          <Image src="/assets/svg/ico_quartos.svg" alt="Quartos" width={24} height={24} />
                          <span className="detail-value">{specificProperty.bedrooms}</span>
                        </div>
                        <div className="detail-item">
                          <Image src="/assets/svg/ico_vagas.svg" alt="Vagas" width={24} height={24} />
                          <span className="detail-value">{specificProperty.parking}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Link 
                      href={specificProperty.link} 
                      className="btn-card bg-[#007cd1] hover:bg-[#005fa3] text-white px-8 py-3 font-semibold transition-colors duration-300 inline-block mt-6"
                    >
                      QUERO MORAR AQUI
                    </Link>
                  </div>
                  
                  <div className="featured-image">
                    <img 
                      src={specificProperty.image} 
                      alt={specificProperty.title}
                      className="w-full h-[400px] object-cover shadow-lg"
                      onError={(e) => handleImageError(e, specificProperty.id)}
                    />
                  </div>
                </>
              ) : (
                // Layout Mobile - Vertical
                <div>
                  <div className="featured-mobile">
                    <div className="featured-image-mobile">
                      <img 
                        src={specificProperty.image} 
                        alt={specificProperty.title}
                        className="w-full h-[320px] object-cover shadow-lg"
                        onError={(e) => handleImageError(e, specificProperty.id)}
                      />
                    </div>
                    
                    <div className="featured-content-mobile">
                      <div className="featured-header-mobile">
                        <h3 className="featured-title-mobile">{specificProperty.title}</h3>
                      </div>
                      
                      <p className="featured-neighborhood-mobile text-[#3498db] mb-3">{specificProperty.neighborhood}</p>
                      <p className="featured-description-mobile text-gray-700 mb-4">{specificProperty.description}</p>
                      
                      <div className="featured-details-mobile">
                        <div className="detail-item-mobile">
                          <Image src="/assets/svg/ico_valor.svg" alt="Preço" width={12} height={12} />
                          <span className="detail-value-mobile text-[#2563eb] font-semibold">{specificProperty.price}</span>
                        </div>
                        <div className="detail-item-mobile">
                          <Image src="/assets/svg/ico_area.svg" alt="Área" width={12} height={12} />
                          <span className="detail-value-mobile">{specificProperty.area}</span>
                        </div>
                        <div className="detail-item-mobile">
                          <Image src="/assets/svg/ico_quartos.svg" alt="Quartos" width={12} height={12} />
                          <span className="detail-value-mobile">{specificProperty.bedrooms}</span>
                        </div>
                        <div className="detail-item-mobile">
                          <Image src="/assets/svg/ico_vagas.svg" alt="Vagas" width={12} height={12} />
                          <span className="detail-value-mobile">{specificProperty.parking}</span>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  <Link 
                    href={specificProperty.link} 
                    className="featured-btn-card bg-[#007cd1] hover:bg-[#005fa3] text-white w-[100%] font-semibold transition-colors duration-300 inline-block mt-4"
                  >
                    QUERO SABER MAIS
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Partners Section - NOVA SEÇÃO */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="titulo-section">
            Nossos parceiros
          </h2>
          
          <div className="partners-grid">
            <div className="partner-item">
              <div className="partner-logo">
                <img src="/assets/XAVIER.svg" alt="Parceiro 1" className="partner-img"/>
              </div>
            </div>
            <div className="partner-item">
              <div className="partner-logo">
                <img src="/assets/logo-caixa.png" alt="Parceiro 2" className="partner-img"/>
              </div>
            </div>
            <div className="partner-item">
              <div className="partner-logo">
                <img src="/assets/rx_inc.png" alt="Parceiro 3" className="partner-img"/>
              </div>
            </div>
            <div className="partner-item">
              <div className="partner-logo">
                <img src="/assets/rs_inc.png" alt="Parceiro 4" className="partner-img"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-white about-section">
        <div className="container mx-auto px-4">
          <div className={`about-layout ${isMobile ? 'mobile-about' : 'desktop-about'}`}>
            {/* Conteúdo textual */}
            <div className="about-content animate-element animate-fade-left">
              <h2 className="titulo-section-about">
                Mais que ser referência, somos realizadores de sonhos
              </h2>

              <p className="conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'left' }}>
                A Xavier Engenharia foi criada em 2008 com a missão de entregar produtos imobiliários modernos e de alta qualidade construtiva que atendam às necessidades e aos desejos dos nossos clientes.
              </p>
              <p className="conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'left' }}>
                Idealizada para mostrar que é possível pensar diferente, a Xavier Engenharia traz a inovação necessária para realizar seus sonhos, pensando sempre no bem-estar e qualidade de vida de cada cliente. 
                Nossos empreendimentos são realizados visando atender às necessidades individuais de espaço, proporcionando o melhor para você e para sua família.
              </p>
              <p className="conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'left' }}>
                O seu projeto com a Xavier Engenharia é realidade e os seus sonhos possíveis.
              </p>
            </div>

            {/* Estatísticas */}
            <div className="about-stats animate-element animate-fade-right animate-delay-200">
              <div className="stats-grid">
                <div className="stat-item">
                  <strong className="stat-number">+17 ANOS</strong>
                  <p className="stat-description">de experiência no mercado</p>
                </div>
                <div className="stat-item">
                  <strong className="stat-number">+200</strong>
                  <p className="stat-description">profissionais realizando sonhos</p>
                </div>
                <div className="stat-item">
                  <strong className="stat-number">+2.000</strong>
                  <p className="stat-description">imóveis entregues</p>
                </div>
                <div className="stat-item">
                  <strong className="stat-number">+10 MIL</strong>
                  <p className="stat-description">famílias atendidas</p>
                </div>
              </div>
            </div>
          </div>

          <Link href="/sobre" className="btn-about bg-[#007cd1] hover:bg-[#005fa3] text-white px-6 py-2 rounded-full font-semibold transition-colors duration-300 inline-block mt-4">
            CONHEÇA MAIS DA NOSSA HISTÓRIA
          </Link>
        </div>
      </section>

      {/* Works Section - Propriedades com destaque=true */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="titulo-section">
            Nossas obras
          </h2>

          {featuredProperties.length > 0 && (
            <div className="mini-hero-swiper">
              <Swiper
                modules={[Autoplay, Navigation]}
                autoplay={{ delay: 10000, disableOnInteraction: false }}
                spaceBetween={12}
                loop
                centeredSlides={true}
                pagination={{ clickable: true }}
                slidesPerView={'auto'}
                navigation
                className="mini-hero-swiper-container overflow-visible"
                breakpoints={{
                  1024: {
                    slidesPerView: 3,
                    centeredSlides: false, // remove centralização no desktop
                    spaceBetween: 24,
                  },
                }}
              >
                {featuredProperties.map((property) => (
                  <SwiperSlide key={property.id} className="mini-hero-slide-wrapper">
                  <Link 
                    href={property.link}>
                    <div
                      className="mini-hero-slide"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${property.image})`,
                      }}
                    >
                      <div className="mini-hero-content">
                        <h3 className="mini-hero-title">{property.title}</h3>
                        <p className="mini-hero-subtitle">{property.neighborhood}</p>
                      </div>
                    </div>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </div>
      </section>

      {/* Financing Section - SEÇÃO AZUL MODIFICADA */}
      <section className="py-12 bg-[#001C60] financing-section-blue">
        <div className="container mx-auto px-4">
          <div className={`section-finan form-grid ${isMobile ? 'grid-1' : 'grid-2'}`}>
            <div className="proporcao-conteudo-fian">
              <h2 className="titulo-finan text-white">programa minha casa, minha vida</h2>
              
              <h2 className="titulo-section-about" style={{ color: '#d68910' }}>
                Seu lar está mais perto do que você imagina!
              </h2>

              <p className="conteudo-1-finan text-white">
                Comprar sua casa própria ficou ainda mais fácil. Parcelamos a entrada, oferecemos condições facilitadas e ajudamos você a aproveitar incentivos como o Minha Casa Minha Vida.
              </p>
              
              <p className="conteudo-1-finan text-white">
                O<b> Minha Casa Minha Vida (MCMV)</b> é o programa de desenvolvimento habitacional do Governo Federal, que tem como objetivo, oferecer subsídio para população adquirir o imóvel a preços acessíveis.
              </p>

              <p className="conteudo-1-finan text-white">
                O grande diferencial do programa está nas taxas de juros mais baixas para todo Brasil e vai proporcionar a mais de 2 milhões de brasileiros a realização do sonho da casa própria até o ano de 2026.
              </p>
              
              <p className="conteudo-2-finan text-white mb-6">
                Simule agora e dê o primeiro passo para um futuro seguro!
              </p>
              
              
              <p className={`${isMobile ? 'hidden' : 'conteudo-2-finan text-white/80 text-sm mb-6'}`} style={{ margin: "15px 0" }}
              >
                *Consulte condições do Programa que se adequam a sua renda.</p>
              
            </div>
          
            <div className="flex flex-col gap-6 text-white px-4 content-4">
              {/* Tabela de Faixas */}
              <div className="rounded-lgtext-sm overflow-hidden">
                <div className="conteudo-3-finan text-white mb-6">
                  Conheça a nova divisão das faixas de renda divulgadas pelo Governo Federal:
                </div>
                <div className="faixa-div px-4 py-2">
                  <span className="faixa font-bold text-[#FFA500]">FAIXA 1 </span>
                  Renda bruta familiar mensal até R$2.800
                </div>
                <div className="faixa-div px-4 py-2">
                  <span className="faixa font-bold text-[#FFA500]">FAIXA 2 </span>
                  Renda bruta familiar mensal de R$2.800 a R$4.700
                </div>
                <div className="faixa-div px-4 py-2">
                  <span className="faixa font-bold text-[#FFA500]">FAIXA 3 </span>
                  Renda bruta familiar mensal de R$4.700,01 a R$8.000
                </div>
                <div className="faixa-div px-4 py-2">
                  <span className="faixa font-bold text-[#FFA500]">FAIXA 4 </span>
                  Renda bruta familiar mensal de R$8.000,00 a R$12.000
                </div>
                <div className="faixa-div text-obs px-4 py-2">
                  <p className="px-4 py-2 text-xs">
                    *Consulte condições do Programa que se adequam a sua renda.
                  </p>
                </div>
              </div>
              
              {/* Ícones Informativos */}  
              <div className="grid grid-cols-3 text-center border border-white/20 rounded-[30px] overflow-hidden bg-white/10 px-6 py-8 gap-4">
                {/* FGTS */}
                <div className="flex flex-col items-center px-4 border-r border-white/20" style={{ height: "160px" }}>
                  <Image 
                    src="/assets/ico_financie-fgts.png"
                    alt="FGTS"
                    width={60}
                    height={60}
                    className="icon-finan-fgts forca-cor"
                  />
                  <div className="grow" />
                  <p className="text-white font-medium text-sm mb-[10px] text-center leading-snug">
                    ENTRADA FACILITADA E USO DO <strong>FGTS</strong>
                  </p>
                </div>

                {/* Familiares */}
                <div className="flex flex-col items-center px-4 border-r border-white/20" style={{ height: "160px" }}>
                  <Image 
                    src="/assets/ico_financie-familia.png"
                    alt="Família"
                    width={60}
                    height={60}
                    className="icon-finan forca-cor"
                  />
                  <div className="grow" />
                  <p className="text-white font-medium text-sm mt-4 mb-[10px] text-center leading-snug">
                    COMPONHA SUA RENDA COM <strong>ATÉ 3 FAMILIARES</strong>
                  </p>
                </div>

                {/* Digital */}
                <div className="flex flex-col items-center px-4" style={{ height: "160px" }}>
                  <Image 
                    src="/assets/ico_financie-documentos.png"
                    alt="Documentos"
                    width={60}
                    height={60}
                    className="icon-finan forca-cor"
                  />
                  <div className="grow" />
                  <p className="text-white font-medium text-sm mt-4 mb-[10px] text-center leading-snug">
                    PROCESSO <strong>RÁPIDO</strong> E <strong>100% DIGITAL</strong>
                  </p>
                </div>
              </div>
              
              {/* Botão de simulação (duplicado à direita se desejar) */}
              <Link href="/simulacao" className={`${isMobile ? 'btn-about' : 'btn-context' } "bg-[#007cd1] hover:bg-[#005fa3] text-white px-6 py-2 rounded-full font-semibold transition-colors duration-300 inline-block mt-4 w-[50%]`}>
                Faça uma simulação
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* Stories Section - NOVA SEÇÃO */}
      <section className="history py-12 bg-white">
        <div className={`content-history grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} text-center overflow-hidden bg-white/10 px-6 py-8 gap-4`}>
          
          {/* TEXTO */}
          <div className="basis-1/3 about-content w-[100%] flex flex-col items-center justify-center px-4 border-white/20"> 
            <p className="conteudo-padrao text-gray-600 w-full text-left my-4">
              <b>BUSCAMOS REALIZAR SONHOS</b>
            </p>
            <h2 className="titulo-section-history text-left">
              Histórias que transformam muitas vidas
            </h2>

            <p className="conteudo-padrao text-gray-600 w-full text-left my-4">
              <b>São mais de 10 mil famílias</b> que tiveram suas vidas transformadas por nossos empreendimentos.
            </p>
            <p className="conteudo-padrao text-gray-600 w-full text-left">
              Histórias que marcam gerações, com depoimentos que nos mostram que é muito mais sobre construir casas, apartamentos ou empreendimentos, mas sobre realizar sonhos de famílias inteiras.
            </p>                    
          </div>

          {/* IMAGENS AGRUPADAS */}
          <div className="basis-2/3 history-div-img grid grid-cols-2 gap-4 px-4 relative h-64">
            {[1, 2].map((_, idx) => (
              <div
                key={idx}
                className="relative rounded-[20px] shadow-lg overflow-hidden h-full w-full"
              >
                <Image
                  className="object-cover"
                  src="/assets/familia-feliz-bulldog.svg"
                  alt="Família"
                  fill
                />

                {/* Overlay escura com gradiente */}
                <div className="absolute inset-0 z-10 w-full h-full" style={{
                  background: "linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.7))"
                }}></div>

                {/* Texto + ícone no rodapé */}
                <div className="div-play">
                  <h3 className="font-bold text-lg">Depoimentos</h3>
                  <Image
                    className="play"
                    src="/assets/svg/play.svg"
                    alt="Play"
                    width={60}
                    height={60}
                  />
                </div>
              </div>

            ))}
          </div>

        </div>
      </section>

            

      {/* Contact Section - MODIFICADO PARA NEWSLETTER */}
      <section className="py-12 contatct-section">
        <div className="container mx-auto px-4" style={{ padding: "0" }}>
          <div className={`section-assine form-grid ${isMobile ? 'grid-1' : 'grid-2'}`} style={{ margin: "0" }}>
            {!isMobile && (
              <div style={{ display: "flex" }}>
                <Image src="/assets/fam-pai-mae-filha.svg" alt="imagem" width={650} height={470}/>
              </div>
            )}
            <div className="proporcao-conteudo-fian animate-element animate-fade-up">
              <h3 className="titulo-section">Assine nossa newsletter</h3>
              
              <p className="conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'center', margin: '30px 0' }}>
                Fique por dentro das facilidades que só a Fort Xavier tem para você.
              </p>
              <form className="contato-form" onSubmit={handleNewsletterFormSubmit}>
                <div className="div-newsletter-campo">
                  <div className="contact-item-desktop">
                    <input
                      type="text" 
                      name="nome" 
                      placeholder="Seu nome*" 
                      className="contact-input"
                      value={newsletterForm.nome} 
                      onChange={handleNewsletterFormChange} 
                      required
                    />
                  </div>
                  <div className="contact-item-desktop">
                    <input
                      type="email" 
                      name="email" 
                      placeholder="Seu e-mail*" 
                      className="contact-input"
                      value={newsletterForm.email} 
                      onChange={handleNewsletterFormChange} 
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn-newsletter block text-center bg-[#007cd1] hover:bg-[#005fa3] rounded-full w-[50%]">
                  Assinar newsletter
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="footer">
        <div className="container">
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

    </div>
  );
}

