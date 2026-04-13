/* ===========================
   PAINEL DO MESTRE RPG v5.0
   script.js — IA & Level Up
   =========================== */

// ===================== CONSTANTES =====================
const RACAS = {
  humano:     { nome: 'Humano',     buffs: { VIDA:1, SORTE:1 }, debuffs: {}, desc: '+1 Vida, +1 Sorte' },
  elfo:       { nome: 'Elfo',       buffs: { AGILIDADE:2, 'PERCEPÇÃO':1 }, debuffs: { 'FORÇA':1 }, desc: '+2 Agilidade, +1 Percepção, -1 Força' },
  anao:       { nome: 'Anão',       buffs: { VIDA:2, 'FORÇA':1 }, debuffs: { AGILIDADE:1 }, desc: '+2 Vida, +1 Força, -1 Agilidade' },
  dragonborn: { nome: 'Dragonborn', buffs: { 'FORÇA':2, CARISMA:1 }, debuffs: { SORTE:1 }, desc: '+2 Força, +1 Carisma, -1 Sorte' },
  orc:        { nome: 'Orc',        buffs: { 'FORÇA':3 }, debuffs: { 'INTELIGÊNCIA':1, CARISMA:1 }, desc: '+3 Força, -1 Inteligência, -1 Carisma' },
  goblin:     { nome: 'Goblin',     buffs: { AGILIDADE:2, SORTE:1 }, debuffs: { VIDA:1, 'FORÇA':1 }, desc: '+2 Agilidade, +1 Sorte, -1 Vida, -1 Força' },
  tiefling:   { nome: 'Tiefling',   buffs: { 'INTELIGÊNCIA':2, CARISMA:1 }, debuffs: { SORTE:1 }, desc: '+2 Inteligência, +1 Carisma, -1 Sorte' },
  fada:       { nome: 'Fada',       buffs: { AGILIDADE:1, CARISMA:2 }, debuffs: { 'FORÇA':2 }, desc: '+1 Agilidade, +2 Carisma, -2 Força' },
  triton:     { nome: 'Tritão',     buffs: { 'PERCEPÇÃO':2, VIDA:1 }, debuffs: { SORTE:1 }, desc: '+2 Percepção, +1 Vida, -1 Sorte' },
  meifera:    { nome: 'Meio-fera',  buffs: { 'FORÇA':1, AGILIDADE:1, 'PERCEPÇÃO':1 }, debuffs: { CARISMA:1 }, desc: '+1 Força, +1 Agilidade, +1 Percepção, -1 Carisma' },
};

const ATRIBUTOS       = ['VIDA','FORÇA','AGILIDADE','SORTE','CARISMA','INTELIGÊNCIA','PERCEPÇÃO'];
const ATRIBUTOS_BONUS = ['FORÇA','AGILIDADE','SORTE','CARISMA','INTELIGÊNCIA','PERCEPÇÃO'];
const BASE_PONTOS     = 37;
const PTS_POR_NIVEL   = 2;

// ===================== STATE =====================
let atqCounter       = 0;
let diceHistory      = [];
let mapPins          = JSON.parse(localStorage.getItem('mapaPins') || '[]');
let pendingPinCoords = null;
let iaHistory        = [];
let levelUpState     = { personagemId: null, pontosRestantes: 0, deltas: {} };

// ===================== UTILS =====================
const $       = id => document.getElementById(id);
const getSalvos = () => JSON.parse(localStorage.getItem('personagens') || '[]');
const setSalvos = arr => localStorage.setItem('personagens', JSON.stringify(arr));

// ===================== TABS =====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    $('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'ferramentas') populateDiceCharSelect();
  });
});

