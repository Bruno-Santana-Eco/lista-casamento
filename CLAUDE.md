# Lista de presentes — Lídia & Bruno

Site do casamento de Lídia e Bruno: lista de presentes com vaquinhas, confirmação de presença e recados.
O plano de trabalho completo, dividido em fases, está em `PLANO.md`. Trabalhe uma fase por vez.

## Datas
- Casamento: 26/11/2026
- Festa de comemoração: 13/12/2026 (é o evento dos convidados)

## Arquitetura (não mudar sem perguntar)
- **Site estático** em HTML, CSS e JavaScript puro, sem framework e sem etapa de build. Hospedado no GitHub Pages.
- **Banco de dados**: uma planilha Google. **API**: Google Apps Script publicado como app da Web.
- **Pagamentos**: Pix direto pela chave do casal (QR Code estático gerado no navegador) e, quando a conta for liberada, Checkout Integrado da InfinitePay (Pix e cartão, com webhook).
- O computador do Bruno não roda nada em produção.

## Regras de segurança (obrigatórias)
- O repositório será **público**. Nunca commitar chaves, tokens, dados de convidados, telefones ou exportações (CSV, OFX, XLSX).
- Segredos ficam só nas **Propriedades do script** do Apps Script, nunca no front-end.
- O site nunca recebe nem guarda dados de cartão: o pagamento acontece na página da InfinitePay.
- O endpoint público de leitura devolve só dados agregados: total arrecadado, meta, número de participantes e nomes de quem marcou "mostrar meu nome", **sem valores por pessoa**. Valores individuais existem só na planilha.
- Nunca confiar no webhook sozinho: confirmar o pagamento consultando o `payment_check` da InfinitePay antes de gravar como aprovado.
- Escapar todo texto vindo da planilha ou do usuário antes de inserir no HTML.

## Princípios do produto
- Ninguém fica impedido de presentear: itens já dados ou vaquinhas com a meta batida mostram um aviso, mas continuam aceitando contribuições.
- Qualquer valor é bem-vindo: sempre existe a opção "outro valor".
- Não expor quanto cada convidado deu.

## Convenções
- Textos da interface em português do Brasil, com apóstrofo e aspas tipográficas (’ “ ”) no texto visível.
- Valores monetários em centavos (inteiros) nos dados e na API; formatar com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` só na exibição.
- Código e comentários claros, com nomes em português quando forem conceitos do domínio (presente, vaquinha, contribuicao).
- Não alterar as funções de geração do Pix em `js/pix.js` sem rodar o teste com o exemplo oficial do Banco Central (`tests/pix.test.mjs`).
- Um commit por tarefa concluída, com mensagem descritiva em português.
- Antes de decisões de produto não previstas no `PLANO.md`, pergunte ao Bruno.
