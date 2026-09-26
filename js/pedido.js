/* ============================================================
   GALP QUELIMANE — PÁGINA DE PEDIDO
   ============================================================ */

const Store = {
  get(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
};

function getProdutos(){ return Store.get('galp_produtos', PRODUTOS_PADRAO); }
function getConfig(){ return Store.get('galp_config', CONFIG); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtMT = v => `${Number(v||0)} MT`;

/* Supabase */
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
  estacao: null,       // ⭐ novo
  modo: 'entrega',
  velocidade: 'normal',
  zona: 0,
  endereco: '',
  referencia: '',
  nome: '',
  telefone: ''
};

function arredondar(v){
  const c = Math.round(v*100)/100;
  const i = Math.floor(c);
  return (c - i) >= 0.5 ? i + 1 : i;
}

async function carregarProdutosDoSupabase(){
  if(!supabaseClient) return getProdutos();
  try{
    const { data, error } = await supabaseClient
      .from('galp_produtos_config')
      .select('*')
      .order('id');

    if(error) throw error;

    const produtos = (data || []).map(p => ({
      id: p.id,
      nome: p.nome,
      preco: Number(p.preco),
      unidade: p.unidade,
      desc: p.descricao,
      icon: p.icon,
      disponivel: p.disponivel
    }));

    Store.set('galp_produtos', produtos);
    return produtos;
  }catch(err){
    console.error('❌ Erro:', err);
    return getProdutos();
  }
}

async function carregarEstacoesDoSupabase(){
  if(!supabaseClient) return (getConfig().estacoes || []);
  try{
    const { data, error } = await supabaseClient
      .from('galp_estacoes_config')
      .select('*')
      .order('id');

    if(error) throw error;

    const estacoes = (data || []).map(e => ({
      id: e.id,
      nome: e.nome,
      endereco: e.endereco,
      disponivel: e.disponivel
    }));

    const cfg = getConfig();
    cfg.estacoes = estacoes;
    Store.set('galp_config', cfg);
    return estacoes;
  }catch(err){
    console.error('❌ Erro estações:', err);
    return (getConfig().estacoes || []);
  }
}

async function renderProdutos(){
  const grid = $('#pdProdutos');
  if(!grid) return;

  let produtos = PRODUTOS_PADRAO;

  //  LÊ DO SUPABASE
  if(supabaseClient){
    try{
      const { data, error } = await supabaseClient
        .from('galp_produtos_config')
        .select('*')
        .order('id');

      if(!error && data?.length){
        produtos = data.map(p => ({
          id: p.id,
          nome: p.nome,
          preco: Number(p.preco),
          unidade: p.unidade,
          desc: p.descricao,
          icon: p.icon,
          disponivel: p.disponivel
        }));
        Store.set('galp_produtos', produtos);
      }
    }catch(err){
      console.error('Erro produtos:', err);
    }
  }

  grid.innerHTML = produtos.map(p => `
    <div class="pd-prod ${p.disponivel ? '' : 'unavailable'}" data-id="${p.id}">
      <span class="pd-prod-badge ${p.disponivel ? '' : 'off'}">
        ${p.disponivel ? '● OK' : '● OFF'}
      </span>
      <span class="pd-prod-icon">${p.icon || '⛽'}</span>
      <b>${p.nome}</b>
      <span class="pd-prod-price">${p.preco} MT/${p.unidade?.split('/')?.[1] || 'L'}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.pd-prod:not(.unavailable)').forEach(el => {
    el.addEventListener('click', () => selecionarProduto(el.dataset.id));
  });
}

/* ============ PASSO 2: SELECIONAR PRODUTO ============ */
async function selecionarProduto(id){
  const p = getProdutos().find(x => x.id === id);
  if(!p || !p.disponivel) return;

  state.produto = p;
  state.quantidade = 1;

  $$('.pd-prod').forEach(el => el.classList.toggle('selected', el.dataset.id === id));

  $('#pdIcon').textContent = p.icon || '⛽';
  $('#pdNome').textContent = p.nome;
  $('#pdPreco').textContent = `${p.preco} MT/${p.unidade?.split('/')?.[1] || 'L'}`;
  $('#pdQtyUnit').textContent = p.unidade?.split('/')?.[1] || 'L';

  renderQtyInputs();
  renderEstacoes();        // ⭐ novo
  updateTotal();

  $('#pdSectionQty').hidden = false;
  $('#pdSectionEstacao').hidden = false;   // ⭐ mostra secção
  $('#pdSectionEntrega').hidden = true;    // será mostrado depois de escolher estação
  $('#pdSectionDados').hidden = false;
  $('#pdSectionResumo').hidden = true;

  setTimeout(() => {
    $('#pdSectionQty')?.scrollIntoView({behavior:'smooth', block:'start'});
  }, 100);
}

/* ============ PASSO 3: ESTAÇÕES GALP ============ */
async function renderEstacoes(){
  const el = $('#pdEstacoes');
  if(!el) return;

  let estacoes = (getConfig().estacoes || []);

  //  LÊ DO SUPABASE
  if(supabaseClient){
    try{
      const { data, error } = await supabaseClient
        .from('galp_estacoes_config')
        .select('*')
        .order('id');

      if(!error && data?.length){
        estacoes = data.map(e => ({
          id: e.id,
          nome: e.nome,
          endereco: e.endereco,
          disponivel: e.disponivel
        }));
      }
    }catch(err){
      console.error('Erro estações:', err);
    }
  }

  el.innerHTML = estacoes.map(e => `
    <div class="pd-estacao ${e.disponivel ? '' : 'unavailable'}" data-id="${e.id}">
      <span class="pd-estacao-icon">⛽</span>
      <div class="pd-estacao-info">
        <b>${e.nome}</b>
        <small>${e.endereco || ''}</small>
      </div>
      <span class="pd-estacao-status ${e.disponivel ? 'ok' : 'off'}">
        ${e.disponivel ? '● Disponível' : '● Indisponível'}
      </span>
    </div>
  `).join('');

  el.querySelectorAll('.pd-estacao:not(.unavailable)').forEach(item => {
    item.addEventListener('click', () => selecionarEstacao(item.dataset.id));
  });
}

function selecionarEstacao(id){
  const cfg = getConfig();
  const e = cfg.estacoes.find(x => x.id === id);
  if(!e || !e.disponivel) return;

  state.estacao = e;

  $$('.pd-estacao').forEach(el => el.classList.toggle('selected', el.dataset.id === id));

  // Mostra a secção de entrega depois de escolher estação
  $('#pdSectionEntrega').hidden = false;
  atualizarMostrarEntrega();

  setTimeout(() => {
    $('#pdSectionEntrega')?.scrollIntoView({behavior:'smooth', block:'start'});
  }, 200);
}

/* ============ PASSO 4: ENTREGA ============ */
function atualizarMostrarEntrega(){
  renderModos();
  renderZonas();
}

function renderModos(){
  $$('input[name="pd-modo"]').forEach(r => {
    r.checked = r.value === state.modo;
    r.onchange = () => {
      state.modo = r.value;
      $('#pdEntregaFields').hidden = state.modo !== 'entrega';
      updateTotal();
    };
  });
  $('#pdEntregaFields').hidden = state.modo !== 'entrega';
}

function renderZonas(){
  const cfg = getConfig();
  const sel = $('#pdZona');
  if(!sel || !cfg.entrega?.zonas?.length) return;

  sel.innerHTML = cfg.entrega.zonas.map((z,i) =>
    `<option value="${i}">${z.nome} — ${z.valor} MT</option>`
  ).join('');

  state.zona = 0;
  sel.onchange = () => { state.zona = Number(sel.value); updateSpeedPrices(); updateTotal(); };

  $$('input[name="pd-velocidade"]').forEach(r => {
    r.checked = r.value === state.velocidade;
    r.onchange = () => { state.velocidade = r.value; updateTotal(); };
  });

  updateSpeedPrices();
}

function updateSpeedPrices(){
  const cfg = getConfig();
  const z = cfg.entrega?.zonas?.[state.zona];
  if(!z) return;
  const mult = cfg.entrega?.premium?.multiplicador || 2;
  $('#pdPrecoNormal').textContent = `${z.valor} MT`;
  $('#pdPrecoPremium').textContent = `${z.valor * mult} MT`;
  $('#pdTempoNormal').textContent = z.tempo || 'até 1 hora';
  $('#pdTempoPremium').textContent = cfg.entrega?.premium?.tempo || 'até 30 min';
}

function calcularEntrega(){
  const cfg = getConfig();
  if(state.modo === 'levantamento') return cfg.entrega?.levantamento || 0;
  const z = cfg.entrega?.zonas?.[state.zona];
  if(!z) return 0;
  const mult = state.velocidade === 'premium' ? (cfg.entrega?.premium?.multiplicador || 2) : 1;
  return z.valor * mult;
}

/* ============ QUANTIDADE ============ */
function renderQtyInputs(){
  const cfg = getConfig();
  const max = cfg.limite?.maxLitros || 20;
  $('#pdQtyInput').value = state.quantidade;
  $('#pdQtyInput').max = max;
  const qtds = cfg.quantidade?.rapida || [5,10,15,20];
  $('#pdQuick').innerHTML = qtds.map(q =>
    `<button data-q="${q}" class="${q===state.quantidade?'active':''}">${q}L</button>`
  ).join('');
  $('#pdQuick').querySelectorAll('button').forEach(b => {
    b.onclick = () => setQty(Number(b.dataset.q));
  });

  // Aviso de limite
  const aviso = $('#pdAvisoLimite');
  if(aviso) aviso.remove();
  if(cfg.limite?.ativo){
    const div = document.createElement('div');
    div.id = 'pdAvisoLimite';
    div.className = 'pd-aviso-limite';
    div.innerHTML = `⚠️ ${cfg.limite.mensagem}`;
    $('#pdQuick')?.insertAdjacentElement('afterend', div);
  }
}

function setQty(v){
  v = Number(v);
  const cfg = getConfig();
  const max = cfg.limite?.maxLitros || 20;

  if(isNaN(v) || v < 1) v = 1;
  if(v > max) v = max;   // ⚠️ bloqueia no máximo

  state.quantidade = v;
  $('#pdQtyInput').value = v;
  $('#pdQuick').querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.q) === v);
  });
  updateTotal();
}

document.addEventListener('click', e => {
  const btn = e.target.closest('.pd-qty-btn');
  if(!btn) return;
  setQty(state.quantidade + Number(btn.dataset.qty));
});
document.addEventListener('input', e => {
  if(e.target.id === 'pdQtyInput') setQty(e.target.value);
});

/* ============ TOTAL ============ */
function updateTotal(){
  if(!state.produto) return;
  const preco = state.produto.preco;
  const subtotal = preco * state.quantidade;
  const unidade = state.produto.unidade?.split('/')?.[1] || 'L';

  $('#pdTotal').textContent = fmtMT(subtotal);
  $('#pdHint').textContent = `${preco} MT × ${state.quantidade} ${unidade}`;

  validarBotao();
}

/* ============ LOCALIZAÇÃO ============ */
$('#pdUseLocation')?.addEventListener('click', () => {
  if(!navigator.geolocation){
    alert('Geolocalização não suportada.');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    $('#pdEndereco').value = `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
    validarBotao();
  }, () => alert('Não foi possível obter.'));
});