// ===================== CRIAÇÃO DE PERSONAGEM =====================
function buildAtributosGrid() {
  const grid = $('atributos-grid');
  grid.innerHTML = '';
  ATRIBUTOS.forEach(attr => {
    const safeId = attr.replace(/[^a-zA-Z0-9]/g, '_');
    const div = document.createElement('div');
    div.className = 'attr-field';
    div.innerHTML = `
      <label>${attr}</label>
      <div class="attr-row">
        <button class="attr-btn" data-attr="${attr}" data-delta="-1">−</button>
        <input type="number" id="attr-${safeId}" value="1" min="1" max="99" readonly />
        <button class="attr-btn" data-attr="${attr}" data-delta="1">+</button>
      </div>`;
    grid.appendChild(div);
  });
  grid.querySelectorAll('.attr-btn').forEach(btn => {
    btn.addEventListener('click', () => adjustAttr(btn.dataset.attr, parseInt(btn.dataset.delta)));
  });
  updatePontos();
}

function attrInputId(attr) {
  return 'attr-' + attr.replace(/[^a-zA-Z0-9]/g, '_');
}

function getAttrValues() {
  const v = {};
  ATRIBUTOS.forEach(a => v[a] = parseInt($(attrInputId(a)).value) || 1);
  return v;
}

function getSumBase() {
  return Object.values(getAttrValues()).reduce((s,v) => s+v, 0) - ATRIBUTOS.length;
}

function updatePontos() {
  const rem = BASE_PONTOS - getSumBase();
  const el  = $('pontos-restantes');
  el.textContent = rem;
  el.className   = 'pontos-count' + (rem < 0 ? ' danger' : '');
}

function adjustAttr(attr, delta) {
  const input = $(attrInputId(attr));
  const cur   = parseInt(input.value) || 1;
  if (delta > 0 && getSumBase() >= BASE_PONTOS) return;
  input.value = Math.max(1, cur + delta);
  updatePontos();
}

function updateRacaInfo() {
  const r = RACAS[$('char-raca').value];
  $('raca-info').innerHTML = `<strong style="color:var(--gold)">${r.nome}</strong> — ${r.desc}`;
}
$('char-raca').addEventListener('change', updateRacaInfo);

function addAtaqueRow(containerId, nome='', dano='') {
  const row = document.createElement('div');
  row.className = 'ataque-row';
  row.innerHTML = `
    <input type="text" placeholder="Nome do ataque" value="${nome}" data-field="nome" />
    <input type="text" placeholder="Dano (ex: 2d6)"  value="${dano}" data-field="dano" />
    <button class="ataque-del" onclick="this.closest('.ataque-row').remove()">✕</button>`;
  $(containerId).appendChild(row);
}

