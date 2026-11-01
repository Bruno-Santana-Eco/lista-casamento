// Testes do carrinho. Rode com: node tests/carrinho.test.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { totalCarrinho, colocarNoCarrinho, retirarDoCarrinho } = require('../js/carrinho.js');
const { pixPayload } = require('../js/pix.js');

// Soma sem erro de ponto flutuante (0,1 + 0,2 = 0,30 e não 0,30000000000000004)
assert.equal(totalCarrinho([{ id: 'a', valor: 0.1 }, { id: 'b', valor: 0.2 }]), 0.3);

// Itens reais da lista: panelas + pratos + 3 jogos de cama + liquidificador
const linhas = [
  { id: 'panelas', valor: 339.70 },
  { id: 'pratos', valor: 315.78 },
  { id: 'jogo-cama', valor: 324.10 * 3 },
  { id: 'liquidificador', valor: 98.99 }
];
assert.equal(totalCarrinho(linhas), 1726.77);

// Carrinho vazio
assert.equal(totalCarrinho([]), 0);

// Colocar o mesmo item de novo substitui a linha, sem duplicar
let c = colocarNoCarrinho([], { id: 'sofa', valor: 100 });
c = colocarNoCarrinho(c, { id: 'tv', valor: 50 });
c = colocarNoCarrinho(c, { id: 'sofa', valor: 300 });
assert.equal(c.length, 2);
assert.equal(totalCarrinho(c), 350);

// Remover
c = retirarDoCarrinho(c, 'sofa');
assert.deepEqual(c.map(l => l.id), ['tv']);
assert.equal(totalCarrinho(c), 50);

// O Pix gerado carrega exatamente o total do carrinho
const payload = pixPayload({ chave: '123e4567-e12b-12d1-a456-426655440000', nomeRecebedor: 'Fulano de Tal', cidade: 'BRASILIA', valor: totalCarrinho(linhas) });
assert.ok(payload.includes('54071726.77'), 'o campo de valor do Pix deve ser 1726.77');

console.log('OK: carrinho soma, substitui e remove corretamente; o Pix leva o total exato.');
