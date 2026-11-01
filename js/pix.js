/* ---------- Pix: gera o código copia e cola com valor (padrão BR Code do Banco Central) ---------- */
function tlv(id, v){ return id + String(v.length).padStart(2,'0') + v; }
function limpar(s, max){ return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').trim().slice(0,max); }
function crc16(str){ let crc=0xFFFF; for(let i=0;i<str.length;i++){ crc^=str.charCodeAt(i)<<8; for(let j=0;j<8;j++){ crc=(crc&0x8000)?((crc<<1)^0x1021):(crc<<1); crc&=0xFFFF; } } return crc.toString(16).toUpperCase().padStart(4,'0'); }
function pixPayload({chave, nomeRecebedor, cidade, valor, txid}){
  const conta = tlv('00','br.gov.bcb.pix') + tlv('01', chave.trim());
  let p = tlv('00','01') + tlv('26', conta) + tlv('52','0000') + tlv('53','986')
    + (valor ? tlv('54', Number(valor).toFixed(2)) : '')
    + tlv('58','BR') + tlv('59', limpar(nomeRecebedor,25)) + tlv('60', limpar(cidade,15))
    + tlv('62', tlv('05', txid || '***')) + '6304';
  return p + crc16(p);
}
const txidDe = id => (String(id).replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,25) || '***');

/* Permite testar no Node (tests/pix.test.mjs); no navegador as funções ficam globais. */
if (typeof module !== 'undefined' && module.exports) module.exports = { tlv, limpar, crc16, pixPayload, txidDe };
