// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')

/**
 * Decorates a function returning a path such that its return value is resolved.
 */
const resolvePath = fn => (...args) => path.resolve(fn(...args))

/** Path to the CPL events. */
const pathCPLEvents = resolvePath(() => `${__dirname}/../data/events`)

/** Path to a specific event's base directory. */
const pathCPLEvent = resolvePath(ev => `${__dirname}/../data/events/${ev}`)

/** Path to the CPL season data. */
const pathCPLSeasonData = resolvePath(season => `${__dirname}/../data/s${season}/static/info.json`)

/** Path to the CPL season miscellaneous data. */
const pathCPLSeasonMiscData = resolvePath(season => `${__dirname}/../data/s${season}/static/misc.json`)

/** Path to the weekly match results. */
const pathCPLSeasonWeekResults = resolvePath((season, week, type = 'regular') => `${__dirname}/../data/s${season}/${getTypePrefix(type)}week${week}_results.json`)

/** Path to a season's vods data. */
const pathCPLSeasonVods = resolvePath(season => `${__dirname}/../data/s${season}/vods.json`)

/** Path to a season's vods cache (raw yt-dlp output). */
const pathCPLSeasonVodsCache = resolvePath(season => `${__dirname}/../data/cache/s${season}-vods.json`)

/** Path to an event's vods cache (raw yt-dlp output). */
const pathCPLEventVodsCache = resolvePath(event => `${__dirname}/../data/cache/event-${event}-vods.json`)

/** Path to a season's replay files. */
const pathCPLReplays = resolvePath(season => `${__dirname}/../data/s${season}/replays`)

/** Path to a season's data base directory. */
const pathCPLSeasonBase = resolvePath(season => `${__dirname}/../data/s${season}`)

/** Path to the maps directory (for the map scraper). */
const pathCPLMaps = resolvePath(() => `${__dirname}/../data/maps`)

/** Path to a season's playlist ID text file. */
const pathCPLSeasonPlaylist = resolvePath(season => `${__dirname}/../data/s${season}/static/playlist_id.txt`)

/** Path to the CPL replay cache file. */
const pathCPLReplayCache = path.resolve(`${__dirname}/../data/cache/replays.json`)

/** Path to a specific replay file. */
const pathCPLReplay = (seasonNumber, typeInfo, weekNumber, teams, tier, players) => {
  const typeSegment = typeInfo.isRegularSeason ? 'regular' : typeInfo.isPlayoffs ? 'playoffs' : 'unknown'
  const weekSegment = `week${weekNumber}`
  const teamSegment = teams.join('_vs_')
  const tierSegment = `tier${tier}`
  const playerSegment = players.join('_vs_')

  return path.join(pathCPLReplays(seasonNumber), typeSegment, weekSegment, teamSegment, tierSegment, playerSegment)
}

/**
 * Returns a prefix to use for targeting files from either the preseason, the regular season or the playoffs.
 */
function getTypePrefix(type) {
  if (!type || type === 'regular') {
    return ''
  }
  return `${type}_`
}

module.exports = {
  getTypePrefix,
  pathCPLEvent,
  pathCPLEvents,
  pathCPLEventVodsCache,
  pathCPLMaps,
  pathCPLReplay,
  pathCPLReplayCache,
  pathCPLReplays,
  pathCPLSeasonBase,
  pathCPLSeasonData,
  pathCPLSeasonMiscData,
  pathCPLSeasonPlaylist,
  pathCPLSeasonVods,
  pathCPLSeasonVodsCache,
  pathCPLSeasonWeekResults
}
