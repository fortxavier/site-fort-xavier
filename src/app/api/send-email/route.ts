// src/app/api/send-email/route.ts - VERSÃO CORRIGIDA
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface EmailData {
  nomeLead: string;
  emailLead: string;
  telefoneLead?: string;
  mensagem?: string;
  assunto?: string;
  paginaOrigem?: string;
  imovelId?: string;
}

export async function POST(request: NextRequest) {
  console.log('🚀 API send-email chamada - iniciando processamento...');
  
  try {
    const body: EmailData = await request.json();
    console.log('📥 Dados recebidos:', body);
    
    const { nomeLead, emailLead, telefoneLead, mensagem, assunto, paginaOrigem, imovelId } = body;

    // Validação básica dos dados recebidos
    if (!nomeLead || !emailLead) {
      console.log('❌ Validação falhou: nome ou email faltando');
      return NextResponse.json(
        { message: 'Nome e email são obrigatórios' }, 
        { status: 400 }
      );
    }

    // Verificar se as variáveis de ambiente estão configuradas
    console.log('🔍 Verificando variáveis de ambiente...');
    const requiredEnvVars = ['GMAIL_EMAIL', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    console.log('📋 Status das variáveis:');
    requiredEnvVars.forEach(varName => {
      console.log(`- ${varName}: ${process.env[varName] ? '✅ Configurada' : '❌ Faltando'}`);
    });
    
    if (missingVars.length > 0) {
      console.error('❌ Variáveis de ambiente faltando:', missingVars);
      return NextResponse.json(
        { message: 'Configuração de e-mail incompleta', missingVars },
        { status: 500 }
      );
    }

    console.log('⚙️ Configurando transporter do Nodemailer...');
    
    // Configurar o transporter do Nodemailer com OAuth2
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_EMAIL,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });

    console.log('📧 Preparando conteúdo do e-mail...');

    // Preparar o conteúdo do e-mail
    const emailSubject = '🎉 Novo Lead Recebido - Creative Imob';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-item { margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px; }
          .label { font-weight: bold; color: #1e40af; }
          .footer { margin-top: 20px; padding: 15px; background-color: #e2e8f0; border-radius: 4px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Novo Lead Recebido!</h1>
            <p>Um novo lead acabou de chegar pelo site Fort Xavier</p>
          </div>
          
          <div class="content">
            <div class="info-item">
              <span class="label">👤 Nome:</span> ${nomeLead}
            </div>
            
            <div class="info-item">
              <span class="label">📧 Email:</span> ${emailLead}
            </div>
            
            ${telefoneLead ? `
            <div class="info-item">
              <span class="label">📱 Telefone:</span> ${telefoneLead}
            </div>
            ` : ''}
            
            ${assunto ? `
            <div class="info-item">
              <span class="label">📋 Assunto:</span> ${assunto}
            </div>
            ` : ''}
            
            ${mensagem ? `
            <div class="info-item">
              <span class="label">💬 Mensagem:</span><br>
              <div style="margin-top: 8px; padding: 10px; background-color: #f1f5f9; border-left: 4px solid #2563eb;">
                ${mensagem.replace(/\n/g, '<br>')}
              </div>
            </div>
            ` : ''}
            
            ${paginaOrigem ? `
            <div class="info-item">
              <span class="label">🌐 Página de Origem:</span> ${paginaOrigem}
            </div>
            ` : ''}
            
            ${imovelId ? `
            <div class="info-item">
              <span class="label">🏠 ID do Imóvel:</span> ${imovelId}
            </div>
            ` : ''}
            
            <div class="info-item">
              <span class="label">⏰ Data/Hora:</span> ${new Date().toLocaleString('pt-BR', { 
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Creative Imob - Sistema de Notificação Automática</strong></p>
            <p>Este e-mail foi gerado automaticamente pelo sistema de leads do site.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Configurar as opções do e-mail
    const mailOptions = {
      from: `"Creative Imob - Sistema de Leads" <${process.env.GMAIL_EMAIL}>`,
      to: 'leonardo@creativeimob.com',
      replyTo: 'tecnologia@creativeimob.com',
      subject: emailSubject,
      html: emailHtml,
    };

    console.log('📤 Tentando enviar e-mail para:', mailOptions.to);
    
    // Enviar o e-mail
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ E-mail enviado com sucesso!');
    console.log('📧 Message ID:', info.messageId);

    return NextResponse.json(
      { 
        message: 'E-mail enviado com sucesso',
        messageId: info.messageId 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    
    // Log detalhado do erro para debug
    if (error instanceof Error) {
      console.error('🔍 Erro detalhado:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }

    return NextResponse.json(
      { 
        message: 'Falha ao enviar e-mail',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

