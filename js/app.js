/* ---------- Utilidades ---------- */
const brl = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const fmt = v => brl.format(v);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isVaq = it => it.tipo === 'vaquinha';
/* Presente com várias unidades (ex.: jogo de cama): quantidade e dadas */
const unidadesTotal = it => (!isVaq(it) && it.quantidade > 1) ? it.quantidade : 1;
const unidadesRestantes = it => Math.max(0, unidadesTotal(it) - (it.dadas || 0));
const jaDado = it => isVaq(it) ? it.arrecadado >= it.meta
  : (unidadesTotal(it) > 1 ? unidadesRestantes(it) === 0 : !!it.comprado);
const valorTotalItem = it => isVaq(it) ? it.meta : it.valor;   // usado na ordenação por valor
const valorLink = it => isVaq(it) ? it.cota : it.valor;   // valor de uma cota ou de uma unidade
const modoExemplo = !CONFIG.apiUrl || CONFIG.pix.chave.includes('COLOQUE');

/* ---------- Página ---------- */
const porId = id => document.getElementById(id);
const nomes = `${CONFIG.casal.nome1} & ${CONFIG.casal.nome2}`;
const [aaaaC, mmC, ddC] = CONFIG.datas.casamento.split('-');

document.title = `Lista de presentes de ${nomes}`;
porId('nome1').textContent = CONFIG.casal.nome1;
porId('nome2').textContent = CONFIG.casal.nome2;
porId('marca').textContent = `${CONFIG.casal.nome1[0]} & ${CONFIG.casal.nome2[0]}`;
porId('data-hero').innerHTML = `${ddC}<span aria-hidden="true">|</span>${mmC}<span aria-hidden="true">|</span>${aaaaC}`;
porId('data-hero').setAttribute('aria-label', `${Number(ddC)}/${Number(mmC)}/${aaaaC}`);
/* Caixa de destaque: o convite é para a celebração (12/12), não para o casamento (26/11) */
if (CONFIG.festa){
  porId('festa-titulo').textContent = CONFIG.festa.titulo;
  porId('festa-data').textContent = CONFIG.festa.data;
  porId('festa-horario').textContent = CONFIG.festa.horario || '';
  porId('festa-horario').hidden = !CONFIG.festa.horario;
  // O "⁠" (invisível) impede a linha de quebrar no hífen: “bem-vinda” não vira “bem-” / “vinda” no celular
  porId('festa-traje').textContent = (CONFIG.festa.traje || '').replace(/(\p{L})-(\p{L})/gu, '$1-⁠$2');
  porId('festa-traje-linha').hidden = !CONFIG.festa.traje;
  porId('convite-festa').hidden = false;
}
porId('intro').textContent = CONFIG.intro;
porId('aviso-config').hidden = !modoExemplo;

/* ---------- Casal ---------- */
porId('legenda1').textContent = CONFIG.casal.nome1;
porId('legenda2').textContent = CONFIG.casal.nome2;
porId('casal-texto').textContent = CONFIG.casal.texto;

/* Forma neutra com ilustração no lugar de qualquer foto que faltar */
function fotoAusente(img){
  const neutro = document.createElement('div');
  neutro.className = `${img.className.replace('foto-blob', '').trim()} neutro`;
  neutro.setAttribute('role', 'img');
  neutro.setAttribute('aria-label', img.alt);
  neutro.innerHTML = '<svg class="ilu" viewBox="-46 -46 92 92" aria-hidden="true"><use href="#ilu-flor"/></svg>';
  img.replaceWith(neutro);
}
document.querySelectorAll('img.foto-blob, img.foto-redonda').forEach(img => {
  if (img.complete && img.naturalWidth === 0) fotoAusente(img);
  else img.addEventListener('error', () => fotoAusente(img), { once:true });
});

/* ---------- Recepção (só aparece com endereço) ---------- */
const rec = CONFIG.recepcao;
if (rec && rec.endereco){
  const q = encodeURIComponent(rec.endereco);
  porId('rec-data').textContent = rec.data || '';
  porId('rec-horario').textContent = rec.horario || '';
  porId('rec-local').textContent = rec.local || '';
  porId('rec-endereco').textContent = rec.endereco;
  porId('rec-maps').href = `https://www.google.com/maps/search/?api=1&query=${q}`;
  porId('rec-waze').href = `https://waze.com/ul?q=${q}&navigate=yes`;
  porId('recepcao').hidden = false;
  porId('menu-recepcao').hidden = false;
}

