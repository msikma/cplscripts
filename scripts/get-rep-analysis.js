// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fg = require('fast-glob')
const path = require('path')
const chalk = require('chalk')
const sortBy = require('lodash.sortBy')
const {sortRaces} = require('sctoolsdata')
const computeMedian = require('stats-median')
const {
  getCastingGroupsOverview,
  getCastingSectionTypes,
  getCPLSeasonAllWeekResults,
  getCPLSeasonData,
  getCPLSeasonMiscData,
  getCPLSeasonPlayedWeeks,
  getReplayInfo,
  getTeamDataByAlias,
  getAllWeekResults,
  msToDuration,
  pathCPLReplay,
  pathCPLReplays,
  convertSeasonStats
} = require('../lib')
const util = require('util')
const log = obj => console.log(util.inspect(obj, {showHidden: false, depth: 10, colors: true, maxArrayLength: Infinity, maxStringLength: Infinity}))

/** A list of all races. */
const allRaces = [
  'T',
  'Z',
  'P'
]

/** A list of all matchups without duplicates. */
const allMatchups = [
  'ZvZ',
  'PvP',
  'TvT',
  'ZvP',
  'PvT',
  'TvZ'
]

/** A list of all matchup permutations. */
const allMatchupPermutations = [
  'TvT',
  'TvZ',
  'TvP',
  'ZvT',
  'ZvZ',
  'ZvP',
  'PvT',
  'PvZ',
  'PvP'
]

/**
 * Returns a given map name, normalized to standard names.
 * 
 * This is used to fix small deficiencies in the replays.
 */
const getNormalizedMapName = name => {
  if (name === 'Untitled Scenario') {
    return 'Butter'
  }
  if (name === 'Bombasticlipse') {
    return 'Eclipse'
  }
  if (name === 'Sylphid') {
    return 'Neo Sylphid'
  }
  return name
}

/**
 * Returns a base object for collecting statistics.
 */
const getStatsBase = (type = ['regular']) => {
  let base = {}
  if (type.includes('regular')) {
    base = {...base, ...{
      shortestGame: Infinity,
      shortestGameFn: null,
      shortestGameMatchup: null,
      longestGame: 0,
      longestGameFn: null,
      longestGameMatchup: null,
      gameLengthAverage: [],
      gameLengthMedian: []
    }}
  }
  if (type.includes('global')) {
    base = {...base, ...{
      groupsPlayed: 0,
      groupsCast: 0,
      groupsCastRate: null,
      groupsCastPerWeek: {},
      groupsCastPerTier: {},
      gameTypes: {}
    }}
  }
  if (type.includes('tier')) {
    base = {...base, ...{
      gameTypes: {},
      averageAPM: {
        T: [],
        P: [],
        Z: []
      },
      averageEAPM: {
        T: [],
        P: [],
        Z: []
      }
    }}
  }
  if (type.includes('team')) {
    base = {...base, ...{
      groupsPlayed: 0,
      groupsCast: 0,
      groupsCastRate: null
    }}
  }
  if (type.includes('race')) {
    base = {...base, ...{
      averageAPM: [],
      averageEAPM: [],
      gamesPlayedVsOther: 0,
      gamesWonVsOther: 0,
      gamesLostVsOther: 0,
      gamesPlayed: 0,
      gamesVsZ: 0,
      gamesVsT: 0,
      gamesVsP: 0
    }}
  }
  if (type.includes('matchup')) {
    base = {...base, ...{
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0
    }}
  }
  if (type.includes('map')) {
    base = {
      ...base,
      gamesPlayed: 0,
      shortestGame: Infinity,
      shortestGameFn: null,
      shortestGameMatchup: null,
      longestGame: 0,
      longestGameFn: null,
      longestGameMatchup: null,
      gameLengthAverage: [],
      gameLengthMedian: []
    }
  }
  if (type.includes('matchupWins')) {
    base = {
      ...base,
      gamesPlayed: 0,
      ...Object.fromEntries(allMatchups.flatMap(matchup => [[`won${matchup}`, 0], [`played${matchup}`, 0]]))
    }
  }
  return base
}

/**
 * Returns an object containing stats base objects.
 */
const getStatsBaseObject = (keys, type) => {
  return Object.fromEntries(keys.map(key => [key, getStatsBase(type)]))
}

