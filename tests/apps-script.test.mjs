// Testes das regras do Apps Script (sem acessar a planilha). Rode com: node tests/apps-script.test.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const codigo = readFileSync(new URL('../apps-script/Codigo.gs', import.meta.url), 'utf8');
const modulo = { exports: {} };
new Function('module', codigo)(modulo);
const {
  agregarPresentes, validarContribuicao, montarCheckout, pagamentoConfirmado, contaComoPendente, limparTexto, verdadeiro,
  normalizarCelular, validarPresenca, planejarPresenca, prazoEncerrado, novoIdResposta, validarRecado, proximaLinhaLivre, lerContatos,
  semFormula, idInfinitePayValido, temChave, grupoDoLimite, contarEmailFormulario, CFG
} = modulo.exports;

const itens = [
  { id: 'geladeira', tipo: 'vaquinha', nome: 'Geladeira', descricao: '', valor_centavos: '', meta_centavos: 250000, cota_centavos: 10000, imagem: '', quantidade: 1 },
  { id: 'jogo-cama', tipo: 'presente', nome: 'Jogo de cama', descricao: '', valor_centavos: 32410, meta_centavos: '', cota_centavos: '', imagem: '', quantidade: 3 },
  { id: 'ferro', tipo: 'presente', nome: 'Ferro', descricao: '', valor_centavos: 8890, meta_centavos: '', cota_centavos: '', imagem: '', quantidade: 1 }
];
const c = (extra) => ({ contribuicao_id: Math.random().toString(36), status: 'confirmado', mostrar_nome: false, nome: '', recado: '', ...extra });
const linhas = (...l) => JSON.stringify(l.map(([id, v]) => ({ id, valor_centavos: v })));

// ---------- Agregação ----------
const contribuicoes = [
  c({ itens_json: linhas(['geladeira', 10000]), nome: 'Ana', mostrar_nome: true }),
  c({ itens_json: linhas(['geladeira', 20000], ['jogo-cama', 64820]), nome: 'Carlos', mostrar_nome: true }),
  c({ itens_json: linhas(['geladeira', 5000]), status: 'pendente', nome: 'Pendente', mostrar_nome: true }),
  c({ itens_json: linhas(['geladeira', 99999]), status: 'cancelado' }),
  c({ itens_json: linhas(['geladeira', 3000]), nome: 'Anônimo', mostrar_nome: false }),
  c({ itens_json: 'isto não é json' }),
  c({ itens_json: linhas(['item-que-nao-existe', 5000]) }),
  c({ itens_json: linhas(['ferro', 8890]), status: 'aprovado' }),
  c({ itens_json: linhas(['jogo-cama', 32410]), recado: 'recado secreto', telefone: '71999990000' })
];
const r = Object.fromEntries(agregarPresentes(itens, contribuicoes).map(i => [i.id, i]));

assert.equal(r.geladeira.arrecadado_confirmado, 33000);          // 10000 + 20000 + 3000
assert.equal(r.geladeira.arrecadado_pendente, 5000);
assert.equal(r.geladeira.participantes, 4);                      // 3 confirmadas + 1 pendente; cancelada fora
assert.deepEqual(r.geladeira.nomes, ['Ana', 'Carlos']);          // só confirmados que marcaram "mostrar meu nome"
assert.equal(r.geladeira.comprado, false);
assert.equal(r['jogo-cama'].unidades_dadas, 3);                  // (64820 + 32410) / 32410 = 3
assert.equal(r['jogo-cama'].comprado, true);
assert.equal(r.ferro.comprado, true);
assert.equal(r.ferro.unidades_dadas, 1);

// Meta batida
const meta = agregarPresentes(itens, [c({ itens_json: linhas(['geladeira', 250000]) })])[0];
assert.equal(meta.comprado, true);

