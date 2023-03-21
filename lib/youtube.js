// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const orderBy = require('lodash.orderby')
const fs = require('fs').promises
const {pathCPLSeasonVodsCache} = require('./paths')
const {arrRemoveNull} = require('./data')
const {execToJSON} = require('./exec')
const {msToDuration} = require('./time')

const makeYoutubeURL = url => {
  return `https://www.youtube.com${url}`
}

/**
 * This keeps only the item with the highest preference value and discards the rest.
 * 
 * Used to keep only the best thumbnail in a Youtube VOD data entry.
 */
const keepOnlyBest = items => {
  const sorted = orderBy(items, 'preference', 'desc')
  const best = sorted[0]
  return [best]
}

const getPlaylistJSON = async (url, getIndividualVideoData = false) => {
  const args = [`yt-dlp`, url, `--skip-download`, `--write-info`, `--write-playlist-metafiles`, `-J`, !getIndividualVideoData ? `--flat-playlist` : null]
  const raw = await execToJSON(args.filter(n => n))

  // Delete some of the additional data that we don't need to cut down on the size.
  // When not deleting these entries, the raw JSON is about 450 MB in size.
  // Without them, the file drops down to around 500 KB.
  for (const entry of raw.entries) {
    delete entry.formats
    delete entry.thumbnails
    delete entry.automatic_captions
    delete entry.requested_downloads
    delete entry.requested_formats
  }

  return raw
}

const getVodsJSON = async (cache, url, clearCache = false) => {
  let data
  if (!clearCache) {
    try {
      data = JSON.parse(await fs.readFile(cache, 'utf8'))
      return data
    }
    catch {
    }
  }
  data = await getPlaylistJSON(url, true)
  await fs.writeFile(cache, JSON.stringify(data, null, 2), 'utf8')
  return data
}

/** Terms used in the playoffs. */
const playoffsTypes = [
  'finals',
  'semi-finals',
  'quarter-finals'
]

/**
 * Returns the week for a given playoffs title.
 */
const getPlayoffsWeek = (title, playoffWeeks) => {
  const titleLower = title.toLowerCase()
  const specialTypes = playoffsTypes.map(type => `${type},`)
  for (let n = specialTypes.length; n > 0; --n) {
    const type = specialTypes[n - 1]
    if (titleLower.includes(type)) {
      return playoffWeeks - (n - 1)
    }
  }
  const week = title.match(/Week ([0-9]{1,2})/i)
  return parseInt(week[1])
}

const getTitleMatchupData = (title, teamNames, teamAliases) => {
  let playerMatchup = null
  const matchup = title.match(/,(.+?) vs (.+?),/)
  const teamMatchup = matchup.slice(1, 3).map(teamString => {
    let team = teamString.trim()

    // Special case: if the title's last segment is a team abbreviation in parentheses,
    // e.g. "(4PL)", we assume that this is a 'player + team' combination.
    const teamSlices = team.split(' ')
    const lastSlice = teamSlices[teamSlices.length - 1]
    const lastNoParens = lastSlice.match(/\((.+?)\)/)

    if (lastNoParens?.length && teamAliases[lastNoParens[1]] && !teamAliases[team]) {
      isSingleMatch = true
      if (playerMatchup == null) playerMatchup = []
      playerMatchup.push(teamSlices.slice(0, -1).join(' '))
      return teamAliases[lastNoParens[1]]
    }
    if (teamAliases[team]) {
      team = teamAliases[team]
    }
    if (!teamNames.includes(team)) {
      throw new Error(`Unknown team: "${team}" ("${teamString}")`)
    }
    return team
  })

  return {team: teamMatchup, player: playerMatchup}
}

const getTitleTierData = title => {
  const tiers = []
  const tierData = title.match(/, T([0-9]) -|, T([0-9]) and T([0-9]) -/)
  if (tierData[1]) {
    tiers.push(Number(tierData[1]))
  }
  if (tierData[2]) {
    tiers.push(Number(tierData[2]))
    tiers.push(Number(tierData[3]))
  }
  return tiers
}

/**
 * Returns an array of the casters for a given video.
 */
const getTitleCasters = _title => {
  // Remove "& Crew" from the title, e.g. for "Cast by Lovesnow7 & Crew".
  let title = _title.replace(/& crew/i, '').trim()
  const casters = title.match(/Cast by(.+?)(\s+\(.+?\)|$)/mi)?.[1]
  if (!casters) return []

  return casters.split(/\s+and\s+|,\s+/i).map(c => c.trim())
}