/**
 * Returns whether the "active" race won in the matchup.
 * 
 * E.g. T beating Z, Z beating P, and P beating T.
 */
const checkActiveWin = (raceWinner, raceLoser) => {
  if (raceWinner === 'T') {
    if (raceLoser === 'P') return false
    if (raceLoser === 'Z') return true
  }
  if (raceWinner === 'Z') {
    if (raceLoser === 'T') return false
    if (raceLoser === 'P') return true
  }
  if (raceWinner === 'P') {
    if (raceLoser === 'Z') return false
    if (raceLoser === 'T') return true
  }
  return null
}

/**
 * Returns the average of an array of numbers.
 */
const getAverage = (items) => {
  const sum = items.reduce((a, b) => a + b, 0)
  return Math.floor(sum / items.length)
}

/**
 * Returns the median of an array of numbers.
 */
const getMedian = (items) => {
  return computeMedian.calc([...items])
}

const obtainShortestAndLongest = (statsObject, duration, fn, raceMatchup, rep) => {
  const gameInfo = {
    players: rep.players,
    races: rep.rep.data.matchup.races.flatMap(players => players.map(race => race[0])),
    tier: rep.tierNumber,
    week: rep.week,
    teams: rep.teams,
    section: rep.rep.filename.startsWith('regular') ? 'regular_season' : 'playoffs'
  }
  statsObject.shortestGame = Math.min(statsObject.shortestGame, duration)
  if (statsObject.shortestGame === duration) {
    statsObject.shortestGameFn = fn
    statsObject.shortestGameMatchup = raceMatchup
    statsObject.shortestGameInfo = gameInfo
  }
  statsObject.longestGame = Math.max(statsObject.longestGame, duration)
  if (statsObject.longestGame === duration) {
    statsObject.longestGameFn = fn
    statsObject.longestGameMatchup = raceMatchup
    statsObject.longestGameInfo = gameInfo
  }
  statsObject.gameLengthAverage.push(duration)
}

const processShortestAndLongest = (data) => {
  data.gameLengthMedian = getMedian(data.gameLengthAverage)
  data.gameLengthAverage = getAverage(data.gameLengthAverage)
  
  data.shortestGameDuration = msToDuration(data.shortestGame, false, true)
  data.averageGameDuration = msToDuration(data.gameLengthAverage, false, true)
  data.medianGameDuration = msToDuration(data.gameLengthMedian, false, true)
  data.longestGameDuration = msToDuration(data.longestGame, false, true)
  if (data.gamesPlayed) {
    data.winRate = `${((data.gamesWon / data.gamesPlayed) * 100).toFixed(2)}%`
  }
}

const addGameTypes = (statsObject, type) => {
  if (!statsObject.gameTypes[type]) {
    statsObject.gameTypes[type] = 0
  }
  statsObject.gameTypes[type] += 1
}

/**
 * Determines the correct race for a race picker.
 * 
 * Takes a path to a set of replays and a single known race.
 * This function will return whatever the other race is in the replays.
 */
const determineUnknownRace = async (knownRace, repPath, repBasePath) => {
  const reps = await fg('*.rep', {cwd: repPath, onlyFiles: true, absolute: true})
  const rep = reps[0]
  const repData = await getReplayInfo(rep, repBasePath)
  const repRaces = repData.data.matchupSummary.split('v')

  if (repRaces[0] === knownRace) {
    return repRaces[1]
  }
  return repRaces[0]
}

/** Packs a player array into an object. */
const packPlayerObject = players => Object.fromEntries(players.map((i, n) => [`player${n + 1}`, i]))

/**
 * Returns a list of the players' races, with 'race picker' etc. replaced, if possible.
 * 
 * If both players are race pickers, null is returned.
 */
