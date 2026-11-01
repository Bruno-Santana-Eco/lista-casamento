/* =====================================================================
   API da lista de presentes (Google Apps Script, publicado como app da Web)
   Cole este arquivo em Extensões > Apps Script, dentro da planilha.
   Passo a passo: apps-script/LEIAME.md
   ===================================================================== */

const CFG = {
  VALOR_MIN: 100,              // R$ 1,00 (em centavos)
  VALOR_MAX: 2000000,          // R$ 20.000,00
  MAX_ITENS: 20,
  MAX_NOME: 80,
  MAX_RECADO: 500,
  CACHE_SEG: 30,
  LIMITE_TOTAL_POR_MINUTO: 40,
  LIMITE_CLIENTE_POR_MINUTO: 6,
  RECHECAR_APOS_MIN: 5,        // o gatilho só reconfere pendentes com mais de 5 minutos
  PRESENCA_MAX_PESSOAS: 50,    // só um teto técnico contra erro de digitação (ex.: 200 em vez de 2)
  INFINITEPAY: 'https://api.checkout.infinitepay.io',
  ABAS: { presentes: 'Presentes', contribuicoes: 'Contribuicoes', presencas: 'Presencas', recados: 'Recados' }
};

const CABECALHOS = {
  Presentes: ['id', 'tipo', 'nome', 'descricao', 'valor_centavos', 'meta_centavos', 'cota_centavos', 'imagem', 'ordem', 'ativo',
    'quantidade', 'arrecadado_confirmado', 'arrecadado_pendente', 'participantes', 'unidades_dadas', 'comprado'],
  Contribuicoes: ['criado_em', 'contribuicao_id', 'itens_json', 'nome', 'mostrar_nome', 'valor_centavos', 'metodo', 'status', 'order_nsu',
    'transaction_nsu', 'invoice_slug', 'capture_method', 'paid_amount_centavos', 'recado', 'atualizado_em'],
  Presencas: ['criado_em', 'nome', 'comparece', 'adultos', 'criancas', 'telefone', 'mensagem', 'resposta_id', 'versao', 'situacao'],
  Recados: ['criado_em', 'nome', 'mensagem', 'aprovado']
};

const STATUS_CONFIRMADOS = ['confirmado', 'aprovado'];

/* =====================================================================
   Regras puras (sem acesso à planilha nem à internet): testadas em tests/apps-script.test.mjs
   ===================================================================== */

const verdadeiro = v => v === true || ['TRUE', 'SIM', '1', 'VERDADEIRO'].indexOf(String(v).trim().toUpperCase()) >= 0;
const numero = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const statusDe = c => String(c.status || '').trim().toLowerCase();