/* ---------- Menu (no celular vira uma faixa de atalhos que rola para o lado) ---------- */
const menuNav = porId('menu');
const linksMenu = [...menuNav.querySelectorAll('a')];
const semAnimacao = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Marca o atalho da seção que está no meio da tela e, na faixa do celular, rola até ele.
// Os atalhos estão na mesma ordem das seções, então vale o último cujo topo já passou do meio.
function marcarSecaoAtual(){
  const ativo = linksMenu.filter(a => {
    const s = document.querySelector(a.hash);
    return s && !s.hidden && s.getBoundingClientRect().top <= innerHeight * .45;
  }).pop();
  if (!ativo || ativo.hasAttribute('aria-current')) return;
  linksMenu.forEach(a => a === ativo ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
  if (menuNav.scrollWidth > menuNav.clientWidth)
    menuNav.scrollTo({ left: ativo.offsetLeft - (menuNav.clientWidth - ativo.offsetWidth) / 2, behavior: semAnimacao ? 'auto' : 'smooth' });
}
addEventListener('scroll', marcarSecaoAtual, { passive:true });
marcarSecaoAtual();

/* ---------- Contagem regressiva ---------- */
const contagemFesta = CONFIG.contagemPara !== 'casamento';
const horaAlvo = contagemFesta && CONFIG.horaFesta ? CONFIG.horaFesta : '00:00';
const alvo = new Date(`${CONFIG.datas[contagemFesta ? 'festa' : 'casamento']}T${horaAlvo}:00-03:00`);
porId('contagem-titulo').textContent = contagemFesta ? 'Faltam para a nossa celebração' : 'Faltam para o nosso casamento';
const dois = n => String(n).padStart(2, '0');
function atualizarContagem(){
  const falta = alvo - Date.now();
  if (falta <= 0){
    porId('contagem-grid').hidden = true;
    porId('contagem-titulo').hidden = true;
    const fim = porId('contagem-fim');
    fim.textContent = CONFIG.mensagemAposContagem;
    fim.hidden = false;
    return false;
  }
  const s = Math.floor(falta / 1000);
  porId('c-dias').textContent = Math.floor(s / 86400);
  porId('c-horas').textContent = dois(Math.floor(s % 86400 / 3600));
  porId('c-min').textContent = dois(Math.floor(s % 3600 / 60));
  porId('c-seg').textContent = dois(s % 60);
  return true;
}
if (atualizarContagem()){
  const t = setInterval(() => { if (!atualizarContagem()) clearInterval(t); }, 1000);
}

/* ---------- Formulários de presença e recados ---------- */
const MENSAGENS_FORM = {
  prazo_encerrado: 'As confirmações foram encerradas. Se precisar, fale com os noivos.',
  muitas_tentativas: 'Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.',
  nome_invalido: 'Escreva seu nome e sobrenome.',
  telefone_invalido: 'Digite o celular com DDD, por exemplo (71) 99999-9999.',
  pessoas_invalido: 'Confira o número de adultos e crianças.'
};

function avisoForm(id, msg, tipo){
  const a = porId(id);
  a.textContent = msg;
  a.className = `aviso-form ${tipo}`;
  a.hidden = false;
}

/* Envia um formulário para a API, com o botão travado enquanto espera */
async function enviarForm(form, idAviso, corpo, sucesso){
  if (!CONFIG.apiUrl) return avisoForm(idAviso, 'O envio ainda não está disponível. Tente mais tarde.', 'erro');
  const botao = form.querySelector('button[type=submit]');
  const rotulo = botao.textContent;
  botao.disabled = true; botao.textContent = 'Enviando…';
  try {
    const j = await enviarApi({ ...corpo, site: form.elements.site.value });
    if (!j.ok) throw new Error(j.erro);
    avisoForm(idAviso, sucesso, 'sucesso');
    return true;
  } catch (e) {
    avisoForm(idAviso, MENSAGENS_FORM[e.message] || 'Não conseguimos enviar agora. Tente de novo em instantes.', 'erro');
    return false;
  } finally {
    botao.disabled = false; botao.textContent = rotulo;
  }
}

/* Mesma regra do Apps Script: só dígitos, sem o 55, com DDD (10 ou 11 dígitos) */
function celularValido(v){
  let d = String(v).replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : '';
}
const pessoasTexto = (a, c) => listaPt.format([
  `${a} ${a === 1 ? 'adulto' : 'adultos'}`,
  ...(c ? [`${c} ${c === 1 ? 'criança' : 'crianças'}`] : [])
]);

/* Confirmação de presença: sem lista prévia; cada envio com o mesmo celular substitui o anterior */
const formPresenca = porId('form-presenca');
const prazoPresenca = CONFIG.presenca.prazo ? new Date(`${CONFIG.presenca.prazo}T23:59:59-03:00`) : null;

if (prazoPresenca && Date.now() > prazoPresenca.getTime()){
  formPresenca.hidden = true;
  porId('presenca-encerrada').hidden = false;
}

// Quem vem detalha quem vai junto; quem não vem só deixa outra informação, se quiser
const atualizarPessoas = () => {
  const vem = formPresenca.elements.comparece.value === 'sim';
  porId('presenca-pessoas').hidden = !vem;
  porId('presenca-detalhe-rotulo').textContent = vem ? 'Quem vai com você? (opcional)' : 'Quer deixar alguma informação? (opcional)';
  porId('presenca-detalhe-dica').hidden = !vem;
  const detalhe = formPresenca.elements.mensagem;
  detalhe.placeholder = vem ? 'Ex.: Maria (esposa), Pedro (filho, 6 anos)' : '';
  if (vem) detalhe.setAttribute('aria-describedby', 'presenca-detalhe-dica'); else detalhe.removeAttribute('aria-describedby');
};
formPresenca.addEventListener('change', e => { if (e.target.name === 'comparece') atualizarPessoas(); });

formPresenca.addEventListener('submit', async e => {
  e.preventDefault();
  const f = formPresenca.elements;
  const nome = f.nome.value.trim().replace(/\s+/g, ' ');
  const vem = f.comparece.value === 'sim';
  const adultos = vem ? Number(f.adultos.value) : 0;
  const criancas = vem ? Number(f.criancas.value || 0) : 0;
  const erro = (msg, campo) => { avisoForm('aviso-presenca', msg, 'erro'); campo.focus(); };
  if (nome.split(' ').length < 2) return erro(MENSAGENS_FORM.nome_invalido, f.nome);
  if (!celularValido(f.telefone.value)) return erro(MENSAGENS_FORM.telefone_invalido, f.telefone);
  if (vem && (!Number.isInteger(adultos) || adultos < 1)) return erro('Informe pelo menos 1 adulto (contando você).', f.adultos);
  if (vem && (!Number.isInteger(criancas) || criancas < 0)) return erro('Confira o número de crianças.', f.criancas);

  await enviarForm(formPresenca, 'aviso-presenca',
    { acao:'presenca', nome, telefone: f.telefone.value, comparece: vem ? 'sim' : 'nao', adultos, criancas, mensagem: f.mensagem.value.trim() },
    vem
      ? `Presença confirmada: ${pessoasTexto(adultos, criancas)}. Obrigado! Se precisar mudar, é só enviar de novo com o mesmo celular.`
      : 'Resposta registrada. Que pena que você não poderá ir! Se mudar de ideia, é só enviar de novo com o mesmo celular.');
});

/* Recados: entram na planilha e só aparecem no mural depois de aprovados */
const formRecado = porId('form-recado');
formRecado.addEventListener('submit', async e => {
  e.preventDefault();
  const f = formRecado.elements;
  const nome = f.nome.value.trim();
  const mensagem = f.mensagem.value.trim();
  if (nome.length < 2){ avisoForm('aviso-recado', 'Escreva seu nome.', 'erro'); return f.nome.focus(); }
  if (mensagem.length < 2){ avisoForm('aviso-recado', 'Escreva sua mensagem.', 'erro'); return f.mensagem.focus(); }
  const ok = await enviarForm(formRecado, 'aviso-recado', { acao:'recado', nome, mensagem },
    'Recado enviado! Assim que os noivos lerem e conferirem, ele aparece aqui no mural.');
  if (ok) f.mensagem.value = '';
});

async function carregarRecados(){
  if (!CONFIG.apiUrl) return;
  try {
    const j = await (await fetch(`${CONFIG.apiUrl}?acao=recados`)).json();
    if (!j.ok || !Array.isArray(j.recados)) return;
    const mural = porId('mural-recados');
    mural.innerHTML = j.recados.map(r => `
      <figure class="recado">
        <blockquote>${esc(r.mensagem)}</blockquote>
        <figcaption>${esc(r.nome)}</figcaption>
      </figure>`).join('');
    mural.hidden = !j.recados.length;
  } catch (e) { /* sem rede ou API fora do ar: o mural fica como está */ }
}

/* ---------- Lista de presentes ---------- */
const mural = porId('mural');
let filtro = 'todos';
let ordem = 'padrao';
let carrinho = [];
let itens = CONFIG.itens;   // reserva; com CONFIG.apiUrl, a planilha passa a ser a fonte

const listaPt = new Intl.ListFormat('pt-BR', { style:'long', type:'conjunction' });
const porcento = (parte, todo) => todo > 0 ? Math.min(100, parte / todo * 100) : 0;
const FLOR_SVG = '<svg class="ilu" viewBox="-46 -46 92 92" aria-hidden="true"><use href="#ilu-flor"/></svg>';

/* Barra da vaquinha: trecho confirmado (sólido) e aguardando confirmação (mais claro).
   Mostra só dados agregados: nada de valores por pessoa. */
function barraHTML(it){
  const conf = porcento(it.arrecadado, it.meta);
  const pend = Math.min(100 - conf, porcento(it.pendente || 0, it.meta));
  const n = it.participantes || 0;
  const nomes = (it.nomes || []).slice(0, 3).map(esc);
  const texto = `${Math.round(conf)}% confirmado` + (pend > 0 ? `, ${Math.round(pend)}% aguardando confirmação` : '');
  // Com todos os nomes na lista, sem “entre elas”: “1 pessoa participou: Ana”, “2 pessoas participaram: Ana e Bia”
  const lista = !nomes.length ? '' : (nomes.length >= n ? `: ${listaPt.format(nomes)}` : `, entre elas ${listaPt.format(nomes)}`);
  const quem = n > 0
    ? `<p class="participantes">${n} ${n === 1 ? 'pessoa participou' : 'pessoas participaram'}${lista}</p>`
    : '';
  return `
    <div class="progresso" role="progressbar" aria-label="Progresso da vaquinha" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(conf)}" aria-valuetext="${texto}">
      <span class="conf" style="width:${conf}%"></span><span class="pend" style="width:${pend}%"></span>
    </div>
    <p class="valores"><strong>${fmt(it.arrecadado)}</strong> de ${fmt(it.meta)}${pend > 0 ? ` <span class="aguardando">(+ ${fmt(it.pendente)} aguardando confirmação)</span>` : ''}</p>
    ${quem}
    <p class="cota">Cotas de ${fmt(it.cota)}, ou o valor que preferir</p>`;
}

function seloHTML(it){
  if (jaDado(it)) return `<span class="selo">${isVaq(it) ? 'Meta alcançada' : (unidadesTotal(it) > 1 ? 'Todas presenteadas' : 'Já presenteado')}</span>`;
  if (unidadesTotal(it) > 1) return `<span class="selo">Restam ${unidadesRestantes(it)} de ${unidadesTotal(it)}</span>`;
  return '';
}

function fotoHTML(it){
  if (!it.imagem) return `<div class="item-img neutro" role="img" aria-label="${esc(it.nome)}">${FLOR_SVG}</div>`;
  return `<img class="item-img" src="${esc(it.imagem)}" width="600" height="600" alt="Foto do presente: ${esc(it.nome)}" loading="lazy">`;
}

/* Presentes de valor fixo: nomes de quem marcou “Mostrar meu nome”, com o pagamento confirmado (vêm da API).
   Se alguém participou sem mostrar o nome: “Presenteado por Ana e mais 1 pessoa”. Sem nomes, não mostra nada. */
function presenteadoPorHTML(it){
  const nomes = (it.nomes || []).slice(0, 3).map(esc);
  if (!nomes.length) return '';
  const outros = Math.max(0, (it.participantes || 0) - nomes.length);
  const lista = outros ? [...nomes, `mais ${outros} ${outros === 1 ? 'pessoa' : 'pessoas'}`] : nomes;
  return `<p class="participantes presenteado">Presenteado por ${listaPt.format(lista)}</p>`;
}

function cardHTML(it){
  const dado = jaDado(it);
  const preco = isVaq(it) ? barraHTML(it)
    : `<p class="preco">${fmt(it.valor)}${unidadesTotal(it) > 1 ? ' <small>cada</small>' : ''}</p>${presenteadoPorHTML(it)}`;
  return `
    <article class="item${dado ? ' dado' : ''}">
      <div class="item-foto">${fotoHTML(it)}${seloHTML(it)}</div>
      <div class="item-corpo">
        <h3>${esc(it.nome)}</h3>
        <p class="desc">${esc(it.descricao)}</p>
        <div class="rodape">
          ${preco}
          <button class="btn" type="button" data-id="${esc(it.id)}">${isVaq(it) ? 'Contribuir' : 'Presentear'}</button>
        </div>
      </div>
    </article>`;
}

const ordenacoes = {
  padrao: null,
  az: (a, b) => a.nome.localeCompare(b.nome, 'pt-BR'),
  menor: (a, b) => valorTotalItem(a) - valorTotalItem(b),
  maior: (a, b) => valorTotalItem(b) - valorTotalItem(a)
};

function renderMural(){
  const lista = itens.filter(it =>
    filtro === 'todos' ||
    (filtro === 'vaquinhas' && isVaq(it)) ||
    (filtro === 'presentes' && !isVaq(it)) ||
    (filtro === 'disponiveis' && !jaDado(it)));
  if (ordenacoes[ordem]) lista.sort(ordenacoes[ordem]);
  mural.innerHTML = lista.length
    ? lista.map(cardHTML).join('')
    : '<p class="vazio">Nenhum presente neste filtro.</p>';
}

document.querySelector('.filtros').addEventListener('click', e => {
  const b = e.target.closest('button[data-filtro]'); if (!b) return;
  filtro = b.dataset.filtro;
  document.querySelectorAll('.filtros button').forEach(x => x.setAttribute('aria-pressed', x === b));
  renderMural();
});

porId('ordem').addEventListener('change', e => { ordem = e.target.value; renderMural(); });

// O botão do card e a foto do presente abrem a mesma janela de contribuição
mural.addEventListener('click', e => {
  const foto = e.target.closest('.item-foto');
  const b = e.target.closest('button[data-id]') || (foto && foto.closest('.item').querySelector('button[data-id]'));
  if (!b) return;
  abrir(itens.find(i => i.id === b.dataset.id));
});

/* Foto que não carregar vira a forma neutra (error não borbulha, por isso captura) */
mural.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('item-img')) return;
  const neutro = document.createElement('div');
  neutro.className = 'item-img neutro';
  neutro.setAttribute('role', 'img');
  neutro.setAttribute('aria-label', img.alt);
  neutro.innerHTML = FLOR_SVG;
  img.replaceWith(neutro);
}, true);

