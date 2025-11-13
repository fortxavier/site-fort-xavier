'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import './ImageCarousel.css';

interface ImageCarouselProps {
  images: {
    [category: string]: string[];
  };
  propertyTitle: string;
  isLoading?: boolean; // Nova prop para indicar carregamento
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  propertyTitle, 
  isLoading = false 
}) => {
  // Memoizar categorias disponíveis para evitar recriação desnecessária
  const availableCategories = useMemo(() => {
    return Object.keys(images || {}).filter(key => images[key] && images[key].length > 0);
  }, [images]);

  // Estado para controlar se o componente foi inicializado
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomImageIndex, setZoomImageIndex] = useState(0);

  // Memoizar categorias formatadas
  const categories = useMemo(() => {
    return availableCategories.map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()
    }));
  }, [availableCategories]);

  // Memoizar imagens atuais
  const currentImages = useMemo(() => {
    return images[activeCategory] || [];
  }, [images, activeCategory]);

  // Inicializar categoria ativa apenas uma vez quando as imagens estiverem disponíveis
  useEffect(() => {
    if (!isLoading && availableCategories.length > 0 && !isInitialized) {
      setActiveCategory(availableCategories[0]);
      setCurrentImageIndex(0);
      setIsInitialized(true);
    }
  }, [availableCategories, isLoading, isInitialized]);

  // Resetar quando a categoria ativa não existe mais nas categorias disponíveis
  useEffect(() => {
    if (isInitialized && availableCategories.length > 0 && !availableCategories.includes(activeCategory)) {
      setActiveCategory(availableCategories[0]);
      setCurrentImageIndex(0);
    }
  }, [availableCategories, activeCategory, isInitialized]);

  // Resetar índice da imagem quando mudar de categoria
  useEffect(() => {
    if (isInitialized) {
      setCurrentImageIndex(0);
    }
  }, [activeCategory, isInitialized]);

  // Função para mudar categoria com useCallback para evitar recriações
  const changeCategory = useCallback((category: string) => {
    setActiveCategory(category);
    setCurrentImageIndex(0);
  }, []);

  // Navegação do carrossel com useCallback
  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => 
      prev === currentImages.length - 1 ? 0 : prev + 1
    );
  }, [currentImages.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? currentImages.length - 1 : prev - 1
    );
  }, [currentImages.length]);

  // Função para abrir zoom
  const openZoom = useCallback((index: number) => {
    setZoomImageIndex(index);
    setIsZoomOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // Função para fechar zoom
  const closeZoom = useCallback(() => {
    setIsZoomOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  // Navegação no zoom
  const nextZoomImage = useCallback(() => {
    setZoomImageIndex((prev) => 
      prev === currentImages.length - 1 ? 0 : prev + 1
    );
  }, [currentImages.length]);

  const prevZoomImage = useCallback(() => {
    setZoomImageIndex((prev) => 
      prev === 0 ? currentImages.length - 1 : prev - 1
    );
  }, [currentImages.length]);

  // Keyboard navigation - apenas quando necessário
  useEffect(() => {
    if (!isZoomOpen) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeZoom();
      } else if (e.key === 'ArrowLeft') {
        prevZoomImage();
      } else if (e.key === 'ArrowRight') {
        nextZoomImage();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isZoomOpen, closeZoom, prevZoomImage, nextZoomImage]);

  // Auto-play apenas quando componente estiver inicializado e não em zoom
  useEffect(() => {
    if (!isInitialized || isZoomOpen || currentImages.length <= 1 || isLoading) {
      return;
    }

    const interval = setInterval(() => {
      nextImage();
    }, 5000);

    return () => clearInterval(interval);
  }, [isInitialized, isZoomOpen, currentImages.length, isLoading, nextImage]);

  // Loading state
  if (isLoading) {
    return (
      <div className="image-carousel-container">
        <div className="carousel-header">
          <h2 className="gallery-title">Mais fotos do local</h2>
        </div>
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <p>Carregando imagens...</p>
        </div>
      </div>
    );
  }

  // Se não há categorias disponíveis após o carregamento
  if (!isLoading && availableCategories.length === 0) {
    return (
      <div className="image-carousel-container">
        <div className="carousel-header">
          <h2 className="gallery-title">Mais fotos do local</h2>
        </div>
        <div className="no-images">
          <p>Nenhuma imagem disponível</p>
        </div>
      </div>
    );
  }

  // Se ainda não foi inicializado, não renderizar o carrossel completo
  if (!isInitialized) {
    return (
      <div className="image-carousel-container">
        <div className="carousel-header">
          <h2 className="gallery-title">Mais fotos do local</h2>
        </div>
        <div className="carousel-initializing">
          <p>Preparando galeria...</p>
        </div>
      </div>
    );
  }

  // Se não há imagens na categoria atual
  if (currentImages.length === 0) {
    return (
      <div className="image-carousel-container">
        <div className="carousel-header">
          <h2 className="gallery-title">Mais fotos do local</h2>
          <div className="carousel-categories">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`category-btn ${activeCategory === category.key ? 'active' : ''}`}
                onClick={() => changeCategory(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
        <div className="no-images">
          <p>Nenhuma imagem disponível para esta categoria</p>
        </div>
      </div>
    );
  }

  // Carrossel completo
  return (
    <>
      <div className="image-carousel-container">
        {/* Category Buttons */}
        <div className="carousel-header">
          <h2 className="gallery-title">Mais fotos do local</h2>
          <div className="carousel-categories">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`category-btn ${activeCategory === category.key ? 'active' : ''}`}
                onClick={() => changeCategory(category.key)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Carousel */}
        <div className="carousel-main">
          <div className="carousel-container">
            {/* Previous Button */}
            <button 
              className="carousel-nav-btn prev"
              onClick={prevImage}
              aria-label="Imagem anterior"
              disabled={currentImages.length <= 1}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            {/* Image Container */}
            <div className="carousel-image-wrapper">
              <div 
                className="carousel-image-container"
                onClick={() => openZoom(currentImageIndex)}
              >
                <img
                  src={currentImages[currentImageIndex]}
                  alt={`${propertyTitle} - ${activeCategory} ${currentImageIndex + 1}`}
                  className="carousel-image"
                  loading="lazy"
                  onError={(e) => {
                    console.error('Erro ao carregar imagem:', currentImages[currentImageIndex]);
                    // Opcional: definir uma imagem de fallback
                    // e.currentTarget.src = '/path/to/fallback-image.jpg';
                  }}
                />
                <div className="zoom-overlay">
                  <div className="zoom-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                      <line x1="11" y1="8" x2="11" y2="14"/>
                      <line x1="8" y1="11" x2="14" y2="11"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button 
              className="carousel-nav-btn next"
              onClick={nextImage}
              aria-label="Próxima imagem"
              disabled={currentImages.length <= 1}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {/* Indicators */}
          <div className="carousel-indicators">
            {currentImages.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                onClick={() => setCurrentImageIndex(index)}
                aria-label={`Ir para imagem ${index + 1}`}
              />
            ))}
          </div>

          {/* Image Counter */}
          <div className="image-counter">
            {currentImageIndex + 1} / {currentImages.length}
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomOpen && (
        <div className="zoom-modal" onClick={closeZoom}>
          <div className="zoom-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button 
              className="zoom-close-btn"
              onClick={closeZoom}
              aria-label="Fechar zoom"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {/* Navigation in Zoom */}
            <button 
              className="zoom-nav-btn prev"
              onClick={prevZoomImage}
              aria-label="Imagem anterior"
              disabled={currentImages.length <= 1}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            <button 
              className="zoom-nav-btn next"
              onClick={nextZoomImage}
              aria-label="Próxima imagem"
              disabled={currentImages.length <= 1}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>

            {/* Zoomed Image */}
            <div className="zoom-image-container">
              <img
                src={currentImages[zoomImageIndex]}
                alt={`${propertyTitle} - ${activeCategory} ${zoomImageIndex + 1}`}
                className="zoom-image"
                onError={(e) => {
                  console.error('Erro ao carregar imagem no zoom:', currentImages[zoomImageIndex]);
                }}
              />
            </div>

            {/* Zoom Info */}
            <div className="zoom-info">
              <p className="zoom-title">{propertyTitle}</p>
              <p className="zoom-category">{categories.find(c => c.key === activeCategory)?.label}</p>
              <p className="zoom-counter">{zoomImageIndex + 1} / {currentImages.length}</p>
            </div>

            {/* Zoom Indicators */}
            <div className="zoom-indicators">
              {currentImages.map((_, index) => (
                <button
                  key={index}
                  className={`zoom-indicator ${index === zoomImageIndex ? 'active' : ''}`}
                  onClick={() => setZoomImageIndex(index)}
                  aria-label={`Ir para imagem ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageCarousel;