function getAtaques(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} .ataque-row`))
    .map(r => ({
      nome: r.querySelector('[data-field="nome"]').value,
      dano: r.querySelector('[data-field="dano"]').value,
    }))
    .filter(a => a.nome || a.dano);
}

function initAtaques() {
  $('ataques-list').innerHTML = '';
  atqCounter = 0;
  for (let i = 0; i < 5; i++) addAtaqueRow('ataques-list');
}

$('add-ataque').addEventListener('click', () => addAtaqueRow('ataques-list'));

$('salvar-personagem').addEventListener('click', () => {
  const nome    = $('char-nome').value.trim();
  const classe  = $('char-classe').value.trim();
  const racaKey = $('char-raca').value;
  if (!nome) { alert('Digite o nome do personagem!'); return; }

  const racaData = RACAS[racaKey];
  const base     = getAttrValues();
  const final    = { ...base };
  Object.entries(racaData.buffs ).forEach(([k,v]) => final[k] = (final[k]||0) + v);
  Object.entries(racaData.debuffs).forEach(([k,v]) => final[k] = (final[k]||0) - v);

  const p = {
    id: Date.now(),
    nome, classe,
    raca: racaData.nome,
    nivel: 1,
    pontosExtras: 0,
    attrs: final,
    ataques: getAtaques('ataques-list'),
  };

  const arr = getSalvos();
  arr.push(p);
  setSalvos(arr);
  renderCards();
  limparPersonagem();
});

$('limpar-personagem').addEventListener('click', limparPersonagem);

function limparPersonagem() {
  $('char-nome').value   = '';
  $('char-classe').value = '';
  $('char-raca').value   = 'humano';
  updateRacaInfo();
  ATRIBUTOS.forEach(a => $(attrInputId(a)).value = 1);
  updatePontos();
  initAtaques();
}

// ===================== CARDS =====================
function hasAllAttrsAbove5(p) {
  return ATRIBUTOS_BONUS.every(a => (p.attrs[a] || 0) > 5);
}

function renderCards() {
  const salvos = getSalvos();
  const grid   = $('cards-grid');
  grid.innerHTML = '';

  if (!salvos.length) {
    grid.innerHTML = '<p style="color:var(--text-muted);font-style:italic">Nenhum personagem salvo ainda.</p>';
    populateDiceCharSelect();
    return;
  }

  salvos.forEach(p => {
    const card      = document.createElement('div');
    card.className  = 'char-card';
    const temBonus  = hasAllAttrsAbove5(p);
    const bonusBadge = temBonus
      ? `<span class="card-bonus-badge">✦ Bônus</span>` : '';

    const badges = ATRIBUTOS.map(a =>
      `<div class="attr-badge">${a.slice(0,3)}: <strong>${p.attrs[a]??0}</strong></div>`
    ).join('');

    const ataques = p.ataques.length
      ? p.ataques.map(a => `<div class="char-ataque-item"><span>${a.nome}</span><span>${a.dano}</span></div>`).join('')
      : '<p style="color:var(--text-muted);font-size:.85rem">Sem ataques</p>';

    const ptsPendentes = p.pontosExtras > 0
      ? `<span class="pontos-pendentes">⚡ ${p.pontosExtras}pts</span>` : '';

    card.innerHTML = `
      <div class="char-card-header">
        <div>
          <div class="char-card-name">${p.nome} ${bonusBadge}</div>
          <div class="char-card-sub">${p.classe} · ${p.raca}</div>
        </div>
        <button class="char-card-del" onclick="deletarPersonagem(${p.id})">✕</button>
      </div>
      <div class="attr-badges">${badges}</div>
      <div class="char-ataques-list"><h4>Ataques</h4>${ataques}</div>
      <div class="char-card-footer">
        <div class="char-level-info">Nível <strong>${p.nivel||1}</strong> ${ptsPendentes}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${p.pontosExtras > 0 ? `<button class="btn-distribute" onclick="abrirDistribuicao(${p.id})">⚡ Distribuir</button>` : ''}
          <button class="btn-levelup" onclick="subirNivel(${p.id})">⬆ Subir Nível</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });

  populateDiceCharSelect();
}

function deletarPersonagem(id) {
  if (!confirm('Remover este personagem?')) return;
  setSalvos(getSalvos().filter(p => p.id !== id));
  renderCards();
}

// ===================== LEVEL UP =====================
function subirNivel(id) {
  const salvos = getSalvos();
  const idx    = salvos.findIndex(p => p.id === id);
  if (idx === -1) return;
  salvos[idx].nivel        = (salvos[idx].nivel || 1) + 1;
  salvos[idx].pontosExtras = (salvos[idx].pontosExtras || 0) + PTS_POR_NIVEL;
  setSalvos(salvos);
  renderCards();
  abrirDistribuicao(id);
}

function abrirDistribuicao(id) {
  const p = getSalvos().find(x => x.id === id);
  if (!p || !p.pontosExtras) return;

  levelUpState = { personagemId: id, pontosRestantes: p.pontosExtras, deltas: {} };
  ATRIBUTOS.forEach(a => levelUpState.deltas[a] = 0);

  $('levelup-sub').textContent         = `${p.nome} — Nível ${p.nivel}`;
  $('levelup-pontos-count').textContent = p.pontosExtras;

  const container = $('levelup-attrs');
  container.innerHTML = '';
  ATRIBUTOS.forEach(a => {
    const safeA = a.replace(/[^a-zA-Z0-9]/g, '_');
    const row   = document.createElement('div');
    row.className = 'levelup-attr-row';
    row.innerHTML = `
      <label>${a}</label>
      <span class="levelup-current">Atual: <strong style="color:var(--gold)">${p.attrs[a]??0}</strong></span>
      <div class="levelup-attr-controls">
        <button class="attr-btn" data-attr="${a}" data-delta="-1">−</button>
        <span id="lu-delta-${safeA}" class="lu-delta">+0</span>
        <button class="attr-btn" data-attr="${a}" data-delta="1">+</button>
      </div>`;
    container.appendChild(row);
  });

  container.querySelectorAll('.attr-btn').forEach(btn => {
    btn.addEventListener('click', () => luAdjust(btn.dataset.attr, parseInt(btn.dataset.delta)));
  });

  $('levelup-modal').style.display = 'flex';
}