/* ---------- Carrinho (guardado nesta aba do navegador para sobreviver à ida e volta do pagamento) ---------- */
const btnCarrinho = porId('carrinho-btn');
const CHAVE_CARRINHO = 'lista-carrinho';
const CHAVE_NOME = 'lista-nome';   // nome digitado no carrinho, para o agradecimento depois do pagamento
const CHAVE_RECADO_MURAL = 'lista-recado-mural';   // último recado do carrinho enviado ao mural, para não duplicar

function salvarCarrinho(){
  try { sessionStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho.map(({ it, ...linha }) => linha))); }
  catch (e) { /* sem armazenamento: o carrinho vive só enquanto a página estiver aberta */ }
}
function restaurarCarrinho(){
  try {
    const salvo = JSON.parse(sessionStorage.getItem(CHAVE_CARRINHO) || '[]');
    carrinho = salvo.map(l => ({ ...l, it: itens.find(i => i.id === l.id) })).filter(l => l.it);
  } catch (e) { carrinho = []; }
}
const btnCarrinhoTopo = porId('carrinho-topo');
function atualizarCarrinho(){
  const n = carrinho.length;
  const itensTexto = `${n} ${n === 1 ? 'item' : 'itens'}`;
  btnCarrinho.hidden = btnCarrinhoTopo.hidden = n === 0;
  porId('carrinho-resumo').textContent = `${itensTexto} · ${fmt(totalCarrinho(carrinho))}`;
  porId('carrinho-qtd').textContent = n;
  btnCarrinhoTopo.setAttribute('aria-label', `Ver carrinho: ${itensTexto}, total de ${fmt(totalCarrinho(carrinho))}`);
  salvarCarrinho();
}
[btnCarrinho, btnCarrinhoTopo].forEach(b => b.addEventListener('click', () => { dlg.showModal(); passoCarrinho(); }));

