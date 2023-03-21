// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const {stringify} = require('csv-stringify/sync')

const util = require('util')
const log = obj => console.log(util.inspect(obj, {showHidden: false, depth: 10, colors: true, maxArrayLength: Infinity, maxStringLength: Infinity}))

const convertVodStats = (data, season) => {
  const rows = []
  rows.push(['', 'Casts', 'Duration (DD:HH:MM:SS)', 'Duration (HH:MM:SS)'])
  rows.push([`CPL Season ${season}`, data.vods, data.vodsDuration, data.vodsDurationInHours])
  rows.push([])
  for (const caster of data.casters) {
    rows.push([caster.name, caster.casts, caster.timeCast, caster.timeCastInHours])
  }
  return convertToCSV(rows)
}

const formatRaceFullName = (race) => {
  if (race === 'T') return 'Terran'
  if (race === 'Z') return 'Zerg'
  if (race === 'P') return 'Protoss'
  if (race === 'R') return 'Random'
  return 'Unknown'
}

const formatType = type => {
  if (type === 'tier') {
    return 'Tier'
  }
  if (type === 'matchup') {
    return 'Matchup'
  }
  return 'UNKNOWN'
}

const getRecordGameHeader = (type) => {
  return ['Week', 'Tier', 'Team', '', 'Player', 'vs', 'Tier', 'Team', '', 'Player', 'Length']
}

const getMedianGameHeader = () => {
  return ['Median length']
}

const getWinRateHeader = () => {
  return ['Matchup', 'Played', `Won`, `Win rate`]
}

const getRaceWinRateHeader = () => {
  return [`Played`, `Played (non-mirrors)`, `Won`, `%`, `Played (mirrors)`, `%`]
}

const getRaceAPMRateHeader = () => {
  return [`APM`, `EAPM`]
}

const getTierAPMRateHeader = () => {
  return [`Race`, `APM`, `EAPM`]
}

const getTvBGameHeader = () => {
  return ['Games', 'TvB', '%']
}

const getCastRateHeader = () => {
  return ['Groups played', 'Groups cast', '%']
}

const getMostImprovedHeader = () => {
  return ['Tier 0', 'Tier 1', 'Tier 2', 'Tier 3']
}

const getRegularSeasonRankingHeader = () => {
  return ['Team name', 'Weeks won', 'Lost', 'Matches won', 'lost', 'played', '%', 'Sets won', 'lost', 'played', '%']
}

const getPlayoffsRankingHeader = () => {
  return ['Team name', 'Result', '', 'Matches won', 'lost', 'played', '%', 'Sets won', 'lost', 'played', '%']
}

const formatTier = (tier) => {
  return `T${tier}`
}

const formatWeek = (week, section) => {
  if (section === 'regular_season') {
    return `Week ${week}`
  }
  if (section === 'playoffs') {
    if (week === '1') {
      return `Quarter-finals`
    }
    if (week === '2') {
      return `Semi-finals`
    }
    if (week === '3') {
      return `Finals`
    }
  }
  return `UNKNOWN`
}


const formatRace = (race) => {
  return race.toUpperCase()
}

const getRecordGameRow = data => {
  return [
    formatWeek(data.info.week, data.info.section),
    formatTier(data.info.tier),
    data.info.teams.teamA,
    formatRace(data.info.races[0]),
    data.info.players.playerA,
    '',
    formatTier(data.info.tier),
    data.info.teams.teamB,
    formatRace(data.info.races[1]),
    data.info.players.playerB,
    data.duration
  ]
}

const getWinRateRow = (matchup, data) => {
  return [
    `${matchup}`,
    data.played,
    data.won,
    data.winRate
  ]
}

const getMedianRow = data => {
  return [
    data.duration
  ]
}

const getCastRateRow = data => {
  return [
    data.played,
    data.cast,
    data.percentage
  ]
}

const getMostImprovedRow = data => {
  return [
    data[0],
    data[1],
    data[2],
    data[3]
  ]
}

const getRegularSeasonRankingRow = (teamName, data) => {
  return [
    data.n,
    teamName,
    data.matchupsWon,
    data.playedWeeks - data.matchupsWon,
    data.matchesWon,
    data.matchesPlayed - data.matchesWon,
    data.matchesPlayed,
    data.matchesWonP,
    data.mapsWon,
    data.mapsPlayed - data.mapsWon,
    data.mapsPlayed,
    data.mapsWonP
  ]
}

