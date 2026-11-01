# Checklist de lançamento

Marque cada item antes de divulgar o link.

## Repositório e privacidade
- [ ] Nenhum segredo ou dado pessoal no repositório **nem no histórico** (`git log -p` revisado: sem telefones, e-mails de convidados, tokens ou exportações CSV/OFX/XLSX)
- [ ] Histórico antigo substituído por um commit limpo antes de tornar o repositório público (o histórico anterior teve um telefone real nos testes)
- [ ] E-mail dos commits configurado como o “noreply” do GitHub (opcional, recomendado)
- [ ] Fotos do casal e dos presentes conferidas: vocês estão de acordo que fiquem públicas
- [ ] Repositório público e GitHub Pages ativo (Settings → Pages → Deploy from a branch → `main` / raiz)
- [ ] `<meta name="robots" content="noindex">` presente (o site não aparece no Google)

## Configuração
- [ ] `js/config.js`: `apiUrl` com a URL `.../exec`; chave Pix, nome do recebedor e cidade corretos
- [ ] Apps Script: código mais recente colado e **nova versão** publicada
- [ ] Propriedades do script: `INFINITEPAY_HANDLE`; `SITE_URL` com o endereço **real** do site (não mais o example.com); `EMAIL_AVISO` (opcional); `PRESENCA_PRAZO` (opcional)
- [ ] `conferirPlanilha` responde “Planilha OK” e o gatilho `verificarPendentes` está instalado

## Planilha
- [ ] Itens reais com valores e fotos (aba `Presentes`); **Sanduicheira de volta a `6924`**
- [ ] Linhas de teste apagadas em `Contribuicoes`, `Presencas` e `Recados` (manter as contribuições externas reais, como a `manual-001`)
- [ ] Planilha continua **privada** (só a conta do casal)

## Testes de ponta a ponta (no site publicado)
- [ ] Pagamento de R$ 1,00 pela InfinitePay: volta para o site, mostra “Pagamento confirmado” e a linha fica `aprovado`
- [ ] Item já presenteado: aviso com “Presentear mesmo assim” e “Contribuição livre por Pix”
- [ ] QR Code da contribuição livre lido no app do banco (nome e valor corretos; não precisa pagar)
- [ ] Confirmação de presença e mudança de resposta com o mesmo celular (versões na planilha)
- [ ] Recado enviado, aprovado na planilha e visível no mural
- [ ] Testado em celular Android e iPhone (menu, carrinho, pagamento, formulários)

## Depois do lançamento
- [ ] Acompanhar a aba `Contribuicoes`: pendentes antigos sem `transaction_nsu` são desistências e não aparecem no site
- [ ] Contar convidados pela aba `Resumo` (fórmulas) ou pela função `resumoPresencas`
