// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const fg = require('fast-glob')
const path = require('path')
const Screp = require('screp-js-file')
const {processRepData} = require('screptools-process')
const {getCPLSeasonData} = require('./cpl')
const {getSeasonVods} = require('./vods')
const {msToDuration} = require('./time')
const {pathCPLReplayCache} = require('./paths')
const {getTeamDataByAlias} = require('./stats')
const {logObject} = require('./util')

/** Cache used to look up replay data. */
const cache = {
  data: null
}

/**
 * Returns the teams in a matchup.
 */
const getTeams = (teams, seasonData) => {
  const teamNames = []
  const [teamA, teamB] = teams.split('_vs_')
  const teamDataA = seasonData.teams.find(team => team.name === teamA)
  const teamDataB = seasonData.teams.find(team => team.name === teamB)
  teamNames.push(teamDataA.titleAliases[0] || teamA)
  teamNames.push(teamDataB.titleAliases[0] || teamB)
  return teamNames
}

/**
 * Retrieves info about a replay from the cache file.
 */
const getReplayInfoFromCache = async (filepath, repPath) => {
  await fs.mkdir(path.dirname(pathCPLReplayCache), {recursive: true})
  if (cache.data == null) {
    try {
      const data = JSON.parse(await fs.readFile(pathCPLReplayCache, 'utf8'))
      cache.data = data
    }
    catch (err) {
      if (err.code === 'ENOENT') {
        return undefined
      }

      throw err
    }
  }

  const fn = path.relative(repPath, filepath)
  
  if (cache.data?.[fn] !== undefined) return cache.data[fn]

  return undefined
}

/**
 * Saves data to the cache file.
 */
const saveReplayInfoToCache = async (data, filepath, repPath) => {
  if (cache.data == null) {
    cache.data = {}
  }
  const fn = path.relative(repPath, filepath)
  cache.data[fn] = data

  const items = Object.values(cache.data).length
  const label = `writing cache: ${items} items: ${fn}`
  console.time(label)
  await fs.writeFile(pathCPLReplayCache, JSON.stringify(cache.data, null, 2), 'utf8')
  console.timeEnd(label)
}

/**
 * Returns data about a replay from the file itself using Screp.
 */
const getReplayInfoFromFile = async (filepath, repPath) => {
  try {
    const res = await Screp.parseFile(filepath, {mapData: true})
    const data = processRepData(res)
    return data
  }
  catch (err) {
    if (String(err).includes('not a replay file')) {
      return null
    }
    throw err
  }
}

/**
 * Returns relevant information about a replay.
 */
const getReplayInfo = async (filepath, repPath) => {
  let data
  const cached = await getReplayInfoFromCache(filepath, repPath)
  if (cached !== undefined) {
    data = cached
  }
  else {
    data = await getReplayInfoFromFile(filepath, repPath)
    await saveReplayInfoToCache(data, filepath, repPath)
  }
  if (data == null) return data
  return {
    data,
    filename: path.relative(repPath, filepath),
    date: new Date(data.match.date),
    matchup: data.matchupSorted,
    length: data.match.duration
  }
}

/**
 * Returns replay information for unsorted replays.
 */
const getUnsortedReplayInfo = async (matchupPath, repPath) => {
  let totalDuration = 0
  let earliestReplay = Infinity
  let latestReplay = 0
  const matchups = []
  const reps = await fg('**/*.rep', {cwd: matchupPath})
  
  for (const rep of reps) {
    const info = await getReplayInfo(path.join(matchupPath, rep), repPath)
    if (info == null) continue
    totalDuration += info.length
    earliestReplay = Math.min(earliestReplay, Number(new Date(info.date)))
    latestReplay = Math.max(latestReplay, Number(new Date(info.date)))
    matchups.push({matchupRace: info.matchup, matchupLength: info.length})
  }

  return [matchups, totalDuration, earliestReplay, latestReplay]
}

