# Modelo da planilha

A planilha é o banco de dados do site. O script lê as abas pelo **nome** e as colunas pela **ordem e pelo nome do cabeçalho**: não renomeie nem reordene.
Os arquivos `.csv` de `apps-script/modelo/` (que o git ignora) já trazem esses cabeçalhos; importe um em cada aba (Arquivo → Importar → Substituir a planilha atual).

Mantenha a planilha **privada** (só a sua conta). Ela guarda nomes e telefones de convidados.

## Aba `Presentes`

`id | tipo | nome | descricao | valor_centavos | meta_centavos | cota_centavos | imagem | ordem | ativo | quantidade | arrecadado_confirmado | arrecadado_pendente | participantes | unidades_dadas | comprado`

- **Você edita:** `tipo` (`presente` ou `vaquinha`), `nome`, `descricao`, `valor_centavos` (presente), `meta_centavos` e `cota_centavos` (vaquinha), `imagem` (caminho `img/presentes/<id>.jpg`), `ordem`, `ativo` (marque para mostrar no site) e `quantidade` (unidades desejadas; use 1 na maioria).
- **Valores em centavos:** R$ 339,70 = `33970`.
- **O script calcula** (pode deixar em branco): `arrecadado_confirmado`, `arrecadado_pendente`, `participantes`, `unidades_dadas` e `comprado`.
- O item é considerado dado quando o confirmado atinge o `valor` (presente) ou a `meta` (vaquinha). Num presente com várias unidades, cada `valor` confirmado conta uma unidade.

## Aba `Contribuicoes`

`criado_em | contribuicao_id | itens_json | nome | mostrar_nome | valor_centavos | metodo | status | order_nsu | transaction_nsu | invoice_slug | capture_method | paid_amount_centavos | recado | atualizado_em`

- O site grava uma linha por pagamento (um carrinho com vários itens é **uma** linha). `itens_json` lista `[{"id":"geladeira","valor_centavos":10000}]`.
- `metodo`: `infinitepay` (pagamento pelo site) ou `externo` (lançado à mão).
- `status`:
  - `pendente`: o convidado abriu o pagamento, mas a InfinitePay ainda não confirmou. Só aparece como “aguardando” na barra quando já existe `transaction_nsu`.
  - `aprovado`: a InfinitePay confirmou (o script preenche sozinho). `confirmado`: lançado à mão por você. **Só estes dois contam como arrecadado.**
  - `cancelado`: ignorada.
- **Não mude o status de pagamentos da InfinitePay à mão**: o script aprova sozinho depois de conferir. Se um pagamento aprovado ficar `pendente`, veja “Problemas” no [LEIAME.md](LEIAME.md).
- A vaquinha soma `valor_centavos` (o valor do presente), nunca `paid_amount_centavos`, que na InfinitePay inclui juros do parcelamento.
- O nome só aparece no site se `mostrar_nome` estiver marcado **e** o status for `aprovado` ou `confirmado`. O valor individual nunca aparece.
- A “Contribuição livre” por Pix direto **não** passa pela planilha.

### Contribuição recebida por fora do site
Adicione uma linha e deixe em branco as colunas não listadas:

| coluna | exemplo |
|---|---|
| `criado_em` | `31/10/2026` (**sempre preencha**: o script usa a coluna A para achar a próxima linha livre) |
| `contribuicao_id` | `manual-001` (não pode repetir: use `manual-002`, `manual-003`…) |
| `itens_json` | `[{"id":"lua-de-mel","valor_centavos":80000}]` (aspas retas; o `id` igual ao da aba `Presentes`) |
| `nome` | quem deu (opcional) |
| `mostrar_nome` | `FALSE` ou `TRUE` |
| `valor_centavos` | `80000` |
| `metodo` | `externo` |
| `status` | `confirmado` |

O card atualiza em até 30 segundos.

## Aba `Presencas`

`criado_em | nome | comparece | adultos | criancas | telefone | mensagem | resposta_id | versao | situacao`

- **Se a sua aba foi criada antes:** acrescente só os cabeçalhos `resposta_id`, `versao` e `situacao` nas colunas **H, I e J**. As outras colunas continuam iguais.
- O site preenche tudo; você só lê. Não há lista prévia de convidados: a família é reconhecida pelo **celular** (guardado só com os dígitos, sem o 55).
- **Cada envio vira uma linha nova** com um `resposta_id` próprio (ex.: `P-7K2QX`). `versao` diz se é a 1ª, 2ª, 3ª resposta daquele celular.
- `situacao`: `atual` é a resposta que vale; quando a mesma família responde de novo, as anteriores viram `substituida`. Assim você vê quem confirmou, mudou ou cancelou, e quando.
- `comparece`: `sim` ou `nao` (no `nao`, adultos e crianças ficam 0).
- **Para contar convidados:** filtre `situacao` = `atual` e `comparece` = `sim`, ou rode a função `resumoPresencas` no Apps Script.

## Aba `Recados`

`criado_em | nome | mensagem | aprovado`

- O site grava cada recado com `aprovado` = `FALSE`. Ele só aparece no mural do site depois que você mudar para `TRUE`.
- Dica: selecione a coluna D (abaixo do cabeçalho) e use **Inserir → Caixa de seleção**; aí é só marcar.
- Para tirar um recado do mural, desmarque; para apagar de vez, exclua a linha.