const getRacePickerInfo = async (seasonNumber, typeInfo, weekNumber, teams, tier, players) => {
  const validRaces = ['T', 'Z', 'P']

  const raceLetters = players.map(player => player.race.slice(0, 1))
  const uncontextualRaces = raceLetters.filter(letter => validRaces.includes(letter))
  const contextualRaces = raceLetters.filter(letter => !validRaces.includes(letter))

  // If all player races are "regular" races (T, Z and P), and not "declared" or "race picker" etc.,
  // just use the plain data and don't scan the replay.
  if (contextualRaces.length === 0) {
    return packPlayerObject(raceLetters)
  }

  // If *both* races are invalid, return nothing. We can't include this in the statistics.
  if (contextualRaces.length > 1) {
    return null
  }

  // For all other cases, we have one race that's context-dependent, and one that's not.
  // In that case we need to look up the replay and look at what the other race was.
  const knownRace = uncontextualRaces[0]
  const unknownPlayerIdx = players.findIndex(player => !validRaces.includes(player.race.slice(0, 1)))

  const repPath = pathCPLReplay(seasonNumber, typeInfo, weekNumber, teams, tier, players.map(player => player.name))
  const repBasePath = pathCPLReplays(seasonNumber)

  raceLetters[unknownPlayerIdx] = await determineUnknownRace(knownRace, repPath, repBasePath)

  return packPlayerObject(raceLetters)
}

/**
 * Returns a team's per-matchup win rates.
 */
const getTeamWinRates = async (team, allResultWeeks, seasonData) => {
  // Base wins/losses object.
  const base = {
    games: {played: 0, won: 0},
    maps: {played: 0, won: 0}
  }
  // Matchup-based win rate object with "played" and "won" for each matchup.
  const rates = Object.fromEntries(allMatchupPermutations.map(matchup => [matchup, {played: 0, won: 0}]))
  
  for (const [week, matchups] of Object.entries(allResultWeeks)) {
    const weekNumber = week.split('_').slice(-1)[0]
    const isRegularSeason = week.includes('regular')
    const isPlayoffs = week.includes('playoffs')
    for (const matchup of matchups) {
      const teams = [matchup.team1, matchup.team2]
      const teamN = teams.findIndex(teamString => teamString === team.name)
      if (teamN === -1) {
        continue
      }
      const friendlyN = `${teamN + 1}`
      const opponentN = `${teamN === 0 ? '2' : '1'}`

      for (const match of matchup.matches) {
        const players = [match.player1, match.player2]
        const friendlyPlayer = match[`player${friendlyN}`]
        const opponentPlayer = match[`player${opponentN}`]

        const isFriendlyWin = friendlyPlayer.score > opponentPlayer.score
        const isFriendlyInactive = match.inactive_players[0] === friendlyPlayer.name
        const isDraw = friendlyPlayer.score === opponentPlayer.score
        const isWalkover = match.walkover

        // Don't count draws or walkovers in the statistics.
        if (isDraw || isWalkover) {
          continue
        }

        const mapsPlayed = players.map(player => player.score).reduce((all, n) => all + n, 0)
        const mapsWon = friendlyPlayer.score

        base.maps.played += mapsPlayed
        base.maps.won += mapsWon
        base.games.played += 1
        base.games.won += isFriendlyWin ? 1 : 0

        const matchupTiers = players.map(player => player.tier)
        const replayTier = Math.min(...matchupTiers)
        const matchRaces = await getRacePickerInfo(seasonData.seasonNumber, {isRegularSeason, isPlayoffs}, weekNumber, teams, replayTier, [match.player1, match.player2])

        // If we can't determine the races (i.e. both players are "declared" or "race picker"), don't include this one.
        if (matchRaces == null) {
          continue
        }

        const friendlyRace = matchRaces[`player${friendlyN}`]
        const opponentRace = matchRaces[`player${opponentN}`]
        const matchupFromFriendlyPerspective = [friendlyRace, opponentRace].join('v')

        rates[matchupFromFriendlyPerspective].played += 1
        if (isFriendlyWin) {
          rates[matchupFromFriendlyPerspective].won += 1
        }
      }
    }
  }

  return [
    Object.fromEntries(Object.entries(base).map(([type, data]) => [type, {...data, winPercentage: `${((data.won / data.played) * 100).toFixed(2)}%`}])),
    Object.fromEntries(Object.entries(rates).map(([matchup, data]) => [matchup, {...data, winPercentage: `${((data.won / data.played) * 100).toFixed(2)}%`}]))
  ]
}

const flattenResults = (results) => {
  return Object.fromEntries(
    Object.entries(results)
      .flatMap(([key, value]) => Object.entries(value).map(([week, data]) => [`${key}_${week}`, data]))
  )
}

const organizeGameDurations = data => {
  return {
    shortest: {
      info: data.shortestGameInfo,
      durationMs: data.shortestGame,
      duration: data.shortestGameDuration
    },
    longest: {
      info: data.longestGameInfo,
      durationMs: data.longestGame,
      duration: data.longestGameDuration
    },
    average: {
      durationMs: data.gameLengthAverage,
      duration: data.averageGameDuration
    },
    median: {
      durationMs: data.gameLengthMedian,
      duration: data.medianGameDuration
    }
  }
}