/**
 * Sorts replays by their match date.
 */
const repSort = (a, b) => {
  const aDate = new Date(a.date)
  const bDate = new Date(b.date)
  return aDate < bDate ? -1 : 1
}

/**
 * Returns all information about a single match with a variable number of replays.
 */
const getMatchupInfo = async (matchupDirs, basepath, noSubdirectory = false, repPath = '/') => {
  let totalDuration = 0
  let earliestReplay = Infinity
  let latestReplay = 0
  const matchups = []
  for (const matchup of matchupDirs) {
    // Look for .rep files either in the subdirectory or in the base directory itself.
    const matchupPath = noSubdirectory ? basepath : path.join(basepath, matchup)
    const reps = await fg('*.rep', {cwd: matchupPath})
    
    let matchupRace = null
    let matchupLength = 0
    const repInfo = []
    for (const rep of reps) {
      const info = await getReplayInfo(path.join(matchupPath, rep), repPath)
      if (info == null) continue
      earliestReplay = Math.min(earliestReplay, Number(new Date(info.date)))
      latestReplay = Math.max(latestReplay, Number(new Date(info.date)))
      matchupRace = info.matchup
      matchupLength += info.length
      repInfo.push(info)
    }
    totalDuration += matchupLength
    const players = matchup.split('_vs_')
    matchups.push({matchupRace, matchupLength, reps: repInfo.sort(repSort), players: {playerA: players[0], playerB: players[1]}})
  }
  return [matchups, totalDuration, earliestReplay, latestReplay]
}

/**
 * Counts the matchup types in a group.
 */
const countMatchups = matchupInfo => {
  const races = {}
  for (const matchup of matchupInfo) {
    if (!races[matchup.matchupRace]) races[matchup.matchupRace] = 0
    races[matchup.matchupRace] += 1
  }
  return races
}

/**
 * Checks whether the metadata of a vod matches the metadata we expect.
 */
const hasMetaMatch = (videoMeta, metaMatch) => {
  for (const [key, value] of Object.entries(metaMatch)) {
    if (videoMeta[key] !== value) {
      return false
    }
  }
  return true
}

/**
 * Returns the full team names from a list of team abbreviations.
 */
const getFullTeamNamesByAlias = (teams, seasonData) => {
  const fullNames = {}
  for (const [key, alias] of Object.entries(teams)) {
    fullNames[key] = getTeamDataByAlias(alias, seasonData)
  }
  return fullNames
}

/**
 * Returns whether a group was cast, and includes a list of vods.
 */
const getGroupCastStatus = (repSection, tierNumber, weekNumber, teamA, teamB, vodsData, seasonData) => {
  const seasonN = Number(seasonData.seasonNumber)
  const tierN = Number(tierNumber)
  const weekN = Number(weekNumber)
  const teams = getFullTeamNamesByAlias({a: teamA, b: teamB}, seasonData)

  // Find vods that pertain to this group.
  const vods = vodsData.filter(vod => {
    const {meta} = vod
    if (!meta.teamMatchup) return false
    const matchingSeason = meta.season === seasonN
    const matchingTier = meta.tiers.includes(tierN)
    const matchingWeek = meta.week === weekN
    const matchingTeams = meta.teamMatchup.includes(teams.a.name) && meta.teamMatchup.includes(teams.b.name)
    const matchingMeta = hasMetaMatch(meta, repSection?.meta?.metaMatch ?? {})
    return matchingSeason && matchingTier && matchingWeek && matchingTeams && matchingMeta
  })

  return {
    wasCast: vods.length > 0,
    vods: vods
  }
}

/**
 * Returns matchup information for a given tier.
 */
