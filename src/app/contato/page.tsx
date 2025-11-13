"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './contato.css';
import { useAuth } from '../../lib/AuthContext';
import { useLeadService } from '@/lib/leadService';

export default function ContatoPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estado para o formulário de contato - REPLICADO DA PÁGINA SOBRE
  const [contactForm, setContactForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    assunto: '',
    mensagem: ''
  });
  const { enviar, success, limparMensagens } = useLeadService();
  
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

  // Fechar menu ao clicar em um link (apenas no mobile)
  const handleLinkClick = () => {
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  // Função para lidar com mudanças no formulário de contato - REPLICADO DA PÁGINA SOBRE
  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para enviar o formulário de contato - REPLICADO DA PÁGINA SOBRE
  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const result = await enviar({
      nome: contactForm.nome,
      email: contactForm.email,
      telefone: contactForm.telefone,
      assunto: 'Contato: '+contactForm.assunto,
      mensagem: contactForm.mensagem,
      imovel_id: '',
      pagina_origem: `/contato`
    });
  
    if (result.success) {
      setContactForm({ nome: '', email: '', telefone: '', assunto: '', mensagem: '' });
    }
  };
  
  const { isAuthenticated } = useAuth();

  return (
    <div>
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
      <header className="hero-bg">
        <div className="container">
          <h1 className="hero-title">
            Ficou com alguma dúvida?<br />
            Estamos aqui para te ajudar
          </h1>
        </div>
      </header>

      <main>
        {/* Contato Section */}
        <section className="section-white">
          <div className="container">
            <div className="contato-header">
              <h2 className="contato-title">TIRE SUAS DÚVIDAS COM A GENTE</h2>
              <h3 className="section-title">Fale conosco</h3>
              <p className="contato-text">
                Se você chegou até aqui com uma dúvida, uma ideia ou pronto pra dar o 
                primeiro passo em direção ao seu novo lar, saiba que estamos prontos pra 
                te ouvir. Na Fort Xavier, cada conversa importa, porque entendemos que cada 
                pessoa tem uma história diferente – e todas merecem atenção.
              </p>
              <p className="contato-text">
                Nosso time está preparado pra atender com clareza, respeito e aquele toque 
                humano que faz toda a diferença. Seja pra entender mais sobre um imóvel, 
                iniciar um financiamento ou apenas conversar sobre possibilidades, pode 
                contar com a gente.
              </p>
              <p className="contato-text">
                Escolha o canal que preferir – WhatsApp, telefone, e-mail ou formulário – e 
                fale com quem realmente se importa com o que você precisa. Vai ser um 
                prazer te ajudar nessa jornada.
              </p>
            </div>

            {/* FORMULÁRIO REPLICADO DA PÁGINA SOBRE */}
            <div className="contato-form-section">
              <div className="contato-form-container-novo">
                <div className="contato-form-content" style={{ display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center' }}>
                  <div className="contato-form-left" style={{ flex: 1, maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007DC3', marginBottom: '1rem', textAlign:'center' }}>
                      Fale com um consultor
                    </h2>
                    <p style={{ fontSize: '1rem', color: '#666', lineHeight: '1.6', textAlign:'center' }}>
                      Preencha seus dados abaixo e fale com um especialista da nossa equipe
                    </p>
                    <form className="contato-form-novo" onSubmit={handleContactFormSubmit}>
                      <input
                        type="text"
                        name="nome"
                        placeholder="Coloque seu nome"
                        value={contactForm.nome}
                        onChange={handleContactFormChange}
                        style={{
                          flex: 1,
                          padding: '0.8rem',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          width: '100%',
                          margin: '0 0 20px'
                        }}
                        required
                      />
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <input
                          type="email"
                          name="email"
                          placeholder="Coloque seu e-mail"
                          value={contactForm.email}
                          onChange={handleContactFormChange}
                          style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                          }}
                          required
                        />
                        <input
                          type="tel"
                          name="telefone"
                          placeholder="Coloque seu telefone"
                          value={contactForm.telefone}
                          onChange={handleContactFormChange}
                          style={{
                            flex: 1,
                            padding: '0.8rem',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '0.9rem'
                          }}
                          required
                        />
                      </div>

                      {/* Campos adicionais para a página de contato */}
                      <input
                        type="text"
                        name="assunto"
                        placeholder="Assunto"
                        value={contactForm.assunto}
                        onChange={handleContactFormChange}
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

                      <textarea
                        name="mensagem"
                        placeholder="Sua mensagem"
                        value={contactForm.mensagem}
                        onChange={handleContactFormChange}
                        rows={4}
                        style={{
                          flex: 1,
                          padding: '0.8rem',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          width: '100%',
                          margin: '0 0 20px',
                          resize: 'vertical'
                        }}
                      />

                      <button type="submit" className="contato-form-submit"
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
                    </form>

                  </div>
                  
                  {/* Imagem ao lado - apenas no desktop */}
                  {/* {!isMobile && (
                    <div style={{ flex: 1, minWidth: '300px', textAlign: 'center' }}>
                      <img
                        src="/assets/img_fale-corretor.png"
                        alt="Consultor"
                        style={{ maxWidth: '485px', height: 'auto' }}
                      />
                    </div>
                  )} */}
                </div>
              </div>
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