/* ============ VALIDAÇÃO ============ */
function validarBotao(){
  const btn = $('#pdBtnContinuar');
  if(!btn || !state.produto) return;

  const nome = $('#pdNomeCliente')?.value.trim() || '';
  const telefone = $('#pdTelefone')?.value.trim() || '';
  const endereco = $('#pdEndereco')?.value.trim() || '';

  let ok = true;
  let motivo = 'Preencha os dados';

  if(!state.estacao){ ok = false; motivo = 'Escolha a estação GALP'; }
  else if(!nome){ ok = false; motivo = 'Preencha o nome'; }
  else if(!telefone){ ok = false; motivo = 'Preencha o telefone'; }
  else if(telefone.replace(/\D/g,'').length < 9){ ok = false; motivo = 'Telefone inválido'; }
  else if(state.modo === 'entrega' && !endereco){ ok = false; motivo = 'Preencha o endereço'; }

  if(!$('#pdSectionResumo').hidden){
    btn.textContent = ok ? '📱 ENVIAR PELO WHATSAPP' : motivo;
  } else {
    btn.textContent = ok ? 'VER RESUMO →' : motivo;
  }
  btn.disabled = !ok;
}

document.addEventListener('input', e => {
  if(['pdNomeCliente','pdTelefone','pdEndereco','pdReferencia'].includes(e.target.id)){
    validarBotao();
  }
});