const getTierInfo = async (repSection, weekNumber, teams, basepath, repPath, vodsData, seasonData) => {
  const tierInfo = []
  const tiers = (await fg('*', {cwd: basepath, deep: 1, onlyDirectories: true})).sort()
  for (const tier of tiers) {
    const tierNumber = tier.match(/tier([0-9]+)/)[1]
    const tierPath = path.join(basepath, tier)

    const playerMatchups = await fg('*', {cwd: tierPath, deep: 1, onlyDirectories: true})
    const [matchupInfo, tierDuration, earliestRep, latestRep] = await getMatchupInfo(playerMatchups, tierPath, false, repPath)
    const matchupRaces = countMatchups(matchupInfo)
    const groupCastStatus  = getGroupCastStatus(repSection, tierNumber, weekNumber, teams.teamA, teams.teamB, vodsData, seasonData)
    tierInfo.push({matchupInfo, matchupRaces, tierNumber, tierDuration, earliestRep, latestRep, groupCastStatus})
  }
  return tierInfo
}

/**
 * Returns all matchup groups for a given week.
 */
const getWeekMatchups = async (repSection, seasonData, weekNumber, basepath, repPath, vodsData) => {
  const weekMatchups = []
  const teamMatchups = await fg('*', {cwd: basepath, deep: 1, onlyDirectories: true})
  for (const teamMatchup of teamMatchups) {
    const [teamA, teamB] = getTeams(teamMatchup, seasonData)
    const matchupPath = path.join(basepath, teamMatchup)
    const tiersInfo = await getTierInfo(repSection, weekNumber, {teamA, teamB}, matchupPath, repPath, vodsData, seasonData)
    weekMatchups.push({tiersInfo, teams: {teamA, teamB}})
  }
  return weekMatchups
}

/**
 * Returns a string of all races in a casting group and their frequency.
 */
const getRacesString = (matchupRaces, term = 'match') => {
  const items = []
  let totalAmount = 0
  for (const [matchup, amount] of Object.entries(matchupRaces)) {
    items.push(`${matchup}: ${amount}`)
    totalAmount += amount
  }
  let termTotal
  if (term === 'match') {
    termTotal = totalAmount === 1 ? 'match' : 'matches'
  }
  else {
    termTotal = totalAmount === 1 ? 'game' : 'games'
  }
  return [`[${items.join(', ')}] = total: ${totalAmount} ${termTotal}`, items.join(', '), `${totalAmount} ${termTotal}`]
}

/**
 * Returns a list of top level casting groups with each a type.
 * 
 * In most cases, 'regular' and 'playoffs' are the most important groups.
 * They are type 'weekly_team_matchups', indicating they are structured as per the readme.
 * 
 * Other groups are type 'static' and get processed without the week/team/matchup structure in mind.
 */
const getCastingSectionTypes = async (season, repPath) => {
  const meta = {
    'regular': {
      title: 'Regular season',
      metaMatch: {
        isRegularSeason: true
      }
    },
    'playoffs': {
      title: 'Playoffs',
      metaMatch: {
        isPlayoffs: true
      }
    },
    'preseason': {
      title: 'Preseason',
      metaMatch: {
        isPreseason: true
      }
    }
  }
  const sections = (await fg('*', {cwd: repPath, deep: 1, onlyDirectories: true})).sort()
  return sections.map(section => {
    const type = ['regular', 'playoffs'].includes(section)
      ? 'weekly_team_matchups'
      : 'static'
    const data = meta[section] ?? {}
    return {
      dir: section,
      title: data.title ?? section,
      meta: data,
      type
    }
  })
}

/**
 * Returns formatted output for the casting groups overview.
 */
const makeCastingGroupsOutput = (season, repWeekGroups, type = 'markdown', onlyUncast = false) => {
  const buffer = []
  for (const [repGroup, repSection, repInfo] of Object.values(repWeekGroups)) {
    if (repSection.type === 'weekly_team_matchups') {
      buffer.push(makeRegularGroupOutput(season, repGroup, repInfo, repSection, type))
    }
    if (repSection.type === 'static') {
      buffer.push(makeStaticGroupOutput(season, repGroup, repInfo, repSection, type))
    }
  }
  return buffer.filter(s => s !== null).join(`\n\n${`═`.repeat(40)}\n\n`).trim()
}

