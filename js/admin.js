
/* ============================================================
   GALP QUELIMANE — ADMIN
   ============================================================ */

const SESSION_KEY = 'galp_admin_session';

if(localStorage.getItem(SESSION_KEY) !== 'ok'){
  window.location.replace('login.html');
}

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const Store = {
  get(key, fallback){
    try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch{ return fallback; }
  },
  set(key, v){ localStorage.setItem(key, JSON.stringify(v)); }
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
    console.log('✅ Admin ligado ao Supabase');
  }
}catch(err){
  console.error('❌ Erro Supabase:', err);
}

/* ============================================================
   CARREGAR PEDIDOS DO SUPABASE (substitui o localStorage)
   ============================================================ */
async function carregarPedidosDoServidor(){
  if(!supabaseClient) return;
  try{
    const { data, error } = await supabaseClient
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if(error) throw error;

    // Converte para o formato do admin
    const pedidos = (data || []).map(p => ({
      id: 'P' + p.id,
      dbId: p.id,
      data: p.created_at,
      cliente: p.cliente,
      telefone: p.telefone,
      produto: p.produto,
      quantidade: p.quantidade,
      unidade: p.unidade,
      precoUnit: p.preco_unit,
      subtotal: p.subtotal,
      modo: p.modo,
      velocidade: p.velocidade,
      zona: p.zona,
      tempo: p.tempo,
      endereco: p.endereco,
      referencia: p.referencia,
      entrega: p.taxa,
      total: p.total,
      status: p.status
    }));

    // Guarda em cache local para renderização rápida
    Store.set('exito_pedidos', pedidos);
    return pedidos;
  }catch(err){
    console.error('❌ Erro ao carregar:', err);
    return Store.get('exito_pedidos', []);
  }
}

function ensureData(){
  if(!localStorage.getItem('galp_config'))    Store.set('galp_config', CONFIG);
  if(!localStorage.getItem('galp_produtos'))  Store.set('galp_produtos', PRODUTOS_PADRAO);
  if(!localStorage.getItem('galp_pedidos'))   Store.set('galp_pedidos', []);
}
ensureData();

let filtroAtual = 'todos';

document.addEventListener('DOMContentLoaded', async () => {
  const app = $('#adminApp');
  if(app) app.style.visibility = 'visible';

  const d = new Date();
  const dataFmt = d.toLocaleDateString('pt-PT', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
  const horaFmt = d.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
  const wd = $('#welcomeDate');
  if(wd) wd.textContent = `${dataFmt} · ${horaFmt}`;

  // ✅ Carrega do Supabase primeiro
  await carregarPedidosDoServidor();

  renderTudo();

  // ✅ Atualiza a cada 30 segundos automaticamente
  setInterval(async () => {
    await carregarPedidosDoServidor();
    renderPendentes();
    renderTabela();
  }, 30000);
});

/* ---------- LOGOUT ---------- */
$('#logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.replace('login.html');
});

/* ---------- RENDER GERAL ---------- */
function renderTudo(){
  renderSwitches();
  renderSwitchesEstacoes(); 
  renderPendentes();
  renderTabela();
}

