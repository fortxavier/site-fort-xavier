'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getMultiplePropertyImages, getCardImageUrl, preloadImages } from '../../lib/imageUploadService';
import './empreendimentos.css';
import { useAuth } from '../../lib/AuthContext';

// Interface para tipagem das propriedades conforme tabela exata
interface Property {
  id: string;
  titulo: string;
  titulo_descricao: string;
  descricao?: string;
  valor: number;
  slug: number;
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
  areas_disponiveis: number[];
}

export default function EmpreendimentosClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    bairro: '',
    estagio: '',
    tipo: [] as string[],
    dormitorios: '',
    area: '',
    valor_min: '',
    valor_max: '',
    caracteristicas: [] as string[]
  });
  const [filteredProperties, setFilteredProperties] = useState<PropertyDisplay[]>([]);
  const [allProperties, setAllProperties] = useState<PropertyDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [propertyImages, setPropertyImages] = useState<Record<string, any>>({});
  const [imagesLoading, setImagesLoading] = useState(false);
  const searchParams = useSearchParams();
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Função para converter dados do Supabase para formato de exibição
  const formatPropertyForDisplay = (property: Property): PropertyDisplay => {
    // Extrair informações das características
      const bedrooms = formatArrayToString(property.quartos, 'dormitório');
      const parking = formatArrayToString(property.vagas, 'vaga');
      const bathrooms = formatArrayToString(property.banheiros, 'banheiro');
      const hasLoadedImage = loadedImages[property.id];
      const propertyImageUrl = getCardImageUrl(propertyImages[property.id]);
      const imageToUse = hasLoadedImage && propertyImageUrl ? propertyImageUrl : "/assets/temporario tela.png";
    // Determinar bairro do endereço ou texto_localizacao
    let neighborhood = property.bairro;
    return {
      id: property.id,
      title: property.titulo,
      neighborhood: neighborhood,
      status: property.status_empreendimento,
      description:property.titulo_descricao,
      price: property.valor > 0 ? `R$ ${property.valor.toLocaleString('pt-BR')}` : 'Consulte',
      area: property.area_texto,
      bedrooms: bedrooms,
      parking: parking,
      image: imageToUse,
      link: `/empreendimentos/${property.slug}`,
      cidade: property.cidade,
      status_empreendimento: property.status_empreendimento,
      valor: property.valor,
      caracteristicas: property.caracteristicas,
      tipo: property.tipo_imovel,
      areas_disponiveis: property.areas_disponiveis || []
    };
  };

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
  
  // Função para buscar propriedades do Supabase
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Iniciando busca de propriedades...');

      const { data, error: supabaseError } = await supabase
        .from('fx_properties')
        .select('*')
        .order('ordem', { ascending: true });

      if (supabaseError) {
        console.error('Erro do Supabase:', supabaseError);
        throw supabaseError;
      }

      console.log(`${data?.length || 0} propriedades encontradas`);

      if (data && data.length > 0) {
        // Buscar imagens das propriedades usando o serviço existente
        setImagesLoading(true);
        const propertyIds = data.map(property => property.id);
        
        console.log('Buscando imagens para propriedades:', propertyIds);
        
        const imagesResult = await getMultiplePropertyImages(propertyIds);
        
        if (imagesResult.success && imagesResult.data) {
          setPropertyImages(imagesResult.data);
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

        // Formatar propriedades para exibição
        const formattedProperties = data.map(formatPropertyForDisplay);
        setAllProperties(formattedProperties);
        setFilteredProperties(formattedProperties);

        console.log('Propriedades formatadas e prontas para exibição');
      } else {
        setAllProperties([]);
        setFilteredProperties([]);
      }
    } catch (err) {
      console.error('Erro ao buscar propriedades:', err);
      setError('Erro ao carregar propriedades. Verifique sua conexão e tente novamente.');
      setAllProperties([]);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
      setImagesLoading(false);
    }
  };

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

  // Carregar filtros dos parâmetros de URL
  useEffect(() => {
    if (searchParams) {
      const urlFilters = {
        bairro: searchParams.get('bairro') || '',
        estagio: searchParams.get('estagio') || '',
        tipo: searchParams.get('tipo')?.split(',').filter(Boolean) || [], 
        dormitorios: searchParams.get('dormitorios') || '',
        area: searchParams.get('area') || '',
        valor_min: searchParams.get('valor_min') || '',
        valor_max: searchParams.get('valor_max') || '',
        caracteristicas: searchParams.get('caracteristicas')?.split(',').filter(Boolean) || []
      };
      setFilters(urlFilters);
    }
  }, [searchParams]);

  // Carregar propriedades ao montar o componente
  useEffect(() => {
    fetchProperties();
  }, []);

  // Reprocessar propriedades quando as imagens mudarem
  useEffect(() => {
    if (Object.keys(propertyImages).length > 0 && allProperties.length > 0) {
      console.log('Reprocessando propriedades com novas imagens...');
      
      const updatedProperties = allProperties.map(property => ({
        ...property,
        image: getCardImageUrl(propertyImages[property.id])
      }));
      
      setAllProperties(updatedProperties);
      setFilteredProperties(prev => 
        prev.map(property => ({
          ...property,
          image: getCardImageUrl(propertyImages[property.id])
        }))
      );
    }
  }, [propertyImages]);

  // Função para filtrar propriedades
  const filterProperties = () => {
    let filtered = allProperties;

    if (filters.bairro) {
      filtered = filtered.filter(property => 
        property.neighborhood.toLowerCase().includes(filters.bairro.toLowerCase()) ||
        property.cidade.toLowerCase().includes(filters.bairro.toLowerCase())
      );
    }

    if (filters.estagio) {
      filtered = filtered.filter(property => 
        property.status_empreendimento === filters.estagio
      );
    }

    if (filters.dormitorios) {
      filtered = filtered.filter(property => 
        property.bedrooms.toLowerCase().includes(filters.dormitorios.toLowerCase())
      );
    }

    if (filters.area) {
      filtered = filtered.filter(property => {
        const areas = property.areas_disponiveis;
        if (!areas || areas.length === 0) return false;
        
        const areaFilter = filters.area;
        
        // Verificar se alguma área está dentro da faixa selecionada
        switch (areaFilter) {
          case '50': // Até 50m²
            return areas.some(area => area <= 50);
          case '100': // 50m² - 100m²
            return areas.some(area => area > 50 && area <= 100);
          case '150': // 100m² - 150m²
            return areas.some(area => area > 100 && area <= 150);
          case '200': // Acima de 150m²
            return areas.some(area => area > 150);
          default:
            return true;
        }
      });
    }

    if (filters.valor_min) {
      filtered = filtered.filter(property => 
        property.valor >= Number(filters.valor_min)
      );
    }

    if (filters.valor_max) {
      filtered = filtered.filter(property => 
        property.valor <= Number(filters.valor_max)
      );
    }

    if (filters.caracteristicas.length > 0) {
      filtered = filtered.filter(property => 
        filters.caracteristicas.some(filterCarac => 
          property.caracteristicas.some(propCarac => 
            propCarac.toLowerCase().includes(filterCarac.toLowerCase())
          )
        )
      );
    }

    if (filters.tipo.length > 0) {
      filtered = filtered.filter(property => 
        filters.tipo.some(filterTipo => 
          property.tipo.some(propTipo => 
            propTipo.toLowerCase().includes(filterTipo.toLowerCase())
          )
        )
      );
    }

    setFilteredProperties(filtered);
  };


  // Função para toggle de características
  const toggleCaracteristica = (caracteristica: string) => {
    setFilters(prev => ({
      ...prev,
      caracteristicas: prev.caracteristicas.includes(caracteristica)
        ? prev.caracteristicas.filter(c => c !== caracteristica)
        : [...prev.caracteristicas, caracteristica]
    }));
  };

  // Aplicar filtros quando mudarem
  useEffect(() => {
    filterProperties();
  }, [filters, allProperties]);

  // Função para atualizar filtros
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // NOVA FUNÇÃO: Função para lidar com a mudança do filtro de tipo (multi-select)
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);

  const toggleTipoOption = (tipo: string) => {
    setFilters(prev => {
      const alreadySelected = prev.tipo.includes(tipo);
      const updated = alreadySelected
        ? prev.tipo.filter(t => t !== tipo)
        : [...prev.tipo, tipo];
      return { ...prev, tipo: updated };
    });
  };
    

  // Função para limpar filtros
  const clearFilters = () => {
    setFilters({
      bairro: '',
      estagio: '',
      tipo: [],
      dormitorios: '',
      area: '',
      valor_min: '',
      valor_max: '',
      caracteristicas: []
    });
    window.history.replaceState({}, '', '/empreendimentos');
  };

  // Fechar menu ao clicar em um link (apenas no mobile)
  const handleLinkClick = () => {
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  // Obter opções únicas para os filtros
  const getUniqueBairros = () => {
    const bairros = new Set<string>();
    allProperties.forEach(prop => {
      bairros.add(prop.neighborhood);
      // bairros.add(prop.cidade);
    });
    return Array.from(bairros).filter(Boolean).sort();
  };

  const getUniqueEstagios = () => {
    return [...new Set(allProperties.map(prop => prop.status_empreendimento))].filter(Boolean).sort();
  };

  // ATUALIZADO: Obter tipos únicos do campo 'tipo' (que vem de tipo_imovel)
  const getUniqueTipos = () => {
    const tipos = new Set<string>();
    allProperties.forEach(prop => {
      if (Array.isArray(prop.tipo)) {
        prop.tipo.forEach(t => {
          if (t) { // Garante que a string do tipo não é vazia
            tipos.add(t);
          }
        });
      }
    });
    return Array.from(tipos).sort();
  };

  const getUniqueDormitorios = () => {
    const dormitorios = new Set<string>();
    allProperties.forEach(prop => {
      if (prop.bedrooms !== 'Consulte') {
        dormitorios.add(prop.bedrooms);
      }
    });
    return Array.from(dormitorios).sort();
  };

  const getCaracteristicasDisponiveis = () => {
    const caracteristicas = [
      'Academia', 'Elevador', 'Quadra esportiva', 'Churrasqueira', 
      'Piscina', 'Salão de Festas', 'Coworking', 'Piscina coberta', 'Sauna'
    ];
    return caracteristicas;
  };

  // MODIFICADO: Nova função para lidar com carregamento bem-sucedido de imagem
  const handleImageLoad = (propertyId: string) => {
    console.log(`Imagem carregada com sucesso para propriedade ${propertyId}`);
    setLoadedImages(prev => ({
      ...prev,
      [propertyId]: true
    }));
  };

  // MODIFICADO: Função para lidar com erro de carregamento de imagem
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, propertyId: string) => {
    console.log(`Erro ao carregar imagem para propriedade ${propertyId}`);
    e.currentTarget.src = "/assets/temporario tela.png";
    // Marcar como não carregada para manter a imagem temporária
    setLoadedImages(prev => ({
      ...prev,
      [propertyId]: false
    }));
  };
  
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
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
      <main className="flex-1 bg-gray-50">
        {/* Filters Section */}
        <section className="filters-section">
          <div className="container mx-auto px-4">
            {/* Filtros principais - sempre visíveis */}
            <div className="filters-container-main">
              <div className="filter-item">
                <Image 
                  src="/assets/svg/ico_local.svg" 
                  alt="Ícone Bairro" 
                  width={20} 
                  height={20} 
                  className="filter-icon" 
                />
                <select 
                  className="filter-select"
                  value={filters.bairro}
                  onChange={(e) => handleFilterChange('bairro', e.target.value)}
                >
                  <option value="">Bairro</option>
                  {getUniqueBairros().map(bairro => (
                    <option key={bairro} value={bairro}>{bairro}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <Image 
                  src="/assets/svg/ico_estagio.svg" 
                  alt="Ícone Estágio" 
                  width={20} 
                  height={20} 
                  className="filter-icon" 
                />
                <select 
                  className="filter-select"
                  value={filters.estagio}
                  onChange={(e) => handleFilterChange('estagio', e.target.value)}
                >
                  <option value="">Estágio da Obra</option>
                  {getUniqueEstagios().map(estagio => (
                    <option key={estagio} value={estagio}>{estagio}</option>
                  ))}
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
                    {filters.tipo.length > 0 ? filters.tipo.join(', ') : 'Tipo do Imóvel'}
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
                            checked={filters.tipo.includes(tipo)}
                            onChange={() => toggleTipoOption(tipo)}
                          />
                          {tipo}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>




              <div className="filter-item">
                <Image 
                  src="/assets/svg/ico_quartos.svg" 
                  alt="Ícone Dormitórios" 
                  width={20} 
                  height={20} 
                  className="filter-icon" 
                />
                <select 
                  className="filter-select"
                  value={filters.dormitorios}
                  onChange={(e) => handleFilterChange('dormitorios', e.target.value)}
                >
                  <option value="">Dormitórios</option>
                  {getUniqueDormitorios().map(dorm => (
                    <option key={dorm} value={dorm}>{dorm}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botão de filtros avançados */}
            <div className="filters-toggle-container">
              <div className="properties-header">
                <h2 className="properties-title">
                  {filteredProperties.length} Imóve{filteredProperties.length !== 1 ? 'is' : 'l'}
                </h2>
              </div>
              <button 
                className="filters-toggle-btn"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <span>Mais filtros</span>
              </button>
            </div>

            {/* Filtros avançados - expansíveis */}
            {filtersOpen && (
              <div className="filters-advanced">
                <div className="filters-advanced-grid">
                  <div className="filter-group">
                    <label className="filter-label">Banheiros</label>
                    <select 
                      className="filter-select-advanced"
                      value=""
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4+">4+</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Áreas</label>
                    <select 
                      className="filter-select-advanced"
                      value={filters.area}
                      onChange={(e) => handleFilterChange('area', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="50">Até 50m²</option>
                      <option value="100">50m² - 100m²</option>
                      <option value="150">100m² - 150m²</option>
                      <option value="200">Acima de 150m²</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Dormitórios</label>
                    <select 
                      className="filter-select-advanced"
                      value={filters.dormitorios}
                      onChange={(e) => handleFilterChange('dormitorios', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      {getUniqueDormitorios().map(dorm => (
                        <option key={dorm} value={dorm}>{dorm}</option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Vagas</label>
                    <select 
                      className="filter-select-advanced"
                      value=""
                      onChange={(e) => handleFilterChange('tipo', e.target.value)}
                    >
                      <option value="">Selecione</option>
                      <option value="1 vaga">1 vaga</option>
                      <option value="2 vagas">2 vagas</option>
                      <option value="3 vagas">3+ vagas</option>
                    </select>
                  </div>
                </div>

                {/* Características */}
                <div className="caracteristicas-section">
                  <h3 className="caracteristicas-title">Características</h3>
                  <div className="caracteristicas-grid">
                    {getCaracteristicasDisponiveis().map(caracteristica => (
                      <label key={caracteristica} className="caracteristica-item">
                        <input
                          type="checkbox"
                          checked={filters.caracteristicas.includes(caracteristica)}
                          onChange={() => toggleCaracteristica(caracteristica)}
                          className="caracteristica-checkbox"
                        />
                        <span className="caracteristica-label">{caracteristica}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="filters-actions">
                  <button 
                    className="btn-clear-filters"
                    onClick={clearFilters}
                  >
                    Limpar Filtros
                  </button>
                  <button 
                    className="btn-apply-filters"
                    onClick={() => setFiltersOpen(false)}
                  >
                    Aplicar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Properties Grid */}
        <section className="properties-section">
          <div className="container mx-auto px-4">
            {loading && (
              <div className="loading-container">
                <div className="loading-screen">
                  <img src="/assets/fort-xavier_logo.png" alt="Logo Fort Xavier" className="logo-loader" />
                </div>
                {/* <p>Carregando empreendimentos...</p>
                {imagesLoading && <p className="text-sm text-gray-600">Carregando imagens...</p>} */}
              </div>
            )}

            {error && (
              <div className="error-container">
                <p className="error-message">{error}</p>
                <button 
                  className="retry-btn"
                  onClick={fetchProperties}
                >
                  Tentar Novamente
                </button>
              </div>
            )}

            {!loading && !error && (
              <>
                <div className="properties-grid">
                  {filteredProperties.map((property) => (
                    <div key={property.id} className="property-card">
                      <div className="property-image-container">
                        <img 
                          src={property.image} 
                          alt={property.title} 
                          className="property-image"
                          onError={(e) => handleImageError(e, property.id)}
                          onLoad={() => {
                            // Só marcar como carregada se não for a imagem temporária
                            if (property.image !== "/assets/temporario tela.png") {
                              handleImageLoad(property.id);
                            }
                          }}
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
                          <p className="property-description">{property.description}</p>

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
                    </div>
                  ))}
                </div>



                {filteredProperties.length === 0 && (
                  <div className="no-results">
                    <h3>Nenhum empreendimento encontrado</h3>
                    <p>Tente ajustar os filtros para encontrar mais opções.</p>
                    <button 
                      className="btn-clear-filters"
                      onClick={clearFilters}
                    >
                      Limpar Filtros
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
          
        {/* Contact CTA Section */}
        <section className="contatct-section">
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <div style={{ flex: 1, maxWidth: '600px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007DC3', marginBottom: '1rem', textAlign:'center' }}>
                  Fale com um consultor
                </h2>
                <p style={{ fontSize: '1rem', color: '#666', lineHeight: '1.6', textAlign:'center' }}>
                  Preencha seus dados abaixo e fale com um especialista da nossa equipe
                </p>
                
                <input 
                    type="text" 
                    placeholder="Coloque seu nome"
                    style={{ 
                      flex: 1, 
                      padding: '0.8rem', 
                      border: '1px solid #ddd', 
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      width: '100%',
                      margin: '0 0 20px'
                    }}
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
      </main>

      

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