/**
 * Returns a human readable group name for a static replay directory.
 */
const getStaticGroupName = (name, groupItems) => {
  const weekNumber = name.match(/week([0-9]+)/)?.[1]
  const groupNumber = name.match(/group([0-9]+)/)?.[1]
  if (weekNumber) {
    return `Week ${weekNumber}`
  }
  if (groupNumber) {
    return `Group ${groupNumber}`
  }
  return `Group: ${name}`
}

/**
 * Returns formatted output for a single casting group.
 */
const makeStaticGroupOutputMarkdown = (season, repGroups, repInfo, repSection) => {
  const buffer = []
  buffer.push(`\n**Tournament: ${repInfo.name ?? repSection.title}**`)
  let seasonDuration = 0
  for (const [name, repGroupItems] of Object.entries(repGroups)) {
    const groupName = getStaticGroupName(name, repGroupItems)
    buffer.push(`\n**${groupName}**\n`)
    for (const repGroupItem of repGroupItems) {
      for (const dir of repGroupItem.dirInfo) {
        seasonDuration += dir.dirDuration
        const isEmpty = Object.keys(dir.matchupRaces).length === 0
        buffer.push(`• **${dir.dir}** - ${isEmpty ? '*No games*' : `Playtime: ${msToDuration(dir.dirDuration, true, true)}, matchups: ${getRacesString(dir.matchupRaces, 'game')[0]}`}`)
      }
    }
  }
  buffer.push(`\n${`┄`.repeat(40)}\n`)
  buffer.push(`**CPL Season ${season}** ${repInfo.name ? `**${repInfo.name}**` : repSection.title.toLowerCase()} total replay duration: **${msToDuration(seasonDuration, true, true)}**`)

  return buffer.join('\n').trim()
}

/**
 * Returns formatted output for a single casting group.
 */
const makeStaticGroupOutputTables = (season, repGroups, repInfo, repSection) => {
  const buffers = []
  let row

  row = []
  row.push(`\n**Tournament: ${repInfo.name ?? repSection.title}**`)
  buffers.push(row)

  row = []
  let seasonDuration = 0
  for (const [name, repGroupItems] of Object.entries(repGroups)) {
    const groupName = getStaticGroupName(name, repGroupItems)
    row.push(`\n**${groupName}**\n`)
    buffers.push(row)

    row = []
    for (const repGroupItem of repGroupItems) {
      for (const dir of repGroupItem.dirInfo) {
        seasonDuration += dir.dirDuration
        const isEmpty = Object.keys(dir.matchupRaces).length === 0
        const races = getRacesString(dir.matchupRaces, 'game')
        row.push(`• ${dir.dir}`)
        row.push(isEmpty ? '-' : `${msToDuration(dir.dirDuration, true, true)}`)
        row.push(races[1])
        row.push(races[2])
        buffers.push(row)
        row = []
      }
    }
  }
  buffers.push([`\n${`┄`.repeat(40)}\n`])
  buffers.push([`**CPL Season ${season}** ${repInfo.name ? `**${repInfo.name}**` : repSection.title.toLowerCase()} total replay duration: **${msToDuration(seasonDuration, true, true)}**`])

  const flatBuffer = []
  const maxCols = buffers.reduce((max, row) => Math.max(row.length, max), 0)
  for (let n = 0; n < maxCols; ++n) {
    for (const row of buffers) {
      if (row[n]) {
        flatBuffer.push(row[n])
      }
    }
    flatBuffer.push('')
  }
  return `TODO: this isn't working right`
  return flatBuffer.join('\n').trim()
}

/**
 * Returns formatted output for a single casting group.
 */
