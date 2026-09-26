/* ============================================================
   BOMBAS ÊXITO — APP PRINCIPAL (Cliente)
   ============================================================ */

const Store = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch{ return fallback; }
  },
  set(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
};
/* ============================================================
   SUPABASE — Ligação
   ============================================================ */
let supabaseClient = null;
try{
  if(window.supabase && CONFIG.supabase){
    supabaseClient = window.supabase.createClient(
      CONFIG.supabase.url,
      CONFIG.supabase.key
    );
    console.log('✅ Supabase ligado');
  }
}catch(err){
  console.error('❌ Erro Supabase:', err);
}

function getProdutos(){ return Store.get('exito_produtos', PRODUTOS_PADRAO); }
function getConfig(){ return Store.get('exito_config', CONFIG); }

const state = {
  produto: null,
  quantidade: 1,
  modo: 'entrega',           // 'entrega' | 'levantamento'
  velocidade: 'normal',      // 'normal' | 'premium'
  endereco: '',
  referencia: '',
  nome: '',
  telefone: '',
  zona: 0
};

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmtMT = v => `${Number(v||0)} MT`;

/* ============================================================
   ARREDONDAMENTO CORRETO
   - ≥ 0.5 → sobe (ex: 98.5 → 99)
   - < 0.5 → desce (ex: 98.4 → 98)
   - Corrige imprecisões do JavaScript (0.1+0.2 = 0.3000...04)
   ============================================================ */
function arredondar(valor){
  // 1) Corrige o erro de vírgula flutuante do JavaScript
  const corrigido = Math.round(valor * 100) / 100;

  // 2) Separa inteiro e decimal
  const inteiro = Math.floor(corrigido);
  const decimal = corrigido - inteiro;

  // 3) Aplica a regra: ≥ 0.5 sobe
  return decimal >= 0.5 ? inteiro + 1 : inteiro;
}

/* Formatar total já arredondado */
const fmtTotal = v => `${arredondar(v)} MT`;

/* ============================================================
   NAVBAR — Menu mobile (versão corrigida)
   ============================================================ */
const hamburger = document.querySelector('#hamburger');
const navLinks  = document.querySelector('#navLinks');

function fecharMenu(){
  if(navLinks)  navLinks.classList.remove('open');
  if(hamburger) hamburger.classList.remove('active');
  const overlay = document.querySelector('.nav-overlay');
  if(overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function abrirMenu(){
  if(navLinks)  navLinks.classList.add('open');
  if(hamburger) hamburger.classList.add('active');
  const overlay = document.querySelector('.nav-overlay');
  if(overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

if(hamburger && navLinks){
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    if(navLinks.classList.contains('open')){
      fecharMenu();
    } else {
      abrirMenu();
    }
  });

  // Fecha ao clicar num link
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', fecharMenu);
  });

  // Fecha ao clicar no overlay
  const overlay = document.querySelector('.nav-overlay');
  if(overlay){
    overlay.addEventListener('click', fecharMenu);
  }

  // Fecha com ESC
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') fecharMenu();
  });

  // Fecha ao redimensionar para desktop
  window.addEventListener('resize', () => {
    if(window.innerWidth > 900) fecharMenu();
  });
}

/* ---------- RENDER: FUEL CARDS ---------- */
function renderFuelCards(){
  const grid = $('#fuelGrid');
  if(!grid) return;
  const produtos = getProdutos();

  grid.innerHTML = produtos.map(p => {
    const preco = p.preco > 0 ? `${p.preco} MT` : 'XX MT';
    const unidadeTxt = p.unidade?.split('/')?.[1] || 'L';
    return `
      <div class="fuel-card ${p.disponivel ? '' : 'unavailable'}" data-id="${p.id}">
        <div class="fc-head">
          <div class="fc-icon">${p.icon || '⛽'}</div>
          <span class="status ${p.disponivel ? 'ok' : 'off'}">
            ● ${p.disponivel ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
          </span>
        </div>
        <div class="fc-name">${p.nome}</div>
        <div class="fc-desc">${p.desc || ''}</div>
        <div class="fc-price">${preco} <small>/${unidadeTxt}</small></div>
        <button class="btn btn-primary fc-btn" ${p.disponivel ? '' : 'disabled'}>
          ${p.disponivel ? 'PEDIR AGORA' : 'INDISPONÍVEL'}
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.fuel-card:not(.unavailable) .fc-btn').forEach(btn => {
    btn.addEventListener('click', e => {
  const id = e.target.closest('.fuel-card').dataset.id;
  window.location.href = `pedido.html?produto=${id}`;
});
  });
}

/* ---------- ABRIR PEDIDO ---------- */
function openOrder(id){
  const produto = getProdutos().find(p => p.id === id);
  if(!produto || !produto.disponivel) return;

  state.produto = produto;
  state.quantidade = 1;

  const section = $('#pedido');
  section.hidden = false;
  section.scrollIntoView({behavior:'smooth', block:'start'});

  goToStep(1);
  renderStep1();
}

function goToStep(n){
  [1,2,3].forEach(i => {
    const el = $(`#step${i}`);
    if(el) el.hidden = i !== n;
  });
}

