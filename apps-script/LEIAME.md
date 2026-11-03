# Como publicar a API (Apps Script)

Antes, a planilha precisa ter as 4 abas com os cabeçalhos do [modelo-planilha.md](modelo-planilha.md).

## 1. Colar o código
1. Abra a sua planilha → **Extensões → Apps Script**.
2. Apague todo o código do editor.
3. Abra o arquivo `apps-script/Codigo.gs` deste projeto, copie **tudo** e cole no editor.
4. Salve (Ctrl+S).

## 2. Propriedades do script (configuração que não vai para o site)
Na engrenagem **Configurações do projeto → Propriedades do script → Adicionar propriedade**:

| Propriedade | Valor | Obrigatória |
|---|---|---|
| `INFINITEPAY_HANDLE` | sua InfiniteTag, **sem o $** | sim |
| `SITE_URL` | endereço `https://` do site. Até o site ser publicado, use `https://example.com/obrigado` | sim |
| `EMAIL_AVISO` | e-mail que recebe aviso de pagamento aprovado | não |
| `API_URL` | a URL `.../exec` do app da Web (só se o aviso da InfinitePay não chegar; veja “Problemas”) | não |
| `CONTATOS_WHATSAPP` | WhatsApp dos noivos para o botão “Falar com os noivos” da ajuda, no formato `Nome=55DDDNUMERO;Nome2=55DDDNUMERO` (ex.: `Ana=5571988887777;Beto=5571987654321`). Fica só aqui, nunca no site nem no GitHub | não |
| `PRESENCA_PRAZO` | último dia para confirmar presença, no formato `AAAA-MM-DD` (ex.: `2026-12-01`). Use a mesma data em `CONFIG.presenca.prazo` no site | não |

O script cria sozinho a propriedade `WEBHOOK_TOKEN` no primeiro pagamento. **Não apague nem compartilhe**: ela impede que terceiros chamem o aviso de pagamento.

## 3. Autorizar e conferir
1. Na lista de funções (ao lado de “Depuração”), escolha **`autorizar`** e clique em **Executar**. Aceite as permissões: planilha, e-mail, acesso externo (para falar com a InfinitePay) e gatilhos. Se aparecer “O Google não verificou este app”: **Avançado → Acessar (não seguro)**. É o seu próprio código.
2. Escolha **`conferirPlanilha`** → **Executar**. Deve aparecer `Planilha OK: abas, cabeçalhos e propriedades corretos.`
3. Escolha **`instalarGatilho`** → **Executar** (uma vez só). Ele reconfere pagamentos pendentes a cada 10 minutos.

## 4. Publicar
- **Primeira vez:** Implantar → **Nova implantação** → engrenagem → **App da Web** → Executar como: **Eu**; Quem tem acesso: **Qualquer pessoa** → Implantar. Copie a URL `.../exec` para o `apiUrl` de `js/config.js`.
- **Depois de colar código novo:** Implantar → **Gerenciar implantações** → lápis → **Versão: Nova versão** → Implantar. A URL continua a mesma. **Sem isso, o site continua usando o código antigo.**

## 5. Conferir no navegador
Cole a URL com `?acao=presentes` no final. Deve aparecer `"ok":true` e a lista de presentes.

## Como o pagamento funciona
1. No carrinho, o convidado clica em **Pagar com Pix ou cartão**. O script grava a contribuição como `pendente`, cria o link na InfinitePay e manda o convidado para lá.
2. Ao aprovar, a InfinitePay avisa o script (webhook). O script **não confia no aviso**: pergunta ao `payment_check` e só marca `aprovado` se estiver pago e com o **valor exato** do pedido.
3. O convidado volta ao `SITE_URL`, e o site pede a mesma conferência (cobre o caso de o aviso falhar).
4. O gatilho de 10 minutos reconfere os pendentes que já têm `transaction_nsu`.

Quem abre o checkout e desiste fica `pendente` sem `transaction_nsu` e **não** aparece nas barras.

## Presença e recados
- **Presença:** sem lista prévia. A família informa nome, celular, se vem, adultos e crianças. Cada envio vira uma linha nova na aba `Presencas`; o mesmo celular de novo substitui a resposta anterior (que fica guardada como `substituida`). Para o total, rode **`resumoPresencas`** no editor ou filtre `situacao` = `atual`.
- **Recados:** chegam na aba `Recados` com `aprovado` = `FALSE`. Marque `TRUE` para aparecer no mural do site (em até 30 segundos).
- Com `EMAIL_AVISO`, você recebe um e-mail a cada confirmação e a cada recado novo.

## Lançar uma contribuição recebida por fora do site
Adicione uma linha na aba `Contribuicoes`, como explicado no [modelo-planilha.md](modelo-planilha.md#contribuição-recebida-por-fora-do-site).

## Problemas
- **`erro_interno` no navegador:** abra **Execuções** (menu da esquerda) e veja a mensagem.
- **Pagamento aprovado na InfinitePay, mas `pendente` na planilha:** o aviso pode não ter chegado. Coloque a URL `.../exec` na propriedade `API_URL`, publique uma nova versão e veja em **Execuções** se aparecem chamadas de `doPost`.
- **“O pagamento ainda não está disponível”:** falta `INFINITEPAY_HANDLE` ou `SITE_URL` (rode `conferirPlanilha`).

## Segurança
- A planilha **continua privada**: o site só lê dados agregados pela URL pública.
- A API pública nunca devolve valores por pessoa, telefones nem recados não aprovados.
- Configurações sensíveis ficam só nas **Propriedades do script**, nunca no site ou no GitHub.