/* Texto simples: tira caracteres de controle e limita o tamanho. Usado ao ler da planilha. */
function textoSimples(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* Texto vindo do usuário, para gravar: além de limpar, impede que a planilha o interprete
   como fórmula (=, +, -, @ no começo). */
function limparTexto(v, max) {
  const s = textoSimples(v, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/* Pendente só conta na barra ("aguardando") se houver sinal de pagamento. Quem abriu o checkout
   da InfinitePay e desistiu fica pendente sem transaction_nsu e não aparece. */
function contaComoPendente(c) {
  if (statusDe(c) !== 'pendente') return false;
  return String(c.metodo || '').trim() !== 'infinitepay' || String(c.transaction_nsu || '').trim() !== '';
}

/* Soma o que cada contribuição deu a cada item. Devolve só dados agregados. */
function agregarPresentes(itens, contribuicoes) {
  const por = {};
  itens.forEach(it => { por[it.id] = { conf: 0, pend: 0, quem: {}, nomes: [] }; });

  contribuicoes.forEach(c => {
    const confirmada = STATUS_CONFIRMADOS.indexOf(statusDe(c)) >= 0;
    if (!confirmada && !contaComoPendente(c)) return;
    let linhas;
    try { linhas = JSON.parse(c.itens_json); } catch (e) { return; }
    if (!Array.isArray(linhas)) return;
    const chave = String(c.contribuicao_id || '') || Math.random().toString(36);
    linhas.forEach(l => {
      const a = por[l && l.id];
      const valor = numero(l && l.valor_centavos);
      if (!a || valor <= 0) return;
      if (confirmada) a.conf += valor; else a.pend += valor;
      a.quem[chave] = true;
      const nome = textoSimples(c.nome, 40);
      if (confirmada && verdadeiro(c.mostrar_nome) && nome && a.nomes.indexOf(nome) < 0) a.nomes.push(nome);
    });
  });

  return itens.map(it => {
    const a = por[it.id];
    const quantidade = Math.max(1, Math.floor(numero(it.quantidade)) || 1);
    const ehVaquinha = it.tipo === 'vaquinha';
    const dadas = ehVaquinha ? 0 : Math.min(quantidade, it.valor_centavos > 0 ? Math.floor(a.conf / it.valor_centavos) : 0);
    return {
      id: it.id, tipo: it.tipo, nome: it.nome, descricao: it.descricao,
      valor_centavos: numero(it.valor_centavos), meta_centavos: numero(it.meta_centavos), cota_centavos: numero(it.cota_centavos),
      imagem: it.imagem, quantidade: quantidade,
      arrecadado_confirmado: a.conf, arrecadado_pendente: a.pend,
      participantes: Object.keys(a.quem).length,
      nomes: a.nomes.slice(-3),
      unidades_dadas: dadas,
      comprado: ehVaquinha ? (it.meta_centavos > 0 && a.conf >= it.meta_centavos) : dadas >= quantidade
    };
  });
}

/* Valida os itens pedidos. Devolve {ok:true, itens, total} ou {ok:false, erro}. */
function validarContribuicao(d, catalogo) {
  const pedidos = Array.isArray(d && d.itens) ? d.itens : [];
  if (!pedidos.length || pedidos.length > CFG.MAX_ITENS) return { ok: false, erro: 'itens_invalidos' };
  const vistos = {};
  const itens = [];
  let total = 0;
  for (let i = 0; i < pedidos.length; i++) {
    const id = String(pedidos[i] && pedidos[i].id || '');
    const valor = pedidos[i] && pedidos[i].valor_centavos;
    if (!catalogo[id] || vistos[id]) return { ok: false, erro: 'item_invalido' };
    if (typeof valor !== 'number' || !isFinite(valor) || Math.floor(valor) !== valor || valor < CFG.VALOR_MIN || valor > CFG.VALOR_MAX) {
      return { ok: false, erro: 'valor_invalido' };
    }
    /* Presente tem preço fechado: só unidades inteiras, até a quantidade da lista. Vaquinha aceita qualquer valor. */
    const item = catalogo[id];
    if (item.tipo !== 'vaquinha') {
      const preco = numero(item.valor_centavos);
      const maxUnidades = Math.max(1, Math.floor(numero(item.quantidade)) || 1);
      if (preco <= 0 || valor % preco !== 0 || valor / preco > maxUnidades) return { ok: false, erro: 'valor_invalido' };
    }
    vistos[id] = true;
    total += valor;
    itens.push({ id: id, valor_centavos: valor });
  }
  if (total > CFG.VALOR_MAX) return { ok: false, erro: 'valor_invalido' };
  return { ok: true, itens: itens, total: total };
}

/* Corpo do POST /links da InfinitePay. A descrição vem da planilha, nunca do visitante. */
function montarCheckout(p) {
  return {
    handle: p.handle,
    order_nsu: p.orderNsu,
    redirect_url: p.redirectUrl,
    webhook_url: p.webhookUrl,
    items: p.itens.map(l => {
      const it = p.catalogo[l.id];
      const sufixo = it.tipo === 'vaquinha' ? ' (vaquinha)' : '';
      return { quantity: 1, price: l.valor_centavos, description: textoSimples(it.nome, 80) + sufixo };
    })
  };
}

/* Só aprova se a InfinitePay disser que foi pago E o valor for exatamente o esperado.
   (amount é o valor dos presentes; paid_amount pode ter juros do parcelamento.) */
function pagamentoConfirmado(resp, esperadoCentavos) {
  return !!resp && resp.success === true && resp.paid === true && Number(resp.amount) === esperadoCentavos && esperadoCentavos > 0;
}

/* Celular só com dígitos e sem o 55 do Brasil: 10 ou 11 dígitos (DDD + número). '' se inválido. */
function normalizarCelular(v) {
  let d = String(v == null ? '' : v).replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) d = d.slice(2);
  return (d.length === 10 || d.length === 11) ? d : '';
}

const inteiroEntre = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

/* Confirmação de presença. Devolve os campos limpos ou {ok:false, erro}. */
function validarPresenca(d) {
  const nome = textoSimples(d && d.nome, CFG.MAX_NOME);
  if (nome.split(' ').filter(Boolean).length < 2) return { ok: false, erro: 'nome_invalido' };
  const telefone = normalizarCelular(d.telefone);
  if (!telefone) return { ok: false, erro: 'telefone_invalido' };
  const comparece = d.comparece === 'sim' || d.comparece === 'nao' ? d.comparece : '';
  if (!comparece) return { ok: false, erro: 'comparece_invalido' };
  let adultos = 0;
  let criancas = 0;
  if (comparece === 'sim') {
    adultos = inteiroEntre(d.adultos, 1, CFG.PRESENCA_MAX_PESSOAS);
    criancas = inteiroEntre(d.criancas, 0, CFG.PRESENCA_MAX_PESSOAS);
    if (adultos === null || criancas === null || adultos + criancas > CFG.PRESENCA_MAX_PESSOAS) return { ok: false, erro: 'pessoas_invalido' };
  }
  return { ok: true, nome: nome, telefone: telefone, comparece: comparece, adultos: adultos, criancas: criancas, mensagem: textoSimples(d.mensagem, CFG.MAX_RECADO) };
}

/* Cada envio vira uma linha nova. As respostas anteriores do mesmo celular deixam de ser a "atual". */
function planejarPresenca(linhas, telefone) {
  const anteriores = [];
  linhas.forEach((l, i) => { if (normalizarCelular(l.telefone) === telefone) anteriores.push(i); });
  return {
    versao: anteriores.length + 1,
    substituir: anteriores.filter(i => String(linhas[i].situacao).trim().toLowerCase() === 'atual')
  };
}

/* Prazo no formato AAAA-MM-DD: vale até o fim do dia, no horário de Brasília. Sem prazo, nunca encerra. */
function prazoEncerrado(prazo, agora) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(prazo || ''))) return false;
  return agora.getTime() > new Date(prazo + 'T23:59:59-03:00').getTime();
}