// Parcial: 1 de 3 unidades
const parcial = agregarPresentes(itens, [c({ itens_json: linhas(['jogo-cama', 32410]) })])[1];
assert.equal(parcial.unidades_dadas, 1);
assert.equal(parcial.comprado, false);

// ---------- Privacidade: a resposta pública não traz recados, telefones nem valores por pessoa ----------
const publico = JSON.stringify(agregarPresentes(itens, contribuicoes));
assert.ok(!publico.includes('recado secreto'));
assert.ok(!publico.includes('71999990000'));
assert.ok(!publico.includes('Pendente'));                        // nome de contribuição ainda não confirmada
assert.ok(!publico.includes('Anônimo'));                         // não marcou "mostrar meu nome"
assert.ok(!publico.includes('contribuicao_id'));
const chaves = Object.keys(r.geladeira).sort().join(',');
assert.equal(chaves, 'arrecadado_confirmado,arrecadado_pendente,comprado,cota_centavos,descricao,id,imagem,meta_centavos,nome,nomes,participantes,quantidade,tipo,unidades_dadas,valor_centavos');

// Só os 3 nomes mais recentes
const muitos = ['A', 'B', 'C', 'D', 'E'].map(n => c({ itens_json: linhas(['geladeira', 1000]), nome: n, mostrar_nome: true }));
assert.deepEqual(agregarPresentes(itens, muitos)[0].nomes, ['C', 'D', 'E']);

// ---------- Validação da contribuição ----------
const ids = { geladeira: itens[0], 'jogo-cama': itens[1], ferro: itens[2], sofa: { id: 'sofa', tipo: 'vaquinha', meta_centavos: 150000 } };
const ok = d => validarContribuicao({ metodo: 'pix_direto', ...d }, ids);

let v = ok({ itens: [{ id: 'ferro', valor_centavos: 8890 }, { id: 'geladeira', valor_centavos: 10000 }] });
assert.equal(v.ok, true);
assert.equal(v.total, 18890);

assert.equal(ok({ itens: [] }).erro, 'itens_invalidos');
assert.equal(ok({}).erro, 'itens_invalidos');
assert.equal(ok({ itens: Array(CFG.MAX_ITENS + 1).fill({ id: 'ferro', valor_centavos: 100 }) }).erro, 'itens_invalidos');
assert.equal(ok({ itens: [{ id: 'desconhecido', valor_centavos: 500 }] }).erro, 'item_invalido');
assert.equal(ok({ itens: [{ id: 'geladeira', valor_centavos: 500 }, { id: 'geladeira', valor_centavos: 500 }] }).erro, 'item_invalido');
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 99 }] }).erro, 'valor_invalido');                 // abaixo de R$ 1,00
assert.equal(ok({ itens: [{ id: 'geladeira', valor_centavos: 100 }] }).ok, true);                          // vaquinha: exatamente R$ 1,00
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 2000001 }] }).erro, 'valor_invalido');            // acima de R$ 20.000
assert.equal(ok({ itens: [{ id: 'geladeira', valor_centavos: 2000000 }] }).ok, true);
assert.equal(ok({ itens: [{ id: 'sofa', valor_centavos: 1500000 }, { id: 'geladeira', valor_centavos: 1500000 }] }).erro, 'valor_invalido'); // soma passa do limite

// Presente tem preço fechado: só unidades inteiras, até a quantidade da lista
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 8890 }] }).ok, true);
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 5000 }] }).erro, 'valor_invalido');      // parcial
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 100 }] }).erro, 'valor_invalido');       // R$ 1,00 num presente de R$ 88,90
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 17780 }] }).erro, 'valor_invalido');     // 2 unidades, mas a lista tem 1
assert.equal(ok({ itens: [{ id: 'jogo-cama', valor_centavos: 64820 }] }).ok, true);              // 2 de 3 unidades
assert.equal(ok({ itens: [{ id: 'jogo-cama', valor_centavos: 97230 }] }).ok, true);              // 3 de 3
assert.equal(ok({ itens: [{ id: 'jogo-cama', valor_centavos: 129640 }] }).erro, 'valor_invalido'); // 4 de 3
assert.equal(ok({ itens: [{ id: 'jogo-cama', valor_centavos: 32411 }] }).erro, 'valor_invalido');  // 1 centavo a mais
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: 100.5 }] }).erro, 'valor_invalido');              // não inteiro
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: '500' }] }).erro, 'valor_invalido');              // texto
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: -500 }] }).erro, 'valor_invalido');
assert.equal(ok({ itens: [{ id: 'ferro', valor_centavos: NaN }] }).erro, 'valor_invalido');