const organizeGameTypes = data => {
  const all = Object.values(data.gameTypes).reduce((all, count) => all + count, 0)
  return {
    types: data.gameTypes,
    tvbPercentage: `${((data.gameTypes.tvb / all) * 100).toFixed(2)}%`
  }
}

const makeDifferentialPercentage = (regularRate, specificRate) => {
  const rate = specificRate - regularRate
  const sign = rate > 0 ? '+' : '-'
  return `${sign}${(Math.abs(rate) * 100).toFixed(2)}%`
}

const organizeWinRates = (data, includeMirrors = false, includeAll = false, useAltFormat = false, matchupData = null) => {
  const matchups = ['ZvP', 'PvT', 'TvZ']
  if (includeMirrors) matchups.push('ZvZ', 'TvT', 'PvP')
  if (includeAll) matchups.push('PvZ', 'TvP', 'ZvT')
  return Object.fromEntries(matchups.map(matchup => {
    let played, won, winRate
    const differential = {}
    if (useAltFormat) {
      played = data.winRatesMatchup[matchup].played
      won = data.winRatesMatchup[matchup].won
      winRate = data.winRatesMatchup[matchup].winPercentage
    }
    else {
      played = data[`played${matchup}`]
      won = data[`won${matchup}`]
      winRate = data[`winRate${matchup}`]
    }
    if (matchupData) {
      const currentMatchupData = matchupData[matchup]
      const regularRate = currentMatchupData.gamesWon / currentMatchupData.gamesPlayed
      const mapRate = won / played
      differential.relativeRate = makeDifferentialPercentage(regularRate, mapRate)
    }
    return [
      matchup, {played, won, winRate, ...differential}
    ]
  }))
}

const organizeGamesPlayed = (race, data) => {
  return {
    vSelf: data[`gamesVs${race}`],
    vAll: data.gamesPlayed,
    vZ: data.gamesVsZ,
    vT: data.gamesVsT,
    vP: data.gamesVsP
  }
}

const organizeMatchWins = data => {
  const games = data.winRatesBase.games
  const maps = data.winRatesBase.maps
  return {
    matches: {
      played: games.played,
      won: games.won,
      lost: games.played - games.won,
      percentage: games.winPercentage
    },
    sets: {
      played: maps.played,
      won: maps.won,
      lost: maps.played - maps.won,
      percentage: maps.winPercentage
    }
  }
}

const makePercentage = (amount, total) => {
  return `${((amount / total) * 100).toFixed(2)}%`
}