/* Identificador curto da resposta, fácil de ler na planilha (sem 0/O, 1/I) */
function novoIdResposta() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'P-';
  for (let i = 0; i < 5; i++) s += letras.charAt(Math.floor(Math.random() * letras.length));
  return s;
}

/* Recebe a coluna A inteira ([[cabeçalho], [valor], ...]) e devolve o número da primeira linha livre depois do último registro. */
function proximaLinhaLivre(colunaA) {
  for (let i = colunaA.length - 1; i >= 1; i--) {
    if (String(colunaA[i][0]).trim() !== '') return i + 2;
  }
  return 2;
}

function validarRecado(d) {
  const nome = textoSimples(d && d.nome, CFG.MAX_NOME);
  const mensagem = textoSimples(d && d.mensagem, CFG.MAX_RECADO);
  if (nome.length < 2) return { ok: false, erro: 'nome_invalido' };
  if (mensagem.length < 2) return { ok: false, erro: 'mensagem_invalida' };
  return { ok: true, nome: nome, mensagem: mensagem };
}

/* =====================================================================
   Entradas da API
   ===================================================================== */

function doGet(e) {
  const acao = (e && e.parameter && e.parameter.acao) || '';
  try {
    if (acao === 'presentes') return json(presentesPublicos());
    if (acao === 'recados') return json({ ok: true, recados: recadosAprovados() });
    return json({ ok: false, erro: 'acao_invalida' });
  } catch (err) {
    console.error(err);
    return json({ ok: false, erro: 'erro_interno' });
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === 'webhook_infinitepay') return json(receberWebhook(e, p.t));

  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, erro: 'json_invalido' }); }
  if (!d || typeof d !== 'object') return json({ ok: false, erro: 'json_invalido' });

  if (d.site) return json({ ok: true });                       // isca (honeypot): robô preencheu, finge que deu certo
  if (excedeuLimite(d.cliente)) return json({ ok: false, erro: 'muitas_tentativas' });

  switch (d.acao) {
    case 'criar_pagamento': return json(comTrava(() => criarPagamento(d)));
    case 'retorno_infinitepay': return json(comTrava(() => verificarPagamento(d.order_nsu, d.transaction_nsu, d.slug)));
    case 'presenca': return json(comTrava(() => gravarPresenca(d)));
    case 'recado': return json(comTrava(() => gravarRecado(d)));
    default: return json({ ok: false, erro: 'acao_invalida' });
  }
}