const makeStaticGroupOutput = (season, repGroups, repInfo, repSection, type = 'markdown') => {
  if (type === 'markdown') {
    return makeStaticGroupOutputMarkdown(season, repGroups, repInfo, repSection)
  }
  if (type === 'tables') {
    return makeStaticGroupOutputTables(season, repGroups, repInfo, repSection)
  }
}

/**
 * Returns formatted output for a single casting group.
 */
const makeRegularGroupOutput = (season, repGroups, repInfo, repSection, type = 'markdown') => {
  const buffer = []
  let seasonDuration = 0
  for (const repWeek of Object.values(repGroups)) {
    if (!repWeek.length) continue
    let totalDuration = 0
    for (const repGroup of repWeek) {
      buffer.push(`\n**Week ${repGroup.week}**: **${repGroup.teams.teamA}** vs **${repGroup.teams.teamB}**\n`)
      for (const tier of repGroup.tiersInfo) {
        totalDuration += tier.tierDuration
        seasonDuration += tier.tierDuration
        buffer.push(`• **Tier ${tier.tierNumber}** - playtime: ${msToDuration(tier.tierDuration, true, true)}, matchups: ${getRacesString(tier.matchupRaces)[0]}`)
      }
    }
    buffer.push(`\n${`┄`.repeat(40)}\n`)
    buffer.push(`**Week ${repWeek[0].week}** total replay duration for all groups: **${msToDuration(totalDuration, true, true)}**`)
    buffer.push(`\n${`─`.repeat(40)}\n`)
  }
  if (seasonDuration === 0) {
    return null
  }
  buffer.push(`**CPL Season ${season}** ${repSection.title.toLowerCase()} total replay duration: **${msToDuration(seasonDuration, true, true)}**`)

  return buffer.join('\n').trim()
}

/**
 * Returns matchup information for a directory of replays.
 */
const getAllRepInfo = async (basepath, repPath) => {
  const dirInfo = []
  const dirs = (await fg('*', {cwd: basepath, deep: 1, onlyDirectories: true})).sort(sortNumericGroups)
  for (const dir of dirs) {
    const dirPath = path.join(basepath, dir)
    const [matchupInfo, dirDuration, earliestRep, latestRep] = await getUnsortedReplayInfo(dirPath, repPath)
    const matchupRaces = countMatchups(matchupInfo)
    dirInfo.push({matchupInfo, matchupRaces, dirDuration, dir, earliestRep, latestRep})
  }
  return dirInfo
}

/**
 * Sorts numeric groups if possible.
 * 
 * This properly sorts groups named like "Group 1", "Group 10", "Group 2", etc.
 */
const sortNumericGroups = (a, b) => {
  const aSliced = a.split(' ')
  const bSliced = b.split(' ')
  const aSlicedNumber = parseInt(aSliced.slice(-1))
  const bSlicedNumber = parseInt(bSliced.slice(-1))

  // If this is pure numbers (e.g. new preseason groups), sort them as is.
  if (String(Number(a)) === a && String(Number(b)) === b) {
    return Number(a) - Number(b)
  }

  // If this is not a valid group/number combination, use regular alphabetic sort.
  if (aSliced.length < 2 || isNaN(aSlicedNumber)) {
    return b - a
  }

  return aSlicedNumber - bSlicedNumber
}

/**
 * Returns the content of a group's info.json file.
 * 
 * Silently fails if the file does not exist.
 */
const getGroupInfo = async groupInfoPath => {
  try {
    const content = await fs.readFile(groupInfoPath, 'utf8')
    return JSON.parse(content)
  }
  catch (err) {
    return {}
  }
}

/**
 * Extracts replay information from irregular casting groups.
 * 
 * This applies to all replay groups other than the regular season and playoffs.
 */
