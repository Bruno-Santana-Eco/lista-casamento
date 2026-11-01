/* =====================================================================
   CONFIGURAÇÃO: edite só este bloco
   ===================================================================== */
const CONFIG = {
  casal: {
    nome1: "Lídia",
    nome2: "Bruno",
    texto: "O que os une está no que é mais profundo. Valores, respeito e a escolha de construir juntos. Entre eles há parceria, conexão e uma união que se fortalece a cada dia. Ela tem um olhar sensível que enxerga o que muitos não veem, e ele sabe ouvir e valorizar cada conselho, porque juntos se completam. Colecionam viagens, descobrem novos sabores à mesa e transformam cada experiência em memória. Agora, dividem também a mesma casa, o sonho de formar uma família e uma vida inteira pela frente."
  },

  // Datas no formato AAAA-MM-DD
  datas: { casamento: "2026-11-26", festa: "2026-12-13" },
  festa: "Festa de comemoração em 13 de dezembro de 2026",   // deixe "" para esconder

  // Contagem regressiva: "festa" ou "casamento"
  contagemPara: "festa",
  mensagemAposContagem: "Obrigado por celebrar com a gente. Foi lindo!",

  intro: "A presença de vocês é o nosso maior presente. Se quiserem nos presentear, cada item abaixo vira uma contribuição: escolham o valor que couber no coração e no bolso.",

  // A seção só aparece quando o endereço estiver preenchido
  recepcao: {
    data: "13 de dezembro de 2026",
    horario: "",
    local: "",
    endereco: ""
  },

  // Confirmação de presença: prazo no formato AAAA-MM-DD (vazio = sem prazo).
  // Para o servidor também recusar depois do prazo, crie a propriedade PRESENCA_PRAZO no Apps Script.
  presenca: { prazo: "" },

  // Pix direto, usado só na "Contribuição livre" (os presentes são pagos pela InfinitePay)
  pix: {
    // Use chave aleatória ou e-mail (evite CPF). Telefone precisa estar no formato +5511999998888.
    chave: "48120211-bcea-4e6c-8535-6d3193b4087e",
    // Nome exatamente como aparece para quem paga (até 25 caracteres)
    nomeRecebedor: "Bruno Santana Bezerra",
    cidade: "Salvador"
  },

  // URL do app da Web do Apps Script (veja apps-script/LEIAME.md). Vazia = sem pagamento dos presentes; o site usa só os itens abaixo.
  apiUrl: "https://script.google.com/macros/s/AKfycbxz_cgs0XSQ07SBe_aWWhPylUyrUBE1UvpyHvG8ifmsHKMKo5nCvWao9jt4TdAw3NOg-A/exec",

  // Para onde vai a contribuição quando o item já foi dado
  destinoExtra: "o nosso fundo para a casa nova",

  /* Itens de reserva, usados só se a API (planilha) não responder. A lista oficial fica na planilha.
     Valores em reais aqui; na planilha e na API, em centavos.
     imagem: foto quadrada em img/presentes/<id>.jpg (se faltar, aparece uma forma neutra)
     tipo "vaquinha": meta (valor total), cota (valor de uma cota), arrecadado
     tipo "presente": valor, comprado (true quando alguém já deu)
       quantidade (opcional): unidades desejadas do mesmo presente; dadas = quantas já foram dadas */
  itens: [
    { id:"lua-de-mel", tipo:"vaquinha", nome:"Lua de mel", descricao:"Alguns dias de descanso depois da festa.", meta:2000, cota:50, arrecadado:0, imagem:"img/presentes/lua-de-mel.jpg" },
    { id:"geladeira", tipo:"vaquinha", nome:"Geladeira", descricao:"Para a casa nova começar com a geladeira cheia.", meta:2500, cota:100, arrecadado:0, imagem:"img/presentes/geladeira.jpg" },
    { id:"tv", tipo:"vaquinha", nome:"TV", descricao:"Para as maratonas de filme a dois.", meta:1900, cota:100, arrecadado:0, imagem:"img/presentes/tv.jpg" },
    { id:"maquina-lavar", tipo:"vaquinha", nome:"Máquina de lavar", descricao:"Uma ajuda a menos no tanque.", meta:1700, cota:100, arrecadado:0, imagem:"img/presentes/maquina-lavar.jpg" },
    { id:"sofa", tipo:"vaquinha", nome:"Sofá", descricao:"Para o descanso depois do trabalho e para receber as visitas.", meta:1500, cota:100, arrecadado:0, imagem:"img/presentes/sofa.jpg" },
    { id:"fogao", tipo:"vaquinha", nome:"Fogão", descricao:"Para o primeiro almoço de domingo sair da nossa própria cozinha.", meta:800, cota:50, arrecadado:0, imagem:"img/presentes/fogao.jpg" },

    { id:"panelas", tipo:"presente", nome:"Jogo de panelas", descricao:"Jogo de inox para as primeiras receitas da casa.", valor:339.70, comprado:false, imagem:"img/presentes/panelas.jpg" },
    { id:"pratos", tipo:"presente", nome:"Jogo de pratos", descricao:"Para receber família e amigos à mesa.", valor:315.78, comprado:false, imagem:"img/presentes/pratos.jpg" },
    { id:"vinho", tipo:"presente", nome:"Cesta de vinho", descricao:"Para brindar nas ocasiões especiais.", valor:319.00, comprado:false, imagem:"img/presentes/vinho.jpg" },
    { id:"jogo-cama", tipo:"presente", nome:"Jogo de cama completo", descricao:"Jogo completo de cama queen. Temos três unidades na lista.", valor:324.10, quantidade:3, dadas:0, comprado:false, imagem:"img/presentes/jogo-cama.jpg" },
    { id:"airfryer", tipo:"presente", nome:"Air fryer", descricao:"Porque ninguém quer fritar nada depois do expediente.", valor:269.90, comprado:false, imagem:"img/presentes/airfryer.jpg" },
    { id:"talheres", tipo:"presente", nome:"Jogo de talheres", descricao:"Um jogo completo para as refeições de todo dia.", valor:185.90, comprado:false, imagem:"img/presentes/talheres.jpg" },
    { id:"facas", tipo:"presente", nome:"Jogo de facas", descricao:"Para cortar tudo com segurança na cozinha nova.", valor:153.90, comprado:false, imagem:"img/presentes/facas.jpg" },
    { id:"liquidificador", tipo:"presente", nome:"Liquidificador", descricao:"Para os sucos e as vitaminas de manhã.", valor:98.99, comprado:false, imagem:"img/presentes/liquidificador.jpg" },
    { id:"ferro", tipo:"presente", nome:"Ferro de passar", descricao:"Para as camisas do dia a dia.", valor:88.90, comprado:false, imagem:"img/presentes/ferro.jpg" },
    { id:"sanduicheira", tipo:"presente", nome:"Sanduicheira", descricao:"Lanches rápidos para as noites de pouco tempo.", valor:69.24, comprado:false, imagem:"img/presentes/sanduicheira.jpg" }
  ]
};
/* ===================================================================== */
