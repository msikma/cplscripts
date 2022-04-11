// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const fetch = require('node-fetch')
const {getPlaylistVideos} = require('../lib/youtube')
const {getCPLSeasonData} = require('../lib/cpl')

/** Playlists containing all VODs for a given season. */
const seasonPlaylists = {
  '8': 'PLo_7E8VFQPBNRRu7B4CzCwsgZFUMHeg8F'
}

function getVodsLocalFilename(season) {
  return `${__dirname}/../data/s${season}_vods.json`
}

async function getVodsLocal(season) {
  const content = await fs.readFile(getVodsLocalFilename(season), 'utf8')
  return JSON.parse(content).videos
}

async function getVods(season, seasonPlaylists, seasonData) {
  const id = seasonPlaylists[season]
  const url = `https://www.youtube.com/playlist?list=${id}`
  const res = await fetch(url)
  const html = await res.text()
  const data = getPlaylistVideos(html, seasonData)
  return data
}

async function getVodsCPL(season) {
  const seasonData = await getCPLSeasonData(season)
  return getVods(season, seasonPlaylists, seasonData)
}

module.exports = {
  getVodsCPL,
  getVodsLocal,
  getVodsLocalFilename,
  getVods
}
