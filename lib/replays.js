// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fg = require('fast-glob')
const path = require('path')
const {getCPLSeasonData} = require('./cpl')
const Screp = require('screp-js-file')
const {processRepData} = require('screptools-process')
const {getFormattedDuration} = require('screptools-process').util

/**
 * Returns the teams in a matchup.
 */
const getTeams = (teams, seasonData) => {
  const teamNames = []
  const [teamA, teamB] = teams.split('_vs_').sort()
  const teamDataA = seasonData.teams.find(team => team.name === teamA)
  const teamDataB = seasonData.teams.find(team => team.name === teamB)
  teamNames.push(teamDataA.titleAliases[0] || teamA)
  teamNames.push(teamDataB.titleAliases[0] || teamB)
  return teamNames
}

/**
 * Returns relevant information about a replay.
 */
const getReplayInfo = async (filepath) => {
  try {
    const res = await Screp.parseFile(filepath, {mapData: true})
    const data = processRepData(res)
    return {
      matchup: data.matchupSorted,
      length: data.match.duration
    }
  }
  catch (err) {
    if (String(err).includes('not a replay file')) {
      return null
    }
    throw err
  }
}

/**
 * Returns all information about a single match with a variable number of replays.
 */
const getMatchupInfo = async (matchupDirs, basepath) => {
  let totalDuration = 0
  const matchups = []
  for (const matchup of matchupDirs) {
    const reps = await fg('*.rep', {cwd: path.join(basepath, matchup)})
    
    let matchupRace = null
    let matchupLength = 0
    for (const rep of reps) {
      const info = await getReplayInfo(path.join(basepath, matchup, rep))
      if (info == null) continue
      matchupRace = info.matchup
      matchupLength += info.length
    }
    totalDuration += matchupLength
    matchups.push({matchupRace, matchupLength})
  }
  return [matchups, totalDuration]
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
 * Returns matchup information for a given tier.
 */
const getTierInfo = async (basepath) => {
  const tierInfo = []
  const tiers = (await fg('*', {cwd: basepath, deep: 1, onlyDirectories: true})).sort()
  for (const tier of tiers) {
    const tierNumber = tier.match(/tier([0-9]+)/)[1]
    const tierPath = path.join(basepath, tier)

    const playerMatchups = await fg('*', {cwd: tierPath, deep: 1, onlyDirectories: true})
    const [matchupInfo, tierDuration] = await getMatchupInfo(playerMatchups, tierPath)
    const matchupRaces = countMatchups(matchupInfo)
    tierInfo.push({matchupInfo, matchupRaces, tierNumber, tierDuration})
  }
  return tierInfo
}

/**
 * Returns all matchup groups for a given week.
 */
const getWeekMatchups = async (seasonData, basepath) => {
  const weekMatchups = []
  const teamMatchups = await fg('*', {cwd: basepath, deep: 1, onlyDirectories: true})
  for (const teamMatchup of teamMatchups) {
    const [teamA, teamB] = getTeams(teamMatchup, seasonData)
    const matchupPath = path.join(basepath, teamMatchup)
    const tiersInfo = await getTierInfo(matchupPath)
    weekMatchups.push({tiersInfo, teams: {teamA, teamB}})
  }
  return weekMatchups
}

/**
 * Returns a string of all races in a casting group and their frequency.
 */
const getRacesString = matchupRaces => {
  const items = []
  for (const [matchup, amount] of Object.entries(matchupRaces)) {
    items.push(`${matchup}: ${amount}`)
  }
  return items.join(', ')
}

/**
 * Returns an overview of all replay casting groups.
 * 
 * Used to display the length of casting groups.
 */
const getCastingGroupsOverview = async (season, basedir) => {
  const seasonData = await getCPLSeasonData(season)

  const repPath = path.join(basedir, `${season}`)
  const repGroups = []
  const weeks = (await fg('week*', {cwd: repPath, deep: 1, onlyDirectories: true})).sort()
  for (const week of weeks) {
    const weekNumber = week.match(/week([0-9]+)/)[1]
    const weekTeamMatchups = await getWeekMatchups(seasonData, path.join(repPath, week))
    
    for (const weekTeamMatchup of weekTeamMatchups) {
      repGroups.push({week: weekNumber, ...weekTeamMatchup})
    }
  }

  const buffer = []
  for (const repGroup of repGroups) {
    buffer.push(`\nWeek ${repGroup.week}, **${repGroup.teams.teamA}** vs **${repGroup.teams.teamB}**\n`)
    for (const tier of repGroup.tiersInfo) {
      buffer.push(`• **Tier ${tier.tierNumber}** - playtime: ${getFormattedDuration(tier.tierDuration)}, matchups: ${getRacesString(tier.matchupRaces)}`)
    }
  }
  return buffer.join('\n').trim()
}

module.exports = {
  getCastingGroupsOverview
}