/* =====================================================================
   Leitura
   ===================================================================== */

function presentesPublicos() {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('presentes');
  if (guardado) return JSON.parse(guardado);
  const itens = lerTabela(CFG.ABAS.presentes).linhas
    .filter(l => l.id && verdadeiro(l.ativo))
    .sort((a, b) => numero(a.ordem) - numero(b.ordem));
  const contribuicoes = lerTabela(CFG.ABAS.contribuicoes).linhas;
  const resposta = { ok: true, atualizado_em: new Date().toISOString(), itens: agregarPresentes(itens, contribuicoes) };
  cache.put('presentes', JSON.stringify(resposta), CFG.CACHE_SEG);
  return resposta;
}

/* Só os recados aprovados, com nome e mensagem (nada de telefone ou valores), mais recentes primeiro */
function recadosAprovados() {
  const cache = CacheService.getScriptCache();
  const guardado = cache.get('recados');
  if (guardado) return JSON.parse(guardado);
  const lista = lerTabela(CFG.ABAS.recados).linhas
    .filter(l => verdadeiro(l.aprovado) && l.mensagem)
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    .slice(0, 100)
    .map(l => ({ nome: textoSimples(l.nome, CFG.MAX_NOME), mensagem: textoSimples(l.mensagem, CFG.MAX_RECADO) }));
  cache.put('recados', JSON.stringify(lista), CFG.CACHE_SEG);
  return lista;
}

/* =====================================================================
   Presença e recados (sempre dentro do LockService)
   ===================================================================== */

function gravarPresenca(d) {
  if (prazoEncerrado(PropertiesService.getScriptProperties().getProperty('PRESENCA_PRAZO'), new Date())) return { ok: false, erro: 'prazo_encerrado' };
  const v = validarPresenca(d);
  if (!v.ok) return v;
  const t = lerTabela(CFG.ABAS.presencas);
  const plano = planejarPresenca(t.linhas, v.telefone);
  plano.substituir.forEach(i => escreverCampos(t, i + 2, { situacao: 'substituida' }));
  const usados = {};
  t.linhas.forEach(l => { usados[String(l.resposta_id)] = true; });
  let id;
  do { id = novoIdResposta(); } while (usados[id]);
  adicionarLinha(CFG.ABAS.presencas, {
    criado_em: new Date(), nome: limparTexto(v.nome, CFG.MAX_NOME), comparece: v.comparece,
    adultos: v.adultos, criancas: v.criancas, telefone: v.telefone, mensagem: limparTexto(v.mensagem, CFG.MAX_RECADO),
    resposta_id: id, versao: plano.versao, situacao: 'atual'
  });
  avisarPorEmail(
    (v.comparece === 'sim' ? 'Presença confirmada: ' : 'Não poderá ir: ') + v.nome + (plano.versao > 1 ? ' (' + plano.versao + 'ª resposta)' : ''),
    'Resposta ' + id + '\nComparece: ' + v.comparece + '\nAdultos: ' + v.adultos + '\nCrianças: ' + v.criancas + (v.mensagem ? '\nMensagem: ' + v.mensagem : '')
  );
  return { ok: true };
}

function gravarRecado(d) {
  const v = validarRecado(d);
  if (!v.ok) return v;
  adicionarLinha(CFG.ABAS.recados, {
    criado_em: new Date(), nome: limparTexto(v.nome, CFG.MAX_NOME), mensagem: limparTexto(v.mensagem, CFG.MAX_RECADO), aprovado: false
  });
  avisarPorEmail('Novo recado de ' + v.nome + ' (aguardando aprovação)', v.mensagem);
  return { ok: true };
}

/* =====================================================================
   Pagamento pela InfinitePay
   ===================================================================== */

