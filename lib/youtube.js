// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const cheerio = require('cheerio')
const {extractScriptResult} = require('./vm')
const {findTagContent} = require('./html')

const makeYoutubeURL = url => {
  return `https://www.youtube.com${url}`
}

const getTitleMetadata = title => {
  let season = title.match(/^CPL S(eason\s)?([0-9]+)/)
  if (season) {
    season = Number(season[2])
  }
  let preseasonWeek = title.match(/Pre-season Week ([0-9]+)/i)
  if (preseasonWeek) {
    preseasonWeek = Number(preseasonWeek[1])
  }
  let groups = [...title.matchAll(/\bG([0-9]+)\b/g)]
  if (groups) {
    groups = groups.map(group => Number(group[1]))
  }
  let isShowmatch = title.includes('Showmatch')
  let isHypeVideo = title.includes('Hype Video')

  return {
    season,
    week: preseasonWeek,
    groups,
    isPreseason: !!preseasonWeek,
    isShowmatch,
    isHypeVideo
  }
}

const getPlaylistVideos = html => {
  const initialData = getInitialData(html)
  const title = initialData.metadata.playlistMetadataRenderer.title
  const videoData = initialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents.map(content => content.playlistVideoRenderer)
  const videos = videoData.map(video => {
    const title = video.title.runs[0].text
    const length = video.lengthText.simpleText
    const url = makeYoutubeURL(video.navigationEndpoint.commandMetadata.webCommandMetadata.url)
    const id = video.navigationEndpoint.watchEndpoint.videoId
    const lengthSeconds = Number(video.lengthSeconds)
    const meta = getTitleMetadata(title)

    return {
      title,
      length,
      lengthSeconds,
      url,
      id,
      meta
    }
  })
  
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