/* ============ RESUMO ============ */
function mostrarResumo(){
  state.endereco = $('#pdEndereco')?.value.trim() || '';
  state.referencia = $('#pdReferencia')?.value.trim() || '';
  state.nome = $('#pdNomeCliente')?.value.trim() || '';
  state.telefone = $('#pdTelefone')?.value.trim() || '';

  const p = state.produto;
  const subtotal = p.preco * state.quantidade;
  const entrega = calcularEntrega();
  const total = arredondar(subtotal + entrega);
  const unidade = p.unidade?.split('/')?.[1] || 'L';
  const cfg = getConfig();

  console.log('🔍 DEBUG resumo:');
  console.log('  modo:', state.modo);
  console.log('  zona:', state.zona);
  console.log('  velocidade:', state.velocidade);
  console.log('  subtotal:', subtotal);
  console.log('  entrega:', entrega);
  console.log('  total:', total);

  let entregaLinhas = '';
  if(state.modo === 'levantamento'){
    entregaLinhas = `
      <div class="pd-resumo-item"><span>Modo</span><b>🏪 Levantamento</b></div>
    `;
  } else {
    const zonaNome = cfg.entrega?.zonas?.[state.zona]?.nome || '—';
    const tipo = state.velocidade === 'premium' ? '⚡ Premium' : '🚚 Normal';
    entregaLinhas = `
      <div class="pd-resumo-item"><span>Modo</span><b>🛵 Entrega</b></div>
      <div class="pd-resumo-item"><span>Zona</span><b>${zonaNome}</b></div>
      <div class="pd-resumo-item"><span>Tipo</span><b>${tipo}</b></div>
      <div class="pd-resumo-item"><span>Endereço</span><b>${state.endereco}</b></div>
      ${state.referencia ? `<div class="pd-resumo-item"><span>Referência</span><b>${state.referencia}</b></div>` : ''}
      <div class="pd-resumo-item"><span>Taxa de entrega</span><b>${entrega} MT</b></div>
    `;
  }

  $('#pdResumoBody').innerHTML = `
    <div class="pd-resumo-titulo">Produto</div>
    <div class="pd-resumo-item"><span>Combustível</span><b>${p.nome}</b></div>
    <div class="pd-resumo-item"><span>Quantidade</span><b>${state.quantidade} ${unidade}</b></div>
    <div class="pd-resumo-item"><span>Preço</span><b>${p.preco} MT/${unidade}</b></div>
    <div class="pd-resumo-item"><span>Subtotal</span><b>${subtotal} MT</b></div>

    <div class="pd-resumo-titulo">Estação GALP</div>
    <div class="pd-resumo-item"><span>Posto</span><b>⛽ ${state.estacao.nome}</b></div>
    <div class="pd-resumo-item"><span>Endereço</span><b>${state.estacao.endereco || '—'}</b></div>

    <div class="pd-resumo-titulo">${state.modo === 'entrega' ? 'Entrega' : 'Levantamento'}</div>
    ${entregaLinhas}

    <div class="pd-resumo-titulo">Cliente</div>
    <div class="pd-resumo-item"><span>Nome</span><b>${state.nome}</b></div>
    <div class="pd-resumo-item"><span>Telefone</span><b>${state.telefone}</b></div>

    ${entrega > 0 ? `<div class="pd-resumo-item"><span>Subtotal</span><b>${subtotal} MT</b></div>` : ''}
    ${entrega > 0 ? `<div class="pd-resumo-item"><span>+ Taxa de entrega</span><b>${entrega} MT</b></div>` : ''}

    <div class="pd-resumo-item total"><span>TOTAL</span><b>${total} MT</b></div>

    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
      <button id="pdEditar" style="
        flex:1;min-width:110px;padding:14px;border-radius:12px;
        background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);
        color:#fff;font-weight:700;font-size:13px;cursor:pointer;
      ">← EDITAR</button>
    </div>
  `;

  $('#pdSectionResumo').hidden = false;
  setTimeout(() => {
    $('#pdSectionResumo')?.scrollIntoView({behavior:'smooth', block:'start'});
  }, 100);

  $('#pdEditar')?.addEventListener('click', () => {
    $('#pdSectionResumo').hidden = true;
    $('#pdSectionDados')?.scrollIntoView({behavior:'smooth', block:'start'});
    validarBotao();
  });

  validarBotao();
}