// ---------- InfinitePay: quem abriu o checkout e desistiu não aparece como "aguardando" ----------
const desistiu = c({ itens_json: linhas(['geladeira', 10000]), status: 'pendente', metodo: 'infinitepay', transaction_nsu: '' });
const pagandoPix = c({ itens_json: linhas(['geladeira', 20000]), status: 'pendente', metodo: 'infinitepay', transaction_nsu: 'abc-123' });
assert.equal(contaComoPendente(desistiu), false);
assert.equal(contaComoPendente(pagandoPix), true);
const g2 = agregarPresentes(itens, [desistiu, pagandoPix])[0];
assert.equal(g2.arrecadado_pendente, 20000);
assert.equal(g2.participantes, 1);

// ---------- Corpo do checkout: preço de cada linha, descrição vinda da planilha ----------
const catalogo = { geladeira: itens[0], 'jogo-cama': itens[1], ferro: itens[2] };
const corpo = montarCheckout({
  handle: 'minha-tag', orderNsu: 'pedido-1', redirectUrl: 'https://site/', webhookUrl: 'https://api/?t=x', catalogo,
  itens: [{ id: 'geladeira', valor_centavos: 30000 }, { id: 'jogo-cama', valor_centavos: 64820 }]
});
assert.deepEqual(corpo, {
  handle: 'minha-tag', order_nsu: 'pedido-1', redirect_url: 'https://site/', webhook_url: 'https://api/?t=x',
  items: [
    { quantity: 1, price: 30000, description: 'Geladeira (vaquinha)' },
    { quantity: 1, price: 64820, description: 'Jogo de cama' }
  ]
});
assert.equal(corpo.items.reduce((s, i) => s + i.price * i.quantity, 0), 94820);   // soma = total gravado

// ---------- Só aprova com pago=true E valor exato ----------
const pago = { success: true, paid: true, amount: 94820, paid_amount: 99000, installments: 3, capture_method: 'credit_card' };
assert.equal(pagamentoConfirmado(pago, 94820), true);                                   // juros do parcelamento não atrapalham
assert.equal(pagamentoConfirmado({ ...pago, paid: false }, 94820), false);
assert.equal(pagamentoConfirmado({ ...pago, success: false }, 94820), false);
assert.equal(pagamentoConfirmado({ success: false }, 94820), false);                    // resposta a dados falsos (testado na InfinitePay)
assert.equal(pagamentoConfirmado({ success: true, paid: false, amount: 0 }, 94820), false);
assert.equal(pagamentoConfirmado({ ...pago, amount: 100 }, 94820), false);              // pagou R$ 1 por um pedido de R$ 948,20
assert.equal(pagamentoConfirmado({ ...pago, amount: 99561 }, 94820), true);             // cartão: taxa embutida no valor (nunca menor)
assert.equal(pagamentoConfirmado({ ...pago, amount: 94819 }, 94820), false);            // 1 centavo a menos não aprova
assert.equal(pagamentoConfirmado({ ...pago, amount: '94820' }, 94820), true);
assert.equal(pagamentoConfirmado(null, 94820), false);
assert.equal(pagamentoConfirmado(pago, 0), false);