/* ---------- Fluxo de contribuição ---------- */
const dlg = porId('dlg');
const corpo = porId('corpo');
const $ = s => corpo.querySelector(s);
let st = {};

porId('fechar').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

function mostrar(html){
  corpo.innerHTML = html;
  const h = corpo.querySelector('h2');
  if (h){ h.id = 'dlg-titulo'; h.tabIndex = -1; h.focus(); }
}
const cab = (rotulo, titulo) => `${rotulo ? `<p class="passo">${rotulo}</p>` : ''}<h2>${titulo}</h2>`;
const erroEm = (msg, campo) => { const e = $('#erro'); e.textContent = msg; e.hidden = false; if (campo) campo.focus(); };

function abrir(it){
  st = { it, qtd:1, modo:'sugerido' };
  const noCarrinho = carrinho.find(l => l.id === it.id);   // já está no carrinho: começa pelo que foi escolhido
  if (noCarrinho){ st.qtd = noCarrinho.qtd; st.modo = noCarrinho.modo; st.valorLivre = noCarrinho.modo === 'livre' ? noCarrinho.valor : undefined; }
  dlg.showModal();
  jaDado(it) ? passoAviso() : passoValor();
}

function passoAviso(){
  const it = st.it;
  const msg = isVaq(it)
    ? `A vaquinha de <strong>${esc(it.nome)}</strong> já alcançou a meta.`
    : (unidadesTotal(it) > 1
      ? `Todas as unidades de <strong>${esc(it.nome)}</strong> já foram presenteadas.`
      : `<strong>${esc(it.nome)}</strong> já foi presenteado por outro convidado.`);
  mostrar(`${cab('Antes de continuar', isVaq(it) ? 'Esta vaquinha já chegou à meta' : 'Este presente já foi dado')}
    <p>${msg} Você ainda pode ${isVaq(it) ? 'contribuir' : 'presentear'} mesmo assim (o valor vai para ${esc(CONFIG.destinoExtra)}) ou fazer uma contribuição livre por Pix, com o valor que quiser.</p>
    <div class="acoes">
      <button class="btn" type="button" id="seguir">${isVaq(it) ? 'Contribuir mesmo assim' : 'Presentear mesmo assim'}</button>
      <button class="btn sec" type="button" id="ir-livre">Contribuição livre por Pix</button>
    </div>
    <p><button class="link" type="button" id="voltar">Ver outros presentes</button></p>`);
  $('#seguir').onclick = passoValor;
  $('#ir-livre').onclick = irParaContribuicaoLivre;
  $('#voltar').onclick = () => dlg.close();
}

/* Fecha a janela e leva até a seção "Contribuição livre" (QR Code do Pix direto) */
function irParaContribuicaoLivre(){
  if (dlgAjuda.open) dlgAjuda.close();
  if (dlg.open) dlg.close();
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  porId('contribuicao-livre').scrollIntoView({ behavior: suave ? 'smooth' : 'auto' });
  porId('pix-livre-valor').focus({ preventScroll: true });
}

/* Opção "valor sugerido": cotas (vaquinha), unidades (presente com várias unidades) ou valor fixo */
function opcaoSugerida(it){
  const marcada = st.modo === 'sugerido' ? 'checked' : '';
  const maxQtd = isVaq(it) ? 50 : unidadesRestantes(it);
  if (!isVaq(it) && maxQtd < 2){
    return `<label class="opcao">
        <input type="radio" name="modo" value="sugerido" ${marcada}>
        <span><span class="op-tit">Valor do presente</span><span class="op-val">${fmt(it.valor)}</span></span>
      </label>`;
  }
  const un = isVaq(it) ? 'cota' : 'unidade';
  return `<label class="opcao">
      <input type="radio" name="modo" value="sugerido" ${marcada}>
      <span>
        <span class="op-tit">${isVaq(it) ? 'Cotas' : 'Unidades'} de ${fmt(valorLink(it))}${isVaq(it) ? '' : ` <small>(restam ${maxQtd})</small>`}</span>
        <span class="contador">
          <button type="button" data-d="-1" aria-label="Uma ${un} a menos">−</button>
          <output id="nc" aria-live="polite">${st.qtd}</output>
          <button type="button" data-d="1" aria-label="Uma ${un} a mais">+</button>
        </span>
        <span class="op-val" id="tot">${fmt(valorLink(it) * st.qtd)}</span>
      </span>
    </label>`;
}

