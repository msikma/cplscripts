// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const cheerio = require('cheerio')
const {extractScriptResult} = require('./vm')
const {findTagContent} = require('./html')
const {arrRemoveNull} = require('./data')

const makeYoutubeURL = url => {
  return `https://www.youtube.com${url}`
}

/**
 * Extracts metadata from Youtube titles.
 * 
 * Youtube titles are expected to have a proper, regular format so that they can be parsed correctly.
 * Some examples:
 * 
 *   CPL S8 Pre-Season Week 2, G39 and G44 + Week 1, G43 and G44 - Cast by Saetzero and Neblime
 *   CPL S8 Pre-Season Week 2, G39, G44 and G45 - Cast by Dada
 *   CPL S8 Week 1, GOSU vs Lettuce Attack, T3 - Cast by Forte
 */
const getTitleMetadata = (title, teams = []) => {
  const titleLower = title.toLowerCase()
  const teamNames = teams.map(team => team.name)
  const teamAliases = Object.fromEntries(arrRemoveNull(teams.map(team => team.titleAliases.length ? team.titleAliases.flatMap(alias => [alias, team.name]) : null)))

  // What season of CPL this is.
  let season = title.match(/^CPL S(eason\s)?([0-9]+)/)
  if (season) {
    season = Number(season[2])
  }

  // Whether this is a pre-season video.
  let isPreseason = false
  if (titleLower.includes('pre-season week') || titleLower.includes('preseason week')) {
    isPreseason = true
  }

  let regularWeek = null
  let weekGroups = null
  let teamMatchup = null
  let tier = null
  
  if (isPreseason) {
    const weekSections = title.match(/Week ([0-9])(.+?)\+|Week ([0-9])(.+?)-/ig)
    weekGroups = weekSections.flatMap(weekSection => {
      const week = weekSection.match(/Week ([0-9])/i)
      const groups = [...weekSection.matchAll(/\bG([0-9]+)\b/g)]
      return groups.map(group => [Number(week[1]), Number(group[1])])
    })
  }
  else {
    const week = title.match(/Week ([0-9])/i)
    if (week) {
      regularWeek = Number(week[1])
      const matchup = title.match(/,(.+?) vs (.+?),/)
      teamMatchup = matchup.slice(1, 3).map(teamString => {
        let team = teamString.trim()
        if (teamAliases[team]) {
          team = teamAliases[team]
        }
        if (!teamNames.includes(team)) {
          throw new Error(`Unknown team: "${team}" ("${teamString}")`)
        }
        return team
      })
      const tierData = title.match(/, T([0-9]) -/)
      tier = Number(tierData[1])
    }
  }

  const isMOTW = title.match(/\(MOTW\)$/i)

  let preseasonWeek = title.match(/Pre-season Week ([0-9]+)/i)
  if (preseasonWeek) {
    preseasonWeek = Number(preseasonWeek[1])
  }
  let isShowmatch = title.includes('Showmatch')
  let isHypeVideo = title.includes('Hype Video')

  return {
    season,
    tier,
    week: regularWeek,
    groups: weekGroups,
    teamMatchup,
    isMOTW: !!isMOTW,
    isPreseason,
    isShowmatch,
    isHypeVideo
  }
}

const getPlaylistVideos = (html, seasonData = {}) => {
  const initialData = getInitialData(html)
  const title = initialData.metadata.playlistMetadataRenderer.title
  const videoData = initialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents.map(content => content.playlistVideoRenderer)
  const videos = arrRemoveNull(videoData.map(video => {
    // If the video length is unknown, it's probably still uploading.
    if (!video.lengthText) {
      return null
    }

    const title = video.title.runs[0].text
    const length = video.lengthText.simpleText
    const url = makeYoutubeURL(video.navigationEndpoint.commandMetadata.webCommandMetadata.url)
    const id = video.navigationEndpoint.watchEndpoint.videoId
    const lengthSeconds = Number(video.lengthSeconds)
    const meta = getTitleMetadata(title, seasonData.teams)

    return {
      title,
      length,
      lengthSeconds,
      url,
      id,
      meta
    }
  }))
  
  return {
    title,
    videos
  }
}

const getInitialData = html => {
  const $ = cheerio.load(html)
  const initialDataScript = findTagContent($, 'script', [`window["ytInitialData"]`, `var ytInitialData`])

  let initialData = extractScriptResult(initialDataScript).context

  // Either the data is in 'window.ytInitialData', or in just 'ytInitialData'.
  if (initialData.window.ytInitialData) {
    initialData = initialData.window.ytInitialData
  }
  else {
    initialData = initialData.ytInitialData
  }

  if (!initialData) {
    throw new Error(`The 'ytInitialData' object could not be extracted`)
  }

  return initialData
}

module.exports = {
  getInitialData,
  getPlaylistVideos
}