const getStaticGroup = async (seasonData, repSection, repTypePath, repPath) => {
  const groupMatchups = {}
  const groupDirMatchups = (await fg('*', {cwd: repTypePath, deep: 1, onlyDirectories: true})).sort(sortNumericGroups)
  const infoPath = path.join(repTypePath, 'info.json')
  for (const dirMatchup of groupDirMatchups) {
    const matchupPath = path.join(repTypePath, dirMatchup)
    const dirInfo = await getAllRepInfo(matchupPath, repPath)
    if (!groupMatchups[dirMatchup]) groupMatchups[dirMatchup] = []

    groupMatchups[dirMatchup].push({dirInfo})
  }
  return [groupMatchups, repSection, await getGroupInfo(infoPath)]
}

/**
 * Extracts replay information from regular casting groups.
 * 
 * This applies to the regular season and the playoffs.
 */
const getWeeklyTeamMatchupsGroup = async (seasonData, repSection, repTypePath, repPath, vodsData) => {
  const repGroups = {}
  const weeks = (await fg('week*', {cwd: repTypePath, deep: 1, onlyDirectories: true})).sort()
  for (const week of weeks) {
    const weekNumber = week.match(/week([0-9]+)/)[1]
    const weekTeamMatchups = await getWeekMatchups(repSection, seasonData, weekNumber, path.join(repTypePath, week), repPath, vodsData)
    if (!repGroups[weekNumber]) repGroups[weekNumber] = []
    
    for (const weekTeamMatchup of weekTeamMatchups) {
      repGroups[weekNumber].push({week: weekNumber, ...weekTeamMatchup})
    }
  }
  return [repGroups, repSection]
}

/**
 * Returns casting group data for a given replay section.
 */
const getReplayGroupData = async (seasonData, repSection, repPath, vodsData) => {
  const repTypePath = path.join(repPath, repSection.dir)
  if (repSection.type === 'weekly_team_matchups') {
    return getWeeklyTeamMatchupsGroup(seasonData, repSection, repTypePath, repPath, vodsData)
  }
  if (repSection.type === 'static') {
    return getStaticGroup(seasonData, repSection, repTypePath, repPath)
  }
  throw new Error(`Invalid replay group: ${JSON.stringify(repSection)}`)
}

/**
 * Returns an overview of all replay casting groups.
 * 
 * Used to display the length of casting groups.
 */
const getCastingGroupsOverview = async (season, repPath, sections) => {
  const seasonData = await getCPLSeasonData(season)
  const vodsData = await getSeasonVods(season)

  const repTypes = {}
  for (const section of sections) {
    repTypes[section.dir] = await getReplayGroupData(seasonData, section, repPath, vodsData)
  }

  return repTypes
}

/**
 * Returns the data for a weekly matchup with the tiers removed that did not get cast.
 */
const filterOutUncastTiers = (weeklyMatchup) => {
  return {
    ...weeklyMatchup,
    tiersInfo: weeklyMatchup.tiersInfo.filter(info => !info.groupCastStatus.wasCast)
  }
}

/**
 * Filters out all groups that have already been cast.
 */
const filterOutUncast = (groups, onlyUncast = false) => {
  if (!onlyUncast) {
    return groups
  }
  const filteredGroups = {}
  for (const [key, data] of Object.entries(groups)) {
    const [repGroup, repSection, repInfo] = data

    // We currently can't determine if matchups other than the regular weekly ones have vods.
    if (repSection.type !== 'weekly_team_matchups') {
      continue
    }

    const currentRepGroup = {}
    for (const [week, weekData] of Object.entries(repGroup)) {
      const weekMatchups = []
      for (const matchup of weekData) {
        weekMatchups.push(filterOutUncastTiers(matchup))
      }
      currentRepGroup[week] = weekMatchups
    }

    filteredGroups[key] = [currentRepGroup, repSection]
    if (repInfo) {
      filteredGroups[key].push(repInfo)
    }
  }

  return filteredGroups
}

module.exports = {
  getCastingGroupsOverview,
  getCastingSectionTypes,
  makeCastingGroupsOutput,
  filterOutUncast,
  getReplayInfo
}