// ---------- Texto do usuário ----------
assert.equal(limparTexto('=HYPERLINK("http://x")', 100), "'=HYPERLINK(\"http://x\")");   // vira texto, não fórmula
assert.equal(limparTexto('+55 71', 100), "'+55 71");
assert.equal(limparTexto('  Oi\n\tmundo \u0000 ', 100), 'Oi mundo');
assert.equal(limparTexto('x'.repeat(1000), 50).length, 50);
assert.equal(limparTexto(null, 10), '');
assert.equal(verdadeiro(true) && verdadeiro('TRUE') && verdadeiro('sim'), true);
assert.equal(verdadeiro(false) || verdadeiro('') || verdadeiro('nao'), false);

// ---------- Presença: celular ----------
assert.equal(normalizarCelular('(71) 98765-4321'), '71987654321');
assert.equal(normalizarCelular('+55 71 98765-4321'), '71987654321');
assert.equal(normalizarCelular('5571987654321'), '71987654321');
assert.equal(normalizarCelular('71 3333-4444'), '7133334444');                // fixo, 10 dígitos
assert.equal(normalizarCelular(71987654321), '71987654321');                  // a planilha guarda como número
assert.equal(normalizarCelular('98765-4321'), '');                            // sem DDD
assert.equal(normalizarCelular(''), '');

// ---------- Presença: validação ----------
const p = extra => validarPresenca({ nome: 'José da Silva', telefone: '(71) 98765-4321', comparece: 'sim', adultos: 2, criancas: 1, mensagem: '', ...extra });
assert.deepEqual(p({}), { ok: true, nome: 'José da Silva', telefone: '71987654321', comparece: 'sim', adultos: 2, criancas: 1, mensagem: '' });
assert.equal(p({ nome: 'José' }).erro, 'nome_invalido');                     // precisa de sobrenome
assert.equal(p({ nome: '   ' }).erro, 'nome_invalido');
assert.equal(p({ telefone: '123' }).erro, 'telefone_invalido');
assert.equal(p({ comparece: 'talvez' }).erro, 'comparece_invalido');
assert.equal(p({ adultos: 0 }).erro, 'pessoas_invalido');                     // quem vem conta pelo menos 1 adulto
assert.equal(p({ adultos: 1.5 }).erro, 'pessoas_invalido');
assert.equal(p({ criancas: -1 }).erro, 'pessoas_invalido');
assert.equal(p({ adultos: 12, criancas: 6 }).ok, true);                      // família grande: sem limite prático
assert.equal(p({ adultos: 45, criancas: 6 }).erro, 'pessoas_invalido');      // passa do teto técnico de 50 (erro de digitação)
assert.equal(p({ adultos: 200, criancas: 0 }).erro, 'pessoas_invalido');
const naoVai = p({ comparece: 'nao', adultos: 4, criancas: 2 });
assert.equal(naoVai.ok, true);
assert.equal(naoVai.adultos + naoVai.criancas, 0);                            // "não vou" zera as pessoas

// ---------- Presença: versões (cada envio é uma linha nova; só a última fica "atual") ----------
const respostas = [
  { telefone: 71987654321, situacao: 'substituida' },
  { telefone: '71988887777', situacao: 'atual' },
  { telefone: '71987654321', situacao: 'atual' }
];
assert.deepEqual(planejarPresenca(respostas, '71987654321'), { versao: 3, substituir: [2] });
assert.deepEqual(planejarPresenca(respostas, '71911112222'), { versao: 1, substituir: [] });

// ---------- Presença: prazo (até o fim do dia, horário de Brasília) ----------
assert.equal(prazoEncerrado('', new Date()), false);
assert.equal(prazoEncerrado('2026-11-30', new Date('2026-11-30T23:00:00-03:00')), false);
assert.equal(prazoEncerrado('2026-11-30', new Date('2026-12-01T00:00:01-03:00')), true);
assert.equal(prazoEncerrado('30/11/2026', new Date('2027-01-01T00:00:00-03:00')), false);   // formato errado não bloqueia