function luAdjust(attr, delta) {
  if (delta > 0 && levelUpState.pontosRestantes <= 0) return;
  if (delta < 0 && levelUpState.deltas[attr] <= 0)   return;
  levelUpState.deltas[attr]      += delta;
  levelUpState.pontosRestantes   -= delta;
  const safeA = attr.replace(/[^a-zA-Z0-9]/g, '_');
  $(`lu-delta-${safeA}`).textContent = (levelUpState.deltas[attr] >= 0 ? '+' : '') + levelUpState.deltas[attr];
  $('levelup-pontos-count').textContent = levelUpState.pontosRestantes;
}

$('levelup-confirmar').addEventListener('click', () => {
  const salvos = getSalvos();
  const idx    = salvos.findIndex(x => x.id === levelUpState.personagemId);
  if (idx === -1) return;
  ATRIBUTOS.forEach(a => {
    salvos[idx].attrs[a] = (salvos[idx].attrs[a] || 0) + (levelUpState.deltas[a] || 0);
  });
  salvos[idx].pontosExtras = levelUpState.pontosRestantes; // restante fica guardado
  setSalvos(salvos);
  $('levelup-modal').style.display = 'none';
  renderCards();
});

$('levelup-cancelar').addEventListener('click', () => {
  $('levelup-modal').style.display = 'none';
});

// ===================== DADOS =====================
function populateDiceCharSelect() {
  const select  = $('dice-char-select');
  const current = select.value;
  select.innerHTML = '<option value="">— Nenhum (sem bônus) —</option>';
  getSalvos().forEach(p => {
    const opt = document.createElement('option');
    opt.value       = p.id;
    opt.textContent = `${p.nome} (Nv.${p.nivel||1})${hasAllAttrsAbove5(p) ? ' ✦' : ''}`;
    select.appendChild(opt);
  });
  if (current) select.value = current;
  checkDiceBonus();
}

function getSelectedChar() {
  const id = parseInt($('dice-char-select').value);
  return id ? getSalvos().find(p => p.id === id) || null : null;
}

function checkDiceBonus() {
  const p = getSelectedChar();
  $('dice-bonus-badge').style.display = (p && hasAllAttrsAbove5(p)) ? 'flex' : 'none';
}

$('dice-char-select').addEventListener('change', checkDiceBonus);

document.querySelectorAll('#tab-ferramentas .dice-btn-main').forEach(btn => {
  btn.addEventListener('click', function() {
    const sides = parseInt(this.dataset.sides);
    const raw   = Math.floor(Math.random() * sides) + 1;
    const p     = getSelectedChar();
    const bonus = (p && hasAllAttrsAbove5(p)) ? 1 : 0;
    const final = Math.min(sides, raw + bonus);

    const el = $('dice-result');
    el.textContent = final;
    el.classList.remove('rolling');
    void el.offsetWidth;
    el.classList.add('rolling');

    $('dice-label').textContent = `D${sides}` + (p ? ` — ${p.nome}` : '');

    const bi = $('dice-bonus-info');
    if (bonus) { bi.style.display = 'block'; bi.textContent = `✦ Rolou ${raw} +1 bônus (atributos > 5)`; }
    else         bi.style.display = 'none';

    diceHistory.unshift({ sides, result: final, raw, bonus, char: p?.nome || null });
    if (diceHistory.length > 24) diceHistory.pop();
    renderDiceHistory();
  });
});

function renderDiceHistory() {
  $('dice-history-list').innerHTML = diceHistory.map(d => {
    const bt = d.bonus ? ` <span style="color:var(--gold);font-size:.75em">(+1✦)</span>` : '';
    const ct = d.char  ? ` <span style="color:var(--text-muted)">${d.char}</span>` : '';
    return `<li>D${d.sides}: <strong>${d.result}</strong>${bt}${ct}</li>`;
  }).join('');
}

