/* ============================================================
   GALP QUELIMANE — ADMIN (com Supabase sync)
   ============================================================ */

const SESSION_KEY = 'galp_admin_session';
if(localStorage.getItem(SESSION_KEY) !== 'ok'){
  window.location.replace('login.html');
}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const Store = {
  get(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
};

/* ============ SUPABASE ============ */
let supabaseClient = null;
try{
  const supaCfg = (typeof CONFIG !== 'undefined' && CONFIG.supabase) ? CONFIG.supabase : null;

  if(!window.supabase){
    console.warn('⚠️ CDN do Supabase não carregou');
  } else if(!supaCfg || !supaCfg.url || !supaCfg.key){
    console.warn('⚠️ CONFIG.supabase está vazio ou em falta');
    console.log('CONFIG.supabase =', supaCfg);
  } else {
    supabaseClient = window.supabase.createClient(supaCfg.url, supaCfg.key);
    console.log('✅ Admin ligado ao Supabase');
  }
}catch(err){ console.error('❌ Erro Supabase:', err); }

let filtroAtual = 'todos';

/* ============ CARREGAR PRODUTOS DO SUPABASE ============ */
async function carregarProdutos(){
  if(!supabaseClient) return Store.get('galp_produtos', PRODUTOS_PADRAO);
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
    console.error('❌ Erro produtos:', err);
    return Store.get('galp_produtos', PRODUTOS_PADRAO);
  }
}

/* ============ CARREGAR ESTAÇÕES DO SUPABASE ============ */
async function carregarEstacoes(){
  if(!supabaseClient) return (Store.get('galp_config', CONFIG).estacoes || []);
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

    const cfg = Store.get('galp_config', CONFIG);
    cfg.estacoes = estacoes;
    Store.set('galp_config', cfg);
    return estacoes;
  }catch(err){
    console.error('❌ Erro estações:', err);
    return (Store.get('galp_config', CONFIG).estacoes || []);
  }
}
/* ============================================================
   CARREGAR PRODUTOS E ESTAÇÕES DO SUPABASE
   ============================================================ */
async function carregarProdutos(){
  if(!supabaseClient) return Store.get('galp_produtos', PRODUTOS_PADRAO);
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
    console.error('❌ Erro produtos:', err);
    return Store.get('galp_produtos', PRODUTOS_PADRAO);
  }
}

async function carregarEstacoes(){
  if(!supabaseClient) return (Store.get('galp_config', CONFIG).estacoes || []);
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

    // Guarda também no galp_config para o cliente ler
    const cfg = Store.get('galp_config', CONFIG);
    cfg.estacoes = estacoes;
    Store.set('galp_config', cfg);
    return estacoes;
  }catch(err){
    console.error('❌ Erro estações:', err);
    return (Store.get('galp_config', CONFIG).estacoes || []);
  }
}

async function carregarPedidos(){
  if(!supabaseClient) return;
  try{
    const { data, error } = await supabaseClient
      .from('pedidos_galp')
      .select('*')
      .order('created_at', { ascending: false });

    if(error) throw error;

    const pedidos = (data || []).map(p => ({
      id: 'G' + p.id,
      dbId: p.id,
      data: p.created_at,
      cliente: p.cliente,
      telefone: p.telefone,
      produto: p.produto,
      quantidade: p.quantidade,
      unidade: p.unidade || 'L',
      precoUnit: p.preco_unit,
      subtotal: p.subtotal,
      codigo: p.codigo_retirada || '—',
      estacaoNome: p.estacao_nome,
      estacaoEndereco: p.estacao_endereco,
      modo: 'retirada',                    // sempre retirada agora
      taxa: p.taxa,
      total: p.total,
      status: p.status
    }));

    Store.set('galp_pedidos', pedidos);
    return pedidos;
  }catch(err){
    console.error('❌', err);
    return Store.get('galp_pedidos', []);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const app = $('#adminApp');
  if(app) app.style.visibility = 'visible';

  const d = new Date();
  const dataFmt = d.toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const horaFmt = d.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
  if($('#welcomeDate')) $('#welcomeDate').textContent = `${dataFmt} · ${horaFmt}`;

  // ⭐ Carrega do Supabase PRIMEIRO
  await carregarProdutos();
  await carregarEstacoes();
  await carregarPedidosDoServidor();

  renderTudo();

  // Atualiza a cada 30s
  setInterval(async () => {
    await carregarProdutos();
    await carregarEstacoes();
    renderSwitches();
    renderSwitchesEstacoes();
  }, 30000);
});

