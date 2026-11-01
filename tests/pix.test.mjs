// Teste do Pix com o exemplo oficial do Banco Central. Rode com: node tests/pix.test.mjs
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { pixPayload } = require('../js/pix.js');

const esperado = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

const obtido = pixPayload({
  chave: '123e4567-e12b-12d1-a456-426655440000',
  nomeRecebedor: 'Fulano de Tal',
  cidade: 'BRASILIA'
});

assert.equal(obtido, esperado);
console.log('OK: payload do Pix igual ao exemplo do Banco Central.');