/* ---------- STEP 1: QUANTIDADE COM CÁLCULO DINÂMICO ---------- */
function renderStep1(){
  const p = state.produto;
  $('#opIcon').textContent = p.icon || '⛽';
  $('#opNome').textContent = p.nome;
  $('#opPreco').textContent = `${p.preco} ${p.unidade}`;
  $('#qtyInput').value = state.quantidade;
  $('#qtyUnit').textContent = p.unidade?.split('/')?.[1] || 'L';

  const cfg = getConfig();
  const qtds = cfg.quantidade?.rapida || [5,10,20,30,50];
  $('#quickQty').innerHTML = qtds.map(q =>
    `<button data-q="${q}" class="${q===state.quantidade?'active':''}">${q}L</button>`
  ).join('');

  $('#quickQty').querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => setQty(Number(b.dataset.q)));
  });

  updateTotal();
}

/* ---------- ATUALIZA TOTAL EM TEMPO REAL ---------- */
function setQty(v){
  const cfg = getConfig();
  const min = cfg.quantidade?.minima || 1;
  const max = cfg.quantidade?.maxima || 500;
  v = Math.max(min, Math.min(max, Number(v) || min));
  state.quantidade = v;
  $('#qtyInput').value = v;
  $('#quickQty').querySelectorAll('button').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.q) === v);
  });
  updateTotal();
}

function updateTotal(){
  const preco = state.produto?.preco || 0;
  const total = preco * state.quantidade;
  const unidade = state.produto?.unidade?.split('/')?.[1] || 'L';

  $('#orderTotal').textContent = fmtMT(total);
  $('#totalHint').textContent = `${preco} MT/${unidade} × ${state.quantidade} ${unidade}`;
}

/* Eventos de quantidade */
$('#qtyInput')?.addEventListener('input', e => setQty(e.target.value));
$$('.qty-btn').forEach(b => {
  b.addEventListener('click', () => setQty(state.quantidade + Number(b.dataset.qty)));
});

$('#toStep2')?.addEventListener('click', () => {
  goToStep(2);
  renderStep2();
});
$('#orderClose')?.addEventListener('click', () => {
  $('#pedido').hidden = true;
  state.produto = null;
});

/* ---------- STEP 2 ---------- */
function renderStep2(){
  const cfg = getConfig();
  const sel = $('#zonaSelect');

  if(sel && cfg.entrega?.zonas?.length){
    sel.innerHTML = cfg.entrega.zonas.map((z,i) =>
      `<option value="${i}">${z.nome}</option>`
    ).join('');
  }

  // Modo (levantamento / entrega)
  $$('input[name="modo"]').forEach(r => {
    r.checked = r.value === state.modo;
    r.onchange = () => {
      state.modo = r.value;
      toggleDeliveryFields();
      updateDeliveryPreview();
      updateSpeedPrices();
    };
  });

  // Velocidade (normal / premium)
  $$('input[name="velocidade"]').forEach(r => {
    r.checked = r.value === state.velocidade;
    r.onchange = () => {
      state.velocidade = r.value;
      updateDeliveryPreview();
    };
  });

  toggleDeliveryFields();

  if($('#endereco')) $('#endereco').value = state.endereco;
  if($('#referencia')) $('#referencia').value = state.referencia;
  if($('#nome')) $('#nome').value = state.nome;
  if($('#telefone')) $('#telefone').value = state.telefone;

  if(sel){
    state.zona = Number(sel.value || 0);
    sel.onchange = () => {
      state.zona = Number(sel.value);
      updateSpeedPrices();
      updateDeliveryPreview();
    };
  }

  updateSpeedPrices();
  updateDeliveryPreview();
}