/* Grava a contribuição como pendente, cria o link de checkout e devolve a URL para o site. */
function criarPagamento(d) {
  const props = PropertiesService.getScriptProperties();
  const handle = props.getProperty('INFINITEPAY_HANDLE');
  const siteUrl = props.getProperty('SITE_URL');
  if (!handle || !/^https:\/\//.test(siteUrl || '')) return { ok: false, erro: 'pagamento_nao_configurado' };

  const catalogo = {};
  lerTabela(CFG.ABAS.presentes).linhas.forEach(l => { if (l.id && verdadeiro(l.ativo)) catalogo[String(l.id)] = l; });
  const v = validarContribuicao(d, catalogo);
  if (!v.ok) return v;

  const id = Utilities.getUuid();
  const agora = new Date();
  const nome = limparTexto(d.nome, CFG.MAX_NOME);
  adicionarLinha(CFG.ABAS.contribuicoes, {
    criado_em: agora, contribuicao_id: id, itens_json: JSON.stringify(v.itens),
    nome: nome, mostrar_nome: !!d.mostrar_nome && !!nome, valor_centavos: v.total,
    metodo: 'infinitepay', status: 'pendente', order_nsu: id,
    recado: limparTexto(d.recado, CFG.MAX_RECADO), atualizado_em: agora
  });

  const corpo = montarCheckout({ handle: handle, orderNsu: id, itens: v.itens, catalogo: catalogo, redirectUrl: siteUrl, webhookUrl: urlWebhook() });
  const r = UrlFetchApp.fetch(CFG.INFINITEPAY + '/links', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(corpo), muteHttpExceptions: true
  });
  let j = {};
  try { j = JSON.parse(r.getContentText()); } catch (err) { /* resposta inválida, tratada abaixo */ }
  if (r.getResponseCode() !== 200 || !/^https:\/\/checkout\.infinitepay\.io\//.test(String(j.url || ''))) {
    console.error('InfinitePay /links', r.getResponseCode(), r.getContentText().slice(0, 500));
    const t = lerTabela(CFG.ABAS.contribuicoes);
    const i = t.linhas.findIndex(l => String(l.contribuicao_id) === id);
    if (i >= 0) escreverCampos(t, i + 2, { status: 'cancelado', atualizado_em: new Date() });
    return { ok: false, erro: 'checkout_indisponivel' };
  }
  return { ok: true, url: j.url, contribuicao_id: id };
}

/* Aviso da InfinitePay. Nunca confia no corpo: só usa os identificadores para perguntar ao payment_check. */
function receberWebhook(e, token) {
  const esperado = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
  if (!esperado || token !== esperado) return { ok: false, erro: 'nao_autorizado' };
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return { ok: false, erro: 'json_invalido' }; }
  return comTrava(() => verificarPagamento(d.order_nsu, d.transaction_nsu, d.invoice_slug || d.slug));
}

/* Confere na InfinitePay e marca como aprovado. Idempotente: repetir não duplica nada. */
function verificarPagamento(orderNsu, transactionNsu, slug) {
  orderNsu = String(orderNsu || '');
  transactionNsu = textoSimples(transactionNsu, 100);
  slug = textoSimples(slug, 100);
  if (!/^[0-9a-f-]{36}$/.test(orderNsu) || !transactionNsu || !slug) return { ok: false, erro: 'dados_invalidos' };

  const t = lerTabela(CFG.ABAS.contribuicoes);
  const i = t.linhas.findIndex(l => String(l.order_nsu) === orderNsu && String(l.metodo).trim() === 'infinitepay');
  if (i < 0) return { ok: false, erro: 'nao_encontrada' };
  const l = t.linhas[i];
  if (STATUS_CONFIRMADOS.indexOf(statusDe(l)) >= 0) return { ok: true, status: 'aprovado' };

  const resp = consultarPagamento(orderNsu, transactionNsu, slug);
  const esperado = numero(l.valor_centavos);
  const valores = { atualizado_em: new Date() };
  if (!l.transaction_nsu) { valores.transaction_nsu = transactionNsu; valores.invoice_slug = slug; }

  const aprovado = pagamentoConfirmado(resp, esperado);
  if (aprovado) {
    valores.status = 'aprovado';
    valores.transaction_nsu = transactionNsu;
    valores.invoice_slug = slug;
    valores.capture_method = textoSimples(resp.capture_method, 20);
    valores.paid_amount_centavos = numero(resp.paid_amount);
  } else if (resp && resp.paid === true) {
    console.error('Valor divergente', orderNsu, resp.amount, esperado);
    avisarPorEmail('Pagamento com valor diferente do esperado', 'Pedido ' + orderNsu + ': esperado ' + esperado + ' centavos, pago ' + resp.amount + '. Confira na InfinitePay.');
  }
  escreverCampos(t, i + 2, valores);
  CacheService.getScriptCache().remove('presentes');
  if (aprovado) avisarPorEmail('Pagamento aprovado', 'Valor: R$ ' + (esperado / 100).toFixed(2).replace('.', ',') + (l.nome ? '\nDe: ' + l.nome : '') + (l.recado ? '\nRecado: ' + l.recado : ''));
  return { ok: true, status: aprovado ? 'aprovado' : 'pendente' };
}

