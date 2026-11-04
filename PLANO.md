# Plano de trabalho

Executar **uma fase por vez**, na ordem. Ao fim de cada fase: conferir os critérios de aceite, fazer commit e parar para o Bruno revisar.
O estado de partida é a tag `v1-azulejo`: um único `index.html` funcional, com vaquinhas, avisos, Pix com valor e recado via WhatsApp.

---

## Decisões já tomadas
- Visual novo inspirado em sites de casamento em tom pêssego e floral, **com ilustrações originais** (não copiar arte de templates de plataformas).
- Nível 2: dados em planilha Google + Apps Script, com atualização automática na tela.
- Valor individual de cada contribuição nunca aparece no site.
- Recados públicos só aparecem depois de aprovados na planilha.

## Decisões pendentes (implementar com o padrão indicado, configurável)
- **Contagem regressiva**: para a festa (13/12/2026) por padrão; `CONFIG.contagemPara` aceita `"festa"` ou `"casamento"`.
- **Confirmação de presença**: formulário aberto com limite de acompanhantes por padrão; preparar o modo "lista de convidados" para fase futura, sem implementar agora.
- **Recepção**: definida em 03/11/2026 (Alameda Praia do Flamengo, Stella Maris, das 10h às 16h). O horário aparece na caixa do convite, no topo, e a contagem regressiva termina às 10h. A seção “Local da celebração” fica no fim da página, depois dos recados, para o convidado passar por tudo antes; só aparece quando `CONFIG.recepcao.endereco` estiver preenchido.
- **Ordem da página** (03/11/2026): O Casal, Confirme presença, Lista de presentes, Contribuição livre, Recados, Local. Os recados ficam depois dos presentes porque o mural pode crescer muito.
- **InfinitePay**: conta aguardando liberação do Checkout Integrado. A Fase 5 só começa quando o Bruno confirmar que o teste de criar link funcionou.

---

## Fase 0 — Estrutura de arquivos

Separar o `index.html` atual sem mudar o comportamento.

```
index.html
css/estilo.css
js/config.js        ← CONFIG: textos, datas, Pix, WhatsApp, URL da API, itens (fallback)
js/pix.js           ← tlv, limpar, crc16, pixPayload (copiar sem alterar a lógica)
js/app.js           ← renderização e fluxo de contribuição
img/                ← fotos e ilustrações (o Bruno adiciona)
tests/pix.test.mjs  ← teste do Pix com o exemplo do Banco Central
apps-script/        ← código do Apps Script (Fase 3), versionado aqui e colado no editor do Google
```

Teste obrigatório em `tests/pix.test.mjs` (rodar com `node tests/pix.test.mjs`): para a chave `123e4567-e12b-12d1-a456-426655440000`, o nome `Fulano de Tal`, a cidade `BRASILIA` e nenhum valor, o payload deve ser exatamente:
`00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D`

**Aceite:** o site abre por duplo clique e se comporta igual à v1; o teste do Pix passa.

---

## Fase 1 — Visual novo e seções

### Direção visual
- Fundo off-white quente com textura de papel bem sutil (CSS ou SVG leve, sem imagem pesada).
- Cor de destaque pêssego/coral (ponto de partida: `#F4A27E`; versão escura para texto sobre claro com contraste AA). Texto principal em azul-ardósia escuro (ponto de partida: `#3A4559`).
- Tipografia: serifada elegante para nomes e títulos e sem serifa limpa para textos (Google Fonts, sempre com fontes de reserva). O "&" entre os nomes em itálico ou cursivo, na cor de destaque.
- Ilustrações florais em traço fino coral: **desenhar SVGs originais** (folhas, ramos, flores soltas) ou usar arquivos que o Bruno colocar em `img/ilustracoes/`. Nada copiado de templates.
- Tema escuro opcional: manter as variáveis de cor em `:root` para permitir no futuro, mas o padrão é claro.

### Seções (página única com menu)
1. **Topo (hero)**: nomes empilhados (`Lídia`, `&`, `Bruno`), a data `26 | 11 | 2026`, uma folha ilustrada entre os nomes e a data, e a foto `img/casal-hero.jpg` recortada em círculo, com uma "mancha" de pincel rosada atrás e ramos florais em traço por cima das bordas. Ilustrações florais nos cantos. No celular, a foto fica acima dos nomes.
2. **Menu**: Home, O Casal, Recepção (só se configurada), Lista de presentes, Confirme presença, Recados. Fixo no topo ao rolar; no celular, vira um botão de menu. Rolagem suave até a seção.
3. **Contagem regressiva**: faixa na cor de destaque com dias, horas, minutos e segundos separados por linhas finas. Depois da data, mostra uma mensagem de agradecimento.
4. **O Casal**: as fotos `img/lidia.jpg` e `img/bruno.jpg` em formas orgânicas (blob via `border-radius` irregular ou `clip-path`) e um texto vindo de `CONFIG.casal.texto`.
5. **Recepção**: texto com data, horário e local, mapa incorporado do Google Maps (iframe "Incorporar mapa", sem API key) e botões "Abrir no Maps" e "Abrir no Waze". Oculta enquanto não houver endereço.
6. **Lista de presentes**: mantém o fluxo atual (Fase 2 melhora).
7. **Confirme presença** e **Recados**: formulários desenhados, mas ainda sem envio (a Fase 4 liga).
8. **Rodapé**: "Pagamentos via Pix e InfinitePay. Este site não recebe nem guarda dados de cartão."

