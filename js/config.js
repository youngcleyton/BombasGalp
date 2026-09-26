// ============ VERSÃO DO CONFIG ============
// ⚠️ AUMENTA ESTE NÚMERO sempre que mudares o config.js
const CONFIG_VERSION = 1;

// Limpa localStorage automaticamente se a versão for antiga
(function sincronizarVersao(){
  const versaoGuardada = parseInt(localStorage.getItem('exito_config_version') || '0');
  if(versaoGuardada !== CONFIG_VERSION){
    localStorage.removeItem('exito_config');
    localStorage.removeItem('exito_produtos');
    localStorage.setItem('exito_config_version', CONFIG_VERSION);
    console.log('🔄 Config atualizado para versão', CONFIG_VERSION);
  }
})();
/* ============================================================
   GALP QUELIMANE — CONFIGURAÇÃO CENTRAL
   ============================================================ */

const CONFIG = {
  // ============ IDENTIDADE GALP ============
  marca: {
    corPrincipal: "#FF6600",
    corSecundaria: "#E30613",
    corEscura: "#1A0E05",
    corClara: "#FFD200"
  },

  // ============ EMPRESA ============
  empresa: {
    nome: "GALP Quelimane",
    slogan: "Energia que move Moçambique",
    tipo: "Posto de Combustível",
    cidade: "Quelimane",
    pais: "Moçambique",
    endereco: "Quelimane, Moçambique",
    horario: "Segunda a Domingo — 24 horas",
    email: "geral@galp-quelimane.co.mz",
    telefone: "258XXXXXXXXX",
    logo: "assets/images/galp-logo.png"
  },

  whatsapp: "258XXXXXXXXX",

  // ============ LIMITE ============
  limite: {
    ativo: true,
    maxLitros: 20,
    mensagem: "Limite de 20L por pedido. Se quiser mais, faça novo pedido."
  },

  // ============ PRAZO LEVANTAMENTO ============
  prazoLevantamento: {
    ativo: true,
    horas: 1,
    mensagem: "Tens até 1 hora para te deslocares à estação escolhida."
  },

  // ============ ESTAÇÕES GALP ============
  estacoes: [
    { id: "galp_centro",    nome: "GALP Centro",    endereco: "Av. Marginal, Centro",   disponivel: true },
    { id: "galp_micaia",    nome: "GALP Micaia",    endereco: "Bairro Micaia",          disponivel: true },
    { id: "galp_sangarive", nome: "GALP Sangarive", endereco: "Estrada de Sangarive",   disponivel: true }
  ],

  // ============ PREÇOS ============
  precos: {
    gasolina: 98,
    diesel: 120,
  },

  // ============ ENTREGA ============
  entrega: {
    ativa: true,
    gratisAcimaDe: null,
    levantamento: 0,
    zonas: [
      { nome: "Centro de Quelimane", valor: 50,  tempo: "até 1 hora" },
      { nome: "Arredores",           valor: 30,  tempo: "até 1 hora" },
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

  supabase: {
    
  }
};

const PRODUTOS_PADRAO = [
  { id: "gasolina",     nome: "Gasolina",     preco: 98,  unidade: "MT/L",  disponivel: true, icon: "⛽",  desc: "Gasolina 95" },
  { id: "diesel",       nome: "Diesel",       preco: 120, unidade: "MT/L",  disponivel: true, icon: "🛢️", desc: "Gasóleo rodoviário" },
];

window.CONFIG = CONFIG;
window.PRODUTOS_PADRAO = PRODUTOS_PADRAO;