function passoValor(){
  const it = st.it;
  const maxQtd = isVaq(it) ? 50 : Math.max(1, unidadesRestantes(it));
  const jaNoCarrinho = carrinho.some(l => l.id === it.id);
  const aceitaOutroValor = isVaq(it);   // presentes têm preço fechado; vaquinhas aceitam qualquer valor
  if (!aceitaOutroValor) st.modo = 'sugerido';
  mostrar(`${cab(aceitaOutroValor ? 'Escolha o valor' : 'Confira o presente', esc(it.nome))}
    ${aceitaOutroValor ? '<p class="nota">Qualquer valor é recebido com carinho.</p>' : ''}
    <div class="opcoes">
      ${opcaoSugerida(it)}
      ${aceitaOutroValor ? `<label class="opcao">
        <input type="radio" name="modo" value="livre" ${st.modo === 'livre' ? 'checked' : ''}>
        <span>
          <span class="op-tit">Outro valor</span>
          <span class="campo-valor">R$ <input type="number" id="livre" min="1" step="0.01" inputmode="decimal" placeholder="0,00" aria-label="Outro valor em reais" value="${st.modo === 'livre' ? st.valorLivre ?? '' : ''}"></span>
        </span>
      </label>` : ''}
    </div>
    ${aceitaOutroValor ? '' : '<p class="nota">Prefere dar outro valor? Use a <button class="link" type="button" id="link-livre">contribuição livre por Pix</button>.</p>'}
    <p class="erro" id="erro" hidden></p>
    <div class="acoes"><button class="btn" type="button" id="no-carrinho">${jaNoCarrinho ? 'Atualizar no carrinho' : 'Adicionar ao carrinho'}</button></div>`);

  const radio = v => corpo.querySelector(`input[name=modo][value=${v}]`);
  corpo.querySelectorAll('.contador button').forEach(b => b.onclick = e => {
    e.preventDefault();
    st.qtd = Math.min(maxQtd, Math.max(1, st.qtd + Number(b.dataset.d)));
    $('#nc').textContent = st.qtd;
    $('#tot').textContent = fmt(valorLink(it) * st.qtd);
    radio('sugerido').checked = true;
  });
  if (aceitaOutroValor) $('#livre').addEventListener('focus', () => radio('livre').checked = true);
  else $('#link-livre').onclick = irParaContribuicaoLivre;

  /* Devolve a linha escolhida ({id, nome, valor, qtd, modo, it}) ou null se o valor for inválido */
  const lerLinha = () => {
    const modo = corpo.querySelector('input[name=modo]:checked').value;
    if (modo === 'livre'){
      const v = parseFloat(String($('#livre').value).replace(',', '.'));
      if (!(v >= 1)) return erroEm('Digite um valor a partir de R$ 1,00.', $('#livre')), null;
      if (v > 20000) return erroEm('Para valores acima de R$ 20.000,00, fale com os noivos.', $('#livre')), null;
      return { id: it.id, nome: it.nome, valor: Math.round(v * 100) / 100, qtd: 1, modo: 'livre', it };
    }
    return { id: it.id, nome: it.nome, valor: emCentavos(valorLink(it)) * st.qtd / 100, qtd: st.qtd, modo: 'sugerido', it };
  };

  $('#no-carrinho').onclick = () => {
    const linha = lerLinha(); if (!linha) return;
    carrinho = colocarNoCarrinho(carrinho, linha);
    atualizarCarrinho();
    passoAdicionado(linha);
  };
}

/* Depois de escolher: ir para o carrinho ou continuar escolhendo */
function passoAdicionado(linha){
  mostrar(`<div class="obrigado">
      <h2>Adicionado ao carrinho</h2>
      <p><strong>${esc(linha.nome)}</strong>: ${fmt(linha.valor)}</p>
      <p class="nota">No carrinho: ${carrinho.length} ${carrinho.length === 1 ? 'item' : 'itens'}, total de ${fmt(totalCarrinho(carrinho))}.</p>
      <p>Quer ir para o carrinho e pagar, ou continuar contribuindo com outros presentes?</p>
      <div class="acoes">
        <button class="btn" type="button" id="ver-carrinho">Ir para o carrinho</button>
        <button class="btn sec" type="button" id="continuar">Continuar contribuindo</button>
      </div>
    </div>`);
  $('#ver-carrinho').onclick = passoCarrinho;
  $('#continuar').onclick = () => dlg.close();
}

function detalheLinha(l){
  if (l.modo === 'livre') return 'outro valor';
  if (isVaq(l.it)) return `${l.qtd} ${l.qtd === 1 ? 'cota' : 'cotas'}`;
  return l.qtd > 1 ? `${l.qtd} unidades` : '';
}

const MENSAGENS_ERRO = {
  muitas_tentativas: 'Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.',
  valor_invalido: 'Algum valor do carrinho não é aceito (presentes têm preço fechado; vaquinhas aceitam de R$ 1,00 a R$ 20.000,00). Remova o item e escolha de novo.',
  item_invalido: 'Um dos presentes saiu da lista. Remova-o do carrinho e tente de novo.',
  pagamento_nao_configurado: 'O pagamento ainda não está disponível. Se quiser, use a contribuição livre por Pix, logo abaixo da lista.'
};

