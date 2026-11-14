# Lista de presentes — Lídia & Bruno

Site do casamento (26/11/2026) e da festa de comemoração (13/12/2026): lista de presentes com vaquinhas, contribuição livre por Pix, confirmação de presença e mural de recados.

## Como funciona

- **Site estático** (HTML, CSS e JavaScript puro, sem etapa de build), publicado no GitHub Pages.
- **Dados** numa planilha Google privada; a **API** é um Google Apps Script publicado como app da Web (`apps-script/Codigo.gs`).
- **Presentes e vaquinhas** são pagos pelo checkout da InfinitePay (Pix ou cartão). O pagamento só é aprovado depois de conferido no `payment_check` da InfinitePay, com o valor exato.
- **Contribuição livre**: QR Code do Pix direto, gerado no navegador (padrão BR Code do Banco Central). Não passa pela planilha.
- **Presença**: cada resposta é registrada com versão; o mesmo celular de novo substitui a anterior.
- **Recados** só aparecem no mural depois de aprovados na planilha.

## Estrutura

```
index.html            página única
css/estilo.css        visual
js/config.js          textos, datas, chave Pix, URL da API e itens de reserva
js/app.js             lista, carrinho, pagamento, presença e recados
js/carrinho.js        contas do carrinho (em centavos)
js/pix.js             geração do código Pix (BR Code)
apps-script/          código da API e passo a passo (LEIAME.md, modelo-planilha.md)
tests/                testes (rode com: node tests/<arquivo>.mjs)
img/                  fotos
```

## Rodar localmente

Abra o `index.html` no navegador. Com `apiUrl` preenchida em `js/config.js`, a lista vem da planilha; sem ela, o site usa os itens de reserva do `config.js` e não aceita pagamentos.

## Testes

```
node tests/pix.test.mjs
node tests/carrinho.test.mjs
node tests/apps-script.test.mjs
```

Não altere `js/pix.js` sem rodar o teste do Pix (exemplo oficial do Banco Central).

## Segurança

- O repositório é **público**: nunca commitar chaves, tokens, dados de convidados, telefones ou exportações (CSV, OFX, XLSX).
- Configurações sensíveis (InfiniteTag, e-mail de aviso, token do webhook) ficam só nas **Propriedades do script** do Apps Script.
- O site nunca recebe dados de cartão, e a API pública só devolve dados agregados (nada de valores por pessoa, telefones ou recados não aprovados).