function consultarPagamento(orderNsu, transactionNsu, slug) {
  const handle = PropertiesService.getScriptProperties().getProperty('INFINITEPAY_HANDLE');
  const r = UrlFetchApp.fetch(CFG.INFINITEPAY + '/payment_check', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ handle: handle, order_nsu: orderNsu, transaction_nsu: transactionNsu, slug: slug })
  });
  try { return JSON.parse(r.getContentText()); } catch (err) { return null; }
}

/* URL que a InfinitePay chama ao aprovar. Leva um token secreto para descartar chamadas de terceiros. */
function urlWebhook() {
  const props = PropertiesService.getScriptProperties();
  let token = props.getProperty('WEBHOOK_TOKEN');
  if (!token) { token = Utilities.getUuid().replace(/-/g, ''); props.setProperty('WEBHOOK_TOKEN', token); }
  const base = props.getProperty('API_URL') || ScriptApp.getService().getUrl();
  return base + '?acao=webhook_infinitepay&t=' + token;
}

/* Gatilho de tempo (a cada 10 min): reconfere pendentes que já têm transaction_nsu. Cobre o caso do webhook falhar. */
function verificarPendentes() {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(30000)) return;
  try {
    const agora = Date.now();
    lerTabela(CFG.ABAS.contribuicoes).linhas.forEach(l => {
      if (statusDe(l) !== 'pendente' || String(l.metodo).trim() !== 'infinitepay') return;
      if (!l.transaction_nsu || !l.invoice_slug) return;
      if (agora - new Date(l.criado_em).getTime() < CFG.RECHECAR_APOS_MIN * 60000) return;
      verificarPagamento(l.order_nsu, l.transaction_nsu, l.invoice_slug);
    });
  } finally {
    trava.releaseLock();
  }
}

/* =====================================================================
   Utilidades
   ===================================================================== */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function comTrava(fn) {
  const trava = LockService.getScriptLock();
  if (!trava.tryLock(15000)) return { ok: false, erro: 'ocupado' };
  try {
    return fn();
  } catch (err) {
    console.error(err);
    return { ok: false, erro: 'erro_interno' };
  } finally {
    trava.releaseLock();
  }
}

function lerTabela(nome) {
  const aba = SpreadsheetApp.getActive().getSheetByName(nome);
  if (!aba) throw new Error('Aba ausente: ' + nome);
  const v = aba.getDataRange().getValues();
  const cab = (v[0] || []).map(String);
  const linhas = v.slice(1).map(r => { const o = {}; cab.forEach((c, i) => { o[c] = r[i]; }); return o; });
  return { aba: aba, cab: cab, linhas: linhas };
}

/* Grava na primeira linha livre pela coluna A (criado_em). Caixas de seleção ou formatação
   em linhas vazias não contam, então a linha nova entra logo abaixo do último registro. */
function adicionarLinha(nomeAba, valores) {
  const aba = SpreadsheetApp.getActive().getSheetByName(nomeAba);
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(String);
  const linha = proximaLinhaLivre(aba.getRange(1, 1, aba.getMaxRows(), 1).getValues());
  if (linha > aba.getMaxRows()) aba.insertRowsAfter(aba.getMaxRows(), 1);
  aba.getRange(linha, 1, 1, cab.length).setValues([cab.map(c => (c in valores ? valores[c] : ''))]);
}

function escreverCampos(tabela, linha, valores) {
  Object.keys(valores).forEach(c => {
    const col = tabela.cab.indexOf(c) + 1;
    if (col > 0) tabela.aba.getRange(linha, col).setValue(valores[c]);
  });
}