// ===================== BOSS MODE =====================
function loadBoss() {
  const boss = JSON.parse(localStorage.getItem('boss') || 'null');
  if (!boss) return;
  $('boss-nome').value       = boss.nome      || '';
  $('boss-vida-max').value   = boss.vidaMax   || '';
  $('boss-vida-atual').value = boss.vidaAtual || '';
  updateBossHPBar();
  $('boss-ataques-list').innerHTML = '';
  (boss.ataques || []).forEach(a => addBossAtaque(a.nome, a.dano));
}

function saveBoss() {
  localStorage.setItem('boss', JSON.stringify({
    nome:      $('boss-nome').value,
    vidaMax:   parseInt($('boss-vida-max').value) || 0,
    vidaAtual: parseInt($('boss-vida-atual').value) || 0,
    ataques:   getBossAtaques(),
  }));
}

function updateBossHPBar() {
  const max   = parseInt($('boss-vida-max').value) || 0;
  const atual = parseInt($('boss-vida-atual').value) || 0;
  const pct   = max > 0 ? Math.min(100, Math.max(0, (atual/max)*100)) : 0;
  $('boss-hp-nome').textContent    = $('boss-nome').value || '—';
  $('boss-hp-numbers').textContent = `${atual} / ${max}`;
  const fill = $('boss-hp-fill');
  fill.style.width = pct + '%';
  fill.style.background = pct > 60
    ? 'linear-gradient(90deg,#8b0000,#c1121f,#e02a37)'
    : pct > 30
    ? 'linear-gradient(90deg,#7a4100,#c17200,#e08e00)'
    : 'linear-gradient(90deg,#2d0a0a,#6b0000,#a00000)';
}

['boss-nome','boss-vida-max','boss-vida-atual'].forEach(id =>
  $(id).addEventListener('input', updateBossHPBar));

$('salvar-boss').addEventListener('click', () => { saveBoss(); updateBossHPBar(); });

$('boss-dmg-btn').addEventListener('click', () => {
  const d = parseInt($('boss-dmg-input').value) || 0;
  $('boss-vida-atual').value = Math.max(0, (parseInt($('boss-vida-atual').value)||0) - d);
  updateBossHPBar(); saveBoss(); $('boss-dmg-input').value = '';
});

$('boss-heal-btn').addEventListener('click', () => {
  const h   = parseInt($('boss-dmg-input').value) || 0;
  const max = parseInt($('boss-vida-max').value) || 0;
  $('boss-vida-atual').value = Math.min(max, (parseInt($('boss-vida-atual').value)||0) + h);
  updateBossHPBar(); saveBoss(); $('boss-dmg-input').value = '';
});

function addBossAtaque(nome='', dano='') {
  const row = document.createElement('div');
  row.className = 'ataque-row';
  row.innerHTML = `
    <input type="text" placeholder="Nome do ataque" value="${nome}" data-field="nome"/>
    <input type="text" placeholder="Dano"            value="${dano}" data-field="dano"/>
    <button class="ataque-del" onclick="this.closest('.ataque-row').remove();saveBoss()">✕</button>`;
  $('boss-ataques-list').appendChild(row);
}

function getBossAtaques() {
  return Array.from(document.querySelectorAll('#boss-ataques-list .ataque-row')).map(r => ({
    nome: r.querySelector('[data-field="nome"]').value,
    dano: r.querySelector('[data-field="dano"]').value,
  }));
}

$('boss-add-ataque').addEventListener('click', () => addBossAtaque());

document.querySelectorAll('#tab-boss .dice-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const sides  = parseInt(this.dataset.sides);
    const result = Math.floor(Math.random() * sides) + 1;
    const el = $('boss-dice-result');
    el.textContent = result;
    el.classList.remove('rolling'); void el.offsetWidth; el.classList.add('rolling');
    $('boss-dice-label').textContent = `D${sides}`;
  });
});

// ===================== MAPA =====================
$('mapa-upload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { localStorage.setItem('mapaImagem', ev.target.result); showMapImage(ev.target.result); };
  reader.readAsDataURL(file);
});

