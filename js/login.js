/* ============================================================
   GALP QUELIMANE — LOGIN
   ============================================================ */

const $ = s => document.querySelector(s);

const Store = {
  get(k,fb){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):fb; }catch{ return fb; } }
};

const SESSION_KEY = 'galp_admin_session';

/* Se já tem sessão ativa → vai direto para o painel */
if(localStorage.getItem(SESSION_KEY) === 'ok'){
  window.location.href = 'exitoadmin.html';
}

/* Garantir config base */
if(!localStorage.getItem('galp_config')){
  localStorage.setItem('galp_config', JSON.stringify(CONFIG));
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#loginForm');
  if(!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const user = $('#loginUser').value.trim();
    const pass = $('#loginPass').value;
    const cfg = Store.get('galp_config', CONFIG);

    const adminUser = cfg.admin?.user || 'galp';
    const adminPass = cfg.admin?.pass || 'quelimane2025';

    console.log('🔍 Tentativa login:');
    console.log('  user digitado:', user);
    console.log('  user esperado:', adminUser);
    console.log('  pass digitada:', pass);
    console.log('  pass esperada:', adminPass);

    if(user === adminUser && pass === adminPass){
      localStorage.setItem(SESSION_KEY, 'ok');
      console.log('✅ Login OK. Redirecionando...');
      window.location.href = 'exitoadmin.html';
    } else {
      $('#loginError').textContent = '❌ Credenciais inválidas. Tenta novamente.';
      $('#loginPass').value = '';
      $('#loginPass').focus();
    }
  });
});