const organizeStats = ({global, tiers, teams, maps, matchups, races}, seasonData, seasonMiscData, teamsRegularSeason, teamsPlayoffs) => {
  const stats = {}
  stats.perTier = Object.fromEntries(Object.entries(tiers).map(([tier, data]) => {
    return [tier, {
      averageAPM: data.averageAPM,
      averageEAPM: data.averageEAPM,
      gameDurations: organizeGameDurations(data),
      gameTypes: organizeGameTypes(data),
      winRates: organizeWinRates(data)
    }]
  }))
  stats.general = {
    gameDurations: organizeGameDurations(global),
    gameTypes: {
      ...organizeGameTypes(global),
      total: global.totalGames
    },
    castRate: {
      played: global.groupsPlayed,
      cast: global.groupsCast,
      percentage: global.groupsCastRate,
      perWeek: Object.fromEntries(Object.entries(global.groupsCastPerWeek).map(([key, value]) => [key, {...value, percentage: makePercentage(value.cast, value.played)}])),
      perTier: Object.fromEntries(Object.entries(global.groupsCastPerTier).map(([key, value]) => [key, {...value, percentage: makePercentage(value.cast, value.played)}])),
    }
  }
  stats.perMap = Object.entries(maps).map(([map, data]) => {
    return {
      mapName: map,
      gameDurations: organizeGameDurations(data),
      winRates: organizeWinRates(data, false, false, false, matchups)
    }
  })
  stats.perMatchup = Object.fromEntries(Object.entries(matchups).map(([matchup, data]) => {
    return [matchup, {
      gamesPlayed: data.gamesPlayed,
      gamesWon: data.gamesWon,
      gamesLost: data.gamesLost,
      gameDurations: organizeGameDurations(data),
      winRate: data.isMirror ? 'N/A' : data.winRate
    }]
  }))
  stats.perRace = Object.fromEntries(Object.entries(races).map(([race, data]) => {
    return [race, {
      averageAPM: data.averageAPM,
      averageEAPM: data.averageEAPM,
      gamesPlayed: organizeGamesPlayed(race, data),
      gamesPlayedVsOther: data.gamesPlayedVsOther,
      gamesWonVsOther: data.gamesWonVsOther,
      winRate: data.winRate,
      mirrorRate: data.mirrorRate
    }]
  }))
  stats.perTeam = Object.fromEntries(
    Object.entries(teams)
      .map(([team, data]) => {
        const teamData = getTeamDataByAlias(team, seasonData)
        const teamStatsRegular = teamsRegularSeason.find(team => team.name === teamData.name)
        const teamStatsPlayoffs = teamsPlayoffs.find(team => team.name === teamData.name)
        return [team, {
          teamName: teamData.name,
          statsRegular: teamStatsRegular,
          statsPlayoffs: teamStatsPlayoffs,
          gameDurations: organizeGameDurations(data),
          matchWins: organizeMatchWins(data),
          mostImprovedPlayers: seasonMiscData.teams[team].mostImprovedPlayers,
          winRates: organizeWinRates(data, true, true, true),
          castRate: {
            played: data.groupsPlayed,
            cast: data.groupsCast,
            percentage: data.groupsCastRate
          }
        }]
      })
      .sort((a, b) => {
        return a[1].statsRegular.n < b[1].statsRegular.n ? -1 : 1
      })
  )
  return stats
}

const addAPM = (data, apm, eapm, race) => {
  let targetAPM = data.averageAPM
  let targetEAPM = data.averageEAPM
  if (race) {
    targetAPM = targetAPM[race]
    targetEAPM = targetEAPM[race]
  }
  targetAPM.push(apm)
  targetEAPM.push(eapm)
}

const processAverageAPM = (data) => {
  if (data.averageAPM.T) {
    for (const child of ['averageAPM', 'averageEAPM']) {
      for (const [race, values] of Object.entries(data[child])) {
        data[child][race] = Math.round(data[child][race].reduce((all, val) => all + val, 0) / data[child][race].length)
      }
    }
  }
  else {
    for (const child of ['averageAPM', 'averageEAPM']) {
      data[child] = Math.round(data[child].reduce((all, val) => all + val, 0) / data[child].length)
    }
  }
}

/**
 * Extracts statistics pertaining to teams.
 */
