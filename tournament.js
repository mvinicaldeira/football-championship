// tournament.js — Pure business logic (no side-effects)

/**
 * Compute raw statistics for one team across an array of matches.
 * @param {string} teamId
 * @param {Array}  matches
 */
export function getTeamStats(teamId, matches) {
  const s = { pj: 0, v: 0, e: 0, d: 0, gf: 0, gs: 0 };

  for (const match of matches) {
    if (match.homeScore === null || match.awayScore === null) continue;
    if (match.home !== teamId && match.away !== teamId) continue;

    s.pj++;
    const isHome  = match.home === teamId;
    const scored  = isHome ? match.homeScore : match.awayScore;
    const conceded = isHome ? match.awayScore : match.homeScore;

    s.gf += scored;
    s.gs += conceded;

    if (scored > conceded)       s.v++;
    else if (scored === conceded) s.e++;
    else                          s.d++;
  }

  return { ...s, sg: s.gf - s.gs, pts: s.v * 3 + s.e };
}

/**
 * Returns group teams sorted by tiebreaker rules:
 * 1. Points (desc)
 * 2. Goal difference (desc)
 * 3. Goals scored (desc)
 * 4. Goals conceded (asc)
 * @param {{ teams: string[], matches: Array }} group
 */
export function getGroupStandings(group) {
  return group.teams
    .map(teamId => ({ teamId, ...getTeamStats(teamId, group.matches) }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;    // 1. Points
      if (b.sg  !== a.sg)  return b.sg  - a.sg;     // 2. Goal diff
      if (b.gf  !== a.gf)  return b.gf  - a.gf;     // 3. Goals scored
      return a.gs - b.gs;                             // 4. Goals conceded
    });
}

/**
 * Whether every match in the group has a result.
 */
export function isGroupComplete(group) {
  return group.matches.every(m => m.homeScore !== null && m.awayScore !== null);
}

/**
 * Whether both groups are complete.
 */
export function areBothGroupsComplete(groups) {
  return isGroupComplete(groups.A) && isGroupComplete(groups.B);
}

/**
 * Determines the winner of a knockout match.
 * Returns teamId or null if no winner yet.
 * Penalties are used as a tiebreaker when regular-time scores are equal.
 * @param {{ home:string|null, away:string|null, homeScore:number|null, awayScore:number|null, homePens:number|null, awayPens:number|null }} match
 */
export function getKnockoutWinner(match) {
  if (match.home === null || match.homeScore === null || match.awayScore === null) return null;

  if (match.homeScore > match.awayScore) return match.home;
  if (match.awayScore > match.homeScore) return match.away;

  // Tied — check penalties
  if (match.homePens !== null && match.awayPens !== null) {
    if (match.homePens > match.awayPens) return match.home;
    if (match.awayPens > match.homePens) return match.away;
  }

  return null; // Still unresolved
}

/**
 * Whether all semifinals have a decided winner.
 */
export function areSemifinalsComplete(semifinals) {
  return semifinals.every(sf => getKnockoutWinner(sf) !== null);
}
