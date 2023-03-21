// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const sortBy = require('lodash.sortby')
const orderBy = require('lodash.orderby')
const {msToDuration, getCPLSeasonData, getAllWeekResults, convertVodStats} = require('../lib')
const {getVodsCPL, getVodsLocal} = require('./get-vods')
//function msToDuration(ms, omitDays = false, omitMs = false, isoString = false) {
const countCasters = videos => {
  const casters = {}
  for (const video of videos) {
    for (const caster of video.meta.casters) {
      if (!casters[caster]) {
        casters[caster] = {
          name: caster,
          casts: 0,
          timeCastMs: 0
        }
      }
      casters[caster].casts += 1
      casters[caster].timeCastMs += video.lengthSeconds * 1000
    }
  }
  const castersList = Object.values(casters)
    .map(caster => ({...caster, timeCast: msToDuration(caster.timeCastMs, false, true), timeCastInHours: msToDuration(caster.timeCastMs, true, true)}))
  return orderBy(castersList, ['timeCastMs', 'casts', 'name'], ['desc', 'desc', 'asc'])
}

/**
 * Returns the combined duration of all VODs for a given season from our local data.
 * 
 * If 'isoString' is true, the duration is returned as an ISO 8601 duration string.
 */
async function getVodsDuration(season, omitDays = false, omitMs = true, isoString = false) {
  const videos = await getVodsLocal(season)
  const durationSeconds = videos.reduce((d, video) => d += video.lengthSeconds, 0)
  return msToDuration(durationSeconds * 1000, omitDays, omitMs, isoString)
}

/**
 * Returns the combined duration of all VODs for a given season.
 */
async function getStatsCPL(season, outCSV, clearCache = false) {
  // Ensure our data is up to date.
  await getVodsCPL(season, clearCache)

  // Get matchup results.
  const seasonData = await getCPLSeasonData(season)
  const videos = await getVodsLocal(season)
  const casters = countCasters(videos)

  const data = {
    vods: videos.length,
    vodsDuration: await getVodsDuration(season),
    vodsDurationISO: await getVodsDuration(season, false, false, true),
    vodsDurationInHours: await getVodsDuration(season, true),
    //teamResults
    casters
  }

  if (outCSV) {
    return convertVodStats(data, season)
  }
  return data
}

module.exports = {
  getStatsCPL,
  getVodsDuration
}