const extractTeamStats = async (seasonData, seasonMiscData, weeks, allReps, allMaps, allResults) => {
  // Flatten the list of game results.
  const resultsFlat = flattenResults(allResults)

  // Games to ignore in the longest/shortest game calculation by exact frame length.
  const ignoredGamesByFrames = [644, 1032]

  // Contains: game types, longest and shortest games, and average and median game durations.
  const global = getStatsBase(['regular', 'global'])
  // Contains: win rates for the "active" races, longest and shortest games, and average and median game durations.
  const tiers = Object.fromEntries(Array(4).fill().map((_, n) => [n, {tier: String(n), ...getStatsBase(['regular', 'tier', 'matchupWins'])}]))
  // Contains: win rates (all and per matchup), longest and shortest games, and average and median game durations.
  const teams = Object.fromEntries(seasonData.teams.map(team => [team.titleAliases[0], getStatsBase(['regular', 'team'])]))
  // Contains: win rates for the "active" races, longest and shortest games, and average and median game durations.
  const maps = Object.fromEntries(Object.entries(getStatsBaseObject(allMaps, ['map', 'matchupWins'])).map(([key, value]) => [key, {...value, map: key}]))
  // Contains: win rates for the "active" races, longest and shortest games, and average and median game durations.
  const matchups = Object.fromEntries(Object.entries(getStatsBaseObject(allMatchups, ['regular', 'matchup'])).map(([key, value]) => {
    const races = key.split('v')
    return [key, {...value, isMirror: races[0] === races[1]}]
  }))
  // Contains: win rate against other races, and mirror rate (percentage of matches that were mirror matchups).
  const races = getStatsBaseObject(allRaces, ['race'])

  // Information about how many matches have a known/unknown winner.
  const matchStatus = {
    knownWinner: 0,
    unknownWinner: 0,

    activeRaceWon: 0,
    passiveRaceWon: 0
  }
  
  for (const rep of allReps) {
    const fn = rep.rep.filename
    const data = rep.rep.data
    const mapName = getNormalizedMapName(data.map.nameData.cleanName)
    const map = maps[mapName]
    const tier = tiers[rep.tierNumber]

    // Count the number of wins per race for this map.
    const winningTeam = data.matchup.teams.find(team => team.isWinningTeam)
    const losingTeam = data.matchup.teams.find(team => !team.isWinningTeam)

    // If we don't know the winner of this replay, skip it entirely.
    // This should amount to maybe 1% of the replays.
    if (!winningTeam || losingTeam == null) {
      matchStatus.unknownWinner += 1
      continue
    }
    
    matchStatus.knownWinner += 1

    for (const team of data.matchup.teams) {
      const player = team.players.filter(player => player.isObserver === false)[0]
      const {apm, eapm} = player
      addAPM(tier, apm, eapm, player.race)
      addAPM(races[player.race], apm, eapm)
    }

    const raceA = data.matchup.teams[0].players[0].race
    const raceB = data.matchup.teams[1].players[0].race
    const raceWinner = winningTeam.players[0].race
    const raceLoser = losingTeam.players[0].race
    const raceMatchup = [raceA, raceB].sort(sortRaces).join('v')

    const isMirror = raceA === raceB
    const activeRaceWon = checkActiveWin(raceWinner, raceLoser)

    addGameTypes(global, data.match.type)

    if (!ignoredGamesByFrames.includes(rep.rep.data.match.frames)) {
      obtainShortestAndLongest(global, data.match.duration, fn, raceMatchup, rep)
      obtainShortestAndLongest(matchups[data.matchupSorted], data.match.duration, fn, raceMatchup, rep)
      obtainShortestAndLongest(tiers[rep.tierNumber], data.match.duration, fn, raceMatchup, rep)
      obtainShortestAndLongest(map, data.match.duration, fn, raceMatchup, rep)
      for (const team of Object.values(rep.teams)) {
        obtainShortestAndLongest(teams[team], data.match.duration, fn, raceMatchup, rep)
      }
      addGameTypes(tiers[rep.tierNumber], data.match.type)
    }

    races[raceA][`gamesVs${raceB}`] += 1
    races[raceB][`gamesVs${raceA}`] += 1
    races[raceA].gamesPlayed += 1
    races[raceB].gamesPlayed += 1

    if (isMirror) {
      matchups[raceMatchup].gamesPlayed += 1
    }
    if (!isMirror) {
      matchups[raceMatchup].gamesPlayed += 1
      if (activeRaceWon) {
        matchups[raceMatchup].gamesWon += 1
      }
      if (!activeRaceWon) {
        matchups[raceMatchup].gamesLost += 1
      }
      races[raceWinner].gamesPlayedVsOther += 1
      races[raceWinner].gamesWonVsOther += 1
      races[raceLoser].gamesPlayedVsOther += 1
      races[raceLoser].gamesLostVsOther += 1
    }

    // Count the number of games for this map.
    map.gamesPlayed += 1
    map[`played${raceMatchup}`] += 1
    if (isMirror || activeRaceWon) {
      map[`won${raceMatchup}`] += 1
    }

    // Count the number of matchup wins for the tier.
    tier.gamesPlayed += 1
    tier[`played${raceMatchup}`] += 1
    if (isMirror || activeRaceWon) {
      tier[`won${raceMatchup}`] += 1
    }
    // if (rep.tierNumber === '2' && raceMatchup === 'TvZ') {
    //   const _line = `Week ${rep.week} T${rep.tierNumber}, ${Object.values(rep.teams).join(' vs ')}: ${raceMatchup} ${Object.values(rep.players).join(' vs ')}: ${activeRaceWon ? 'Win for T' : 'Win for Z'}`
    //   console.log(activeRaceWon ? chalk.green(_line) : chalk.red(_line))
    // }
    
    if (!isMirror) {
      if (activeRaceWon) {
        matchStatus.activeRaceWon += 1
      }
      else {
        matchStatus.passiveRaceWon += 1
      }
    }
  }

  processShortestAndLongest(global)

  for (const week of weeks) {
    if (week.type !== 'regular') {
      continue
    }
    for (const match of week.matches) {
      for (const tier of match.tiersInfo) {
        if (!global.groupsCastPerWeek[week.week]) {
          global.groupsCastPerWeek[week.week] = {
            played: 0,
            cast: 0
          }
        }
        if (!global.groupsCastPerTier[tier.tierNumber]) {
          global.groupsCastPerTier[tier.tierNumber] = {
            played: 0,
            cast: 0
          }
        }
        global.groupsCastPerWeek[week.week].played += 1
        global.groupsCastPerTier[tier.tierNumber].played += 1
        global.groupsPlayed += 1
        if (tier.groupCastStatus.wasCast) {
          global.groupsCastPerWeek[week.week].cast += 1
          global.groupsCastPerTier[tier.tierNumber].cast += 1
          global.groupsCast += 1
        }
      }
    }
  }
  global.groupsCastRate = `${((global.groupsCast / global.groupsPlayed) * 100).toFixed(2)}%`

  for (const [team, data] of Object.entries(teams)) {
    processShortestAndLongest(data)

    for (const week of weeks) {
      if (week.type !== 'regular') {
        continue
      }
      const teamMatches = week.matches.filter(match => Object.values(match.teams).includes(team))
      for (const match of teamMatches) {
        for (const tier of match.tiersInfo) {
          data.groupsPlayed += 1
          if (tier.groupCastStatus.wasCast) {
            data.groupsCast += 1
          }
        }
      }
    }

    data.groupsCastRate = `${((data.groupsCast / data.groupsPlayed) * 100).toFixed(2)}%`
    const [baseWinRates, matchupWinRates] = await getTeamWinRates(getTeamDataByAlias(team, seasonData), resultsFlat, seasonData)
    data.winRatesBase = baseWinRates
    data.winRatesMatchup = matchupWinRates
  }
  for (const [matchup, data] of Object.entries(matchups)) {
    processShortestAndLongest(data)
  }
  for (const [matchup, data] of Object.entries(tiers)) {
    for (const matchup of ['ZvP', 'PvT', 'TvZ']) {
      data[`winRate${matchup}`] = `${((data[`won${matchup}`] / data[`played${matchup}`]) * 100).toFixed(2)}%`
    }
    processAverageAPM(data)
    processShortestAndLongest(data)
  }
  for (const [race, data] of Object.entries(races)) {
    data.winRate = `${((data.gamesWonVsOther / data.gamesPlayedVsOther) * 100).toFixed(2)}%`
    data.mirrorRate = `${((data[`gamesVs${race}`] / data.gamesPlayed) * 100).toFixed(2)}%`
    processAverageAPM(data)
  }
  for (const [map, data] of Object.entries(maps)) {
    for (const matchup of ['ZvP', 'PvT', 'TvZ']) {
      data[`winRate${matchup}`] = `${((data[`won${matchup}`] / data[`played${matchup}`]) * 100).toFixed(2)}%`
    }
    processShortestAndLongest(data)
  }

  // Check for correctness.
  const a = Object.values(matchups).reduce((count, data) => count + data.gamesPlayed, 0)
  const b = (races.T.gamesVsT + races.T.gamesVsZ + races.T.gamesVsP + 
    races.Z.gamesVsZ + races.Z.gamesVsT + races.Z.gamesVsP +
    races.P.gamesVsP + races.P.gamesVsZ + races.P.gamesVsT) / 2
  const c = matchStatus.knownWinner
  const d = Object.values(maps).reduce((count, data) => count + data.gamesPlayed, 0)
  if (a !== b || b !== c || c !== d) {
    throw new Error(`Numbers don't add up`)
  }
  
  return {
    global: {
      ...global,
      totalGames: allReps.length
    },
    tiers,
    teams,
    maps,
    matchups,
    races
  }
}