/* ---------- SWITCHES ---------- */
function renderSwitches(){
  const lista = Store.get('exito_produtos', PRODUTOS_PADRAO);
  const el = $('#switchList');
  if(!el) return;

  el.innerHTML = lista.map(p => `
    <div class="switch-row">
      <div class="switch-info">
        <span class="sw-icon">${p.icon}</span>
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
    chk.addEventListener('change', () => {
      const lista = Store.get('exito_produtos', PRODUTOS_PADRAO);
      const p = lista.find(x => x.id === chk.dataset.id);
      if(p){ p.disponivel = chk.checked; Store.set('exito_produtos', lista); }
      renderSwitches();
    });
  });
}

/* ============ SWITCHES ESTAÇÕES GALP ============ */
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
    chk.addEventListener('change', () => {
      const cfg = Store.get('galp_config', CONFIG);
      const est = cfg.estacoes.find(x => x.id === chk.dataset.estacao);
      if(est){
        est.disponivel = chk.checked;
        Store.set('galp_config', cfg);
      }
      renderSwitchesEstacoes();
    });
  });
}

/* ---------- PEDIDOS PENDENTES ---------- */
function renderPendentes(){
  const pedidos = Store.get('exito_pedidos', []);
  const pendentes = pedidos.filter(p =>
    p.status === 'PENDENTE' || p.status === 'PREPARACAO' || p.status === 'CAMINHO'
  );

  $('#pendentesCount').textContent = pendentes.length;

  const container = $('#pendentesList');
  if(!container) return;

  if(!pendentes.length){
    container.innerHTML = `<p class="empty">✅ Nenhum pedido pendente. Bom trabalho!</p>`;
    return;
  }

  container.innerHTML = pendentes.map(p => {
    const label = {
      PENDENTE:   { txt:'Pendente',       color:'#FFD200' },
      PREPARACAO: { txt:'Em preparação',  color:'#4D9FFF' },
      CAMINHO:    { txt:'A caminho',      color:'#FFA84D' }
    }[p.status] || { txt:'Pendente', color:'#FFD200' };

    return `
      <div class="receipt pending">
        <div class="receipt-head">
          <span class="receipt-id">${p.id.slice(-6)}</span>
          <span class="receipt-date">${new Date(p.data).toLocaleString('pt-PT')}</span>
        </div>
        <div class="receipt-body">
          <div class="receipt-row"><span>Cliente</span><b>${p.cliente}</b></div>
          <div class="receipt-row"><span>Telefone</span><b>${p.telefone}</b></div>
          <div class="receipt-row"><span>Produto</span><b>${p.produto}</b></div>
          <div class="receipt-row"><span>Qtd</span><b>${p.quantidade} ${p.unidade || 'L'}</b></div>
          <div class="receipt-row"><span>Modo</span><b>${
            p.modo === 'entrega'
              ? `${p.velocidade === 'premium' ? '⚡ Premium' : '🚚 Normal'} — ${p.zona || '—'}`
              : '🏪 Levantamento'
          }</b></div>
          ${p.modo === 'entrega' ? `
            <div class="receipt-row"><span>Local</span><b>${p.endereco || '—'}</b></div>
            ${p.referencia ? `<div class="receipt-row"><span>Ref.</span><b>${p.referencia}</b></div>` : ''}
          ` : ''}
          <div class="receipt-row"><span>Taxa</span><b>${p.entrega ? p.entrega + ' MT' : 'GRÁTIS'}</b></div>
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
      if(!confirm('Confirmar que este pedido foi ENTREGUE?')) return;
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

/* ---------- TABELA TIPO EXCEL ---------- */
function renderTabela(){
  const pedidos = Store.get('exito_pedidos', []);
  let filtrados = pedidos;

  if(filtroAtual !== 'todos'){
    filtrados = pedidos.filter(p => p.status === filtroAtual);
  }

  $('#totalRegistos').textContent = `${filtrados.length} registos`;

  const body = $('#tabelaPedidosBody');
  if(!body) return;

  if(!filtrados.length){
    body.innerHTML = `<tr><td colspan="13" class="empty">Sem registos.</td></tr>`;
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

    const modoTxt = p.modo === 'entrega'
      ? `${p.velocidade === 'premium' ? '⚡ Premium' : '🚚 Normal'}`
      : '🏪 Levantam.';

    // ===== BOTÕES DE AÇÃO (só se ainda não estiver finalizado) =====
    const acoes = isPendente
      ? `
        <div class="acoes-linha">
          <button class="btn-mini btn-entregue-mini" data-entregue="${p.id}" title="Marcar como Entregue">✅</button>
          <button class="btn-mini btn-cancelar-mini" data-cancelar="${p.id}" title="Cancelar pedido">❌</button>
          <button class="btn-mini btn-imprimir-mini" data-imprimir="${p.id}" title="Imprimir recibo">🖨️</button>
        </div>
      `
      : `
        <div class="acoes-linha">
          <span class="txt-final">${isEntregue ? '✅ Finalizado' : '❌ Cancelado'}</span>
          <button class="btn-mini btn-imprimir-mini" data-imprimir="${p.id}" title="Imprimir recibo">🖨️</button>
        </div>
      `;

    return `
      <tr>
        <td>${i + 1}</td>
        <td><b>${p.id.slice(-6)}</b></td>
        <td>${new Date(p.data).toLocaleDateString('pt-PT')}</td>
        <td>${p.cliente}</td>
        <td>${p.telefone || '—'}</td>
        <td>${p.produto}</td>
        <td>${p.quantidade} ${p.unidade || 'L'}</td>
        <td>${modoTxt}</td>
        <td>${p.zona || '—'}</td>
        <td>${p.entrega ? p.entrega + ' MT' : '—'}</td>
        <td><b>${p.total} MT</b></td>
        <td><span class="badge ${badgeClass}">${p.status}</span></td>
        <td>${acoes}</td>
      </tr>
    `;
  }).join('');

  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);
  $('#totalGeral').textContent = `${total} MT`;

  /* ===== LIGAR OS BOTÕES ===== */
  body.querySelectorAll('[data-entregue]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Confirmar que este pedido foi ENTREGUE?')) return;
      atualizarStatus(b.dataset.entregue, 'ENTREGUE');
    });
  });

  body.querySelectorAll('[data-cancelar]').forEach(b => {
    b.addEventListener('click', () => {
      if(!confirm('Cancelar este pedido?')) return;
      atualizarStatus(b.dataset.cancelar, 'CANCELADO');
    });
  });

  body.querySelectorAll('[data-imprimir]').forEach(b => {
    b.addEventListener('click', () => imprimirRecibo(b.dataset.imprimir));
  });
}