### Imagens (o Bruno coloca em `img/`)
- `casal-hero.jpg`: cerca de 1200 px no lado maior e menos de 300 KB.
- `lidia.jpg` e `bruno.jpg`: cerca de 800 px.
- `presentes/<id>.jpg`: quadradas, com cerca de 600 px (Fase 2).
- Se faltar uma imagem, mostrar uma forma neutra com ilustração no lugar, sem quebrar o layout.
- Usar `loading="lazy"`, `width` e `height` nas imagens e `alt` descritivo.

**Aceite:** layout fiel à direção acima em desktop (1280 px) e celular (390 px); nenhuma rolagem horizontal; menu funcional; contagem correta para a data configurada; Lighthouse de acessibilidade ≥ 90.

---

## Fase 2 — Lista de presentes completa

- Cards com foto (`imagem` de cada item; usar a forma neutra se não houver), nome, descrição e valor, ou barra de progresso nas vaquinhas.
- Barra da vaquinha com dois trechos: **confirmado** (sólido) e **aguardando confirmação** (mais claro), mais o texto "X pessoas participaram" e, se houver, "entre elas Ana, Carlos…" (só nomes opt-in, até 3, sem valores, e só quando a vaquinha tiver 3 ou mais participantes confirmados, para o total não revelar quanto cada um deu).
- Filtros atuais (Todos, Vaquinhas, Presentes, Ainda disponíveis) mais ordenação (A–Z, menor valor, maior valor).
- **Carrinho**: adicionar vários presentes ou cotas e pagar o total de uma vez.
  - Pix direto: um único QR Code com o total.
  - InfinitePay (Fase 5): um link com vários itens.
- Manter os avisos de item já dado, a opção "outro valor" e a mensagem "qualquer valor é recebido com carinho".
- Nesta fase os itens ainda vêm de `js/config.js`; a Fase 3 passa a ler da planilha, mantendo o `config.js` como reserva se a API falhar.

**Aceite:** carrinho soma corretamente, permite remover itens e gera Pix com o total exato; ordenação e filtros combinam entre si; tudo navegável por teclado.

---

## Fase 3 — Planilha e Apps Script

### Abas da planilha
Gerar também um modelo em `apps-script/modelo-planilha.md` com os cabeçalhos exatos, para o Bruno criar a planilha.

**Presentes**: `id | tipo (presente/vaquinha) | nome | descricao | valor_centavos | meta_centavos | cota_centavos | imagem | ordem | ativo | arrecadado_confirmado | arrecadado_pendente | participantes | comprado`
As quatro últimas são fórmulas sobre a aba Contribuições. O item é considerado comprado quando o confirmado atinge o valor ou a meta.

**Contribuicoes**: `criado_em | contribuicao_id | itens_json | nome | mostrar_nome | valor_centavos | metodo (pix_direto/infinitepay) | status (pendente/confirmado/aprovado/cancelado) | order_nsu | transaction_nsu | invoice_slug | capture_method | paid_amount_centavos | recado | atualizado_em`
- Uma contribuição de carrinho com vários itens: `itens_json` lista `[{id, valor_centavos}]`, e as fórmulas ou o script distribuem por item.
- A vaquinha soma `valor_centavos` (o valor do presente), nunca `paid_amount`, que inclui juros de parcelamento pagos pelo convidado.

**Presencas**: `criado_em | nome | comparece (sim/nao) | adultos | criancas | telefone | mensagem`

**Recados**: `criado_em | nome | mensagem | aprovado (checkbox)`

### API (Apps Script publicado como app da Web: executar como "Eu", acesso "Qualquer pessoa")
- `GET ?acao=presentes`: lista pública com os dados agregados (ver regra de segurança no CLAUDE.md). Usar CacheService por 30 s.
- `GET ?acao=recados`: só os aprovados, com nome e mensagem.
- `POST` com corpo JSON enviado como `text/plain` (evita a requisição prévia de CORS), com campo `acao`:
  - `contribuicao`: grava a linha `pendente` com `contribuicao_id` gerado no servidor.
  - `presenca` e `recado`: Fase 4.
  - `webhook_infinitepay` e `retorno_infinitepay`: Fase 5.
- Usar LockService em toda escrita.
- Validar tipos, limites de tamanho de texto e valores (mínimo R$ 1,00; máximo razoável, por exemplo R$ 20.000,00).
- Campo honeypot nos formulários e limite simples de envios por minuto via CacheService.
- Responder sempre JSON `{ok, ...}` ou `{ok:false, erro}`.