const getPlayoffsRankingRow = (teamName, data) => {
  return [
    data.n,
    teamName,
    data.playoffsBracket,
    '',
    data.matchesWon,
    data.matchesPlayed - data.matchesWon,
    data.matchesPlayed,
    data.matchesWonP,
    data.mapsWon,
    data.mapsPlayed - data.mapsWon,
    data.mapsPlayed,
    data.mapsWonP
  ]
}

const getLongestShortestRows = (shortest, longest) => {
  return [
    ...getRecordGameRow(shortest),
    ...getRecordGameRow(longest),
  ]
}

const convertSeasonStats = data => {
  const rows = []

  rows.push(['Playoffs rankings'])
  rows.push(...getPlayoffsRankings(data))
  rows.push(['Regular season rankings'])
  rows.push(...getRegularSeasonRankings(data))
  rows.push(['Longest and shortest games'])
  rows.push(...getLongestShortestGames(data))
  rows.push(['Median game length'])
  rows.push(...getMedianGames(data))
  rows.push(['Matchup win rates'])
  rows.push(...getMatchupWinRates(data))
  rows.push(['Race win rates'])
  rows.push(...getRaceWinRates(data))
  rows.push(['Race APM rates'])
  rows.push(...getRaceAPMRates(data))
  rows.push(['Most improved players'])
  rows.push(...getMostImprovedRates(data))
  rows.push(['% of games casted'])
  rows.push(...getCastRates(data))
  rows.push(['% of games Top vs Bottom'])
  rows.push(...getTopVsBottomGames(data))

  return convertToCSV(rows)
}

const getTvBRow = data => {
  const games = Object.values(data.types).reduce((amount, n) => amount + n, 0)
  return [
    games,
    data.types.tvb,
    data.tvbPercentage
  ]
}

const getTopVsBottomGames = data => {
  const rows = []

  if (data.perTier) {
    rows.push(['Tier', ...getTvBGameHeader()])
    for (const [tier, stats] of Object.entries(data.perTier)) {
      rows.push([tier, ...getTvBRow(stats.gameTypes)])
    }
  }
  if (data.general) {
    rows.push(['Overall', ...getTvBRow(data.general.gameTypes)])
  }

  return rows
}

const getMatchupWinRates = data => {
  const rows = []

  if (data.perTier) {
    rows.push(['Per tier', ...getWinRateHeader()])
    for (const [tier, stats] of Object.entries(data.perTier)) {
      for (const [matchup, winRates] of Object.entries(stats.winRates)) {
        rows.push([tier, ...getWinRateRow(matchup, winRates)])
      }
    }
  }
  if (data.perMap) {
    rows.push(['Per map', ...getWinRateHeader()])
    for (const [map, stats] of Object.entries(data.perMap)) {
      for (const [matchup, winRates] of Object.entries(stats.winRates)) {
        rows.push([stats.mapName, ...getWinRateRow(matchup, winRates)])
      }
    }
  }
  if (data.perTeam) {
    rows.push(['Per team', ...getWinRateHeader()])
    for (const [team, stats] of Object.entries(data.perTeam)) {
      for (const [matchup, winRates] of Object.entries(stats.winRates)) {
        rows.push([team, ...getWinRateRow(matchup, winRates)])
      }
    }
  }

  return rows
}

const getRaceAPMRates = data => {
  const rows = []

  if (data.perRace) {
    rows.push(['Race', ...getRaceAPMRateHeader()])
    for (const [race, stats] of Object.entries(data.perRace)) {
      rows.push([formatRaceFullName(race), stats.averageAPM, stats.averageEAPM])
    }
  }
  if (data.perTier) {
    rows.push(['Tier', ...getTierAPMRateHeader()])
    for (const [tier, stats] of Object.entries(data.perTier)) {
      for (const race of ['T', 'Z', 'P']) {
        rows.push([tier, formatRaceFullName(race), stats.averageAPM[race], stats.averageEAPM[race]])
      }
    }
  }

  return rows
}