function passoCarrinho(){
  if (!carrinho.length){
    mostrar(`<h2>Seu carrinho está vazio</h2>
      <p>Escolha um presente ou uma vaquinha e use “Adicionar ao carrinho”.</p>
      <div class="acoes"><button class="btn" type="button" id="fechar-carrinho">Ver a lista</button></div>`);
    $('#fechar-carrinho').onclick = () => dlg.close();
    return;
  }
  const dados = st.dados || (st.dados = { nome:'', mostrar:false, recado:'', publicar:false });
  mostrar(`<h2>Seu carrinho</h2>
    <ul class="carrinho-lista">
      ${carrinho.map(l => `
        <li>
          <span class="cl-nome">${esc(l.nome)}${detalheLinha(l) ? ` <small>${esc(detalheLinha(l))}</small>` : ''}${jaDado(l.it) ? `<small class="cl-aviso">já dado: vai para ${esc(CONFIG.destinoExtra)}</small>` : ''}</span>
          <strong>${fmt(l.valor)}</strong>
          <button class="link" type="button" data-remover="${esc(l.id)}" aria-label="Remover ${esc(l.nome)} do carrinho">Remover</button>
        </li>`).join('')}
    </ul>
    <p class="carrinho-total"><span>Total</span> <strong>${fmt(totalCarrinho(carrinho))}</strong></p>
    <div class="carrinho-dados">
      <label class="campo">Seu nome (para sabermos a quem agradecer)<input id="nome" autocomplete="name" maxlength="80" value="${esc(dados.nome)}"></label>
      <label class="radio"><input type="checkbox" id="mostrar" ${dados.mostrar ? 'checked' : ''}> Mostrar meu nome na lista de quem participou (nunca mostramos o valor)</label>
      <label class="campo">Recado para os noivos (opcional)<textarea id="msg" rows="3" maxlength="500">${esc(dados.recado)}</textarea></label>
      <label class="radio"><input type="checkbox" id="publicar" ${dados.publicar ? 'checked' : ''}> Quero meu recado no mural de recados do site, com meu nome (aparece depois que os noivos lerem e aprovarem)</label>
      <input class="isca" id="isca" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
    </div>
    <p class="nota"><strong>Pagar com Pix ou cartão:</strong> você vai para a página segura da InfinitePay, autorizada pelo Banco Central, e paga como em qualquer compra pela internet (ex.: Mercado Livre, Shopee…). O presente é confirmado sozinho na lista. Você não cria conta: ela só pede telefone, e-mail e nome para enviar um código de segurança pelo WhatsApp e evitar fraudes. Este site não recebe esses dados nem os do cartão. <button class="link" type="button" data-ajuda="privacidade">Seus dados (LGPD)</button></p>
    <p class="ajuda-chamada no-carrinho"><button class="btn-ajuda" type="button" data-ajuda="dados"><span class="btn-ajuda-icone" aria-hidden="true">?</span> Primeira vez? Veja como pagar, passo a passo</button></p>
    <p class="erro" id="erro" hidden></p>
    <div class="acoes">
      <button class="btn" type="button" id="pagar-carrinho">Pagar com Pix ou cartão</button>
      <button class="btn sec" type="button" id="continuar">Continuar contribuindo</button>
    </div>
    <div class="atalho-direto carrinho-terceira">
      <p>Achou difícil? Faça um <strong>Pix direto</strong> para os noivos, sem cadastro e sem código.</p>
      <button class="btn btn-direto" type="button" data-pix-direto>Pix direto de ${fmt(totalCarrinho(carrinho))}</button>
    </div>`);

  const guardarDados = () => { dados.nome = $('#nome').value; dados.mostrar = $('#mostrar').checked; dados.recado = $('#msg').value; dados.publicar = $('#publicar').checked; };
  ['#nome', '#mostrar', '#msg', '#publicar'].forEach(s => $(s).addEventListener('input', guardarDados));
  // Recado marcado para o mural (com texto). Precisa de nome, porque o mural mostra quem escreveu.
  const vaiProMural = () => dados.publicar && dados.recado.trim().length >= 2;
  const ERRO_MURAL_SEM_NOME = 'Escreva seu nome para o recado aparecer no mural.';
  corpo.querySelectorAll('[data-remover]').forEach(b => b.onclick = () => {
    carrinho = retirarDoCarrinho(carrinho, b.dataset.remover);
    atualizarCarrinho();
    passoCarrinho();
  });
  $('#continuar').onclick = () => dlg.close();
  corpo.querySelectorAll('[data-pix-direto]').forEach(b => b.onclick = () => {
    guardarDados();
    if (vaiProMural()){
      if (dados.nome.trim().length < 2) return erroEm(ERRO_MURAL_SEM_NOME, $('#nome'));
      recadoParaMural(dados.nome.trim(), dados.recado.trim(), $('#isca').value);
    }
    pixDiretoDoCarrinho(dados);
  });

  $('#pagar-carrinho').onclick = async () => {
    guardarDados();
    const nome = dados.nome.trim();
    if (dados.mostrar && !nome) return erroEm('Escreva seu nome para ele aparecer na lista.', $('#nome'));
    if (vaiProMural() && nome.length < 2) return erroEm(ERRO_MURAL_SEM_NOME, $('#nome'));
    if (!CONFIG.apiUrl) return erroEm(MENSAGENS_ERRO.pagamento_nao_configurado);
    const botao = $('#pagar-carrinho');
    botao.disabled = true; botao.textContent = 'Abrindo o pagamento…';
    try {
      // Os dois envios correm juntos; espera o do recado terminar antes de sair do site para a InfinitePay
      const [j] = await Promise.all([
        enviarApi({
          acao:'criar_pagamento', itens: itensDoPedido(carrinho),
          nome, mostrar_nome: dados.mostrar, recado: dados.recado.trim(), site: $('#isca').value
        }),
        vaiProMural() ? recadoParaMural(nome, dados.recado.trim(), $('#isca').value) : null
      ]);
      if (!j.ok || !j.url) throw new Error(j.erro || 'sem_url');
      try { sessionStorage.setItem(CHAVE_NOME, nome); } catch (e) { /* sem armazenamento: agradece sem o nome */ }
      abrirCheckout(j.url);
    } catch (e) {
      botao.disabled = false; botao.textContent = 'Pagar com Pix ou cartão';
      erroEm(MENSAGENS_ERRO[e.message] || 'Não conseguimos abrir o pagamento agora. Tente de novo em instantes.');
    }
  };
}

/* Pix direto a partir do carrinho: leva à Contribuição livre com o total preenchido e o QR Code pronto.
   Como esse Pix não passa pelo site, o aviso aos noivos já vai com nome, itens, valor e recado,
   e o carrinho é zerado para não ficar pendente (nem ser pago de novo pelo site). */
function pixDiretoDoCarrinho(dados){
  const total = totalCarrinho(carrinho);
  const itensTexto = carrinho.map(l => l.nome + (detalheLinha(l) ? ` (${detalheLinha(l)})` : '')).join(', ');
  const nome = dados.nome.trim(), recado = dados.recado.trim();
  const aviso = porId('contribuicao-livre').querySelector('.livre-avisar .contatos');
  aviso.dataset.rotulo = 'Avisar';
  aviso.dataset.mensagem = `Oi! ${nome ? `Aqui é ${nome}. ` : ''}Fiz um Pix direto de ${fmt(total)} para: ${itensTexto}.${recado ? ` Recado: ${recado}` : ''}`;
  carrinho = [];
  atualizarCarrinho();
  irParaContribuicaoLivre();
  porId('pix-livre-valor').value = total.toFixed(2);
  porId('pix-livre-gerar').click();
  mostrarContatos(aviso);
}

/* Recado do carrinho no mural, só quando a pessoa marca a opção: entra na mesma fila da aba Recados
   e só aparece depois que os noivos aprovarem. Nunca falha para quem chama: sem rede, o recado ainda
   chega aos noivos junto com o presente. Não reenvia o mesmo texto se a pessoa tentar pagar de novo. */
async function recadoParaMural(nome, mensagem, isca){
  const chave = `${nome}\n${mensagem}`;
  try { if (sessionStorage.getItem(CHAVE_RECADO_MURAL) === chave) return; } catch (e) {}
  try {
    const j = await enviarApi({ acao:'recado', nome, mensagem, site: isca });
    if (j.ok){ try { sessionStorage.setItem(CHAVE_RECADO_MURAL, chave); } catch (e) {} }
  } catch (e) { /* sem rede ou API fora do ar: segue sem o mural */ }
}

