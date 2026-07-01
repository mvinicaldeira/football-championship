// data.js — Teams & Initial Tournament State

/** @type {Record<string, {id:string, name:string, flag:string}>} */
export const TEAMS = {
  germany:   { id: 'germany',   name: 'Alemanha',   flag: '🇩🇪' },
  argentina: { id: 'argentina', name: 'Argentina',  flag: '🇦🇷' },
  spain:     { id: 'spain',     name: 'Espanha',    flag: '🇪🇸' },
  france:    { id: 'france',    name: 'França',     flag: '🇫🇷' },
  england:   { id: 'england',   name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  portugal:  { id: 'portugal',  name: 'Portugal',   flag: '🇵🇹' },
};

/**
 * Creates a fresh tournament state.
 * Groups are fixed:
 *   Grupo A — Alemanha, Argentina, Espanha
 *   Grupo B — França, Inglaterra, Portugal
 *
 * @returns {TournamentState}
 */
export function createInitialState() {
  return {
    /** @type {'groups'|'semifinals'|'final'|'completed'} */
    phase: 'groups',

    groups: {
      A: {
        teams: ['germany', 'argentina', 'spain'],
        matches: [
          { id: 'A1', home: 'germany',   away: 'argentina', homeScore: null, awayScore: null },
          { id: 'A2', home: 'germany',   away: 'spain',     homeScore: null, awayScore: null },
          { id: 'A3', home: 'argentina', away: 'spain',     homeScore: null, awayScore: null },
        ],
      },
      B: {
        teams: ['france', 'england', 'portugal'],
        matches: [
          { id: 'B1', home: 'france',  away: 'england',  homeScore: null, awayScore: null },
          { id: 'B2', home: 'france',  away: 'portugal', homeScore: null, awayScore: null },
          { id: 'B3', home: 'england', away: 'portugal', homeScore: null, awayScore: null },
        ],
      },
    },

    // Populated when advancing from groups
    semifinals: [
      // SF1: 1º Grupo A vs 2º Grupo B
      { id: 'SF1', home: null, away: null, homeScore: null, awayScore: null, homePens: null, awayPens: null },
      // SF2: 1º Grupo B vs 2º Grupo A
      { id: 'SF2', home: null, away: null, homeScore: null, awayScore: null, homePens: null, awayPens: null },
    ],

    // Populated when advancing from semifinals
    final: {
      id: 'FIN',
      home: null, away: null,
      homeScore: null, awayScore: null,
      homePens: null, awayPens: null,
    },

    champion: null,
  };
}
