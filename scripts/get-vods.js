// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const {getAllEvents} = require('../lib/events')
const {getPlaylistVideos, getVodsJSON} = require('../lib/youtube')
const {pathCPLSeasonVods, pathCPLSeasonVodsCache, pathCPLEventVodsCache} = require('../lib/paths')
const {getCPLSeasonData} = require('../lib/cpl')
const {getPlaylistID} = require('../lib/vods')

async function getVodsLocal(season) {
  const content = await fs.readFile(pathCPLSeasonVods(season), 'utf8')
  return JSON.parse(content).videos
}

async function getEventVods(event, clearCache = false) {
  const url = `https://www.youtube.com/playlist?list=${event.playlistID}`
  const cache = pathCPLEventVodsCache(event.name)
  const json = await getVodsJSON(cache, url, clearCache)
  const data = getPlaylistVideos(json, {}, false, event)
  return data
}

async function getEventVodsCPL(clearCache = false) {
  const events = await getAllEvents()
  for (const event of Object.values(events)) {
    const vods = await getEventVods(event, clearCache)
    event.vods = vods
  }
  return events
}

async function getVods(season, seasonData, clearCache = false) {
  const id = await getPlaylistID(season)
  const url = `https://www.youtube.com/playlist?list=${id}`
  const cache = pathCPLSeasonVodsCache(season)
  const json = await getVodsJSON(cache, url, clearCache)
  const data = getPlaylistVideos(json, seasonData)
  return data
}

async function getVodsCPL(season, clearCache = false) {
  const seasonData = await getCPLSeasonData(season)
  return getVods(season, seasonData, clearCache)
}

module.exports = {
  getVodsCPL,
  getEventVodsCPL,
  getVodsLocal,
  getVods
}