/* ============ LOGOUT ============ */
$('#logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  window.location.replace('login.html');
});

/* ============ RENDER ============ */
function renderTudo(){
  renderSwitches();
  renderSwitchesEstacoes();
  renderPendentes();
  renderTabela();
}

function renderSwitches(){
  const lista = Store.get('galp_produtos', PRODUTOS_PADRAO);
  const el = $('#switchList');
  if(!el) return;

  el.innerHTML = lista.map(p => `
    <div class="switch-row">
      <div class="switch-info">
        <span class="sw-icon">${p.icon || '⛽'}</span>
        <div>
          <b>${p.nome}</b>
          <small>${p.disponivel ? '🟢 Disponível' : '⚪ Indisponível'}</small>
        </div>
      </div>
      <label class="switch">
        <input type="checkbox" data-id="${p.id}" ${p.disponivel ? 'checked' : ''}/>
        <span class="slider"></span>
      </label>
    </div>
  `).join('');

  $$('[data-id]').forEach(chk => {
    chk.addEventListener('change', async () => {
      const novoEstado = chk.checked;

      // 1) GRAVA NO SUPABASE (servidor central)
      if(supabaseClient){
        const { error } = await supabaseClient
          .from('galp_produtos_config')
          .update({ disponivel: novoEstado })
          .eq('id', chk.dataset.id);

        if(error){
          console.error('❌', error);
          alert('Erro ao guardar no servidor. Tenta novamente.');
          chk.checked = !novoEstado;
          return;
        }
        console.log(`✅ Supabase: ${chk.dataset.id} → ${novoEstado ? 'ON' : 'OFF'}`);
      }

      // 2) Atualiza cache local
      const lista = Store.get('galp_produtos', PRODUTOS_PADRAO);
      const p = lista.find(x => x.id === chk.dataset.id);
      if(p){ p.disponivel = novoEstado; Store.set('galp_produtos', lista); }

      renderSwitches();
    });
  });
}

function renderSwitchesEstacoes(){
  const cfg = Store.get('galp_config', CONFIG);
  const el = $('#switchEstacoes');
  if(!el) return;

  const estacoes = cfg.estacoes || [];

  el.innerHTML = estacoes.map(e => `
    <div class="switch-row">
      <div class="switch-info">
        <span class="sw-icon">⛽</span>
        <div>
          <b>${e.nome}</b>
          <small>${e.disponivel ? '🟢 Disponível' : '⚪ Indisponível'} — ${e.endereco || ''}</small>
        </div>
      </div>
      <label class="switch">
        <input type="checkbox" data-estacao="${e.id}" ${e.disponivel ? 'checked' : ''}/>
        <span class="slider"></span>
      </label>
    </div>
  `).join('');

  $$('[data-estacao]').forEach(chk => {
    chk.addEventListener('change', async () => {
      const novoEstado = chk.checked;

      // 1) GRAVA NO SUPABASE
      if(supabaseClient){
        const { error } = await supabaseClient
          .from('galp_estacoes_config')
          .update({ disponivel: novoEstado })
          .eq('id', chk.dataset.estacao);

        if(error){
          console.error('❌', error);
          alert('Erro ao guardar no servidor. Tenta novamente.');
          chk.checked = !novoEstado;
          return;
        }
        console.log(`✅ Supabase: ${chk.dataset.estacao} → ${novoEstado ? 'ON' : 'OFF'}`);
      }

      // 2) Atualiza cache local
      const cfg = Store.get('galp_config', CONFIG);
      const est = cfg.estacoes.find(x => x.id === chk.dataset.estacao);
      if(est){ est.disponivel = novoEstado; Store.set('galp_config', cfg); }

      renderSwitchesEstacoes();
    });
  });
}

