// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const {msToDuration} = require('../lib')
const {getVodsCPL, getVodsLocal} = require('./get-vods')

/**
 * Returns the combined duration of all VODs for a given season from our local data.
 * 
 * If 'isoString' is true, the duration is returned as an ISO 8601 duration string.
 */
async function getVodsDuration(season, omitDays = false, isoString = false) {
  const videos = await getVodsLocal(season)
  const durationSeconds = videos.reduce((d, video) => d += video.lengthSeconds, 0)
  return msToDuration(durationSeconds * 1000, omitDays, isoString)
}

/**
 * Returns the combined duration of all VODs for a given season.
 */
async function getStatsCPL(season) {
  // Ensure our data is up to date.
  await getVodsCPL(season)
  return {
    vodsDuration: await getVodsDuration(season),
    vodsDurationISO: await getVodsDuration(season, false, true),
    vodsDurationInHours: await getVodsDuration(season, true)
  }
}

module.exports = {
  getStatsCPL,
  getVodsDuration
}