/* Limite simples de envios por minuto: um contador geral e um por visitante (o visitante se identifica sozinho) */
function excedeuLimite(cliente) {
  const cache = CacheService.getScriptCache();
  const minuto = Math.floor(Date.now() / 60000);
  const chaves = [['rl_total_' + minuto, CFG.LIMITE_TOTAL_POR_MINUTO]];
  const c = String(cliente || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (c) chaves.push(['rl_' + c + '_' + minuto, CFG.LIMITE_CLIENTE_POR_MINUTO]);
  for (let i = 0; i < chaves.length; i++) {
    const n = Number(cache.get(chaves[i][0]) || 0) + 1;
    if (n > chaves[i][1]) return true;
    cache.put(chaves[i][0], String(n), 90);
  }
  return false;
}

/* Aviso opcional: só envia se a propriedade EMAIL_AVISO existir (Configurações do projeto > Propriedades do script) */
function avisarPorEmail(assunto, corpo) {
  const para = PropertiesService.getScriptProperties().getProperty('EMAIL_AVISO');
  if (!para) return;
  try { MailApp.sendEmail(para, '[Lista de presentes] ' + assunto, corpo); } catch (err) { console.error(err); }
}

/* =====================================================================
   Funções para rodar à mão no editor do Apps Script
   ===================================================================== */

/* 1) Rode para autorizar planilha, e-mail, chamadas à InfinitePay e gatilhos.
   Rode de novo sempre que o Google pedir permissões novas. */
function autorizar() {
  SpreadsheetApp.getActive().getName();
  CacheService.getScriptCache().get('x');
  LockService.getScriptLock();
  MailApp.getRemainingDailyQuota();
  ScriptApp.getProjectTriggers();
  console.log('Autorizado.');
}

/* 2) Confere se as abas, os cabeçalhos e as propriedades estão corretos. */
function conferirPlanilha() {
  const problemas = [];
  Object.keys(CABECALHOS).forEach(nome => {
    const aba = SpreadsheetApp.getActive().getSheetByName(nome);
    if (!aba) { problemas.push('Falta a aba "' + nome + '"'); return; }
    const cab = aba.getRange(1, 1, 1, Math.max(aba.getLastColumn(), 1)).getValues()[0].map(String);
    CABECALHOS[nome].forEach((c, i) => { if (cab[i] !== c) problemas.push('Aba ' + nome + ', coluna ' + (i + 1) + ': esperado "' + c + '", encontrado "' + (cab[i] || '') + '"'); });
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('INFINITEPAY_HANDLE')) problemas.push('Falta a propriedade INFINITEPAY_HANDLE (sua InfiniteTag, sem o $)');
  if (!/^https:\/\//.test(props.getProperty('SITE_URL') || '')) problemas.push('Falta a propriedade SITE_URL (endereço https do site)');
  console.log(problemas.length ? 'PROBLEMAS:\n' + problemas.join('\n') : 'Planilha OK: abas, cabeçalhos e propriedades corretos.');
}

/* 3) Liga o gatilho que reconfere pagamentos pendentes a cada 10 minutos (rode uma vez). */
function instalarGatilho() {
  ScriptApp.getProjectTriggers()
    .filter(g => g.getHandlerFunction() === 'verificarPendentes')
    .forEach(g => ScriptApp.deleteTrigger(g));
  ScriptApp.newTrigger('verificarPendentes').timeBased().everyMinutes(10).create();
  console.log('Gatilho instalado: verificarPendentes a cada 10 minutos.');
}

/* 4) Mostra o que a API pública devolveria agora. */
function verPresentes() {
  console.log(JSON.stringify(presentesPublicos(), null, 2));
}

/* 5) Resumo da presença: soma só as respostas atuais (a última de cada celular). */
function resumoPresencas() {
  const atuais = lerTabela(CFG.ABAS.presencas).linhas.filter(l => String(l.situacao).trim().toLowerCase() === 'atual');
  const vem = atuais.filter(l => l.comparece === 'sim');
  const adultos = vem.reduce((s, l) => s + numero(l.adultos), 0);
  const criancas = vem.reduce((s, l) => s + numero(l.criancas), 0);
  console.log('Respostas atuais: ' + atuais.length + '\nVão: ' + vem.length + ' respostas, ' + adultos + ' adultos e ' + criancas + ' crianças (total ' + (adultos + criancas) + ')\nNão vão: ' + (atuais.length - vem.length));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    agregarPresentes, validarContribuicao, montarCheckout, pagamentoConfirmado, contaComoPendente, limparTexto, textoSimples, verdadeiro,
    normalizarCelular, validarPresenca, planejarPresenca, prazoEncerrado, novoIdResposta, validarRecado, proximaLinhaLivre, CFG
  };
}