/* Vai para a página de pagamento da InfinitePay (só aceita esse endereço) */
function abrirCheckout(url){
  if (!/^https:\/\/checkout\.infinitepay\.io\//.test(url)) throw new Error('url_invalida');
  window.location.href = url;
}

/* ---------- Volta da InfinitePay: o site confere o pagamento e agradece ---------- */
/* Comprovante só da InfinitePay (infinitepay.io ou subdomínio). Um link de outro site, colocado na URL por um golpista,
   não vira “Ver comprovante” na página do casamento. */
const linkSeguro = u => /^https:\/\/([a-z0-9-]+\.)*infinitepay\.io\/[^\s"'<>]*$/i.test(String(u || '')) ? u : '';

async function verificarRetorno(){
  const p = new URLSearchParams(location.search);
  if (!p.get('order_nsu')) return;
  const pedido = { order_nsu: p.get('order_nsu'), transaction_nsu: p.get('transaction_nsu'), slug: p.get('slug') };
  const recibo = linkSeguro(p.get('receipt_url'));
  history.replaceState(null, '', location.pathname + location.hash);   // limpa a URL: não reprocessa ao recarregar
  dlg.showModal();
  mostrar(`<div class="obrigado"><h2>Confirmando seu pagamento…</h2><p class="nota">Isso leva só alguns segundos.</p></div>`);
  let status = 'pendente';
  if (CONFIG.apiUrl && pedido.transaction_nsu && pedido.slug){
    try { const j = await enviarApi({ acao:'retorno_infinitepay', ...pedido }); if (j.ok) status = j.status; }
    catch (e) { /* a confirmação também chega pelo aviso da InfinitePay */ }
  }
  if (status === 'aprovado'){ carrinho = []; atualizarCarrinho(); carregarPresentes(); }
  passoObrigado(status, recibo);
}

/* Fecha a janela e leva a uma seção da página (a lista, para ver o presente na barra, ou os recados) */
function voltarPara(idSecao, campo){
  dlg.close();
  const suave = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  porId(idSecao).scrollIntoView({ behavior: suave ? 'smooth' : 'auto' });
  if (campo) campo.focus({ preventScroll: true });
}

function passoObrigado(status, recibo){
  const aprovado = status === 'aprovado';
  let nome = '';
  try { nome = sessionStorage.getItem(CHAVE_NOME) || ''; if (aprovado) sessionStorage.removeItem(CHAVE_NOME); } catch (e) {}
  const primeiroNome = nome.trim().split(/\s+/)[0] || '';
  const casal = `${CONFIG.casal.nome1} & ${CONFIG.casal.nome2}`;
  const linkRecibo = recibo ? ` <a class="link" href="${esc(recibo)}" target="_blank" rel="noopener noreferrer">Ver comprovante</a>` : '';
  /* Próximos passos: aproveitar o momento para confirmar presença e deixar um recado */
  const presencaAberta = !porId('form-presenca').hidden;
  const proximos = `
      <div class="agradecimento-proximos">
        <p>${presencaAberta
          ? '<strong>Já confirmou sua presença na celebração?</strong> Leva menos de um minuto. E, se quiser, deixe um recado para o nosso mural.'
          : 'Se quiser, deixe um recado para o nosso mural.'}</p>
        <div class="acoes">
          ${presencaAberta ? '<button class="btn" type="button" id="ir-presenca">Confirmar presença</button>' : ''}
          <button class="btn${presencaAberta ? ' sec' : ''}" type="button" id="ir-recados">Deixar um recado</button>
        </div>
        <p><button class="link" type="button" id="fim">Voltar para a lista de presentes</button></p>
      </div>`;
  const foto = `
      <div class="agradecimento-foto" aria-hidden="true">
        <img src="img/casal-hero.jpg" width="1000" height="1000" alt="">
        <svg class="ilu agradecimento-ramo ramo-a" viewBox="0 -20 160 320"><use href="#ilu-ramo"/></svg>
        <svg class="ilu agradecimento-ramo ramo-b" viewBox="0 -20 160 320"><use href="#ilu-ramo"/></svg>
      </div>`;
  mostrar(aprovado ? `
    <div class="agradecimento">
      ${foto}
      <h2>${primeiroNome ? `Obrigado, ${esc(primeiroNome)}!` : 'Muito obrigado!'}</h2>
      <p class="agradecimento-selo">Pagamento confirmado</p>
      <p class="agradecimento-texto">Seu presente chegou com todo o carinho. Cada cantinho da nossa casa nova vai ter um pouco de você, e mal podemos esperar para celebrar juntos.</p>
      <p class="agradecimento-assinatura">Com amor,<br>${esc(casal)}</p>
      <p class="agradecimento-email">O comprovante do pagamento foi enviado para o e-mail que você informou na InfinitePay.${linkRecibo}</p>
      ${proximos}
    </div>` : `
    <div class="agradecimento">
      ${foto}
      <h2>Quase lá!</h2>
      <p class="agradecimento-texto">Recebemos o seu pedido. Assim que a InfinitePay confirmar o pagamento, o seu presente aparece na lista: no Pix leva poucos minutos e, no cartão, pode levar até o próximo dia útil.</p>
      <p class="nota">Se você não chegou a pagar, seu carrinho continua salvo.${linkRecibo}</p>
      <p class="agradecimento-assinatura">Obrigado pelo carinho!<br>${esc(casal)}</p>
      ${proximos}
    </div>`);
  $('#fim').onclick = () => voltarPara('presentes');
  $('#ir-recados').onclick = () => voltarPara('recados', porId('form-recado').elements.nome);
  if (presencaAberta) $('#ir-presenca').onclick = () => voltarPara('presenca', porId('form-presenca').elements.nome);
}

/* ---------- Ajuda passo a passo (abre por cima de tudo, inclusive do carrinho) ---------- */
const dlgAjuda = porId('dlg-ajuda');
function abrirAjuda(secao){
  if (!dlgAjuda.open) dlgAjuda.showModal();
  // No topo da ajuda, o contato dos noivos já aparece pronto, sem precisar de mais um toque
  dlgAjuda.querySelectorAll('[data-contatos-auto]').forEach(mostrarContatos);
  const alvo = secao ? porId(`ajuda-${secao}`) : null;
  if (alvo) alvo.scrollIntoView({ block:'start' });
  else dlgAjuda.scrollTop = 0;
  porId('ajuda-titulo').focus({ preventScroll: !!alvo });
  atualizarBarraFacil();
}
// A barra "Achou difícil?" aparece quando a caixa do topo sai da tela, para não repetir o mesmo botão
const caixaFacil = porId('ajuda-facil'), barraFacil = porId('ajuda-barra-facil');
function atualizarBarraFacil(){
  barraFacil.hidden = caixaFacil.getBoundingClientRect().bottom > dlgAjuda.getBoundingClientRect().top;
}
dlgAjuda.addEventListener('scroll', atualizarBarraFacil, { passive:true });
document.addEventListener('click', e => {
  const abrir = e.target.closest('[data-ajuda]');
  if (abrir) return abrirAjuda(abrir.dataset.ajuda);
  if (e.target.closest('[data-fechar-ajuda]')) return dlgAjuda.close();
  if (e.target.closest('[data-ir-livre]')) return irParaContribuicaoLivre();
  const contatos = e.target.closest('[data-contatos]');
  if (contatos) mostrarContatos(contatos.closest('[data-caixa-contatos]').querySelector('.contatos'));
});

/* Contato dos noivos no WhatsApp. Os números ficam só nas Propriedades do script (CONTATOS_WHATSAPP):
   nunca no código público do site. A API entrega só quando alguém abre a ajuda ou pede contato. */
let contatosNoivos = null;
async function mostrarContatos(caixa){
  caixa.hidden = false;
  caixa.textContent = 'Carregando…';
  try {
    if (!contatosNoivos){
      if (!CONFIG.apiUrl) throw new Error('sem_api');
      const j = await (await fetch(`${CONFIG.apiUrl}?acao=contato`)).json();
      const validos = (j.ok && Array.isArray(j.contatos) ? j.contatos : []).filter(c => /^\d{12,13}$/.test(String(c.whatsapp)));
      if (!validos.length) throw new Error('sem_contato');
      contatosNoivos = validos;
    }
    // Texto do botão e mensagem pronta podem vir da caixa (data-rotulo, data-mensagem)
    const rotulo = caixa.dataset.rotulo || 'Falar com';
    const msg = encodeURIComponent(caixa.dataset.mensagem || 'Oi! Estou no site da lista de presentes e preciso de ajuda para presentear.');
    caixa.innerHTML = contatosNoivos.map(c =>
      `<a class="btn sec" href="https://wa.me/${c.whatsapp}?text=${msg}" target="_blank" rel="noopener noreferrer">${esc(rotulo)} ${esc(c.nome)}</a>`).join('');
  } catch (e) {
    caixa.textContent = 'Não conseguimos carregar o contato agora. Se você tem o WhatsApp dos noivos, mande uma mensagem para eles.';
  }
}
// Caixas da página que mostram o contato sozinhas quando chegam perto da tela (uma consulta só, depois fica guardado).
// Observa a caixa inteira: a área dos botões começa escondida e, escondida, nunca "entra" na tela.
const vigiaContatos = new IntersectionObserver(entradas => entradas.forEach(en => {
  if (!en.isIntersecting) return;
  vigiaContatos.unobserve(en.target);
  mostrarContatos(en.target.querySelector('[data-contatos-ao-ver]'));
}), { rootMargin: '300px 0px' });
document.querySelectorAll('[data-contatos-ao-ver]').forEach(c => vigiaContatos.observe(c.closest('[data-caixa-contatos]')));
dlgAjuda.addEventListener('click', e => { if (e.target === dlgAjuda) dlgAjuda.close(); });

/* ---------- Contribuição livre por Pix (não grava nada e não entra nas barras dos presentes) ---------- */
// Se a pessoa mudar o valor à mão, o aviso aos noivos volta à mensagem geral (sem os itens do carrinho)
porId('pix-livre-valor').addEventListener('input', () => {
  const aviso = porId('contribuicao-livre').querySelector('.livre-avisar .contatos');
  delete aviso.dataset.mensagem; delete aviso.dataset.rotulo;
});
porId('pix-livre-gerar').addEventListener('click', () => {
  const campo = porId('pix-livre-valor');
  const erro = porId('pix-livre-erro');
  const bruto = String(campo.value).trim().replace(',', '.');
  let valor = null;
  if (bruto){
    const v = parseFloat(bruto);
    if (!(v >= 1) || v > 20000){
      erro.textContent = 'Digite um valor entre R$ 1,00 e R$ 20.000,00, ou deixe em branco.';
      erro.hidden = false; campo.focus(); return;
    }
    valor = Math.round(v * 100) / 100;
  }
  erro.hidden = true;
  const payload = pixPayload({ ...CONFIG.pix, valor, txid: '***' });
  const res = porId('pix-livre-resultado');
  res.innerHTML = `
    <div class="pix">
      <div class="qr" id="pix-livre-qr" role="img" aria-label="QR Code do Pix"></div>
      <div>
        <p>${valor ? `Valor: <strong>${fmt(valor)}</strong>. ` : 'Sem valor definido: você digita no app do banco. '}Abra o app do banco, escolha Pix e leia o QR Code, ou use o código copia e cola.</p>
        <textarea id="pix-livre-cc" class="cc" rows="3" readonly aria-label="Código Pix copia e cola">${esc(payload)}</textarea>
        <button class="btn sec" type="button" id="pix-livre-copiar">Copiar código Pix</button>
      </div>
    </div>
    <p class="alerta">Antes de confirmar no banco, confira se o recebedor aparece como <strong>${esc(CONFIG.pix.nomeRecebedor)}</strong>.</p>`;
  if (window.QRCode){
    new QRCode(porId('pix-livre-qr'), { text: payload, width: 336, height: 336, correctLevel: QRCode.CorrectLevel.M });
  } else {
    porId('pix-livre-qr').remove();
  }
  porId('pix-livre-copiar').onclick = async () => {
    try { await navigator.clipboard.writeText(payload); }
    catch { porId('pix-livre-cc').select(); document.execCommand('copy'); }
    porId('pix-livre-copiar').textContent = 'Código copiado';
  };
});

/* ---------- API (planilha Google via Apps Script) ---------- */
const clienteId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2);
const caminhoImagemOk = s => /^img\/[\w\-\/.]+$/.test(String(s || ''));

/* A API fala em centavos; o resto do site usa reais. A conversão fica só aqui. */
const deApi = a => ({
  id: a.id, tipo: a.tipo, nome: a.nome, descricao: a.descricao,
  valor: a.valor_centavos / 100, meta: a.meta_centavos / 100, cota: a.cota_centavos / 100,
  quantidade: a.quantidade, dadas: a.unidades_dadas, comprado: !!a.comprado,
  arrecadado: a.arrecadado_confirmado / 100, pendente: a.arrecadado_pendente / 100,
  participantes: a.participantes, nomes: a.nomes || [],
  imagem: caminhoImagemOk(a.imagem) ? a.imagem : ''
});

const itensDoPedido = linhas => linhas.map(l => ({ id: l.id, valor_centavos: emCentavos(l.valor) }));

async function enviarApi(corpo){
  /* text/plain evita a requisição prévia de CORS, que o Apps Script não responde */
  const r = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...corpo, cliente: clienteId })
  });
  return r.json();
}

let ultimaResposta = '';
async function carregarPresentes(){
  if (!CONFIG.apiUrl) return;
  try {
    const j = await (await fetch(`${CONFIG.apiUrl}?acao=presentes`)).json();
    if (!j.ok || !Array.isArray(j.itens) || !j.itens.length) return;
    const nova = JSON.stringify(j.itens);
    if (nova === ultimaResposta) return;
    ultimaResposta = nova;
    itens = j.itens.map(deApi);
    carrinho.forEach(l => { l.it = itens.find(i => i.id === l.id) || l.it; });
    renderMural();
  } catch (e) { /* sem rede ou API fora do ar: continua com o que já está na tela (config.js) */ }
}

/* ---------- Início ---------- */
restaurarCarrinho();
renderMural();
atualizarCarrinho();
verificarRetorno();

/* Lê a planilha ao abrir e a cada 30 s (pausa com a aba oculta) */
if (CONFIG.apiUrl){
  carregarPresentes();
  carregarRecados();
  setInterval(() => { if (!document.hidden) carregarPresentes(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden){ carregarPresentes(); carregarRecados(); } });
}
