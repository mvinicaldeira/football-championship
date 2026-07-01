// app.js — Main application controller
import { TEAMS, createInitialState } from './data.js';
import {
  getGroupStandings,
  isGroupComplete,
  areBothGroupsComplete,
  getKnockoutWinner,
  areSemifinalsComplete,
} from './tournament.js';

// ═══════════════════════════════════════════════════════════
// STATE — localStorage persistence
// ═══════════════════════════════════════════════════════════

const STORAGE_KEY = 'fcm-state-v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createInitialState();
  } catch {
    return createInitialState();
  }
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let state = loadState();

// Current visible tab (independent of phase for history navigation)
let activeTab = state.phase === 'completed' ? 'final' :
                state.phase === 'final'      ? 'final' :
                state.phase === 'semifinals' ? 'semifinals' : 'groups';

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const t = (id) => TEAMS[id];

function phaseLabel(phase) {
  return { groups: 'Fase de Grupos', semifinals: 'Semifinais', final: 'Final', completed: 'Concluído' }[phase] ?? phase;
}

function fmt(n) { return n >= 0 ? `+${n}` : `${n}`; }

/** True if the given tab is accessible given the current phase */
function tabEnabled(tab) {
  const order = { groups: 0, semifinals: 1, final: 2 };
  const current = { groups: 0, semifinals: 1, final: 2, completed: 2 };
  return order[tab] <= current[state.phase];
}

// ═══════════════════════════════════════════════════════════
// RENDER — Building HTML strings
// ═══════════════════════════════════════════════════════════

function renderHeader() {
  const { phase } = state;
  const isCompleted = phase === 'completed';
  return `
    <header class="app-header">
      <div class="header-content">
        <div class="header-logo">
          <span class="logo-icon" aria-hidden="true">⚽</span>
          <div class="logo-text">
            <span class="logo-main">Championship</span>
            <span class="logo-sub">Manager</span>
          </div>
        </div>
        <div class="header-right">
          <div class="phase-indicator" title="Fase atual">
            <span class="phase-dot ${phase}" aria-hidden="true"></span>
            <span class="phase-label">${phaseLabel(phase)}</span>
          </div>
          <button
            id="btn-reset"
            class="btn btn-reset-sm"
            title="Reiniciar torneio"
            aria-label="Reiniciar torneio"
          >🔄</button>
        </div>
      </div>
      ${!isCompleted ? renderNavTabs() : ''}
    </header>
  `;
}

function renderNavTabs() {
  const tabs = [
    { id: 'groups',     label: '⚽ Grupos' },
    { id: 'semifinals', label: '⚡ Semifinais' },
    { id: 'final',      label: '🏆 Final' },
  ];
  return `
    <nav class="nav-tabs" role="tablist" aria-label="Fases do torneio">
      ${tabs.map(tab => {
        const enabled = tabEnabled(tab.id);
        return `
          <button
            class="nav-tab ${activeTab === tab.id ? 'active' : ''} ${!enabled ? 'disabled' : ''}"
            data-tab="${tab.id}"
            id="tab-${tab.id}"
            role="tab"
            aria-selected="${activeTab === tab.id}"
            ${!enabled ? 'disabled aria-disabled="true"' : ''}
          >${tab.label}</button>
        `;
      }).join('')}
    </nav>
  `;
}

// ——— Standings ——————————————————————————————————————————