function toggleDeliveryFields(){
  const wrap = $('#deliveryFields');
  if(wrap) wrap.style.display = state.modo === 'entrega' ? 'block' : 'none';
}

/* Atualiza os preços visíveis do Normal / Premium */
function updateSpeedPrices(){
  const cfg = getConfig();
  const zona = cfg.entrega?.zonas?.[state.zona];
  if(!zona) return;

  const precoNormal = zona.valor;
  const mult = cfg.entrega?.premium?.multiplicador || 2;
  const precoPremium = zona.valor * mult;

  if($('#precoNormal'))  $('#precoNormal').textContent  = `${precoNormal} MT`;
  if($('#precoPremium')) $('#precoPremium').textContent = `${precoPremium} MT`;
}

/* ---------- CÁLCULO DE ENTREGA ---------- */
function calcularEntrega(){
  const cfg = getConfig();

  // Levantamento
  if(state.modo === 'levantamento'){
    return cfg.entrega?.levantamento || 30;
  }

  const zona = cfg.entrega?.zonas?.[state.zona];
  if(!zona) return 0;

  // Premium = dobro
  if(state.velocidade === 'premium'){
    const mult = cfg.entrega?.premium?.multiplicador || 2;
    return zona.valor * mult;
  }

  return zona.valor;
}

/* Tempo estimado para mostrar no resumo */
function calcularTempo(){
  const cfg = getConfig();
  if(state.modo === 'levantamento') return 'Imediato';
  if(state.velocidade === 'premium') return cfg.entrega?.premium?.tempo || 'até 30 minutos';
  return 'até 1 hora';
}

/* Preview dinâmico */
function updateDeliveryPreview(){
  const preview = $('#deliveryPreview');
  if(!preview) return;
  const cfg = getConfig();

  // Levantamento
  if(state.modo === 'levantamento'){
    preview.innerHTML = `🏪 Levantamento nas Bombas Êxito — <b>${cfg.entrega?.levantamento || 30} MT</b>`;
    return;
  }

  const valor = calcularEntrega();
  const tempo = calcularTempo();
  const tipo = state.velocidade === 'premium' ? '⚡ Premium' : '🚚 Normal';

  preview.innerHTML = `${tipo} · ${tempo} — <b>${valor} MT</b>`;
}

$('#useLocation')?.addEventListener('click', () => {
  const hint = $('#locHint');
  if(!navigator.geolocation){
    hint.textContent = 'Geolocalização não suportada. Escreva a localização manualmente.';
    return;
  }
  hint.textContent = 'A obter localização...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      $('#endereco').value = `Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`;
      hint.textContent = '✅ Localização obtida.';
      hint.classList.add('ok');
    },
    () => {
      hint.textContent = 'Não foi possível obter. Escreva manualmente.';
    }
  );
});

$('#backStep1')?.addEventListener('click', () => goToStep(1));

$('#toStep3')?.addEventListener('click', () => {
  state.endereco = $('#endereco')?.value.trim() || '';
  state.referencia = $('#referencia')?.value.trim() || '';
  state.nome = $('#nome')?.value.trim() || '';
  state.telefone = $('#telefone')?.value.trim() || '';

  if(!state.nome || !state.telefone){
    alert('Por favor, preencha o nome e o telefone.');
    return;
  }
  if(state.modo === 'entrega' && !state.endereco){
    alert('Por favor, informe o endereço / localização.');
    return;
  }

  goToStep(3);
  renderSummary();
});