/* ============ ENVIAR WHATSAPP ============ */
async function enviarWhatsApp(){
  const cfg = getConfig();
  const p = state.produto;
  const subtotal = p.preco * state.quantidade;
  const entrega = calcularEntrega();
  const total = arredondar(subtotal + entrega);
  const unidade = p.unidade?.split('/')?.[1] || 'L';

  const zonaNome = state.modo === 'entrega'
    ? (cfg.entrega?.zonas?.[state.zona]?.nome || '—')
    : 'Levantamento';

  const pedido = {
    cliente: state.nome,
    telefone: state.telefone,
    produto: p.nome,
    quantidade: state.quantidade,
    unidade,
    preco_unit: p.preco,
    subtotal,
    estacao_id: state.estacao.id,
    estacao_nome: state.estacao.nome,
    estacao_endereco: state.estacao.endereco,
    modo: state.modo,
    velocidade: state.velocidade,
    zona: zonaNome,
    tempo: state.velocidade === 'premium' ? (cfg.entrega?.premium?.tempo || 'até 30 min') : 'até 1 hora',
    endereco: state.endereco,
    referencia: state.referencia,
    taxa: entrega,
    total,
    status: 'PENDENTE'
  };

  if(supabaseClient){
    supabaseClient.from('pedidos_galp').insert([pedido]).then(({ error }) => {
      if(error) console.error('❌ Erro Supabase:', error);
      else console.log('✅ Pedido gravado');
    });
  } else {
    const pedidos = Store.get('galp_pedidos', []);
    pedidos.unshift({ ...pedido, id: 'G' + Date.now(), data: new Date().toISOString() });
    Store.set('galp_pedidos', pedidos);
  }

  // ========== MENSAGEM WHATSAPP ==========
  const linhas = [
    cfg.mensagemWhatsApp || 'Olá, GALP Quelimane!',
    '',
    `Cliente: ${state.nome}`,
    `Telefone: ${state.telefone}`,
    '',
    `⛽ Estação GALP: ${state.estacao.nome}`,
    `📍 Endereço: ${state.estacao.endereco}`,
    '',
    `Combustível: ${p.nome}`,
    `Quantidade: ${state.quantidade} ${unidade}`,
    `Preço: ${p.preco} MT/${unidade}`,
    `Subtotal: ${subtotal} MT`,
    '',
    state.modo === 'entrega'
      ? `Entrega: ${state.velocidade === 'premium' ? 'Premium' : 'Normal'} — ${zonaNome}`
      : `Levantamento na ${state.estacao.nome}`,
    state.modo === 'entrega' ? `Endereço: ${state.endereco}` : '',
    state.modo === 'entrega' && state.referencia ? `Referência: ${state.referencia}` : '',
    entrega > 0 ? `Taxa: ${entrega} MT` : '',
    '',
    `TOTAL: ${total} MT`,
    '',
    '⚠️ IMPORTANTE:',
    'Tens até 1 hora para te deslocares à estação escolhida.',
    'Apresenta este pedido ao frentista.',
    '',
    `Pedido realizado através do site da GALP Quelimane.`
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(linhas)}`, '_blank');
}

/* ============ BOTÃO PRINCIPAL ============ */
$('#pdBtnContinuar')?.addEventListener('click', () => {
  const emResumo = !$('#pdSectionResumo').hidden;
  if(emResumo){
    enviarWhatsApp();
  } else {
    mostrarResumo();
  }
});

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', async () => {
  await renderProdutos();

  const params = new URLSearchParams(window.location.search);
  const produtoId = params.get('produto');
  if(produtoId){
    const p = (await carregarProdutosDoSupabase()).find(x => x.id === produtoId);
    if(p && p.disponivel) selecionarProduto(produtoId);
    renderQtyInputs();
    await renderEstacoes();
    updateTotal();
  }
});