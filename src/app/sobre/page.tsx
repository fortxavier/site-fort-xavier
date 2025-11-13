"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './sobre.css';
import { useAuth } from '../../lib/AuthContext';
import { useLeadService } from '@/lib/leadService';

export default function SobrePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Estado para o formulário de contato
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

  // Função para lidar com mudanças no formulário de contato
  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para enviar o formulário de contato
  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const result = await enviar({
      nome: contactForm.nome,
      email: contactForm.email,
      telefone: contactForm.telefone,
      assunto: 'Sobre: '+contactForm.assunto,
      mensagem: contactForm.mensagem,
      imovel_id: '',
      pagina_origem: `/sobre`
    });
  
    if (result.success) {
      setContactForm({ nome: '', email: '', telefone: '', assunto: '', mensagem: '' });
    }
  };

  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* Header - Mantido do page.tsx original */}
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
      <section className="about-hero-section">
        <div className="about-hero-overlay">
          <div className="about-container">
            <h1 className="about-hero-title">
              A Fort Xavier nasceu para transformar gerações
            </h1>
          </div>
        </div>
      </section>

      <main>
        {/* About Section */}
        <section className="about-section">
          <div className="about-container">
            <p className="about-text">
              A <strong>Fort&Xavier Construtora</strong> é uma incorporadora e construtora que atua com foco em 
              empreendimentos residenciais de pequeno e médio porte, sempre com o compromisso de oferecer qualidade, 
              conforto e valorização para quem busca o primeiro imóvel ou deseja morar bem. 
              Nossa história começou com obras menores, mas hoje já estamos construindo edifícios maiores, 
              com torres e projetos mais completos, sempre mantendo o cuidado e o padrão que nossos clientes conhecem.
            </p>
            <p className="about-text">
              Nossa atuação é forte na Zona Leste de São Paulo, principalmente nas regiões da Vila Carrão, Vila Formosa, 
              Anália Franco, Tatuapé e arredores. A Fort&Xavier Construtora é uma empresa que cresce junto com o bairro 
              e com as pessoas. 
            </p>
            <p className="about-text">
              Nosso maior feito é a confiança que construímos — com os clientes, com os parceiros e com os bairros onde
              atuamos. A Fort&Xavier Construtora cresceu investindo com capital próprio, acreditando no potencial das 
              regiões em que escolhe construir e desenvolvendo projetos que valorizam o entorno e transformam a paisagem local.
              Com uma atuação próxima, transparente e comprometida, conquistamos nosso espaço de forma orgânica, por indicação e 
              pela credibilidade que entregamos em cada etapa. A confiança que recebemos é reflexo direto da forma como conduzimos 
              nossos negócios: com seriedade, responsabilidade e presença constante no dia a dia da obra e do cliente.
            </p>
          </div>
        </section>

        {/* Quality Section */}
        <section className="about-quality-section">
          <div className="about-container">
            <div className="about-quality-content">
              <div className="about-quality-image">
                <img 
                  src="/assets/empreendimento-sobre.svg" 
                  alt="Prédio moderno da Fort Xavier" 
                  className="about-building-image"
                />
              </div>
              <div className="about-quality-text">
                <p className="about-section-subtitle">NOSSA HISTÓRIA MOSTRA ISSO</p>
                <h2 className="about-section-title">Nascemos para te entregar o melhor</h2>
                <p className="about-section-description">
                  A <strong>Fort&Xavier Construtora</strong> nasceu da união estratégica entre duas frentes complementares: a experiência comercial da Fort Lest Imóveis, focada em vendas e relacionamento com o cliente, e a solidez técnica da Xavier Engenharia, responsável por projetar e executar obras com excelência.
                </p>
                <p className="about-section-description">
                  Dessa parceria surgiu uma incorporadora com visão completa do mercado — do planejamento à entrega —, combinando conhecimento prático, compromisso com a qualidade e proximidade com o público. A Fort&Xavier Construtora foi criada para unir forças, otimizar e entregar empreendimentos residenciais com mais eficiência, segurança e propósito.
                </p>
              </div>
            </div>
          </div>
        </section>

        
      {/* About Section - LAYOUT MODIFICADO */}
      <section className="py-16 bg-white about-section">
        <div className="about-container mx-auto px-4">
          <div className={`about-layout ${isMobile ? 'about-mobile-about' : 'about-desktop-about'}`}>
            {/* Conteúdo textual */}
            <div className="about-content">
              <h2 className="about-titulo-section-about">
                Mais que ser referência, somos realizadores de sonhos
              </h2>

              <p className="about-conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'left' }}>
                A Xavier Engenharia foi criada em 2008 com a missão de entregar produtos imobiliários modernos e de alta qualidade construtiva que atendam às necessidades e aos desejos dos nossos clientes.
              </p>
              <p className="about-conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'left' }}>
                Idealizada para mostrar que é possível pensar diferente, a Xavier Engenharia traz a inovação necessária para realizar seus sonhos, pensando sempre no bem-estar e qualidade de vida de cada cliente. 
                Nossos empreendimentos são realizados visando atender às necessidades individuais de espaço, proporcionando o melhor para você e para sua família.
              </p>
              <p className="about-conteudo-padrao text-gray-600" style={{ width: '100%', textAlign: 'left' }}>
                O seu projeto com a Xavier Engenharia é realidade e os seus sonhos possíveis.
              </p>
            </div>

            {/* Estatísticas */}
            <div className="about-stats">
              <div className="about-stats-grid">
                <div className="about-stat-item">
                  <strong className="about-stat-number">+17 ANOS</strong>
                  <p className="about-stat-description">de experiência no mercado</p>
                </div>
                <div className="about-stat-item">
                  <strong className="about-stat-number">+200</strong>
                  <p className="about-stat-description">profissionais realizando sonhos</p>
                </div>
                <div className="about-stat-item">
                  <strong className="about-stat-number">+2.000</strong>
                  <p className="about-stat-description">imóveis entregues</p>
                </div>
                <div className="about-stat-item">
                  <strong className="about-stat-number">+10 MIL</strong>
                  <p className="about-stat-description">famílias atendidas</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

        {/* Testimonials Section */}
        {/* <section className="about-testimonials-section">
          <div className="about-container">
            <div className="about-testimonials-header">
              <p className="about-section-subtitle">UNIÃO QUE FAZ A FORÇA</p>
              <h2 className="about-section-title">Ninguém cresce tanto e em pouco tempo sozinho</h2>
            </div>
            
            <div className="about-testimonials-grid">
              <div className="about-testimonial-item">
                <div className="about-testimonial-avatar">
                  <img src="/assets/avatar-1.jpg" alt="Roberto Shultz" />
                </div>
                <div className="about-testimonial-content">
                  <h4 className="about-testimonial-name">Roberto Shultz</h4>
                  <p className="about-testimonial-role">Advogado e contador de imóveis</p>
                  <p className="about-testimonial-text">
                    "A credibilidade da Fort Xavier no mercado imobiliário é resultado de anos de trabalho sério e 
                    comprometimento estratégico. Com sua visão de mercado e habilidade em negociação, sempre foi 
                    um diferencial que nos permitiu crescer juntos."
                  </p>
                </div>
              </div>

              <div className="about-testimonial-item">
                <div className="about-testimonial-avatar">
                  <img src="/assets/avatar-2.jpg" alt="Eduardo Santos" />
                </div>
                <div className="about-testimonial-content">
                  <h4 className="about-testimonial-name">Eduardo Santos</h4>
                  <p className="about-testimonial-role">Engenheiro civil, especialista pela estrutura financeira de empresas</p>
                  <p className="about-testimonial-text">
                    "Com visão analítica e foco no resultado financeiro das empresas, com visão 
                    analítica e foco no resultado financeiro das empresas e de crescimento e estrutura de recursos 
                    adequados, sempre foi fundamental para o crescimento da Fort Xavier."
                  </p>
                </div>
              </div>

              <div className="about-testimonial-item">
                <div className="about-testimonial-avatar">
                  <img src="/assets/avatar-3.jpg" alt="Mauricio Xavier" />
                </div>
                <div className="about-testimonial-content">
                  <h4 className="about-testimonial-name">Mauricio Xavier</h4>
                  <p className="about-testimonial-role">É quem articula a base técnica da FortXavier Construtora</p>
                  <p className="about-testimonial-text">
                    "Ele coordena as atividades de construção e é responsável pela qualidade técnica dos 
                    empreendimentos. É ele quem garante que cada projeto seja executado com excelência e dentro 
                    dos padrões bem estabelecidos da empresa."
                  </p>
                </div>
              </div>

              <div className="about-testimonial-item">
                <div className="about-testimonial-avatar">
                  <img src="/assets/avatar-4.jpg" alt="Rogerio Xavier" />
                </div>
                <div className="about-testimonial-content">
                  <h4 className="about-testimonial-name">Rogerio Xavier</h4>
                  <p className="about-testimonial-role">Pai dos sócios, gerente que tem uma visão de negócio excepcional</p>
                  <p className="about-testimonial-text">
                    "Ele tem a capacidade de enxergar oportunidades de outros não veem, além dos desafios do mercado e da 
                    empresa. É quem orienta estrategicamente a empresa e quem a orienta e inspira."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section> */}
        
        {/* Contact CTA Section */}
        <section className="about-contatct-section">
          <div className="about-container">
            <div className="about-div-contato"  style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <div className="about-div-contato" style={{ flex: 1, maxWidth: '600px' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007DC3', marginBottom: '1rem', textAlign:'center' }}>
                  Fale com um consultor
                </h2>
                <p style={{ fontSize: '1rem', color: '#666', lineHeight: '1.6', textAlign:'center' }}>
                  Preencha seus dados abaixo e fale com um especialista da nossa equipe
                </p>
                <form className="about-contato-form" onSubmit={handleContactFormSubmit}>
                  {/* Adicionado o atributo name="nome" */}
                  <input
                    type="text"
                    name="nome" // <-- ADICIONE ESTA LINHA
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
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Adicionado o atributo name="email" */}
                    <input
                      type="text"
                      name="email" // <-- ADICIONE ESTA LINHA
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
                    />
                    {/* Adicionado o atributo name="telefone" */}
                    <input
                      type="tel"
                      name="telefone" // <-- ADICIONE ESTA LINHA
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
                    />
                  </div>

                  <button type="submit" className="about-form-submit"
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

      {/* Footer - Copiado da Home */}
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