/**
 * Returns a flat list of all replays with some metadata.
 */
const getFlatReps = (teamWeeks) => {
  const allReps = []
  for (const week of teamWeeks) {
    for (const matchup of week.matches) {
      allReps.push(
        ...matchup.tiersInfo.flatMap(
          tierInfo => tierInfo.matchupInfo.flatMap(
            matchupInfo => matchupInfo.reps.map(rep => {
              const isRegularSeason = rep.filename.startsWith('regular/')
              return {
                rep,
                type: isRegularSeason ? 'regular_season' : 'playoffs',
                players: matchupInfo.players,
                tierNumber: tierInfo.tierNumber,
                week: matchup.week,
                teams: matchup.teams
              }
            })
          )
        )
      )
    }
  }
  return allReps
}

/**
 * Returns an array of all map names, normalized.
 */
const getAllMaps = (allReps) => {
  const maps = new Set()
  for (const rep of allReps) {
    maps.add(getNormalizedMapName(rep.rep.data.map.nameData.cleanName))
  }
  return [...maps]
}

const organizeTeamResults = (teamResults, weeksPlayed, seasonData, useRealMatches = false, type = 'regular') => {
  const teams = sortBy(Object.entries(teamResults).map(([key, value]) => ({
    ...value,
    name: key,
    playedWeeks: weeksPlayed,
    matchesWonP: makePercentage(value.matchesWon, value.matchesPlayed),
    mapsWonP: makePercentage(value.mapsWon, value.mapsPlayed),
    realMatchesWonP: makePercentage(value.realMatchesWon, value.realMatchesPlayed)
  })), ['matchupsWon', useRealMatches ? 'realMatchesWonP' : 'matchesWonP', 'mapsWonP'])
    .reverse()
    .map((team, n) => ({...team, n: n + 1}))
  
  if (type === 'playoffs') {
    const resultNames = [
      ['Champions', 'Runners-up'],
      ['3-4', '3-4'],
      ['5-6', '5-6']
    ]
    const playoffsTeams = []
    let pos = 0
    for (let n = 0; n < seasonData.playoffs.results.length; ++n) {
      const set = seasonData.playoffs.results[n]
      const setTeams = sortBy(set
        .map(teamAlias => {
          const teamData = getTeamDataByAlias(teamAlias, seasonData)
          const teamStats = teams.find(team => team.name === teamData.name)
          return {
            ...teamStats,
            matchesWonPP: teamStats.matchesWon / teamStats.matchesPlayed,
            mapsWonPP: teamStats.mapsWon / teamStats.mapsPlayed,
            realMatchesWonPP: teamStats.realMatchesWon / teamStats.realMatchesPlayed
          }
        }), ['matchupsWon', useRealMatches ? 'realMatchesWonPP' : 'matchesWonPP', 'mapsWonPP']
      )
        .reverse()
        .map((team, m) => {
          return {
            ...team,
            pos: pos++,
            playoffsBracket: resultNames[n][m]
          }
        })

      playoffsTeams.push(...setTeams)
    }
    return playoffsTeams
  }
  return teams
}

