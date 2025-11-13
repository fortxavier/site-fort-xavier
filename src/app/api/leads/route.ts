// src/app/api/leads/route.ts - VERSÃO COM DEBUG DETALHADO
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extrair apenas campos preenchidos (não vazios)
    const leadData: any = {
      id: crypto.randomUUID(),
      status: 'Novo',
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString()
    };

    // Adicionar campos apenas se estiverem preenchidos
    if (body.nome?.trim()) leadData.nome = body.nome.trim();
    if (body.email?.trim()) leadData.email = body.email.trim();
    if (body.telefone?.trim()) leadData.telefone = body.telefone.trim();
    if (body.mensagem?.trim()) leadData.mensagem = body.mensagem.trim();
    if (body.assunto?.trim()) leadData.assunto = body.assunto.trim();
    if (body.pagina_origem?.trim()) leadData.pagina_origem = body.pagina_origem.trim();
    if (body.imovel_id?.trim()) leadData.imovel_id = body.imovel_id.trim();

    // Validação mínima: pelo menos nome OU telefone OU email
    if (!leadData.nome && !leadData.telefone && !leadData.email) {
      return NextResponse.json(
        { error: 'É necessário preencher pelo menos nome, telefone ou email' },
        { status: 400 }
      );
    }

    console.log('🔍 DEBUG - Dados do lead a serem salvos:', leadData);

    // Inserir no banco
    const { data, error } = await supabase
      .from('fx_leads')
      .insert([leadData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao inserir lead:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor ao salvar no DB' },
        { status: 500 }
      );
    }

    console.log('✅ Lead salvo com sucesso no banco:', data.id);

    // ---- INÍCIO DA NOVA LÓGICA DE E-MAIL COM DEBUG ----
    console.log('🚀 INICIANDO PROCESSO DE ENVIO DE E-MAIL...');
    
    try {
      // Debug das variáveis de ambiente
      console.log('🔍 DEBUG - Verificando variáveis de ambiente:');
      console.log('- VERCEL_URL:', process.env.VERCEL_URL || 'NÃO DEFINIDA');
      console.log('- NODE_ENV:', process.env.NODE_ENV || 'NÃO DEFINIDA');
      
      // A URL absoluta é necessária para chamadas server-to-server.
      const absoluteUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';

      console.log('🌐 URL que será usada para chamada:', absoluteUrl);

      // Preparar dados do e-mail
      const emailPayload = {
        nomeLead: data.nome || 'Não informado',
        emailLead: data.email || 'Não informado',
        telefoneLead: data.telefone,
        mensagem: data.mensagem,
        assunto: data.assunto,
        paginaOrigem: data.pagina_origem,
        imovelId: data.imovel_id,
      };

      console.log('📧 Dados que serão enviados para API de e-mail:', emailPayload);
      console.log('🔗 URL completa da chamada:', `${absoluteUrl}/api/send-email`);
      
      console.log('📤 Fazendo chamada para API de e-mail...');
      
      const emailResponse = await fetch(`${absoluteUrl}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      console.log('📥 Resposta recebida da API de e-mail:');
      console.log('- Status:', emailResponse.status);
      console.log('- Status Text:', emailResponse.statusText);
      console.log('- Headers:', Object.fromEntries(emailResponse.headers.entries()));

      if (emailResponse.ok) {
        const emailResult = await emailResponse.json();
        console.log('✅ SUCESSO! E-mail enviado:', emailResult);
        console.log('📧 Message ID:', emailResult.messageId);
      } else {
        const emailError = await emailResponse.json();
        console.error('⚠️ FALHA na API de e-mail:');
        console.error('- Status:', emailResponse.status);
        console.error('- Erro:', emailError);
      }
      
    } catch (emailError) {
      console.error('❌ ERRO CRÍTICO ao tentar enviar e-mail:');
      console.error('- Tipo do erro:', emailError instanceof Error ? emailError.constructor.name : typeof emailError);
      console.error('- Mensagem:', emailError instanceof Error ? emailError.message : emailError);
      console.error('- Stack:', emailError instanceof Error ? emailError.stack : 'N/A');
      
      // Verificar se é erro de rede
      if (emailError instanceof Error) {
        if (emailError.message.includes('ECONNREFUSED')) {
          console.error('🔥 ERRO DE CONEXÃO: Servidor não está respondendo na URL configurada');
        } else if (emailError.message.includes('fetch')) {
          console.error('🔥 ERRO DE FETCH: Problema na chamada HTTP interna');
        }
      }
    }
    
    console.log('🏁 PROCESSO DE E-MAIL FINALIZADO');
    // ---- FIM DA NOVA LÓGICA DE E-MAIL ----

    return NextResponse.json(
      { 
        success: true, 
        message: 'Lead cadastrado com sucesso!',
        lead: data 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('💥 ERRO GERAL na API de leads:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// ... resto do código GET e PUT permanece igual