function renderStandingsCard(group, letter) {
  const standings = getGroupStandings(group);
  const complete  = isGroupComplete(group);

  const rows = standings.map((s, i) => {
    const team = t(s.teamId);
    const qualifying = i < 2;
    return `
      <tr class="${qualifying ? 'qualifying' : ''}">
        <td class="pos">${i + 1}</td>
        <td class="team-name">
          ${qualifying && complete ? '<span class="qualify-dot" aria-hidden="true"></span>' : ''}
          ${team.flag} ${team.name}
        </td>
        <td>${s.pj}</td>
        <td>${s.v}</td>
        <td>${s.e}</td>
        <td>${s.d}</td>
        <td>${s.gf}</td>
        <td>${s.gs}</td>
        <td>${fmt(s.sg)}</td>
        <td class="pts">${s.pts}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="standings-card glass-card">
      <div class="card-header">
        <h3>Grupo ${letter}</h3>
        ${complete
          ? '<span class="badge badge-complete">✓ Concluído</span>'
          : '<span class="badge badge-pending">Em Andamento</span>'}
      </div>
      <div class="table-wrapper">
        <table class="standings-table" aria-label="Classificação Grupo ${letter}">
          <thead>
            <tr>
              <th aria-label="Posição">#</th>
              <th style="text-align:left;padding-left:16px">Time</th>
              <th title="Partidas Jogadas">PJ</th>
              <th title="Vitórias">V</th>
              <th title="Empates">E</th>
              <th title="Derrotas">D</th>
              <th title="Gols Feitos">GF</th>
              <th title="Gols Sofridos">GS</th>
              <th title="Saldo de Gols">SG</th>
              <th title="Pontos">Pts</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

// ——— Match Card ———————————————————————————————————————————

/**
 * @param {object}  match
 * @param {string}  phase  'A' | 'B' | 'semifinals' | 'final'
 * @param {boolean} isKnockout
 */
function renderMatchCard(match, phase, isKnockout = false) {
  const home  = t(match.home);
  const away  = t(match.away);
  const played = match.homeScore !== null && match.awayScore !== null;
  const tied   = played && match.homeScore === match.awayScore;
  const pensPlayed = tied && match.homePens !== null && match.awayPens !== null;
  const winner = played && isKnockout ? getKnockoutWinner(match) : null;

  /* Score block */
  const scoreBlock = played
    ? `<div class="score-display played">
         <div class="score-nums">
           <span class="score-num ${isKnockout && winner === match.home ? 'text-green' : ''}">${match.homeScore}</span>
           <span class="score-sep">×</span>
           <span class="score-num ${isKnockout && winner === match.away ? 'text-green' : ''}">${match.awayScore}</span>
         </div>
         ${pensPlayed ? `<span class="pens-result">(${match.homePens} × ${match.awayPens} pên.)</span>` : ''}
       </div>`
    : `<div class="score-display pending" aria-label="Resultado pendente"><span>×</span></div>`;

  /* Penalty inputs — shown only for knockout when tied */
  const penaltiesSection = isKnockout ? `
    <div class="penalty-hint hidden" id="pens-hint-${match.id}">
      <p class="penalty-label">⚽ Empate! Insira os gols nos pênaltis:</p>
      <div class="score-inputs">
        <input
          type="number" id="home-pens-${match.id}" min="0" max="99"
          placeholder="0" class="score-input score-input--pens"
          aria-label="Pênaltis ${home.name}"
        />
        <span class="input-sep">—</span>
        <input
          type="number" id="away-pens-${match.id}" min="0" max="99"
          placeholder="0" class="score-input score-input--pens"
          aria-label="Pênaltis ${away.name}"
        />
      </div>
    </div>
  ` : '';

  return `
    <article
      class="match-card glass-card"
      data-match-id="${match.id}"
      data-phase="${phase}"
      aria-label="Partida ${home.name} vs ${away.name}"
    >
      <div class="match-teams">
        <div class="match-team home">
          <span class="team-name">${home.name}</span>
          <span class="team-flag" aria-hidden="true">${home.flag}</span>
        </div>
        ${scoreBlock}
        <div class="match-team away">
          <span class="team-flag" aria-hidden="true">${away.flag}</span>
          <span class="team-name">${away.name}</span>
        </div>
      </div>

      <div class="match-inputs ${played ? 'hidden' : ''}" id="inputs-${match.id}">
        <div class="score-inputs">
          <input
            type="number" id="home-${match.id}" min="0" max="99"
            placeholder="0" value="${match.homeScore ?? ''}"
            class="score-input"
            aria-label="Gols ${home.name}"
          />
          <span class="input-sep">—</span>
          <input
            type="number" id="away-${match.id}" min="0" max="99"
            placeholder="0" value="${match.awayScore ?? ''}"
            class="score-input"
            aria-label="Gols ${away.name}"
          />
        </div>
        ${penaltiesSection}
        <div class="match-actions">
          <button
            class="btn btn-save"
            id="save-${match.id}"
            data-match-id="${match.id}"
            data-phase="${phase}"
            ${isKnockout ? 'data-knockout="true"' : ''}
          >Salvar Resultado</button>
        </div>
      </div>

      ${played ? `
        <div class="match-edit">
          <button class="btn btn-edit" data-match-id="${match.id}" data-phase="${phase}">
            ✎ Editar
          </button>
        </div>
      ` : ''}
    </article>
  `;
}

// ——— Group Phase —————————————————————————————————————————

function renderGroupPhase() {
  const { groups } = state;
  const bothDone   = areBothGroupsComplete(groups);
  const sA         = getGroupStandings(groups.A);
  const sB         = getGroupStandings(groups.B);

  const playedA = groups.A.matches.filter(m => m.homeScore !== null).length;
  const playedB = groups.B.matches.filter(m => m.homeScore !== null).length;

  return `
    <section id="groups-section" aria-label="Fase de Grupos">
      <div class="phase-header">
        <h2>⚽ Fase de Grupos</h2>
        <p class="phase-subtitle">Todos jogam contra todos · ${playedA + playedB}/6 partidas jogadas</p>
      </div>

      <div class="groups-grid">
        <div class="group-container">
          ${renderStandingsCard(groups.A, 'A')}
          <div class="matches-section">
            <p class="matches-title">Partidas — Grupo A</p>
            ${groups.A.matches.map(m => renderMatchCard(m, 'A')).join('')}
          </div>
        </div>
        <div class="group-container">
          ${renderStandingsCard(groups.B, 'B')}
          <div class="matches-section">
            <p class="matches-title">Partidas — Grupo B</p>
            ${groups.B.matches.map(m => renderMatchCard(m, 'B')).join('')}
          </div>
        </div>
      </div>

      ${bothDone ? `
        <div class="advance-banner glass-card" role="status">
          <div class="advance-content">
            <div class="advance-info">
              <h3>🎉 Fase de Grupos Concluída!</h3>
              <p>
                Classificados:
                ${t(sA[0].teamId).flag} ${t(sA[0].teamId).name} &amp;
                ${t(sA[1].teamId).flag} ${t(sA[1].teamId).name} (Grupo A)
                ·
                ${t(sB[0].teamId).flag} ${t(sB[0].teamId).name} &amp;
                ${t(sB[1].teamId).flag} ${t(sB[1].teamId).name} (Grupo B)
              </p>
            </div>
            <button class="btn btn-advance" id="btn-advance-semis">
              Avançar para Semifinais →
            </button>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

// ——— Semifinals ——————————————————————————————————————————

function renderSemifinals() {
  const { semifinals } = state;
  const [sf1, sf2]    = semifinals;
  const done          = areSemifinalsComplete(semifinals);
  const w1 = getKnockoutWinner(sf1);
  const w2 = getKnockoutWinner(sf2);

  return `
    <section id="semis-section" aria-label="Semifinais">
      <div class="phase-header">
        <h2>⚡ Semifinais</h2>
        <p class="phase-subtitle">Jogo único · Em caso de empate, decide nos pênaltis</p>
      </div>

      <div class="knockout-grid">
        <div class="knockout-match-container">
          <p class="match-label">Semifinal 1</p>
          <p class="match-sublabel">1º Grupo A × 2º Grupo B</p>
          ${renderMatchCard(sf1, 'semifinals', true)}
        </div>

        <div class="knockout-connector" aria-hidden="true">
          <div class="connector-line"></div>
          <div class="connector-final">FINAL</div>
          <div class="connector-line"></div>
        </div>

        <div class="knockout-match-container">
          <p class="match-label">Semifinal 2</p>
          <p class="match-sublabel">1º Grupo B × 2º Grupo A</p>
          ${renderMatchCard(sf2, 'semifinals', true)}
        </div>
      </div>

      ${done ? `
        <div class="advance-banner glass-card" role="status">
          <div class="advance-content">
            <div class="advance-info">
              <h3>🎉 Semifinais Concluídas!</h3>
              <p>Final: ${t(w1).flag} ${t(w1).name} × ${t(w2).flag} ${t(w2).name}</p>
            </div>
            <button class="btn btn-advance" id="btn-advance-final">
              Avançar para Final →
            </button>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

// ——— Final ———————————————————————————————————————————————

function renderFinal() {
  const { final } = state;
  const played     = final.homeScore !== null && final.awayScore !== null;
  const winner     = played ? getKnockoutWinner(final) : null;

  return `
    <section id="final-section" aria-label="Grande Final">
      <div class="phase-header">
        <h2>🏆 Grande Final</h2>
        <p class="phase-subtitle">O momento decisivo do campeonato</p>
      </div>

      <div class="final-container">
        ${renderMatchCard(final, 'final', true)}
      </div>

      ${winner ? `
        <div class="advance-banner glass-card" role="status">
          <div class="advance-content">
            <div class="advance-info">
              <h3>🎉 Temos um Campeão!</h3>
              <p>${t(winner).flag} ${t(winner).name} venceu o torneio!</p>
            </div>
            <button class="btn btn-advance btn-champion" id="btn-declare-champion">
              🏆 Ver Campeão →
            </button>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

// ——— Champion ————————————————————————————————————————————

function renderChampion() {
  const champion   = t(state.champion);
  const { final }  = state;
  const homeTeam   = t(final.home);
  const awayTeam   = t(final.away);

  /* Determine final score label */
  const isKOTied = final.homeScore === final.awayScore;
  const pensLabel = isKOTied ? ` (pên. ${final.homePens}×${final.awayPens})` : '';

  /* Build confetti stars via JS (injected after render) */
  return `
    <div id="stars-container" class="stars" aria-hidden="true"></div>
    <section class="champion-section" aria-label="Campeão">
      <div class="champion-container">
        <div class="champion-card glass-card">
          <span class="trophy-icon" aria-hidden="true">🏆</span>
          <p class="champion-title">Campeão!</p>
          <span class="champion-flag" aria-hidden="true">${champion.flag}</span>
          <h1 class="champion-name">${champion.name}</h1>
          <div class="champion-details">
            <strong>Final:</strong>
            ${homeTeam.flag} ${homeTeam.name} ${final.homeScore} × ${final.awayScore} ${awayTeam.flag} ${awayTeam.name}${pensLabel}
          </div>
          <button class="btn btn-reset" id="btn-new-tournament">
            🔄 Novo Torneio
          </button>
        </div>
      </div>
    </section>
  `;
}

// ——— Main render ——————————————————————————————————————————

function render() {
  const { phase } = state;
  const isCompleted = phase === 'completed';

  // Resolve content for current tab
  let content = '';
  if (isCompleted) {
    content = renderChampion();
  } else {
    if (activeTab === 'groups')     content = renderGroupPhase();
    if (activeTab === 'semifinals') content = renderSemifinals();
    if (activeTab === 'final')      content = renderFinal();
  }

  document.getElementById('app').innerHTML = `
    ${renderHeader()}
    <main class="main-content" id="main-content">
      ${content}
    </main>
    <footer class="app-footer">
      <p>⚽ Championship Manager &nbsp;·&nbsp; Dados salvos localmente no navegador</p>
    </footer>
  `;

  // Inject stars if champion
  if (isCompleted) spawnStars();

  attachEvents();
}

// ═══════════════════════════════════════════════════════════
// CONFETTI / STARS
// ═══════════════════════════════════════════════════════════

function spawnStars() {
  const container = document.getElementById('stars-container');
  if (!container) return;
  const colors = ['#f59e0b', '#22c55e', '#fff', '#fde68a', '#86efac'];
  for (let i = 0; i < 30; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
      animation-duration: ${3 + Math.random() * 5}s;
      animation-delay: ${Math.random() * 3}s;
    `;
    container.appendChild(star);
  }
}

// ═══════════════════════════════════════════════════════════
// EVENT HANDLING
// ═══════════════════════════════════════════════════════════

function attachEvents() {
  // Nav tabs
  document.querySelectorAll('.nav-tab:not(.disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      render();
    });
  });

  // Save buttons
  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', handleSave);
  });

  // Edit buttons
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', handleEdit);
  });

  // Knockout penalty hint — show when tie
  document.querySelectorAll('.score-input:not(.score-input--pens)').forEach(input => {
    input.addEventListener('input', () => {
      const matchId = input.id.replace('home-', '').replace('away-', '');
      updatePenaltyHint(matchId);
    });
  });

  // Advance buttons
  el('btn-advance-semis',     () => advanceToSemifinals());
  el('btn-advance-final',     () => advanceToFinalPhase());
  el('btn-declare-champion',  () => declareChampion());
  el('btn-reset',             () => confirmReset());
  el('btn-new-tournament',    () => confirmReset());
}

