/* ============================================================
   GALP QUELIMANE — CHECKOUT (retirada na estação escolhida)
   ============================================================ */

const Store = {
  get(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
};

function getConfig(){ return Store.get('galp_config', CONFIG); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtMT = v => `${Number(v||0)} MT`;

let supabaseClient = null;
try{
  if(window.supabase && CONFIG.supabase && CONFIG.supabase.url.includes('supabase.co')){
    supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
    console.log('✅ Supabase ligado');
  }
}catch(err){ console.error('❌', err); }

const state = {
  produto: null,
  quantidade: 1,
  estacao: null,
  nome: '',
  telefone: '',
  matricula: '',
  observacoes: '',
  codigo: ''
};

function arredondar(v){
  const c = Math.round(v*100)/100;
  const i = Math.floor(c);
  return (c - i) >= 0.5 ? i + 1 : i;
}

document.addEventListener('DOMContentLoaded', () => {
  const temp = Store.get('galp_pedido_temp', null);
  if(!temp || !temp.produto || !temp.estacao){
    alert('Nenhum pedido em curso. Volte ao site.');
    window.location.href = 'pedido.html';
    return;
  }

  state.produto = temp.produto;
  state.quantidade = temp.quantidade || 1;
  state.estacao = temp.estacao;

  if($('#pdPostoNome'))     $('#pdPostoNome').textContent     = state.estacao.nome;
  if($('#pdPostoEndereco')) $('#pdPostoEndereco').textContent = state.estacao.endereco || '';

  validarBotao();
});

function validarBotao(){
  const btn = $('#pdVerResumo');
  if(!btn) return;
  const nome = $('#pdNomeCliente')?.value.trim() || '';
  const telefone = $('#pdTelefone')?.value.trim() || '';

  let ok = true, motivo = 'Preencha os dados';
  if(!nome){ ok = false; motivo = 'Preencha o nome'; }
  else if(!telefone){ ok = false; motivo = 'Preencha o telefone'; }
  else if(telefone.replace(/\D/g,'').length < 9){ ok = false; motivo = 'Telefone inválido'; }

  btn.disabled = !ok;
  btn.textContent = ok ? 'VER RESUMO →' : motivo;
}

document.addEventListener('input', e => {
  if(['pdNomeCliente','pdTelefone','pdMatricula','pdObs'].includes(e.target.id)){
    validarBotao();
  }
});

function subtotal(){ return (state.produto?.preco || 0) * state.quantidade; }
function calcularTaxa(){ return getConfig().retirada?.taxa || 30; }
function total(){ return arredondar(subtotal() + calcularTaxa()); }

$('#pdVerResumo')?.addEventListener('click', () => {
  state.nome = $('#pdNomeCliente')?.value.trim() || '';
  state.telefone = $('#pdTelefone')?.value.trim() || '';
  state.matricula = $('#pdMatricula')?.value.trim() || '';
  state.observacoes = $('#pdObs')?.value.trim() || '';
  if(!state.nome || !state.telefone) return;
  renderResumo();
  $('#pdModalResumo').classList.add('active');
});

function renderResumo(){
  const p = state.produto;
  const sub = subtotal();
  const taxa = calcularTaxa();
  const tot = total();
  const unidade = p.unidade?.split('/')?.[1] || 'L';

  $('#pdResumoBody').innerHTML = `
    <div class="pd-resumo-titulo">⛽ Combustível</div>
    <div class="pd-resumo-item"><span>Produto</span><b>${p.nome}</b></div>
    <div class="pd-resumo-item"><span>Quantidade</span><b>${state.quantidade} ${unidade}</b></div>
    <div class="pd-resumo-item"><span>Preço</span><b>${p.preco} MT/${unidade}</b></div>
    <div class="pd-resumo-item"><span>Subtotal</span><b>${sub} MT</b></div>

    <div class="pd-resumo-titulo">⛽ Posto de retirada</div>
    <div class="pd-resumo-item"><span>Posto</span><b>${state.estacao.nome}</b></div>
    <div class="pd-resumo-item"><span>Endereço</span><b>${state.estacao.endereco || '—'}</b></div>
    <div class="pd-resumo-item"><span>Taxa de serviço</span><b>${taxa} MT</b></div>

    <div class="pd-resumo-titulo">👤 Cliente</div>
    <div class="pd-resumo-item"><span>Nome</span><b>${state.nome}</b></div>
    <div class="pd-resumo-item"><span>Telefone</span><b>${state.telefone}</b></div>
    ${state.matricula ? `<div class="pd-resumo-item"><span>Matrícula</span><b>${state.matricula}</b></div>` : ''}
    ${state.observacoes ? `<div class="pd-resumo-item"><span>Obs.</span><b>${state.observacoes}</b></div>` : ''}

    <div style="margin-top:14px;padding-top:12px;border-top:1px dashed rgba(255,255,255,.15)"></div>
    <div class="pd-resumo-item"><span>Subtotal</span><b>${sub} MT</b></div>
    <div class="pd-resumo-item"><span>Taxa de serviço</span><b>${taxa} MT</b></div>
    <div class="pd-resumo-item total"><span>TOTAL</span><b>${tot} MT</b></div>
  `;
}

$('#pdModalResumoClose')?.addEventListener('click', () => $('#pdModalResumo').classList.remove('active'));
$('#pdResumoEditar')?.addEventListener('click', () => $('#pdModalResumo').classList.remove('active'));
$('#pdModalResumo')?.addEventListener('click', e => {
  if(e.target.id === 'pdModalResumo') $('#pdModalResumo').classList.remove('active');
});

$('#pdResumoEnviar')?.addEventListener('click', () => {
  $('#pdModalResumo').classList.remove('active');
  const codigo = 'G' + Date.now().toString().slice(-5);
  state.codigo = codigo;
  if($('#pdModalEstacaoNome'))     $('#pdModalEstacaoNome').textContent     = state.estacao.nome;
  if($('#pdModalEstacaoEndereco')) $('#pdModalEstacaoEndereco').textContent = state.estacao.endereco || '';
  if($('#pdModalCodigo'))          $('#pdModalCodigo').textContent          = '#' + codigo;
  $('#pdModalAviso').classList.add('active');
});

$('#pdModalAvisoCancelar')?.addEventListener('click', () => $('#pdModalAviso').classList.remove('active'));
$('#pdModalAvisoOk')?.addEventListener('click', () => {
  $('#pdModalAviso').classList.remove('active');
  enviarWhatsAppFinal();
});
$('#pdModalAviso')?.addEventListener('click', e => {
  if(e.target.id === 'pdModalAviso') $('#pdModalAviso').classList.remove('active');
});

async function enviarWhatsAppFinal(){
  const cfg = getConfig();
  const p = state.produto;
  const sub = subtotal();
  const taxa = calcularTaxa();
  const tot = total();
  const unidade = p.unidade?.split('/')?.[1] || 'L';

  const pedido = {
    cliente: state.nome,
    telefone: state.telefone,
    produto: p.nome,
    quantidade: state.quantidade,
    unidade,
    preco_unit: p.preco,
    subtotal: sub,
    modo: 'retirada',
    estacao_id: state.estacao.id,
    estacao_nome: state.estacao.nome,
    estacao_endereco: state.estacao.endereco,
    endereco: '',
    referencia: state.matricula || '',
    observacoes: state.observacoes,
    taxa: taxa,
    total: tot,
    codigo_retirada: state.codigo,
    status: 'PENDENTE'
  };

  if(supabaseClient){
    supabaseClient.from('pedidos_galp').insert([pedido]).then(({ error }) => {
      if(error) console.error('❌', error);
      else console.log('✅ Pedido gravado');
    });
  }

  const linhas = [
    cfg.mensagemWhatsApp || 'Olá, GALP Quelimane!',
    '',
    `🎫 Código: #${state.codigo}`,
    `👤 Cliente: ${state.nome}`,
    `📱 Telefone: ${state.telefone}`,
    state.matricula ? `🚗 Matrícula: ${state.matricula}` : '',
    '',
    `⛽ Posto: ${state.estacao.nome}`,
    `📍 Endereço: ${state.estacao.endereco || '—'}`,
    '',
    `Combustível: ${p.nome}`,
    `Quantidade: ${state.quantidade} ${unidade}`,
    `Preço: ${p.preco} MT/${unidade}`,
    `Subtotal: ${sub} MT`,
    `Taxa de serviço: ${taxa} MT`,
    '',
    `💰 TOTAL: ${tot} MT`,
    '',
    '⏰ Tenho 1 hora para retirar no posto.',
    state.observacoes ? `💬 Obs.: ${state.observacoes}` : '',
    '',
    'Pedido através do site GALP Quelimane.'
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(linhas)}`, '_blank');
  localStorage.removeItem('galp_pedido_temp');
}