// ---------- Presença: id da resposta ----------
const idsResposta = new Set(Array.from({ length: 200 }, () => novoIdResposta()));
assert.ok([...idsResposta].every(id => /^P-[A-HJ-NP-Z2-9]{5}$/.test(id)));
assert.ok(idsResposta.size > 190);                                              // praticamente sem repetição

// ---------- Recado ----------
assert.deepEqual(validarRecado({ nome: ' Ana ', mensagem: ' Felicidades! ' }), { ok: true, nome: 'Ana', mensagem: 'Felicidades!' });
assert.equal(validarRecado({ nome: '', mensagem: 'Oi' }).erro, 'nome_invalido');
assert.equal(validarRecado({ nome: 'Ana', mensagem: ' ' }).erro, 'mensagem_invalida');
assert.equal(validarRecado({ nome: 'Ana', mensagem: 'x'.repeat(900) }).mensagem.length, CFG.MAX_RECADO);

// ---------- Próxima linha livre: olha só a coluna A (caixas de seleção nas linhas vazias não atrapalham) ----------
const colA = vals => vals.map(v => [v]);
assert.equal(proximaLinhaLivre(colA(['criado_em'])), 2);                                   // só o cabeçalho
assert.equal(proximaLinhaLivre(colA(['criado_em', '', '', ''])), 2);                       // aba vazia com 1000 linhas
assert.equal(proximaLinhaLivre(colA(['criado_em', new Date(), new Date(), '', '', ''])), 4); // 2 registros
assert.equal(proximaLinhaLivre(colA(['criado_em', new Date(), '', new Date(), ''])), 5);     // linha apagada no meio: entra depois do último

// ---------- Contatos dos noivos (números fictícios) ----------
assert.deepEqual(
  lerContatos('Ana=5571988887777; Beto=+55 (71) 98765-4321 ;Lixo=123;=5571900000000;SemIgual'),
  [{ nome: 'Ana', whatsapp: '5571988887777' }, { nome: 'Beto', whatsapp: '5571987654321' }]
);
assert.deepEqual(lerContatos(''), []);
assert.deepEqual(lerContatos(null), []);

// ---------- Fórmulas: nada do que o script grava vira fórmula na planilha ----------
assert.equal(semFormula('=1+1'), "'=1+1");
assert.equal(semFormula('+55 71'), "'+55 71");
assert.equal(semFormula('-x'), "'-x");
assert.equal(semFormula('@x'), "'@x");
assert.equal(semFormula('abc'), 'abc');
assert.equal(semFormula(''), '');
assert.equal(semFormula(1000), 1000);
assert.equal(semFormula(true), true);
const dia = new Date('2026-11-04T10:00:00-03:00');
assert.equal(semFormula(dia), dia);
assert.equal(semFormula('[{"id":"tv","valor_centavos":100}]'), '[{"id":"tv","valor_centavos":100}]');
assert.equal(semFormula("'=já protegido"), "'=já protegido");                  // não protege duas vezes
assert.equal(limparTexto('=HYPERLINK("http://x")', 100), "'=HYPERLINK(\"http://x\")"); // limparTexto continua protegendo

// ---------- Códigos da InfinitePay (transaction_nsu e slug): só letras, números, - e _ ----------
assert.equal(idInfinitePayValido('34bdaeab-776a-43b1-a37f-ebac5853c1fb'), true);   // transaction_nsu real
assert.equal(idInfinitePayValido('emvoXdrSR3'), true);                              // invoice_slug real
assert.equal(idInfinitePayValido('=IMPORTDATA("https://x")'), false);
assert.equal(idInfinitePayValido(''), false);
assert.equal(idInfinitePayValido(null), false);
assert.equal(idInfinitePayValido(undefined), false);
assert.equal(idInfinitePayValido('abc def'), false);
assert.equal(idInfinitePayValido('a'.repeat(100)), true);
assert.equal(idInfinitePayValido('a'.repeat(101)), false);