function el(id, handler) {
  const node = document.getElementById(id);
  if (node) node.addEventListener('click', handler);
}

function updatePenaltyHint(matchId) {
  const homeInput = document.getElementById(`home-${matchId}`);
  const awayInput = document.getElementById(`away-${matchId}`);
  const hint      = document.getElementById(`pens-hint-${matchId}`);
  if (!homeInput || !awayInput || !hint) return;

  const h = parseInt(homeInput.value);
  const a = parseInt(awayInput.value);

  if (!isNaN(h) && !isNaN(a) && h === a) {
    hint.classList.remove('hidden');
  } else {
    hint.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════
// SAVE / EDIT HANDLERS
// ═══════════════════════════════════════════════════════════

function handleSave(e) {
  const { matchId, phase } = e.currentTarget.dataset;
  const isKnockout = e.currentTarget.dataset.knockout === 'true';

  const homeInput = document.getElementById(`home-${matchId}`);
  const awayInput = document.getElementById(`away-${matchId}`);
  if (!homeInput || !awayInput) return;

  const homeScore = parseInt(homeInput.value);
  const awayScore = parseInt(awayInput.value);

  if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    showError('Por favor, insira um placar válido (números não negativos).');
    return;
  }

  let homePens = null, awayPens = null;

  if (isKnockout && homeScore === awayScore) {
    const hpInput = document.getElementById(`home-pens-${matchId}`);
    const apInput = document.getElementById(`away-pens-${matchId}`);
    if (hpInput && apInput) {
      homePens = parseInt(hpInput.value);
      awayPens = parseInt(apInput.value);
      if (isNaN(homePens) || isNaN(awayPens)) {
        showError('Empate! Insira o placar nos pênaltis para definir o classificado.');
        return;
      }
      if (homePens === awayPens) {
        showError('O placar nos pênaltis não pode ser empate. Defina um vencedor.');
        return;
      }
    }
  }

  applyMatch(matchId, phase, homeScore, awayScore, homePens, awayPens);
}

function handleEdit(e) {
  const { matchId } = e.currentTarget.dataset;
  const card        = e.currentTarget.closest('.match-card');
  const inputs      = document.getElementById(`inputs-${matchId}`);
  const editRow     = card.querySelector('.match-edit');

  if (inputs)  inputs.classList.remove('hidden');
  if (editRow) editRow.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// STATE MUTATIONS
// ═══════════════════════════════════════════════════════════

function applyMatch(matchId, phase, homeScore, awayScore, homePens, awayPens) {
  let match;

  if (phase === 'A' || phase === 'B') {
    match = state.groups[phase].matches.find(m => m.id === matchId);
  } else if (phase === 'semifinals') {
    match = state.semifinals.find(m => m.id === matchId);
  } else if (phase === 'final') {
    match = state.final;
  }

  if (!match) return;

  match.homeScore = homeScore;
  match.awayScore = awayScore;
  match.homePens  = homePens ?? null;
  match.awayPens  = awayPens ?? null;

  saveState(state);
  render();
}

function advanceToSemifinals() {
  if (!areBothGroupsComplete(state.groups)) return;

  const sA = getGroupStandings(state.groups.A);
  const sB = getGroupStandings(state.groups.B);

  // SF1: 1º Grupo A vs 2º Grupo B
  state.semifinals[0].home = sA[0].teamId;
  state.semifinals[0].away = sB[1].teamId;

  // SF2: 1º Grupo B vs 2º Grupo A
  state.semifinals[1].home = sB[0].teamId;
  state.semifinals[1].away = sA[1].teamId;

  state.phase = 'semifinals';
  activeTab   = 'semifinals';

  saveState(state);
  render();
}

function advanceToFinalPhase() {
  if (!areSemifinalsComplete(state.semifinals)) return;

  const w1 = getKnockoutWinner(state.semifinals[0]);
  const w2 = getKnockoutWinner(state.semifinals[1]);

  state.final.home = w1;
  state.final.away = w2;
  state.phase      = 'final';
  activeTab        = 'final';

  saveState(state);
  render();
}

function declareChampion() {
  const winner = getKnockoutWinner(state.final);
  if (!winner) return;

  state.champion = winner;
  state.phase    = 'completed';

  saveState(state);
  render();
}

function confirmReset() {
  if (window.confirm('Tem certeza? Todos os dados do torneio atual serão apagados.')) {
    localStorage.removeItem(STORAGE_KEY);
    state     = createInitialState();
    activeTab = 'groups';
    render();
  }
}

// ═══════════════════════════════════════════════════════════
// UI UTILITIES
// ═══════════════════════════════════════════════════════════

function showError(msg) {
  // Simple inline toast — append to main and auto-remove
  const existing = document.getElementById('toast-error');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-error';
  toast.setAttribute('role', 'alert');
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444;
    padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.85rem;
    z-index: 9999; animation: fadeInUp 0.3s ease both;
    box-shadow: 0 8px 32px rgba(239,68,68,0.35); max-width: 90vw; text-align:center;
    font-family: var(--font);
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ═══════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════

render();