function renderPendentes(){
  const pedidos = Store.get('galp_pedidos', []);
  const pendentes = pedidos.filter(p =>
    p.status === 'PENDENTE' || p.status === 'PREPARACAO'
  );

  $('#pendentesCount').textContent = pendentes.length;

  const container = $('#pendentesList');
  if(!container) return;

  if(!pendentes.length){
    container.innerHTML = `<p class="empty">✅ Nenhum pedido pendente.</p>`;
    return;
  }

  container.innerHTML = pendentes.map(p => {
    const label = {
      PENDENTE:   { txt:'Pendente',       color:'#FFD200' },
      PREPARACAO: { txt:'Pronto a retirar', color:'#4D9FFF' }
    }[p.status] || { txt:'Pendente', color:'#FFD200' };

    return `
      <div class="receipt pending">
        <div class="receipt-head">
          <span class="receipt-id">#${p.codigo || p.id.slice(-6)}</span>
          <span class="receipt-date">${new Date(p.data).toLocaleString('pt-PT')}</span>
        </div>
        <div class="receipt-body">
          <div class="receipt-row"><span>Cliente</span><b>${p.cliente}</b></div>
          <div class="receipt-row"><span>Telefone</span><b>${p.telefone}</b></div>
          <div class="receipt-row"><span>Estação</span><b>⛽ ${p.estacaoNome || '—'}</b></div>
          <div class="receipt-row"><span>Endereço</span><b>${p.estacaoEndereco || '—'}</b></div>
          <div class="receipt-row"><span>Combustível</span><b>${p.produto}</b></div>
          <div class="receipt-row"><span>Quantidade</span><b>${p.quantidade} ${p.unidade}</b></div>
          <div class="receipt-row"><span>Taxa de serviço</span><b>${p.taxa} MT</b></div>
          <div class="receipt-row total"><span>TOTAL</span><b>${p.total} MT</b></div>
        </div>
        <div class="receipt-foot">
          <span class="status-dot" style="background:${label.color}"></span>
          <span style="color:${label.color};font-weight:600">${label.txt}</span>

          <div class="action-buttons">
            <button class="btn-action btn-imprimir-mini" data-imprimir="${p.id}">🖨️ Recibo</button>
            <button class="btn-action btn-entregue" data-entregue="${p.id}">✅ Entregue</button>
            <button class="btn-action btn-cancelar" data-cancelar="${p.id}">❌ Cancelado</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  $$('[data-entregue]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Confirmar que este pedido foi retirado?')) return;
      atualizarStatus(b.dataset.entregue, 'ENTREGUE');
    });
  });

  $$('[data-cancelar]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Cancelar este pedido?')) return;
      atualizarStatus(b.dataset.cancelar, 'CANCELADO');
    });
  });

  $$('[data-imprimir]').forEach(b => {
    b.addEventListener('click', () => imprimirRecibo(b.dataset.imprimir));
  });
}

function renderTabela(){
  const pedidos = Store.get('galp_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos') filtrados = pedidos.filter(p => p.status === filtroAtual);

  $('#totalRegistos').textContent = `${filtrados.length} registos`;

  const body = $('#tabelaPedidosBody');
  if(!body) return;

  if(!filtrados.length){
    body.innerHTML = `<tr><td colspan="12" class="empty">Sem registos.</td></tr>`;
    $('#totalGeral').textContent = '0 MT';
    return;
  }

  body.innerHTML = filtrados.map((p, i) => {
    const isEntregue  = p.status === 'ENTREGUE';
    const isCancelado = p.status === 'CANCELADO';
    const isPendente  = !isEntregue && !isCancelado;

    const badgeClass = isEntregue ? 'badge-entregue'
                     : isCancelado ? 'badge-cancelado'
                     : 'badge-pendente';

    const acoes = isPendente
      ? `<div class="acoes-linha">
          <button class="btn-mini btn-entregue-mini" data-entregue="${p.id}">✅</button>
          <button class="btn-mini btn-cancelar-mini" data-cancelar="${p.id}">❌</button>
          <button class="btn-mini btn-imprimir-mini" data-imprimir="${p.id}">🖨️</button>
        </div>`
      : `<div class="acoes-linha">
          <span class="txt-final">${isEntregue ? '✅ Finalizado' : '❌ Cancelado'}</span>
          <button class="btn-mini btn-imprimir-mini" data-imprimir="${p.id}">🖨️</button>
        </div>`;

    return `
      <tr>
        <td>${i + 1}</td>
        <td><b>#${p.codigo || p.id.slice(-6)}</b></td>
        <td>${new Date(p.data).toLocaleDateString('pt-PT')}</td>
        <td>${p.cliente}</td>
        <td>${p.telefone || '—'}</td>
        <td>⛽ ${p.estacaoNome || '—'}</td>
        <td>${p.produto}</td>
        <td>${p.quantidade} ${p.unidade}</td>
        <td>${p.taxa ? p.taxa + ' MT' : '—'}</td>
        <td><b>${p.total} MT</b></td>
        <td><span class="badge ${badgeClass}">${p.status}</span></td>
        <td>${acoes}</td>
      </tr>
    `;
  }).join('');

  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);
  $('#totalGeral').textContent = `${total} MT`;

  body.querySelectorAll('[data-entregue]').forEach(b => b.addEventListener('click', () => {
    if(!confirm('Marcar como ENTREGUE?')) return;
    atualizarStatus(b.dataset.entregue, 'ENTREGUE');
  }));
  body.querySelectorAll('[data-cancelar]').forEach(b => b.addEventListener('click', () => {
    if(!confirm('Cancelar?')) return;
    atualizarStatus(b.dataset.cancelar, 'CANCELADO');
  }));
  body.querySelectorAll('[data-imprimir]').forEach(b => b.addEventListener('click', () => imprimirRecibo(b.dataset.imprimir)));
}

/* ============ FILTROS ============ */
$$('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtual = btn.dataset.filtro;
    renderTabela();
  });
});

/* ============ ATUALIZAR STATUS ============ */
async function atualizarStatus(id, novoStatus){
  const pedidos = Store.get('galp_pedidos', []);
  const p = pedidos.find(x => x.id === id);
  if(!p) return;

  if(supabaseClient && p.dbId){
    try{
      if(novoStatus === 'CANCELADO'){
        await supabaseClient.from('pedidos_galp').delete().eq('id', p.dbId);
        Store.set('galp_pedidos', pedidos.filter(x => x.id !== id));
      } else {
        await supabaseClient.from('pedidos_galp').update({ status: novoStatus }).eq('id', p.dbId);
        p.status = novoStatus;
        Store.set('galp_pedidos', pedidos);
      }
    }catch(err){
      console.error('❌', err);
      alert('Erro ao comunicar com o servidor.');
      return;
    }
  } else {
    if(novoStatus === 'CANCELADO'){
      Store.set('galp_pedidos', pedidos.filter(x => x.id !== id));
    } else {
      p.status = novoStatus;
      Store.set('galp_pedidos', pedidos);
    }
  }

  renderPendentes();
  renderTabela();
}

/* ============ IMPRIMIR (mantém o que já tinhas) ============ */
function imprimirRecibo(id){
  const pedidos = Store.get('galp_pedidos', []);
  const p = pedidos.find(x => x.id === id);
  if(!p){ alert('Pedido não encontrado.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  desenharReciboGrande(doc, p);
  doc.save(`Recibo_${p.id.slice(-6)}.pdf`);
}

/* ============ EXTRATO COMPLETO ============ */
$('#imprimirExtrato')?.addEventListener('click', () => {
  const pedidos = Store.get('galp_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos') filtrados = pedidos.filter(p => p.status === filtroAtual);
  if(!filtrados.length){ alert('Sem pedidos.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const pageW = 297, margin = 10;

  doc.setFillColor(26, 14, 5);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(255, 102, 0);
  doc.triangle(0, 22, 35, 22, 0, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GALP QUELIMANE', margin, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Quelimane · Moçambique', margin, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('EXTRATO DE PEDIDOS', pageW - margin, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-PT')}`, margin, 30);
  doc.text(`Total: ${filtrados.length}`, pageW - margin, 30, { align: 'right' });

  const linhas = filtrados.map((p, i) => [
    i + 1, p.id.slice(-6), new Date(p.data).toLocaleDateString('pt-PT'),
    p.cliente, p.telefone || '—', p.estacaoNome || '—', p.produto,
    `${p.quantidade} ${p.unidade || 'L'}`,
    p.modo === 'entrega' ? (p.velocidade === 'premium' ? 'Premium' : 'Normal') : 'Levant.',
    p.zona || '—', p.entrega ? `${p.entrega} MT` : '—', `${p.total} MT`, p.status
  ]);
  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);

  doc.autoTable({
    startY: 36,
    head: [['#','ID','Data','Cliente','Telefone','Estação','Combustível','Qtd','Modo','Zona','Taxa','Total','Estado']],
    body: linhas,
    foot: [['','','','','','','','','','','TOTAL:',`${total} MT`,'']],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor:[26,14,5], textColor:[255,255,255], fontStyle:'bold', halign:'center' },
    footStyles: { fillColor:[255,210,0], textColor:[26,14,5], fontStyle:'bold' },
    alternateRowStyles: { fillColor:[255,245,235] },
    margin: { left: margin, right: margin }
  });

  doc.save(`Extrato_GALP_${new Date().toISOString().slice(0,10)}.pdf`);
});