/* ---------- STEP 3: RESUMO (arredondado no total) ---------- */
function renderSummary(){
  const p = state.produto;
  const precoUnit = p.preco || 0;
  const subtotal  = precoUnit * state.quantidade;
  const entrega   = calcularEntrega();
  const total     = subtotal + entrega;
  const totalArr  = arredondar(total);
  const unidade   = p.unidade?.split('/')?.[1] || 'L';
  const tempo     = calcularTempo();

  let modoLabel = '';
  let entregaLinha = '';

  if(state.modo === 'levantamento'){
    modoLabel = '🏪 Levantamento nas Bombas Êxito';
    entregaLinha = `<div class="summary-row"><span>Taxa de levantamento</span><b>${entrega} MT</b></div>`;
  } else {
    const zonaNome = getConfig().entrega?.zonas?.[state.zona]?.nome || '—';
    const tipo = state.velocidade === 'premium' ? '⚡ Premium' : '🚚 Normal';
    modoLabel = `Entrega — ${zonaNome}`;
    entregaLinha = `
      <div class="summary-row"><span>Tipo</span><b>${tipo} (${tempo})</b></div>
      <div class="summary-row"><span>Taxa de entrega</span><b>${entrega} MT</b></div>
    `;
  }

  $('#summary').innerHTML = `
    <div class="summary-section">
      <h4>Produto</h4>
      <div class="summary-row"><span>Combustível</span><b>${p.nome}</b></div>
      <div class="summary-row"><span>Quantidade</span><b>${state.quantidade} ${unidade}</b></div>
      <div class="summary-row"><span>Preço</span><b>${precoUnit} MT / ${unidade}</b></div>
      <div class="summary-row"><span>Subtotal</span><b>${subtotal.toFixed(2)} MT</b></div>
    </div>

    <div class="summary-section">
      <h4>${state.modo === 'entrega' ? 'Entrega' : 'Levantamento'}</h4>
      <div class="summary-row"><span>Modo</span><b>${modoLabel}</b></div>
      ${state.modo === 'entrega' ? `
        <div class="summary-row"><span>Endereço</span><b>${state.endereco}</b></div>
        ${state.referencia ? `<div class="summary-row"><span>Referência</span><b>${state.referencia}</b></div>` : ''}
      ` : ''}
      ${entregaLinha}
    </div>

    <div class="summary-section">
      <h4>Cliente</h4>
      <div class="summary-row"><span>Nome</span><b>${state.nome}</b></div>
      <div class="summary-row"><span>Telefone</span><b>${state.telefone}</b></div>
    </div>

    <div class="summary-row total">
      <span>TOTAL</span>
      <b>${totalArr} MT</b>
    </div>
  `;
}

$('#backStep2')?.addEventListener('click', () => goToStep(2));

