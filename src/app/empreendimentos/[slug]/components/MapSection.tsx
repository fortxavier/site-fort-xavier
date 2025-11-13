'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import './MapSection.css';

interface MapSectionProps {
  address: string;
  city: string;
  state: string;
  locationDescription?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

const MapSection: React.FC<MapSectionProps> = ({ 
  address, 
  city, 
  state, 
  locationDescription,
  coordinates 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Simular carregamento do mapa
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Função para abrir no Google Maps
  const openInGoogleMaps = () => {
    const query = encodeURIComponent(address || `${city}, ${state}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  // Função para obter direções
  const getDirections = () => {
    const query = encodeURIComponent(address || `${city}, ${state}`);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    window.open(url, '_blank');
  };

  return (
    <div className="map-section-container">
      <div className="map-header">
        <h2 className="map-title">
          Localizado no bairro {city}
        </h2>
        <p className="map-subtitle">
          Oportunidade Única em uma das Melhores Regiões!
        </p>
      </div>

      <div className="map-content">
        <div className="map-info">
          <div className="address-info">
            <div className="address-icon">
              <Image 
                src="/assets/icones/ico_local.png" 
                alt="Localização" 
                width={24} 
                height={24} 
              />
            </div>
            <div className="address-text">
              <h3 className="address-title">Endereço</h3>
              <p className="address-details">{address}</p>
            </div>
          </div>

          {locationDescription && (
            <div className="location-description">
              <h4 className="description-title">Sobre a Localização</h4>
              <p className="description-text">{locationDescription}</p>
            </div>
          )}

          <div className="map-actions">
            <button 
              className="map-action-btn primary"
              onClick={openInGoogleMaps}
            >
              <Image 
                src="/assets/icones/ico_mapa.png" 
                alt="Ver no Mapa" 
                width={20} 
                height={20} 
              />
              Ver no Google Maps
            </button>
            <button 
              className="map-action-btn secondary"
              onClick={getDirections}
            >
              <Image 
                src="/assets/icones/ico_direcoes.png" 
                alt="Direções" 
                width={20} 
                height={20} 
              />
              Como Chegar
            </button>
          </div>
        </div>

        <div className="map-container">
          {!mapLoaded ? (
            <div className="map-loading">
              <div className="loading-spinner"></div>
              <p>Carregando mapa...</p>
            </div>
          ) : mapError ? (
            <div className="map-error">
              <div className="error-icon">
                <Image 
                  src="/assets/icones/ico_erro.png" 
                  alt="Erro" 
                  width={48} 
                  height={48} 
                />
              </div>
              <p>Erro ao carregar o mapa</p>
              <button onClick={() => setMapError(false)}>Tentar novamente</button>
            </div>
          ) : (
            <div className="map-placeholder">
              <div className="map-overlay">
                <div className="map-marker">
                  <Image 
                    src="/assets/icones/ico_marker.png" 
                    alt="Marcador" 
                    width={32} 
                    height={32} 
                  />
                </div>
                <div className="map-info-overlay">
                  <h4>{city}</h4>
                  <p>{state}</p>
                </div>
              </div>
              
              {/* Simulação de mapa com grid */}
              <div className="map-grid">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="grid-line"></div>
                ))}
              </div>
              
              {/* Simulação de ruas */}
              <div className="map-streets">
                <div className="street horizontal street-1"></div>
                <div className="street horizontal street-2"></div>
                <div className="street vertical street-3"></div>
                <div className="street vertical street-4"></div>
              </div>

              {/* Botão para mapa real */}
              <button 
                className="map-real-btn"
                onClick={openInGoogleMaps}
                title="Abrir mapa interativo"
              >
                <Image 
                  src="/assets/icones/ico_expandir.png" 
                  alt="Expandir" 
                  width={24} 
                  height={24} 
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pontos de Interesse */}
      <div className="points-of-interest">
        <h3 className="poi-title">Pontos de Interesse Próximos</h3>
        <div className="poi-grid">
          <div className="poi-item">
            <div className="poi-icon">
              <Image 
                src="/assets/icones/ico_transporte.png" 
                alt="Transporte" 
                width={24} 
                height={24} 
              />
            </div>
            <div className="poi-info">
              <h4>Transporte Público</h4>
              <p>Estações de metrô e pontos de ônibus próximos</p>
            </div>
          </div>

          <div className="poi-item">
            <div className="poi-icon">
              <Image 
                src="/assets/icones/ico_comercio.png" 
                alt="Comércio" 
                width={24} 
                height={24} 
              />
            </div>
            <div className="poi-info">
              <h4>Comércio</h4>
              <p>Shopping centers e centros comerciais</p>
            </div>
          </div>

          <div className="poi-item">
            <div className="poi-icon">
              <Image 
                src="/assets/icones/ico_saude.png" 
                alt="Saúde" 
                width={24} 
                height={24} 
              />
            </div>
            <div className="poi-info">
              <h4>Saúde</h4>
              <p>Hospitais e clínicas na região</p>
            </div>
          </div>

          <div className="poi-item">
            <div className="poi-icon">
              <Image 
                src="/assets/icones/ico_educacao.png" 
                alt="Educação" 
                width={24} 
                height={24} 
              />
            </div>
            <div className="poi-info">
              <h4>Educação</h4>
              <p>Escolas e universidades próximas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapSection;