/* ============ RECIBOS MINI ============ */
$('#imprimirMini')?.addEventListener('click', () => {
  const pedidos = Store.get('galp_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos') filtrados = pedidos.filter(p => p.status === filtroAtual);
  if(!filtrados.length){ alert('Sem pedidos.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cols = 6, rows = 5, porPagina = cols * rows;
  const mX = 5, mY = 5, gX = 1.5, gY = 1.5;
  const cW = (210 - mX*2 - gX*(cols-1)) / cols;
  const cH = (297 - mY*2 - gY*(rows-1)) / rows;

  filtrados.forEach((p, i) => {
    const pos = i % porPagina;
    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const x = mX + col * (cW + gX);
    const y = mY + row * (cH + gY);
    if(i > 0 && pos === 0) doc.addPage();
    desenharReciboMini(doc, p, x, y, cW, cH);
  });

  doc.save(`Recibos_GALP_${filtrados.length}.pdf`);
});

/* ============ DESENHOS (mini + grande) ============ */
function desenharReciboMini(doc, p, x, y, w, h){
  const escuro = [26, 14, 5], laranja = [255, 102, 0];
  const cinzaClaro = [230, 230, 230], cinza = [120, 120, 120];

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.setLineDash([1, 1], 0);
  doc.roundedRect(x, y, w, h, 1, 1, 'S');
  doc.setLineDash([], 0);

  doc.setFillColor(...escuro); doc.rect(x, y, w, 7, 'F');
  doc.setFillColor(...laranja); doc.rect(x, y, 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
  doc.text('GALP QUELIMANE', x + 3, y + 4.5);
  doc.setFontSize(5); doc.setTextColor(255, 210, 0);
  doc.text(`#${p.id.slice(-6)}`, x + w - 1.5, y + 4.5, { align: 'right' });

  let cy = y + 8;
  doc.setDrawColor(...cinzaClaro); doc.setLineWidth(0.15);
  doc.line(x + 2, cy, x + w - 2, cy); cy += 3;

  doc.setTextColor(...cinza); doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5);
  doc.text('CLIENTE', x + 2, cy); cy += 2.5;
  doc.setTextColor(20, 20, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
  doc.text((p.cliente || '—').substring(0, 22), x + 2, cy); cy += 2.8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(60, 60, 60);
  doc.text(p.telefone || '—', x + 2, cy); cy += 3.5;

  doc.setDrawColor(...cinzaClaro); doc.line(x + 2, cy, x + w - 2, cy); cy += 3;
  doc.setTextColor(...cinza); doc.setFontSize(4.5);
  doc.text('ESTAÇÃO', x + 2, cy); cy += 2.5;
  doc.setTextColor(20, 20, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
  doc.text((p.estacaoNome || '—').substring(0, 24), x + 2, cy); cy += 3.5;

  doc.setDrawColor(...cinzaClaro); doc.line(x + 2, cy, x + w - 2, cy); cy += 3;
  doc.setTextColor(...cinza); doc.setFont('helvetica', 'normal'); doc.setFontSize(4.5);
  doc.text('COMBUSTÍVEL', x + 2, cy); cy += 2.5;
  doc.setTextColor(20, 20, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(6);
  doc.text(p.produto || '—', x + 2, cy); cy += 3;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(60, 60, 60);
  doc.text(`${p.quantidade} ${p.unidade || 'L'} × ${p.precoUnit || '—'} MT`, x + 2, cy); cy += 3.5;

  doc.setDrawColor(...cinzaClaro); doc.line(x + 2, cy, x + w - 2, cy); cy += 3;
  doc.setTextColor(...cinza); doc.setFontSize(4.5);
  doc.text('MODO', x + 2, cy); cy += 2.5;
  doc.setTextColor(20, 20, 30); doc.setFont('helvetica', 'normal'); doc.setFontSize(5);
  const modoTxt = p.modo === 'entrega'
    ? `${p.velocidade === 'premium' ? 'PREMIUM' : 'Normal'} — ${p.zona || ''}`
    : 'Levantamento';
  doc.text(modoTxt.substring(0, 28), x + 2, cy); cy += 2.8;
  doc.setTextColor(60, 60, 60);
  doc.text(`Taxa: ${p.entrega ? p.entrega + ' MT' : '—'}`, x + 2, cy);

  const totalY = y + h - 8;
  doc.setFillColor(...escuro); doc.rect(x, totalY, w, 8, 'F');
  doc.setFillColor(...laranja); doc.rect(x, totalY, 2, 8, 'F');
  doc.setTextColor(255, 210, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(5);
  doc.text('TOTAL', x + 3, totalY + 3);
  doc.setTextColor(255, 255, 255); doc.setFontSize(9);
  doc.text(`${p.total} MT`, x + w - 2, totalY + 5.5, { align: 'right' });

  const sc = { PENDENTE:[255,210,0], PREPARACAO:[77,159,255], CAMINHO:[255,168,77], ENTREGUE:[0,200,83], CANCELADO:[227,6,19] };
  const cor = sc[p.status] || [150,150,150];
  doc.setFillColor(...cor); doc.circle(x + 3, y + h - 1.5, 0.7, 'F');
  doc.setTextColor(...cor); doc.setFontSize(4);
  doc.text(p.status, x + 5, y + h - 0.7);
}

function desenharReciboGrande(doc, p){
  const x = 8, w = 148 - 16;
  const escuro = [26, 14, 5], laranja = [255, 102, 0];

  doc.setFillColor(...escuro); doc.rect(0, 0, 148, 26, 'F');
  doc.setFillColor(...laranja); doc.triangle(0, 26, 30, 26, 0, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('GALP QUELIMANE', x, 11);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('Quelimane · Moçambique', x, 17);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('PEDIDO', 148 - x, 11, { align: 'right' });
  doc.setFontSize(14); doc.setTextColor(255, 210, 0);
  doc.text(`#${p.id.slice(-6)}`, 148 - x, 18, { align: 'right' });

  let y = 34;
  doc.setTextColor(120, 120, 120); doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Emitido: ${new Date(p.data).toLocaleString('pt-PT')}`, x, y);
  doc.text(`Estado: ${p.status}`, 148 - x, y, { align: 'right' }); y += 8;

  function caixa(titulo, linhas){
    const altura = 7 + linhas.length * 6 + 4;
    doc.setFillColor(255, 250, 245);
    doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, altura, 1.5, 1.5, 'FD');
    doc.setFillColor(...laranja); doc.rect(x, y, 1.5, altura, 'F');
    doc.setTextColor(...escuro); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(titulo.toUpperCase(), x + 4, y + 5);
    let ly = y + 11; doc.setFontSize(9);
    linhas.forEach(([c, v]) => {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
      doc.text(c, x + 4, ly);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 20, 30);
      doc.text(String(v).substring(0, 40), x + w - 4, ly, { align: 'right' });
      ly += 6;
    });
    y += altura + 3;
  }

  caixa('Cliente', [['Nome', p.cliente || '—'], ['Telefone', p.telefone || '—']]);
  caixa('Estação GALP', [['Posto', p.estacaoNome || '—']]);
  caixa('Combustível', [
    ['Produto', p.produto],
    ['Quantidade', `${p.quantidade} ${p.unidade || 'L'}`],
    ['Preço unitário', `${p.precoUnit} MT`],
    ['Subtotal', `${p.subtotal} MT`],
  ]);

  const modoTxt = p.modo === 'entrega'
    ? `${p.velocidade === 'premium' ? 'Premium' : 'Normal'} — ${p.zona || '—'}`
    : 'Levantamento';
  const lE = [['Modo', modoTxt], ['Tempo', p.tempo || '—']];
  if(p.modo === 'entrega'){
    lE.push(['Endereço', p.endereco || '—']);
    if(p.referencia) lE.push(['Referência', p.referencia]);
  }
  if(p.observacoes) lE.push(['Obs.', p.observacoes]);
  lE.push(['Taxa', p.entrega ? `${p.entrega} MT` : '—']);
  caixa('Entrega', lE);

  y += 2;
  const tH = 16;
  doc.setFillColor(...escuro); doc.roundedRect(x, y, w, tH, 2, 2, 'F');
  doc.setFillColor(...laranja); doc.rect(x, y, 2, tH, 'F');
  doc.setTextColor(255, 210, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('TOTAL', x + 5, y + 6);
  doc.setFontSize(20); doc.setTextColor(255, 255, 255);
  doc.text(`${p.total} MT`, x + w - 5, y + 11, { align: 'right' });
  doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text('GALP Quelimane · Documento gerado automaticamente', 74, 200, { align: 'center' });
}

/* ============ FECHAR DIA / APAGAR ============ */
document.addEventListener('click', async e => {
  if(e.target.closest('#fecharDia')){
    const pedidos = Store.get('galp_pedidos', []);
    const entregues = pedidos.filter(p => p.status === 'ENTREGUE');
    if(!entregues.length){ alert('Não há entregues.'); return; }
    if(!confirm(`Apagar ${entregues.length} pedidos entregues?`)) return;
    if(supabaseClient){
      for(const p of entregues){
        if(p.dbId) await supabaseClient.from('pedidos_galp').delete().eq('id', p.dbId);
      }
    }
    Store.set('galp_pedidos', pedidos.filter(p => p.status !== 'ENTREGUE'));
    renderPendentes(); renderTabela();
    alert('✅ Dia fechado.');
  }
});

document.addEventListener('click', async e => {
  if(e.target.closest('#apagarTudo')){
    if(!confirm('⚠️ Apagar TODOS os pedidos?')) return;
    if(supabaseClient) await supabaseClient.from('pedidos_galp').delete().neq('id', 0);
    Store.set('galp_pedidos', []);
    renderPendentes(); renderTabela();
    alert('✅ Extrato limpo.');
  }
});