// ---------- Limites por minuto: cada ação na sua conta; o retorno do pagamento fica de fora ----------
assert.equal(grupoDoLimite('criar_pagamento'), 'pagamento');
assert.equal(grupoDoLimite('presenca'), 'formulario');
assert.equal(grupoDoLimite('recado'), 'formulario');
assert.equal(grupoDoLimite('retorno_infinitepay'), null);
assert.equal(grupoDoLimite('acao_que_nao_existe'), null);

// ---------- Teto diário de e-mails de presença e recado ----------
let guardado = '';
const envios = [];
for (let n = 1; n <= 62; n++) {
  const cont = contarEmailFormulario(guardado, '2026-11-04', 60);
  guardado = cont.guardar;
  envios.push(cont.enviar);
}
assert.equal(envios[0], 'normal');                                               // 1º do dia
assert.equal(envios[59], 'normal');                                              // 60º
assert.equal(envios[60], 'aviso_teto');                                          // 61º: um aviso só
assert.equal(envios[61], 'nao');                                                 // 62º em diante: só na planilha
assert.equal(guardado, '2026-11-04|62');
assert.deepEqual(contarEmailFormulario(guardado, '2026-11-05', 60), { guardar: '2026-11-05|1', enviar: 'normal' });   // dia novo zera
assert.deepEqual(contarEmailFormulario('lixo', '2026-11-04', 60), { guardar: '2026-11-04|1', enviar: 'normal' });     // propriedade estranha
assert.deepEqual(contarEmailFormulario(null, '2026-11-04', 60), { guardar: '2026-11-04|1', enviar: 'normal' });

// ---------- Nomes nas vaquinhas: quem marcou "mostrar meu nome" aparece, mesmo sendo o único (decisão de 05/11/2026) ----------
const quem = (n, extra) => c({ itens_json: linhas(['geladeira', 1000]), nome: n, mostrar_nome: true, ...extra });
const nomesDa = (...contr) => agregarPresentes(itens, contr)[0].nomes;           // itens[0] é a geladeira
assert.deepEqual(nomesDa(quem('Ana')), ['Ana']);                                 // 1 confirmado que autorizou
assert.deepEqual(nomesDa(quem('Ana'), quem('Bia')), ['Ana', 'Bia']);
assert.deepEqual(nomesDa(quem('Ana'), quem('Bia'), quem('Caio')), ['Ana', 'Bia', 'Caio']);
assert.deepEqual(nomesDa(quem('Ana'), quem('Pend', { status: 'pendente' })), ['Ana']);                   // pendente não aparece
assert.deepEqual(nomesDa(quem('Ana'), quem('Anônimo', { mostrar_nome: false })), ['Ana']);              // quem não marcou não aparece
assert.deepEqual(nomesDa(quem('Anônimo', { mostrar_nome: false })), []);
assert.equal(agregarPresentes(itens, [quem('Ana')])[0].participantes, 1);       // a contagem continua aparecendo

// ---------- Nomes embutidos do JavaScript (constructor, __proto__…) não derrubam a lista nem passam na validação ----------
const estranho = agregarPresentes(itens, [c({ itens_json: linhas(['constructor', 1000], ['geladeira', 1000]) })]);
assert.equal(estranho[0].arrecadado_confirmado, 1000);                           // só a geladeira conta
assert.equal(ok({ itens: [{ id: 'constructor', valor_centavos: 500 }] }).erro, 'item_invalido');
assert.equal(ok({ itens: [{ id: '__proto__', valor_centavos: 500 }] }).erro, 'item_invalido');
assert.equal(ok({ itens: [{ id: 'toString', valor_centavos: 500 }] }).erro, 'item_invalido');
assert.equal(temChave({ a: 1 }, 'a'), true);
assert.equal(temChave({}, 'constructor'), false);

console.log('OK: agregação, privacidade da resposta pública, validação da contribuição, presença, recados, fórmulas, limites e e-mails.');