### Front-end
- `CONFIG.apiUrl` com a URL do app da Web. Se vazia ou com erro, o site cai para os itens do `config.js`.
- Ler `presentes` ao abrir e a cada 30 s (pausar quando a aba estiver oculta).
- "Já fiz o Pix" grava a contribuição pendente; a barra mostra o trecho "aguardando" na hora.
- Confirmação manual: o casal muda o status para `confirmado` na planilha.

### Documentação para o Bruno (`apps-script/LEIAME.md`)
Passo a passo para criar a planilha, colar o código, publicar o app da Web, copiar a URL para o `config.js` e republicar após mudanças.

**Aceite:** contribuição feita no site aparece como pendente na planilha e na barra em até 30 s; ao marcar como confirmado, a barra fica sólida; o endpoint público não expõe valores individuais, telefones nem recados não aprovados.

---

## Fase 4 — Confirmação de presença e recados

- **Confirme presença**: nome, se comparece (sim/não), número de adultos e crianças (limite em `CONFIG.presenca.maxAcompanhantes`), telefone opcional, mensagem opcional e prazo de `CONFIG.presenca.prazo`. Depois do prazo, mostrar o aviso "confirmações encerradas, fale com os noivos".
- **Recados**: nome e mensagem; aviso de que aparece depois de aprovado. Mural com os aprovados, mais recentes primeiro.
- O recado opcional do fluxo de presente também vai para a planilha (mantendo o WhatsApp como opção extra, se `CONFIG.whatsapp` estiver preenchido).
- Texto curto de privacidade nos formulários: para que os dados são usados e que só os noivos têm acesso.

**Aceite:** envio grava na aba certa; recado só aparece no mural depois de marcado como aprovado; honeypot e limite de envios funcionando.

---

## Fase 5 — InfinitePay (só depois da liberação da conta)

Documentação da conta (resumo):
- Criar link: `POST https://api.checkout.infinitepay.io/links` com `handle` (InfiniteTag sem $), `items` [{quantity, price em centavos, description}], `order_nsu`, `redirect_url` e `webhook_url`. Não é necessário API Key para isso.
- Retorno ao site: a `redirect_url` recebe `receipt_url`, `order_nsu`, `slug`, `capture_method` e `transaction_nsu`.
- Conferência: `POST https://api.checkout.infinitepay.io/payment_check` com `handle`, `order_nsu`, `transaction_nsu` e `slug` → `{success, paid, amount, paid_amount, installments, capture_method}`.
- Webhook (pagamento aprovado): `{invoice_slug, amount, paid_amount, installments, capture_method, transaction_nsu, order_nsu, receipt_url, items}`. Responder 200 rápido; 400 faz a InfinitePay tentar de novo.

Implementação no Apps Script:
1. `acao=criar_pagamento`: grava a contribuição `pendente` com `order_nsu = contribuicao_id`, chama `/links` e devolve a URL do checkout ao site.
2. `webhook_infinitepay`: localiza pelo `order_nsu`, confirma via `payment_check` e só então marca `aprovado`, gravando `transaction_nsu`, `invoice_slug`, `capture_method` e `paid_amount`. Idempotente: se o `transaction_nsu` já existir, apenas responder 200.
3. `retorno_infinitepay`: a página de retorno do site envia os parâmetros recebidos; o script faz o mesmo `payment_check`. Isso cobre o caso de o webhook falhar.
4. Gatilho de tempo a cada 10 minutos: para pendentes da InfinitePay com mais de 5 minutos e com `transaction_nsu` conhecido, rodar `payment_check`.
5. Testar se a InfinitePay aceita a resposta do Apps Script (o app da Web responde com redirecionamento 302). Se não aceitar, os passos 3 e 4 garantem a confirmação mesmo assim.

No site: o botão "Pagar com Pix ou cartão" leva ao checkout da InfinitePay; o Pix direto pela chave continua como alternativa ("prefere pagar direto pela chave?").

**Aceite:** pagamento de teste de R$ 1 aprovado aparece como `aprovado` na planilha e na barra sem intervenção manual; reenvio do mesmo webhook não duplica valores.

---

## Fase 6 — Polimento e publicação

- Revisão de acessibilidade (contraste, foco visível, `aria-*`, navegação por teclado no modal e no menu).
- Performance: imagens comprimidas, fontes com `display=swap` e nenhum script bloqueante desnecessário.
- `<meta name="robots" content="noindex">` mantido.
- Checklist de lançamento em `LANCAMENTO.md`:
  - [ ] Chave Pix real configurada e Pix de R$ 1 testado com outra conta
  - [ ] Pagamento de teste na InfinitePay (se liberada)
  - [ ] URL da API configurada; contribuição, presença e recado testados ponta a ponta
  - [ ] Itens reais com valores e fotos
  - [ ] Nenhum segredo ou dado pessoal no repositório (`git log -p` revisado)
  - [ ] Repositório público e GitHub Pages ativo
  - [ ] Testado em celular Android e iPhone