/**
 * Extracts metadata from Youtube titles.
 * 
 * Youtube titles are expected to have a proper, regular format so that they can be parsed correctly.
 * 
 * Preseason examples:
 * 
 *   CPL S8 Pre-Season Week 2, G39, G44 and G45 - Cast by Dada
 *   CPL S8 Pre-Season Week 2, G39 and G44 + Week 1, G43 and G44 - Cast by Saetzero and Neblime
 * 
 * Regular season examples:
 * 
 *   CPL S8 Week 1, GOSU vs Lettuce Attack, T3 - Cast by Forte
 *   CPL S8 Week 1, GOSU iRk-ocoini vs LA SHimmer[ReV], T2 - Cast by dada78641, Grast_bg and Kik0
 * 
 * Playoffs examples (TBA):
 * 
 *   CPL S8 Playoffs Week 1, GOSU vs Lettuce Attack, T3 - Cast by Forte
 *   CPL S8 Quarter-finals, GOSU vs Lettuce Attack, T3 - Cast by Forte
 *   CPL S8 Semi-finals, GOSU vs Lettuce Attack, T3 - Cast by Forte
 *   CPL S8 Finals, GOSU vs Lettuce Attack, T3 - Cast by Forte
 * 
 * Additional examples:
 * 
 *   CPL 8 HYPE!!!
 *   CPL 8 TEAM REVEAL STREAM!!
 *   CPL S8 Showmatch: Team 1 vs Team 2 - Cast by Y2Kid and Dada
 *   CPL S8 Week 9, dbootyz (4PL) vs iRk-RoyalBlue (KM), T0 - Cast by hangs, BoldEgul and LizardKingly
 *   CPL S9 Week 1, Durandal (CMR) vs Charact_R (SEAL), T3 - Cast by Scimo
 */
const getTitleMetadata = (title, seasonData = {}, isSeasonVods = true, eventData = null) => {
  const teams = seasonData.teams ?? []
  const titleLower = title.toLowerCase()
  const teamNames = teams.map(team => team.name)
  const teamAliases = Object.fromEntries(arrRemoveNull(teams.map(team => team.titleAliases.length ? team.titleAliases.flatMap(alias => [alias, team.name]) : null)))

  // What season of CPL this is.
  let season = title.match(/^CPL S(eason\s)?([0-9]+)/)
  if (season) {
    season = Number(season[2])
  }

  // Whether this is a pre-season video.
  const isPreseason = titleLower.includes('pre-season week') || titleLower.includes('preseason week')
  const isPlayoffs = titleLower.includes('playoffs') || playoffsTypes.map(type => titleLower.includes(`${type},`)).includes(true)
  const isKOTT = titleLower.includes('king of the tiers')
  const isShowmatch = titleLower.includes('showmatch')
  const isHypeVideo = titleLower.includes('hype video') || titleLower.match(/CPL\s+[0-9]+\s+hype/i)
  const isRaceWars = titleLower.includes('race wars')
  const isTeamReveal = titleLower.includes('team reveal')
  const isMOTW = title.match(/\(MOTW\)$/i)
  const isRegularSeason = !isPreseason && !isPlayoffs && !isKOTT && !isShowmatch && !isHypeVideo && !isRaceWars && !isTeamReveal && isSeasonVods

  // List of the casters.
  const casters = getTitleCasters(title)

  let weekValue = null
  let weekGroups = null
  let matchupData = null
  let isSingleMatch = false
  let tiers = []
  
  if (isPreseason) {
    const weekSections = title.match(/Week ([0-9])(.+?)\+|Week ([0-9])(.+?)-/ig)
    weekGroups = weekSections.flatMap(weekSection => {
      const week = weekSection.match(/Week ([0-9])/i)
      const groups = [...weekSection.matchAll(/\bG([0-9]+)\b/g)]
      return groups.map(group => [Number(week[1]), Number(group[1])])
    })
  }
  else if (isRegularSeason) {
    const week = title.match(/Week ([0-9]{1,2})/i)
    if (!week) {
      throw new Error(`Regular season title doesn't parse (no week): ${title}`)
    }
    weekValue = Number(week[1])
    matchupData = getTitleMatchupData(title, teamNames, teamAliases)
    tiers = getTitleTierData(title)
  }
  else if (isPlayoffs) {
    const playoffWeeks = Object.keys(seasonData.playoffs.weeks).length
    weekValue = getPlayoffsWeek(title, playoffWeeks)
    matchupData = getTitleMatchupData(title, teamNames, teamAliases)
    tiers = getTitleTierData(title)
  }
  
  return {
    season,
    tiers,
    week: weekValue,
    groups: weekGroups,
    casters,
    teamMatchup: matchupData?.team ?? null,
    playerMatchup: matchupData?.player ?? null,
    event: {...eventData},
    isMOTW: !!isMOTW,
    isKOTT,
    isSeasonVideo: isSeasonVods,
    isSingleMatch,
    isPreseason,
    isRegularSeason,
    isTeamReveal,
    isPlayoffs,
    isRaceWars,
    isShowmatch,
    isHypeVideo
  }
}

const getUploadDate = uploadString => {
  const y = uploadString.slice(0, 4)
  const m = uploadString.slice(4, 6)
  const d = uploadString.slice(6, 8)
  return new Date(`${y}-${m}-${d}`)
}

const getPlaylistVideos = (playlistData, seasonData = {}, isSeasonVods = true, eventData = null) => {
  const title = playlistData.title
  const videos = playlistData.entries.map(entry => {
    return {
      id: entry.id,
      title: entry.title,
      views: entry.view_count,
      likes: Number(entry.like_count),
      upload: Number(entry.upload_date),
      comments: Number(entry.comment_count),
      upload: getUploadDate(entry.upload_date),
      length: msToDuration(entry.duration * 1000, false, true),
      lengthSeconds: entry.duration,
      url: entry.url ?? entry.original_url,
      meta: getTitleMetadata(entry.title, seasonData, isSeasonVods, eventData)
    }
  })
  return {
    title,
    videos
  }
}

module.exports = {
  getPlaylistVideos,
  getPlaylistJSON,
  getVodsJSON
}
