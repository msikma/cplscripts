// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const {pathCPLSeasonPlaylist, pathCPLSeasonVods} = require('./paths')

/**
 * Returns the content of the a season vods data file.
 */
async function getSeasonVods(season) {
  const content = await fs.readFile(pathCPLSeasonVods(season), 'utf8')
  return JSON.parse(content).videos
}

/**
 * Returns the playlist ID for a given season.
 * 
 * Will return null if the season's playlist text file does not exist.
 */
async function getPlaylistID(season) {
  try {
    const content = await fs.readFile(pathCPLSeasonPlaylist(season), 'utf8')
    return content.trim()
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return null
    }
    throw err
  }
}

/**
 * Checks whether this preseason video contains replays of groups we're looking for.
 */
function matchVodGroups(vodGroups, groupNumber, weekNumber) {
  for (const [vodWeek, vodGroup] of vodGroups) {
    if (vodWeek === weekNumber && vodGroup === groupNumber) {
      return true
    }
  }
  return false
}

/**
 * Checks whether a given VOD's metadata matches a video we're trying to find.
 */
function matchVodMeta(vodMeta, groupNumber, seasonNumber, weekNumber, tierNumber, isPreseason, teams) {
  if (vodMeta.isPreseason !== isPreseason) {
    return false
  }
  if (vodMeta.season !== seasonNumber) {
    return false
  }
  if (isPreseason) {
    return matchVodGroups(vodMeta.groups, groupNumber, weekNumber)
  }
  if (!vodMeta.tiers.includes(tierNumber)) {
    return false
  }
  if (vodMeta.week !== weekNumber) {
    return false
  }
  if (vodMeta.isShowmatch || vodMeta.isHypeVideo) {
    return false
  }
  for (const vodTeam of vodMeta.teamMatchup) {
    if (teams.includes(vodTeam)) {
      return true
    }
  }
  return false
}

/**
 * Returns a list of VODs that match a given group.
 */
function findGroupVods(vods, groupNumber, seasonNumber, weekNumber, isPreseason) {
  return vods.filter(vod => matchVodMeta(vod.meta, groupNumber, seasonNumber, weekNumber, null, isPreseason, null))
}

module.exports = {
  findGroupVods,
  getPlaylistID,
  getSeasonVods
}
