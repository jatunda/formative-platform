import { getAllMatchesInScheduleOrder, allianceTeamNames, playoffAllianceTeamIds, playoffAllianceLabel } from './state.js';
import { computeMatchTime } from './match-timeline.js';
import { getCurrentMatchIndex, getUpNextMatchIndex, getEliminationCurrentMatchId, getEliminationUpNextMatchId } from './current-match.js';
import { resolveMatchSides, sideSourceLabel, getMatchesInBracketOrder, isBracketComplete } from './bracket.js';

/**
 * @typedef {{teamIds: string[], label: string}} LiveMatchSide
 * @typedef {{
 *   ref: number|string,   // Qualification index, or Elimination Match id
 *   entry: object,        // its getAllMatchesInScheduleOrder entry
 *   matchTime: number|null,
 *   sideA: LiveMatchSide,
 *   sideB: LiveMatchSide,
 * }} LiveMatchSlot
 * @typedef {{
 *   phase: 'qualification'|'elimination',
 *   position: number,     // the Current Match's 1-based position among the phase's played matches
 *   total: number,
 *   current: LiveMatchSlot,
 *   upNext: LiveMatchSlot|null,
 * }} LiveMatch
 */

function slot(state, entry, ref, sideA, sideB) {
  return { ref, entry, matchTime: computeMatchTime(state.timeline, entry.globalIndex), sideA, sideB };
}

function qualificationSide(state, teamIds) {
  return { teamIds, label: allianceTeamNames(state, teamIds) };
}

function qualificationLiveMatch(state, entries) {
  const { matches } = state.qualification;
  const currentIndex = getCurrentMatchIndex(matches);
  if (currentIndex === null) return null;
  const qualSlot = (index) => {
    const { match } = entries[index];
    return slot(state, entries[index], index, qualificationSide(state, match.allianceA), qualificationSide(state, match.allianceB));
  };
  const upNextIndex = getUpNextMatchIndex(matches, currentIndex);
  return {
    phase: 'qualification',
    position: currentIndex + 1,
    total: matches.length,
    current: qualSlot(currentIndex),
    upNext: upNextIndex === null ? null : qualSlot(upNextIndex),
  };
}

/** A side not decided yet is labelled by the match it comes from ("Winner of …" / "Runner-up of …"). */
function eliminationSide(state, bracket, matchId, allianceId, side) {
  if (allianceId == null) return { teamIds: [], label: sideSourceLabel(bracket, matchId, side) };
  return { teamIds: playoffAllianceTeamIds(state, allianceId), label: playoffAllianceLabel(state, allianceId) };
}

function eliminationLiveMatch(state, entries) {
  const { bracket } = state.elimination;
  const currentId = getEliminationCurrentMatchId(bracket);
  const elimSlot = (matchId) => {
    const { allianceA, allianceB } = resolveMatchSides(bracket, matchId);
    return slot(
      state,
      entries.find((e) => e.kind === 'elimination' && e.match.id === matchId),
      matchId,
      eliminationSide(state, bracket, matchId, allianceA, 'A'),
      eliminationSide(state, bracket, matchId, allianceB, 'B'),
    );
  };
  const ordered = getMatchesInBracketOrder(bracket);
  const upNextId = getEliminationUpNextMatchId(bracket, currentId);
  return {
    phase: 'elimination',
    position: ordered.findIndex((m) => m.id === currentId) + 1,
    total: ordered.length,
    current: elimSlot(currentId),
    upNext: upNextId === null ? null : elimSlot(upNextId),
  };
}

/**
 * The Live Match: the Current Match of whichever phase is running, its Up
 * Next, and everything the live displays need about each (schedule entry,
 * Match Time, side labels). Null when no match is in play: setup, Alliance
 * Selection, or once the Tournament is complete.
 * @returns {LiveMatch|null}
 */
export function getLiveMatch(state) {
  const entries = getAllMatchesInScheduleOrder(state);
  const { bracket } = state.elimination;
  if (bracket) return isBracketComplete(bracket) ? null : eliminationLiveMatch(state, entries);
  return qualificationLiveMatch(state, entries);
}
