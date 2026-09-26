/* ============================================================
   GALP QUELIMANE — APP PRINCIPAL (index.html)
   Só UI — sem Supabase (só usado em pedido.js e admin.js)
   ============================================================ */

const Store = {
  get(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
};

function getProdutos(){ return Store.get('galp_produtos', PRODUTOS_PADRAO); }
function getConfig(){ return Store.get('galp_config', CONFIG); }

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ============ NAVBAR MOBILE ============ */
const hamburger = $('#hamburger');
const navLinks = $('#navLinks');

function fecharMenu(){
  navLinks?.classList.remove('open');
  hamburger?.classList.remove('active');
  document.querySelector('.nav-overlay')?.classList.remove('active');
  document.body.style.overflow = '';
}
function abrirMenu(){
  navLinks?.classList.add('open');
  hamburger?.classList.add('active');
  document.querySelector('.nav-overlay')?.classList.add('active');
  document.body.style.overflow = 'hidden';
}
hamburger?.addEventListener('click', () => {
  if(navLinks.classList.contains('open')) fecharMenu();
  else abrirMenu();
});
navLinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', fecharMenu));
document.querySelector('.nav-overlay')?.addEventListener('click', fecharMenu);

/* ============ CARDS COMBUSTÍVEIS ============ */
function renderFuelCards(){
  const grid = $('#fuelGrid');
  if(!grid) return;
  const produtos = getProdutos();

  grid.innerHTML = produtos.map(p => `
    <div class="fuel-card ${p.disponivel ? '' : 'unavailable'}" data-id="${p.id}">
      <div class="fc-head">
        <div class="fc-icon">${p.icon || '⛽'}</div>
        <span class="status ${p.disponivel ? 'ok' : 'off'}">
          ● ${p.disponivel ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
        </span>
      </div>
      <div class="fc-name">${p.nome}</div>
      <div class="fc-desc">${p.desc || ''}</div>
      <div class="fc-price">${p.preco} MT <small>/${p.unidade?.split('/')?.[1] || 'L'}</small></div>
      <button class="btn btn-primary fc-btn" ${p.disponivel ? '' : 'disabled'}>
        ${p.disponivel ? 'PEDIR AGORA' : 'INDISPONÍVEL'}
      </button>
    </div>
  `).join('');

  grid.querySelectorAll('.fuel-card:not(.unavailable) .fc-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.target.closest('.fuel-card').dataset.id;
      window.location.href = `pedido.html?produto=${id}`;
    });
  });
}

/* ============ GALERIA ============ */
const galeriaItems = [
  { cat:'estacao', emoji:'🏢', label:'Estação principal' },
  { cat:'estacao', emoji:'⛽', label:'Área de bombas' },
  { cat:'combustiveis', emoji:'🛢️', label:'Depósitos' },
  { cat:'combustiveis', emoji:'⛽', label:'Bomba de gasolina' },
  { cat:'servicos', emoji:'🚗', label:'Serviços de apoio' },
  { cat:'servicos', emoji:'🌙', label:'Iluminação noturna' }
];

function renderGaleria(){
  const g = $('#gallery');
  if(!g) return;
  g.innerHTML = galeriaItems.map((it,i) => `
    <div class="gal-item" data-cat="${it.cat}" data-i="${i}">
      <span class="emoji">${it.emoji}</span>
      <b>${it.label}</b>
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
  $('#lbImg').src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1A0E05"/><stop offset="1" stop-color="#E30613"/>
      </linearGradient></defs>
      <rect width="800" height="600" fill="url(#g)"/>
      <text x="400" y="300" text-anchor="middle" fill="#FFD200"
        font-family="sans-serif" font-size="42" font-weight="700">GALP QUELIMANE</text>
      <text x="400" y="350" text-anchor="middle" fill="#fff"
        font-family="sans-serif" font-size="20">${el.querySelector('b').textContent}</text>
    </svg>
  `);
  lb.classList.add('active');
}

document.addEventListener('click', e => {
  if(e.target.closest('#lbClose')) $('#lightbox')?.classList.remove('active');
  if(e.target.id === 'lightbox') $('#lightbox')?.classList.remove('active');
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') $('#lightbox')?.classList.remove('active');
});

/* ============ SCROLL REVEAL ============ */
function setupReveal(){
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold:.15 });
  $$('.fade-up, .step-card').forEach(el => { el.classList.add('fade-up'); io.observe(el); });
}

/* ============ CONFIG NA UI ============ */
function aplicarConfig(){
  const cfg = getConfig();
  if($('#locEndereco')) $('#locEndereco').textContent = cfg.empresa?.endereco || '';
  if($('#locTelefone')) $('#locTelefone').textContent = cfg.telefone || cfg.whatsapp;
  if($('#locHorario'))  $('#locHorario').textContent  = cfg.empresa?.horario || '';

  const floatLink = $('#floatWhats');
  if(floatLink) floatLink.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(cfg.mensagemWhatsApp)}`;
  const locLink = $('#locWhatsApp');
  if(locLink) locLink.href = `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de saber mais.')}`;

  if($('#year')) $('#year').textContent = new Date().getFullYear();
}

/* ============ INIT ============ */
document.addEventListener('DOMContentLoaded', () => {
  aplicarConfig();
  renderFuelCards();
  renderGaleria();
  setupReveal();
});