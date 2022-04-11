// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const sortBy = require('lodash.sortby')
const {getVodsLocal, getVodsLocalFilename} = require('./get-vods')
const {loadJSON, genTeamMatchResults, genWeeklyMapPool, getCPLSeasonData, genComments} = require('../lib')

function categorizeVods(dataVods) {
  const vodCats = {
    preseason: [],
    regular: [],
    showmatch: [],
    other: []
  }
  for (const vod of dataVods) {
    if (vod.meta.isShowmatch) {
      vodCats.showmatch.push(vod)
    }
    else if (vod.meta.isPreseason) {
      vodCats.preseason.push(vod)
    }
    else if (!vod.meta.isPreseason && vod.meta.tier !== null) {
      vodCats.regular.push(vod)
    }
    else {
      vodCats.other.push(vod)
    }
  }

  const allCategorizedVods = Object.values(vodCats).reduce((n, vodCat) => n + vodCat.length, 0)
  const allUncategorizedVods = dataVods.length
  if (allCategorizedVods !== allUncategorizedVods) {
    throw new Error(`did not consume all vods`)
  }

  return vodCats
}

function getVodLink(vod, type) {
  let title = vod.title
  if (vod.meta.isMOTW) {
    title = title.replace(/\(MOTW\)$/i, '').trim()
  }
  return `* [${vod.url} ${title}], <span data-time-seconds="${vod.lengthSeconds}">${vod.length}</span>${vod.meta.isMOTW ? ` (Match of the Week)` : ''}`
}

function getVodHeader(type) {
  if (type === 'preseason') {
    return 'Preseason casts'
  }
  if (type === 'regular') {
    return 'Regular season casts'
  }
  if (type === 'showmatch') {
    return 'Showmatches'
  }
  if (type === 'other') {
    return 'Special events and other videos'
  }
}

function sortVods(vods, type, sortByPlaylistOrder) {
  if (sortByPlaylistOrder) {
    // Vods are already sorted in playlist order by default.
    return vods
  }

  const vodsNumbered = vods.map((vod, n) => ({...vod, n}))

  if (type === 'preseason') {
    return sortBy(vodsNumbered, ['meta.groups', 'n'])
  }
  if (type === 'regular') {
    return sortBy(vodsNumbered, ['season', 'week', 'tier', 'meta.teamMatchup', 'n'])
  }
  return vods
}

function getVodsList(vodCats, sortByPlaylistOrder) {
  const buffer = []
  for (const [type, vods] of Object.entries(vodCats)) {

    const sortedVods = sortVods(vods, type, sortByPlaylistOrder)
    buffer.push(`===${getVodHeader(type)}===`)
    for (const vod of sortedVods) {
      buffer.push(getVodLink(vod, type))
    }
    buffer.push('')
  }
  return buffer
}

async function generateVodsList(seasonNumber, sortByPlaylistOrder = true) {
  const seasonData = await getCPLSeasonData(seasonNumber)
  const fileLocal = path.basename(getVodsLocalFilename(seasonNumber))

  const dataVods = await getVodsLocal(seasonNumber)
  const catVods = categorizeVods(dataVods)
  const vodList = getVodsList(catVods, sortByPlaylistOrder)

  const [startComments, endComments] = genComments(fileLocal)

  const buffer = []
  buffer.push(...startComments)
  buffer.push(`==List of VODs==`)
  buffer.push(``)
  buffer.push(...vodList)
  buffer.push(...endComments)

  return buffer.join('\n')
}

module.exports = {
  generateVodsList
}
