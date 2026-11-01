/* ---------- Carrinho: contas em centavos, para o total do Pix bater exatamente ---------- */
/* Cada linha: { id, nome, valor (em reais), ... }. Um item só aparece uma vez no carrinho. */
const emCentavos = v => Math.round(Number(v) * 100);
const totalCarrinho = linhas => linhas.reduce((soma, l) => soma + emCentavos(l.valor), 0) / 100;
const colocarNoCarrinho = (linhas, linha) => [...linhas.filter(l => l.id !== linha.id), linha];
const retirarDoCarrinho = (linhas, id) => linhas.filter(l => l.id !== id);

/* Permite testar no Node (tests/carrinho.test.mjs); no navegador as funções ficam globais. */
if (typeof module !== 'undefined' && module.exports) module.exports = { emCentavos, totalCarrinho, colocarNoCarrinho, retirarDoCarrinho };