/**
 * Returns the combined duration of all casting groups.
 */
async function getRepAnalysisCPL(season, repPath, outCSV = false, useRealMatches = false) {
  const seasonData = await getCPLSeasonData(season)
  const seasonMiscData = await getCPLSeasonMiscData(season)
  const types = await getCastingSectionTypes(season, repPath)
  const groups = await getCastingGroupsOverview(season, repPath, types)

  const [teamResultsRegular, weeksPlayedRegular] = await getAllWeekResults(season, 'regular')
  const teamsRegular = organizeTeamResults(teamResultsRegular, weeksPlayedRegular, seasonData, useRealMatches, 'regular')
  const [teamResultsPlayoffs, weeksPlayedPlayoffs] = await getAllWeekResults(season, 'playoffs')
  const teamsPlayoffs = organizeTeamResults(teamResultsPlayoffs, weeksPlayedPlayoffs, seasonData, useRealMatches, 'playoffs')

  const {preseason, regular, playoffs} = groups
  const teamWeeks = [
    ...Object.values(regular[0]).map(w => ({matches: w, type: 'regular', week: w[0].week})),
    ...Object.values(playoffs[0]).map(w => ({matches: w, type: 'playoffs', week: w[0].week}))
  ]
  const allReps = getFlatReps(teamWeeks)
  const allMaps = getAllMaps(allReps)
  const allResults = await getCPLSeasonAllWeekResults(season)
  const stats = await extractTeamStats(seasonData, seasonMiscData, teamWeeks, allReps, allMaps, allResults)
  const data = organizeStats(stats, seasonData, seasonMiscData, teamsRegular, teamsPlayoffs)
  
  if (outCSV) {
    return convertSeasonStats(data)
  }

  return data
}

module.exports = {
  getRepAnalysisCPL
}
