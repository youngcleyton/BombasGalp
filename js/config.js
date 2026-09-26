const CONFIG = {
  marca: {
    corPrincipal: "#FF6600",
    corSecundaria: "#E30613",
    corEscura: "#1A0E05",
    corClara: "#FFD200"
  },

  empresa: {
    nome: "GALP Quelimane",
    slogan: "Energia que move Moçambique",
    tipo: "Posto de Combustível",
    cidade: "Quelimane",
    pais: "Moçambique",
    endereco: "Quelimane, Moçambique",
    horario: "Segunda a Domingo — 24 horas",
    email: "geral@galp-quelimane.co.mz",
    telefone: "25871632577",
    logo: "assets/images/galp-logo.png"
  },

  whatsapp: "258871632577",

  limite: {
    ativo: true,
    maxLitros: 20,
    mensagem: "Limite de 20L por pedido. Se quiser mais, faça novo pedido."
  },

  prazoLevantamento: {
    ativo: true,
    horas: 1,
    mensagem: "Tens até 1 hora para te deslocares à estação escolhida."
  },

  estacoes: [
    { id: "galp_centro",    nome: "GALP Centro",    endereco: "Av. Marginal, Centro",   disponivel: true },
    { id: "galp_micaia",    nome: "GALP Micaia",    endereco: "Bairro Micaia",          disponivel: true },
    { id: "galp_sangarive", nome: "GALP Sangarive", endereco: "Estrada de Sangarive",   disponivel: true }
  ],

  precos: {
    gasolina: 98,
    diesel: 120
  },

  entrega: {
    ativa: true,
    gratisAcimaDe: null,
    levantamento: 30,
    zonas: [
      { nome: "Centro de Quelimane", valor: 80,  tempo: "até 1 hora" },
      { nome: "Arredores",           valor: 60,  tempo: "até 1 hora" },
      { nome: "Bairros próximos",    valor: 80,  tempo: "até 1 hora" },
      { nome: "Periferia",           valor: 120, tempo: "até 1 hora" }
    ],
    premium: {
      ativo: true,
      tempo: "até 30 minutos",
      multiplicador: 2
    }
  },

  quantidade: {
    minima: 1,
    maxima: 20,
    rapida: [5, 10, 15, 20],
    unidade: "L"
  },

  admin: {
    user: "galp",
    pass: "quelimane2025"
  },

  mensagemWhatsApp: "Olá, GALP Quelimane! Gostaria de fazer um pedido de combustível.",

  // ⬇️⬇️⬇️ ESTA É A PARTE QUE FALTAVA ⬇️⬇️⬇️
  supabase: {
    url: "https://hqlxwegzkllpvqwwzhhw.supabase.co",
    key: "sb_publishable_DaVPlT1yggN8BHbBHxvx0g_-pZ4zb-c"
  }
};

const PRODUTOS_PADRAO = [
  { id: "gasolina", nome: "Gasolina", preco: 98,  unidade: "MT/L", disponivel: true, icon: "⛽",  desc: "Gasolina 95" },
  { id: "diesel",   nome: "Diesel",   preco: 120, unidade: "MT/L", disponivel: true, icon: "🛢️", desc: "Gasóleo rodoviário" }
];

window.CONFIG = CONFIG;
window.PRODUTOS_PADRAO = PRODUTOS_PADRAO;