function showMapImage(src) {
  $('mapa-img').src = src;
  $('mapa-img').style.display = 'block';
  $('mapa-placeholder').style.display = 'none';
  renderPins();
}

$('mapa-container').addEventListener('click', function(e) {
  if (![$('mapa-img'), $('mapa-container'), $('pins-layer')].includes(e.target)) return;
  const rect = $('mapa-container').getBoundingClientRect();
  pendingPinCoords = {
    x: ((e.clientX - rect.left) / rect.width)  * 100,
    y: ((e.clientY - rect.top)  / rect.height) * 100,
  };
  $('pin-legenda').value = '';
  $('pin-modal').style.display = 'flex';
  setTimeout(() => $('pin-legenda').focus(), 50);
});

$('pin-confirmar').addEventListener('click', () => {
  if (pendingPinCoords) {
    mapPins.push({ ...pendingPinCoords, legenda: $('pin-legenda').value.trim() || 'Pin' });
    savePins(); renderPins();
  }
  $('pin-modal').style.display = 'none'; pendingPinCoords = null;
});

$('pin-cancelar').addEventListener('click', () => {
  $('pin-modal').style.display = 'none'; pendingPinCoords = null;
});

$('pin-legenda').addEventListener('keydown', e => {
  if (e.key === 'Enter')  $('pin-confirmar').click();
  if (e.key === 'Escape') $('pin-cancelar').click();
});

$('mapa-limpar-pins').addEventListener('click', () => {
  if (!confirm('Limpar todos os pins?')) return;
  mapPins = []; savePins(); renderPins();
});

$('mapa-limpar-tudo').addEventListener('click', () => {
  if (!confirm('Limpar mapa e todos os pins?')) return;
  mapPins = []; savePins();
  localStorage.removeItem('mapaImagem');
  $('mapa-img').style.display = 'none';
  $('mapa-placeholder').style.display = 'flex';
  $('pins-layer').innerHTML = '';
});

function savePins()  { localStorage.setItem('mapaPins', JSON.stringify(mapPins)); }

function renderPins() {
  const layer = $('pins-layer');
  layer.innerHTML = '';
  mapPins.forEach((pin, i) => {
    const el = document.createElement('div');
    el.className = 'map-pin';
    el.style.left = pin.x + '%';
    el.style.top  = pin.y + '%';
    el.innerHTML  = `<div class="pin-label">${pin.legenda}</div><div class="pin-dot"></div>`;
    el.title = 'Duplo clique para remover';
    el.addEventListener('dblclick', ev => { ev.stopPropagation(); mapPins.splice(i,1); savePins(); renderPins(); });
    layer.appendChild(el);
  });
}

function loadMapa() {
  const src = localStorage.getItem('mapaImagem');
  if (src) showMapImage(src); else renderPins();
}

// ===================== ORÁCULO IA =====================
function buildGameContext() {
  const salvos = getSalvos();
  const boss   = JSON.parse(localStorage.getItem('boss') || 'null');
  const pins   = JSON.parse(localStorage.getItem('mapaPins') || '[]');

  let ctx = '=== CONTEXTO DA PARTIDA ATUAL ===\n\n';

  if (salvos.length) {
    ctx += '## Personagens dos Jogadores\n';
    salvos.forEach(p => {
      ctx += `\n**${p.nome}** | ${p.classe} · ${p.raca} · Nível ${p.nivel||1}\n`;
      ctx += 'Atributos: ' + ATRIBUTOS.map(a => `${a.slice(0,3)}=${p.attrs[a]??0}`).join(', ') + '\n';
      if (hasAllAttrsAbove5(p)) ctx += '→ Possui bônus passivo de +1 em todos os dados\n';
      if (p.ataques.length)     ctx += 'Ataques: ' + p.ataques.map(a=>`${a.nome}(${a.dano})`).join(', ') + '\n';
    });
  } else {
    ctx += '## Personagens: nenhum criado ainda.\n';
  }

  if (boss?.nome) {
    ctx += `\n## Boss: ${boss.nome}\n`;
    ctx += `Vida: ${boss.vidaAtual}/${boss.vidaMax}\n`;
    if (boss.ataques?.length)
      ctx += 'Ataques: ' + boss.ataques.map(a=>`${a.nome}(${a.dano})`).join(', ') + '\n';
  }

  if (pins.length) {
    ctx += '\n## Locais no Mapa\n';
    pins.forEach(p => ctx += `- ${p.legenda}\n`);
  }

  ctx += '\n=== FIM DO CONTEXTO ===\n';
  return ctx;
}