/* ---------- FILTROS ---------- */
$$('.filtro-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.filtro-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtroAtual = btn.dataset.filtro;
    renderTabela();
  });
});

async function atualizarStatus(id, novoStatus){
  const pedidos = Store.get('exito_pedidos', []);
  const p = pedidos.find(x => x.id === id);
  if(!p) return;

  // ✅ Atualiza no Supabase
  if(supabaseClient && p.dbId){
    try{
      if(novoStatus === 'CANCELADO'){
        // Apaga no servidor
        await supabaseClient
          .from('pedidos')
          .delete()
          .eq('id', p.dbId);

        // Remove localmente
        const restantes = pedidos.filter(x => x.id !== id);
        Store.set('exito_pedidos', restantes);
      } else {
        // Atualiza o status
        await supabaseClient
          .from('pedidos')
          .update({ status: novoStatus })
          .eq('id', p.dbId);

        p.status = novoStatus;
        Store.set('exito_pedidos', pedidos);
      }
    }catch(err){
      console.error('❌ Erro ao atualizar:', err);
      alert('Erro ao comunicar com o servidor.');
      return;
    }
  } else {
    // Fallback local
    if(novoStatus === 'CANCELADO'){
      const restantes = pedidos.filter(x => x.id !== id);
      Store.set('exito_pedidos', restantes);
    } else {
      p.status = novoStatus;
      Store.set('exito_pedidos', pedidos);
    }
  }

  renderPendentes();
  renderTabela();
}

/* ---------- RECARREGAR CONFIG ---------- */
$('#resetBtn')?.addEventListener('click', () => {
  if(!confirm('Recarregar preços e produtos do config.js?')) return;
  localStorage.removeItem('exito_config');
  localStorage.removeItem('exito_produtos');
  Store.set('exito_config', CONFIG);
  Store.set('exito_produtos', PRODUTOS_PADRAO);
  location.reload();
});

/* ============================================================
   IMPRIMIR — RECIBO INDIVIDUAL (A5)
   ============================================================ */
