/* ============================================================
   GALP QUELIMANE — PEDIDO
   Modo: SÓ RETIRADA (cliente escolhe estação)
   ============================================================ */

const Store = {
  get(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
};

function getProdutos(){ return Store.get('galp_produtos', PRODUTOS_PADRAO); }
function getConfig(){ return Store.get('galp_config', CONFIG); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtMT = v => `${Number(v||0)} MT`;

/* ============ SUPABASE ============ */
let supabaseClient = null;
try{
  if(window.supabase && CONFIG.supabase && CONFIG.supabase.url.includes('supabase.co')){
    supabaseClient = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.key);
    console.log('✅ Supabase ligado');
  }
}catch(err){ console.error('❌', err); }

/* ============ ESTADO ============ */
const state = {
  produto: null,
  quantidade: 1,
  estacao: null
};

/* ============ RENDER PRODUTOS ============ */
async function renderProdutos(){
  const grid = $('#pdProdutos');
  if(!grid) return;

  let produtos = PRODUTOS_PADRAO;

  // Lê do Supabase
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
    }catch(err){ console.error('❌ Produtos:', err); }
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

/* ============ SELECIONAR PRODUTO ============ */
function selecionarProduto(id){
  const p = getProdutos().find(x => x.id === id);
  if(!p || !p.disponivel) return;

  state.produto = p;
  state.quantidade = 1;

  $$('.pd-prod').forEach(el => el.classList.toggle('selected', el.dataset.id === id));

  const unidade = p.unidade?.split('/')?.[1] || 'L';
  if($('#pdIcon'))     $('#pdIcon').textContent     = p.icon || '⛽';
  if($('#pdNome'))     $('#pdNome').textContent     = p.nome;
  if($('#pdPreco'))    $('#pdPreco').textContent    = `${p.preco} MT/${unidade}`;
  if($('#pdQtyUnit'))  $('#pdQtyUnit').textContent  = unidade;

  renderQtyInputs();
  renderEstacoes();
  updateTotal();

  if($('#pdSectionQty'))      $('#pdSectionQty').hidden = false;
  if($('#pdSectionEstacao'))  $('#pdSectionEstacao').hidden = false;

  setTimeout(() => {
    $('#pdSectionQty')?.scrollIntoView({behavior:'smooth', block:'start'});
  }, 150);
}

/* ============ RENDER ESTAÇÕES ============ */
async function renderEstacoes(){
  const el = $('#pdEstacoes');
  if(!el) return;

  let estacoes = (getConfig().estacoes || []);

  // Lê do Supabase
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
    }catch(err){ console.error('❌ Estações:', err); }
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

/* ============ SELECIONAR ESTAÇÃO ============ */
function selecionarEstacao(id){
  const cfg = getConfig();
  const e = (cfg.estacoes || []).find(x => x.id === id);

  // Se não encontrar no config, procura na lista renderizada
  if(!e){
    const estacoes = Store.get('galp_estacoes_temp', []);
    const found = estacoes.find(x => x.id === id);
    if(!found) return;
    state.estacao = found;
  } else {
    state.estacao = e;
  }

  $$('.pd-estacao').forEach(el => el.classList.toggle('selected', el.dataset.id === id));

  updateTotal();
  validarBotao();
}

/* ============ QUANTIDADE ============ */
function renderQtyInputs(){
  const cfg = getConfig();
  if($('#pdQtyInput')) $('#pdQtyInput').value = state.quantidade;

  const qtds = cfg.quantidade?.rapida || [5,10,15,20];
  if($('#pdQuick')){
    $('#pdQuick').innerHTML = qtds.map(q =>
      `<button data-q="${q}" class="${q===state.quantidade?'active':''}">${q}L</button>`
    ).join('');
    $('#pdQuick').querySelectorAll('button').forEach(b => {
      b.onclick = () => setQty(Number(b.dataset.q));
    });
  }

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
  if(v > max) v = max;

  state.quantidade = v;
  if($('#pdQtyInput')) $('#pdQtyInput').value = v;
  $('#pdQuick')?.querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.q) === v);
  });
  updateTotal();
  validarBotao();
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

  if($('#pdTotal')) $('#pdTotal').textContent = fmtMT(subtotal);
  if($('#pdHint'))  $('#pdHint').textContent  = `${preco} MT × ${state.quantidade} ${unidade}`;
}

/* ============ VALIDAR BOTÃO ============ */
function validarBotao(){
  const btn = $('#pdBtnContinuar');
  if(!btn) return;

  const ok = state.produto && state.estacao;

  btn.disabled = !ok;

  if(ok){
    btn.textContent = 'CONTINUAR →';
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else if(!state.produto){
    btn.textContent = 'Escolha o combustível';
    btn.style.opacity = '.5';
    btn.style.cursor = 'not-allowed';
  } else {
    btn.textContent = 'Escolha a estação GALP';
    btn.style.opacity = '.5';
    btn.style.cursor = 'not-allowed';
  }
}

/* ============ BOTÃO CONTINUAR ============ */
$('#pdBtnContinuar')?.addEventListener('click', () => {
  if(!state.produto || !state.estacao) return;

  // Guarda estado para o checkout
  Store.set('galp_pedido_temp', {
    produto: state.produto,
    quantidade: state.quantidade,
    estacao: state.estacao
  });

  window.location.href = 'checkout.html';
});

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', async () => {
  await renderProdutos();
  validarBotao();
});