const IA_SYSTEM = `Você é o Oráculo — assistente místico e mestre-auxiliar de RPG de Mesa.
Você conhece todos os personagens da partida, o boss atual e os locais marcados no mapa.
Use esse contexto para respostas personalizadas e imersivas.
Tom: épico, criativo, levemente sombrio, medieval-fantástico, sempre claro.
Ajude com: NPCs, encontros balanceados, histórias, dungeons, armadilhas, itens mágicos, descrições.
Responda SEMPRE em português do Brasil. Use **negrito** para nomes e títulos importantes.`;

async function enviarMensagemIA(mensagem) {
  if (!mensagem.trim()) return;

  const contextMsg = buildGameContext() + '\n\nMensagem do Mestre: ' + mensagem;
  const apiMessages = [...iaHistory, { role: 'user', content: contextMsg }];
  iaHistory.push({ role: 'user', content: mensagem });
  renderIAMsg('user', mensagem);

  const loadId = 'ia-load-' + Date.now();
  renderIALoading(loadId);

  const inputEl = $('ia-input'), btnEl = $('ia-send-btn');
  inputEl.disabled = btnEl.disabled = true;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: IA_SYSTEM,
        messages: apiMessages,
      }),
    });
    const data  = await res.json();
    const texto = data.content?.map(c => c.text||'').join('') || '⚠ Sem resposta.';
    document.getElementById(loadId)?.closest('.ia-message')?.remove();
    iaHistory.push({ role: 'assistant', content: texto });
    renderIAMsg('assistant', texto);
  } catch {
    document.getElementById(loadId)?.closest('.ia-message')?.remove();
    renderIAMsg('assistant', '⚠ Erro de conexão com a IA. Verifique sua rede.');
  }

  inputEl.disabled = btnEl.disabled = false;
  inputEl.focus();
}

function renderIAMsg(role, texto) {
  const c   = $('ia-chat-container');
  const div = document.createElement('div');
  div.className = `ia-message ia-${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'ia-bubble';
  bubble.innerHTML = formatIA(texto);
  div.innerHTML = `<div class="ia-avatar">${role==='assistant'?'🔮':'👤'}</div>`;
  div.appendChild(bubble);
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function renderIALoading(id) {
  const c   = $('ia-chat-container');
  const div = document.createElement('div');
  div.className = 'ia-message ia-assistant';
  div.innerHTML = `<div class="ia-avatar">🔮</div><div class="ia-bubble ia-loading" id="${id}"></div>`;
  c.appendChild(div);
  c.scrollTop = c.scrollHeight;
}

function formatIA(t) {
  return t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/^### (.+)$/gm,   '<h4 style="color:var(--gold);margin:8px 0 4px;font-family:var(--font-heading)">$1</h4>')
    .replace(/^## (.+)$/gm,    '<h3 style="color:var(--gold);margin:12px 0 6px;font-family:var(--font-heading)">$1</h3>')
    .replace(/^[•\-] /gm,      '&bull; ')
    .replace(/\n/g,            '<br>');
}

function iaQuickPrompt(text) {
  $('ia-input').value = '';
  enviarMensagemIA(text);
}

$('ia-send-btn').addEventListener('click', () => {
  const msg = $('ia-input').value.trim();
  if (!msg) return;
  $('ia-input').value = '';
  enviarMensagemIA(msg);
});

$('ia-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('ia-send-btn').click(); }
});

// ===================== INIT =====================
function init() {
  buildAtributosGrid();
  updateRacaInfo();
  initAtaques();
  renderCards();
  loadBoss();
  loadMapa();
  renderDiceHistory();
  populateDiceCharSelect();
}

init();