function imprimirRecibo(id){
  const pedidos = Store.get('exito_pedidos', []);
  const p = pedidos.find(x => x.id === id);
  if(!p){ alert('Pedido não encontrado.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  desenharReciboGrande(doc, p);
  doc.save(`Recibo_${p.id.slice(-6)}.pdf`);
}

/* ============================================================
   IMPRIMIR — EXTRATO COMPLETO (A4 paisagem, tipo Excel)
   ============================================================ */
$('#imprimirExtrato')?.addEventListener('click', () => {
  const pedidos = Store.get('exito_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos'){
    filtrados = pedidos.filter(p => p.status === filtroAtual);
  }

  if(!filtrados.length){
    alert('Não há pedidos para imprimir.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

  const pageW = 297;
  const margin = 10;

  // Cabeçalho
  doc.setFillColor(10, 18, 48);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setFillColor(227, 6, 19);
  doc.triangle(0, 22, 35, 22, 0, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BOMBAS ÊXITO', margin, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Quelimane · Moçambique', margin, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('EXTRATO DE PEDIDOS', pageW - margin, 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const filtroTxt = filtroAtual === 'todos' ? 'Todos os pedidos' : `Filtro: ${filtroAtual}`;
  doc.text(filtroTxt, pageW - margin, 16, { align: 'right' });

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text(`Emitido em: ${new Date().toLocaleString('pt-PT')}`, margin, 30);
  doc.text(`Total de registos: ${filtrados.length}`, pageW - margin, 30, { align: 'right' });

  const linhas = filtrados.map((p, i) => [
    i + 1,
    p.id.slice(-6),
    new Date(p.data).toLocaleDateString('pt-PT'),
    p.cliente,
    p.telefone || '—',
    p.produto,
    `${p.quantidade} ${p.unidade || 'L'}`,
    p.modo === 'entrega'
      ? (p.velocidade === 'premium' ? 'Premium' : 'Normal')
      : 'Levantam.',
    p.zona || '—',
    p.entrega ? `${p.entrega} MT` : '—',
    `${p.total} MT`,
    p.status
  ]);

  const total = filtrados.reduce((s, p) => s + (p.total || 0), 0);

  doc.autoTable({
    startY: 36,
    head: [[
      '#', 'ID', 'Data', 'Cliente', 'Telefone', 'Produto', 'Qtd',
      'Modo', 'Zona', 'Taxa', 'Total', 'Estado'
    ]],
    body: linhas,
    foot: [[
      '', '', '', '', '', '', '', '', '', 'TOTAL GERAL:', `${total} MT`, ''
    ]],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: 'middle',
      lineColor: [220, 220, 220],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [10, 18, 48],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    footStyles: {
      fillColor: [255, 210, 0],
      textColor: [10, 18, 48],
      fontStyle: 'bold',
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255]
    },
    columnStyles: {
      0:  { halign: 'center', cellWidth: 8 },
      1:  { halign: 'center', cellWidth: 15 },
      2:  { halign: 'center', cellWidth: 18 },
      3:  { cellWidth: 32 },
      4:  { cellWidth: 22 },
      5:  { cellWidth: 22 },
      6:  { halign: 'center', cellWidth: 14 },
      7:  { halign: 'center', cellWidth: 18 },
      8:  { cellWidth: 25 },
      9:  { halign: 'right', cellWidth: 16 },
      10: { halign: 'right', cellWidth: 20, fontStyle: 'bold' },
      11: { halign: 'center', cellWidth: 20 }
    },
    margin: { left: margin, right: margin }
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Bombas Êxito · Relatório gerado automaticamente em ${new Date().toLocaleString('pt-PT')}`,
    pageW / 2,
    finalY,
    { align: 'center' }
  );

  const dataFile = new Date().toISOString().slice(0, 10);
  doc.save(`Extrato_Pedidos_${dataFile}.pdf`);
});

/* ============================================================
   IMPRIMIR — RECIBOS MINI (30 por A4)
   ============================================================ */
$('#imprimirMini')?.addEventListener('click', () => {
  const pedidos = Store.get('exito_pedidos', []);
  let filtrados = pedidos;
  if(filtroAtual !== 'todos'){
    filtrados = pedidos.filter(p => p.status === filtroAtual);
  }

  if(!filtrados.length){
    alert('Não há pedidos para imprimir.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const cols = 6;
  const rows = 5;
  const porPagina = cols * rows;

  const marginX = 5;
  const marginY = 5;
  const gapX = 1.5;
  const gapY = 1.5;

  const pageW = 210;
  const pageH = 297;

  const cardW = (pageW - marginX * 2 - gapX * (cols - 1)) / cols;
  const cardH = (pageH - marginY * 2 - gapY * (rows - 1)) / rows;

  filtrados.forEach((p, i) => {
    const pos = i % porPagina;
    const col = pos % cols;
    const row = Math.floor(pos / cols);

    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    if(i > 0 && pos === 0) doc.addPage();

    desenharReciboMini(doc, p, x, y, cardW, cardH);
  });

  doc.save(`Recibos_${filtrados.length}_pedidos.pdf`);
});

/* ============================================================
   RECIBO MINI — 30 por página
   ============================================================ */
function desenharReciboMini(doc, p, x, y, w, h){
  const azul = [10, 18, 48];
  const vermelho = [227, 6, 19];
  const cinzaClaro = [230, 230, 230];
  const cinza = [120, 120, 120];

  // Borda tracejada
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.setLineDash([1, 1], 0);
  doc.roundedRect(x, y, w, h, 1, 1, 'S');
  doc.setLineDash([], 0);

  // Cabeçalho azul
  doc.setFillColor(...azul);
  doc.rect(x, y, w, 7, 'F');
  doc.setFillColor(...vermelho);
  doc.rect(x, y, 2, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text('BOMBAS ÊXITO', x + 3, y + 4.5);

  doc.setFontSize(5);
  doc.setTextColor(255, 210, 0);
  doc.text(`#${p.id.slice(-6)}`, x + w - 1.5, y + 4.5, { align: 'right' });

  let cy = y + 8;
  doc.setDrawColor(...cinzaClaro);
  doc.setLineWidth(0.15);
  doc.line(x + 2, cy, x + w - 2, cy);
  cy += 3;

  doc.setTextColor(...cinza);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.text('CLIENTE', x + 2, cy);
  cy += 2.5;

  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text((p.cliente || '—').substring(0, 22), x + 2, cy);
  cy += 2.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(60, 60, 60);
  doc.text(p.telefone || '—', x + 2, cy);
  cy += 3.5;

  doc.setDrawColor(...cinzaClaro);
  doc.line(x + 2, cy, x + w - 2, cy);
  cy += 3;

  doc.setTextColor(...cinza);
  doc.setFontSize(4.5);
  doc.text('PRODUTO', x + 2, cy);
  cy += 2.5;

  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.text(p.produto || '—', x + 2, cy);
  cy += 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(60, 60, 60);
  doc.text(`${p.quantidade} ${p.unidade || 'L'} × ${p.precoUnit || '—'} MT`, x + 2, cy);
  cy += 3.5;

  doc.setDrawColor(...cinzaClaro);
  doc.line(x + 2, cy, x + w - 2, cy);
  cy += 3;

  doc.setTextColor(...cinza);
  doc.setFontSize(4.5);
  doc.text('ENTREGA', x + 2, cy);
  cy += 2.5;

  doc.setTextColor(20, 20, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const modoTxt = p.modo === 'entrega'
    ? `${p.velocidade === 'premium' ? 'PREMIUM' : 'Normal'} — ${p.zona || ''}`
    : 'Levantamento';
  doc.text(modoTxt.substring(0, 28), x + 2, cy);
  cy += 2.8;

  doc.setTextColor(60, 60, 60);
  doc.text(`Taxa: ${p.entrega ? p.entrega + ' MT' : 'GRÁTIS'}`, x + 2, cy);
  cy += 4;

  const totalY = y + h - 8;
  doc.setFillColor(...azul);
  doc.rect(x, totalY, w, 8, 'F');
  doc.setFillColor(...vermelho);
  doc.rect(x, totalY, 2, 8, 'F');

  doc.setTextColor(255, 210, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('TOTAL', x + 3, totalY + 3);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`${p.total} MT`, x + w - 2, totalY + 5.5, { align: 'right' });

  const statusCores = {
    PENDENTE:   [255, 210, 0],
    PREPARACAO: [77, 159, 255],
    CAMINHO:    [255, 168, 77],
    ENTREGUE:   [0, 200, 83],
    CANCELADO:  [227, 6, 19]
  };
  const cor = statusCores[p.status] || [150, 150, 150];
  doc.setFillColor(...cor);
  doc.circle(x + 3, y + h - 1.5, 0.7, 'F');

  doc.setTextColor(...cor);
  doc.setFontSize(4);
  doc.text(p.status, x + 5, y + h - 0.7);
}

/* ============================================================
   RECIBO GRANDE (A5) — 1 pedido
   ============================================================ */
function desenharReciboGrande(doc, p){
  const x = 8, w = 148 - 16;

  doc.setFillColor(10, 18, 48);
  doc.rect(0, 0, 148, 26, 'F');
  doc.setFillColor(227, 6, 19);
  doc.triangle(0, 26, 30, 26, 0, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('BOMBAS ÊXITO', x, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Quelimane · Moçambique', x, 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PEDIDO', 148 - x, 11, { align: 'right' });
  doc.setFontSize(14);
  doc.setTextColor(255, 210, 0);
  doc.text(`#${p.id.slice(-6)}`, 148 - x, 18, { align: 'right' });

  let y = 34;
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido: ${new Date(p.data).toLocaleString('pt-PT')}`, x, y);
  doc.text(`Estado: ${p.status}`, 148 - x, y, { align: 'right' });
  y += 8;

  function caixa(titulo, linhas){
    const altura = 7 + linhas.length * 6 + 4;
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, altura, 1.5, 1.5, 'FD');
    doc.setFillColor(227, 6, 19);
    doc.rect(x, y, 1.5, altura, 'F');

    doc.setTextColor(10, 18, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(titulo.toUpperCase(), x + 4, y + 5);

    let ly = y + 11;
    doc.setFontSize(9);
    linhas.forEach(([chave, valor]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(chave, x + 4, ly);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 20, 30);
      doc.text(String(valor).substring(0, 40), x + w - 4, ly, { align: 'right' });
      ly += 6;
    });

    y += altura + 3;
  }

  caixa('Cliente', [
    ['Nome', p.cliente || '—'],
    ['Telefone', p.telefone || '—'],
  ]);

  caixa('Produto', [
    ['Combustível', p.produto],
    ['Quantidade', `${p.quantidade} ${p.unidade || 'L'}`],
    ['Preço unitário', `${p.precoUnit} MT/${p.unidade || 'L'}`],
    ['Subtotal', `${p.subtotal?.toFixed(2) || '—'} MT`],
  ]);

  const modoTxt = p.modo === 'entrega'
    ? `${p.velocidade === 'premium' ? 'Premium' : 'Normal'} — ${p.zona || '—'}`
    : 'Levantamento';
  const linhasEnt = [
    ['Modo', modoTxt],
    ['Tempo', p.tempo || 'até 1 hora'],
  ];
  if(p.modo === 'entrega'){
    linhasEnt.push(['Endereço', p.endereco || '—']);
  }
  linhasEnt.push(['Taxa', p.entrega ? `${p.entrega} MT` : 'GRÁTIS']);
  caixa('Entrega', linhasEnt);

  y += 2;
  const totalH = 16;
  doc.setFillColor(10, 18, 48);
  doc.roundedRect(x, y, w, totalH, 2, 2, 'F');
  doc.setFillColor(227, 6, 19);
  doc.rect(x, y, 2, totalH, 'F');

  doc.setTextColor(255, 210, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL', x + 5, y + 6);

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(`${p.total} MT`, x + w - 5, y + 11, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Bombas Êxito · Documento gerado automaticamente', 74, 200, { align: 'center' });

}
/* ---------- FECHAR O DIA ---------- */
document.addEventListener('click', async e => {
  if(e.target.closest('#fecharDia')){
    const pedidos = Store.get('exito_pedidos', []);
    const entregues = pedidos.filter(p => p.status === 'ENTREGUE');
    const pendentes = pedidos.filter(p =>
      p.status === 'PENDENTE' || p.status === 'PREPARACAO' || p.status === 'CAMINHO'
    ).length;

    if(!entregues.length){
      alert('Não há pedidos entregues para fechar.');
      return;
    }

    const msg = `📅 FECHAR O DIA\n\n` +
                `• ${entregues.length} pedidos ENTREGUES serão apagados\n` +
                `• ${pendentes} pedidos PENDENTES ficam guardados\n\n` +
                `Continuar?`;

    if(!confirm(msg)) return;

    // Apaga cada entregue no Supabase
    if(supabaseClient){
      for(const p of entregues){
        if(p.dbId){
          await supabaseClient.from('pedidos').delete().eq('id', p.dbId);
        }
      }
    }

    const restantes = pedidos.filter(p => p.status !== 'ENTREGUE');
    Store.set('exito_pedidos', restantes);
    renderPendentes();
    renderTabela();
    alert(`✅ Dia fechado!\n${entregues.length} pedidos apagados.`);
  }
});

/* ---------- APAGAR TUDO ---------- */
document.addEventListener('click', async e => {
  if(e.target.closest('#apagarTudo')){
    const pedidos = Store.get('exito_pedidos', []);
    if(!pedidos.length){
      alert('O extrato já está vazio.');
      return;
    }

    const msg = `🗑️ APAGAR TUDO\n\n` +
                `⚠️ Isto vai apagar TODOS os ${pedidos.length} pedidos.\n\n` +
                `Ação IRREVERSÍVEL. Continuar?`;

    if(!confirm(msg)) return;
    if(!confirm('⚠️ TEM A CERTEZA?')) return;

    // Apaga todos no Supabase
    if(supabaseClient){
      await supabaseClient.from('pedidos').delete().neq('id', 0);
    }

    Store.set('exito_pedidos', []);
    renderPendentes();
    renderTabela();
    alert('✅ Extrato limpo.');
  }
});