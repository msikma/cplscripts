// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const sortBy = require('lodash.sortby')
const {getVodsLocal, getEventVodsCPL} = require('./get-vods')
const {getHammerTime, getCPLSeasonData, getYearMonth, getPlaylistID} = require('../lib')

function categorizeVods(dataVods) {
  const vodCats = {
    preseason: {vods: {title: getVodHeader('preseason'), videos: []}},
    regular: {vods: {title: getVodHeader('regular'), videos: []}},
    showmatch: {vods: {title: getVodHeader('showmatch'), videos: []}},
    other: {vods: {title: getVodHeader('other'), videos: []}}
  }
  for (const vod of dataVods) {
    if (vod.meta.isShowmatch) {
      vodCats.showmatch.vods.videos.push(vod)
    }
    else if (vod.meta.isPreseason) {
      vodCats.preseason.vods.videos.push(vod)
    }
    else if (!vod.meta.isPreseason && vod.meta.tiers.length > 0) {
      vodCats.regular.vods.videos.push(vod)
    }
    else {
      vodCats.other.vods.videos.push(vod)
    }
  }

  const allCategorizedVods = Object.values(vodCats).reduce((n, vodCat) => n + vodCat.vods.videos.length, 0)
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
  if (title.includes(' - ')) {
    title = title.replace(/^(.+?) - (.+?)$/, `**$1** - $2`)
  }
  else {
    title = `**${title}**`
  }
  const date = new Date(vod.upload)
  const htAbs = getHammerTime(date, 'date', false)
  const htRel = getHammerTime(date, 'relative')
  return `• ${title}${vod.meta.isMOTW ? ` (Match of the Week)` : ''}, posted ${htAbs}, ${htRel}:\n   <${vod.url}> - ${vod.length}`
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

function getSeasonStartEnd(seasonData) {
  const start = seasonData.dates?.start
  const end = seasonData.dates?.end
  if (!start || !end) {
    return null
  }
  const [startYear, startMonth] = getYearMonth(new Date(seasonData.dates.start))
  const [endYear, endMonth] = getYearMonth(new Date(seasonData.dates.end))
  if (startYear === endYear) {
    return `${startMonth}–${endMonth} ${startYear}`
  }
  else {
    return `${startMonth} ${startYear}–${endMonth} ${endYear}`
  }
}


function getVodsList(vodCats, seasonData, seasonPlaylistURL, sortByPlaylistOrder = true) {
  const buffer = []
  if (seasonData) {
    const dateString = getSeasonStartEnd(seasonData)
    buffer.push(`** **\n**CPL SEASON ${seasonData.seasonNumber}**${dateString ? ` - ${dateString}` : ''}`)
    if (dateString) {
      buffer.push(`> Full playlist: <${seasonPlaylistURL}>`)
    }
  }
  for (const [type, ev] of Object.entries(vodCats)) {
    const header = ev.title ?? ev.vods.title
    const sortedVods = sortVods(ev.vods.videos, type, sortByPlaylistOrder)
    buffer.push(`** **\n**${header}:**`) // note: untrimmable linebreak prefix
    buffer.push(``)
    for (const vod of sortedVods) {
      buffer.push(getVodLink(vod, type))
    }
  }
  return buffer
}

function paginateBuffer(buffer, maxSize = 1999) {
  const pages = []
  let page = []
  let pageSize = 0
  for (let n = 0; n < buffer.length; ++n) {
    pageSize += buffer[n].length
    if (pageSize > maxSize) {
      pages.push(page)
      page = [buffer[n]]
      pageSize = buffer[n].length
    }
    else {
      page.push(buffer[n])
    }
  }
  if (page.length > 0) {
    pages.push(page)
  }
  return pages
}

async function generateVodsListDiscord(seasonNumber, sortByPlaylistOrder = true) {
  const id = await getPlaylistID(seasonNumber)
  const url = `https://www.youtube.com/playlist?list=${id}`
  const seasonData = await getCPLSeasonData(seasonNumber)
  const eventVods = await getEventVodsCPL()
  const dataVods = await getVodsLocal(seasonNumber)
  const catVods = categorizeVods(dataVods)
  const vodList = getVodsList({...catVods, ...eventVods}, seasonData, url, sortByPlaylistOrder)
  const paginatedBuffer = paginateBuffer(vodList).map(page => page.join('\n'))
  return paginatedBuffer.join('\n---\n')
}

module.exports = {
  generateVodsListDiscord
}