const getRaceWinRates = data => {
  const rows = []

  if (data.perRace) {
    rows.push(['Per race', ...getRaceWinRateHeader()])
    for (const [race, stats] of Object.entries(data.perRace)) {
      rows.push([formatRaceFullName(race), stats.gamesPlayed.vAll, stats.gamesPlayedVsOther, stats.gamesWonVsOther, stats.winRate, stats.gamesPlayed.vSelf, stats.mirrorRate])
    }
  }

  return rows
}

const getPlayoffsRankings = data => {
  const rows = []

  if (data.perTeam) {
    rows.push(['#', ...getPlayoffsRankingHeader()])
    const teamsSorted = Object.entries(data.perTeam)
      .sort((a, b) => {
        return a[1].statsPlayoffs.pos < b[1].statsPlayoffs.pos ? -1 : 1
      })
    for (const [team, stats] of teamsSorted) {
      rows.push([...getPlayoffsRankingRow(stats.teamName, stats.statsPlayoffs)])
    }
  }

  return rows
}

const getRegularSeasonRankings = data => {
  const rows = []

  if (data.perTeam) {
    rows.push(['#', ...getRegularSeasonRankingHeader()])
    for (const [team, stats] of Object.entries(data.perTeam)) {
      rows.push([...getRegularSeasonRankingRow(stats.teamName, stats.statsRegular)])
    }
  }

  return rows
}

const getMedianGames = data => {
  const rows = []

  if (data.perTier) {
    rows.push(['Per tier', ...getMedianGameHeader()])
    for (const [tier, stats] of Object.entries(data.perTier)) {
      rows.push([tier, ...getMedianRow(stats.gameDurations.median)])
    }
  }
  if (data.perMatchup) {
    rows.push(['Per matchup', ...getMedianGameHeader()])
    for (const [matchup, stats] of Object.entries(data.perMatchup)) {
      rows.push([matchup, ...getMedianRow(stats.gameDurations.median)])
    }
  }
  if (data.perMap) {
    rows.push(['Per map', ...getMedianGameHeader()])
    for (const [map, stats] of Object.entries(data.perMap)) {
      rows.push([stats.mapName, ...getMedianRow(stats.gameDurations.median)])
    }
  }

  return rows
}

const getMostImprovedRates = data => {
  const rows = []

  if (data.perTeam) {
    rows.push(['Per team', ...getMostImprovedHeader()])
    for (const [team, stats] of Object.entries(data.perTeam)) {
      rows.push([team, ...getMostImprovedRow(stats.mostImprovedPlayers)])
    }
  }

  return rows
}

const getCastRates = data => {
  const rows = []

  if (data.perTeam) {
    rows.push(['Per team', ...getCastRateHeader()])
    for (const [team, stats] of Object.entries(data.perTeam)) {
      rows.push([team, ...getCastRateRow(stats.castRate)])
    }
    rows.push(['Overall', ...getCastRateRow(data.general.castRate)])
  }

  return rows
}

const getLongestShortestGames = data => {
  const rows = []

  if (data.perTier) {
    rows.push(['Per tier', ...getRecordGameHeader('tier'), ...getRecordGameHeader('tier')])
    for (const [tier, stats] of Object.entries(data.perTier)) {
      rows.push([tier, ...getLongestShortestRows(stats.gameDurations.shortest, stats.gameDurations.longest)])
    }
  }
  if (data.perMatchup) {
    rows.push(['Per matchup', ...getRecordGameHeader('matchup'), ...getRecordGameHeader('matchup')])
    for (const [matchup, stats] of Object.entries(data.perMatchup)) {
      rows.push([matchup, ...getLongestShortestRows(stats.gameDurations.shortest, stats.gameDurations.longest)])
    }
  }
  if (data.perTeam) {
    rows.push(['Per team', ...getRecordGameHeader('team'), ...getRecordGameHeader('team')])
    for (const [team, stats] of Object.entries(data.perTeam)) {
      rows.push([team, ...getLongestShortestRows(stats.gameDurations.shortest, stats.gameDurations.longest)])
    }
  }
  if (data.general) {
    rows.push(['Overall', ...getRecordGameHeader(), ...getRecordGameHeader()])
    rows.push(['', ...getLongestShortestRows(data.general.gameDurations.shortest, data.general.gameDurations.longest)])
  }

  return rows
}

/**
 * Converts statistics data to CSV.
 */
const convertToCSV = data => {
  return stringify(data)
}

module.exports = {
  convertVodStats,
  convertSeasonStats,
  convertToCSV
}