$('#confirmOrder')?.addEventListener('click', () => {
  const cfg = getConfig();
  const p = state.produto;
  const precoUnit = p.preco || 0;
  const subtotal  = precoUnit * state.quantidade;
  const entrega   = calcularEntrega();
  const total     = subtotal + entrega;
  const totalArr  = arredondar(total);
  const unidade   = p.unidade?.split('/')?.[1] || 'L';
  const tempo     = calcularTempo();

  const zonaNome = state.modo === 'entrega'
    ? (cfg.entrega?.zonas?.[state.zona]?.nome || '—')
    : 'Levantamento';

  const pedidos = Store.get('exito_pedidos', []);
  const pedido = {
  cliente: state.nome,
  telefone: state.telefone,
  produto: p.nome,
  quantidade: state.quantidade,
  unidade,
  preco_unit: precoUnit,
  subtotal,
  modo: state.modo,
  velocidade: state.velocidade,
  zona: zonaNome,
  tempo,
  endereco: state.endereco,
  referencia: state.referencia,
  taxa: entrega,
  total: totalArr,
  status: 'PENDENTE'
};

/* ✅ ENVIA PARA O SUPABASE */
if(supabaseClient){
  supabaseClient
    .from('pedidos')
    .insert([pedido])
    .then(({ error }) => {
      if(error) console.error('❌ Erro ao gravar:', error);
      else console.log('✅ Pedido gravado no Supabase');
    });
} else {
  // Fallback: guarda localmente
  const pedidos = Store.get('exito_pedidos', []);
  pedidos.unshift({ ...pedido, id: 'P' + Date.now(), data: new Date().toISOString() });
  Store.set('exito_pedidos', pedidos);
}

  const linhas = [
    cfg.mensagemWhatsApp || 'Olá, Bombas Êxito!',
    '',
    `Cliente: ${state.nome}`,
    `Telefone: ${state.telefone}`,
    '',
    `Combustível: ${p.nome}`,
    `Quantidade: ${state.quantidade} ${unidade}`,
    `Preço: ${precoUnit} MT/${unidade}`,
    `Subtotal: ${subtotal.toFixed(2)} MT`,
    '',
    state.modo === 'entrega'
      ? `Entrega: ${state.velocidade === 'premium' ? '⚡ Premium' : '🚚 Normal'} (${tempo})`
      : 'Levantamento nas Bombas Êxito',
    state.modo === 'entrega' ? `Zona: ${zonaNome}` : '',
    state.modo === 'entrega' ? `Localização: ${state.endereco}` : '',
    state.modo === 'entrega' && state.referencia ? `Referência: ${state.referencia}` : '',
    entrega > 0 ? `Taxa: ${entrega} MT` : '',
    '',
    `TOTAL: ${totalArr} MT`,
    '',
    `Pedido registado no sistema.`,
    'Pedido realizado através do site das Bombas Êxito.'
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(linhas)}`, '_blank');

  $('#pedido').hidden = true;
  state.produto = null;
  alert('✅ Pedido registado! Continue no WhatsApp.');
});

/* ---------- GALERIA ---------- */
/* ---------- GALERIA (com fotos reais) ---------- */
const galeriaItems = [
  { cat:'estacao',      foto:'assents/images/estacao.jpg',      label:'Entrada Principal' },
  { cat:'combustiveis', foto:'assents/images/combustiveis.jpg', label:'Bomba de Gasolina' },
  { cat:'combustiveis', foto:'assents/images/deposito.jpg', label:'Depósitos' },
  { cat:'servicos',     foto:'assents/images/lubrificante.jpg',     label:'Lubrificantes' },
  { cat:'servicos',     foto:'assents/images/lojadeconveniencias.jpg',     label:'Loja de Conveniência' },
];
function renderGaleria(){
  const g = $('#gallery');
  if(!g) return;

  g.innerHTML = galeriaItems.map((it, i) => `
    <div class="gal-item" data-cat="${it.cat}" data-i="${i}">
      <img src="${it.foto}" alt="${it.label}" loading="lazy"/>
      <div class="gal-overlay">
        <b>${it.label}</b>
      </div>
    </div>
  `).join('');

  g.querySelectorAll('.gal-item').forEach(el => {
    el.addEventListener('click', () => openLightbox(el));
  });

  $$('.gf').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.gf').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      g.querySelectorAll('.gal-item').forEach(it => {
        it.classList.toggle('hidden', f !== 'todos' && it.dataset.cat !== f);
      });
    });
  });
}

function openLightbox(el){
  const lb = $('#lightbox');
  const img = el.querySelector('img');
  if(!img) return;

  $('#lbImg').src = img.src;
  $('#lbImg').alt = img.alt;
  lb.classList.add('active');
}
/* ---------- FECHAR LIGHTBOX ---------- */
document.addEventListener('click', e => {
  // Clicou no X
  if(e.target.closest('#lbClose')){
    $('#lightbox').classList.remove('active');
    return;
  }
  // Clicou no fundo escuro (fora da imagem)
  if(e.target.id === 'lightbox'){
    $('#lightbox').classList.remove('active');
  }
});

/* Fechar com tecla ESC */
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){
    $('#lightbox')?.classList.remove('active');
  }
});

/* ---------- SCROLL REVEAL ---------- */
function setupReveal(){
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold:.15 });

  $$('.fade-up, .step-card').forEach(el => {
    el.classList.add('fade-up');
    io.observe(el);
  });
}

/* ---------- CONFIG DINÂMICA ---------- */
function aplicarConfigNaUI(){
  const cfg = getConfig();
  const produtos = getProdutos();
  produtos.forEach(p => {
    $$(`.js-preco-${p.id}`).forEach(el => {
      el.textContent = `${p.preco} MT/${p.unidade?.split('/')?.[1]||'L'}`;
    });
  });

  if($('#locEndereco')) $('#locEndereco').textContent = cfg.empresa?.endereco || '';
  if($('#locTelefone')) $('#locTelefone').textContent = cfg.telefone || cfg.whatsapp;
  if($('#locHorario')) $('#locHorario').textContent = cfg.empresa?.horario || '';

  const floatLink = $('#floatWhats');
  if(floatLink){
    floatLink.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(cfg.mensagemWhatsApp)}`;
  }
  const locLink = $('#locWhatsApp');
  if(locLink){
    locLink.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent('Olá, gostaria de saber mais sobre as Bombas Êxito.')}`;
  }

  if($('#year')) $('#year').textContent = new Date().getFullYear();
}

/* ---------- INICIALIZAÇÃO ---------- */
document.addEventListener('DOMContentLoaded', () => {
  aplicarConfigNaUI();
  renderFuelCards();
  renderGaleria();
  setupReveal();
});