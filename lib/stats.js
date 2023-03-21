// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const cloneDeep = require('lodash.clonedeep')
const {getCPLSeasonPlayedWeeks, getCPLSeasonWeekResults} = require('./cpl')

/**
 * Returns the full team names from a list of team abbreviations.
 */
const getTeamDataByAlias = (alias, seasonData) => {
  return seasonData.teams.find(team => team.titleAliases.includes(alias))
}

/**
 * Returns the matchup results for a given season and week.
 * 
 * Includes the data for all teams.
 */
async function getWeekResults(season, week, type = 'regular') {
  const data = await getCPLSeasonWeekResults(season, week, type)

  const teams = {}

  for (const matchup of data) {
    const {team1, team2} = matchup
    const teamData = {
      matchesPlayed: 0,
      matchesWon: 0,
      mapsPlayed: 0,
      mapsWon: 0,
      matchupsWon: 0,
      matchupsDrawn: 0
    }
    teams[team1] = cloneDeep(teamData)
    teams[team2] = cloneDeep(teamData)
  }

  for (const matchup of data) {
    const {team1, team2} = matchup

    let matchesPlayed = 0
    let rMatchesPlayed = 0
    let mapsPlayed = 0
    let team1wins = 0
    let team2wins = 0
    let team1rwins = 0
    let team2rwins = 0
    let team1maps = 0
    let team2maps = 0

    for (const match of matchup.matches) {
      if (match.walkover) {
        const inactivePlayer = [match.player1, match.player2].findIndex(p => p.name === match.inactive_players[0])
        if (inactivePlayer === 0) {
          team2wins += 1
        }
        if (inactivePlayer === 1) {
          team1wins += 1
        }
      }
      else if (match.player1.score > match.player2.score) {
        team1wins += 1
        team1rwins += 1
        rMatchesPlayed += 1
      }
      else if (match.player1.score < match.player2.score) {
        team2wins += 1
        team2rwins += 1
        rMatchesPlayed += 1
      }
      else if (match.player1.score === 0 && match.player2.score === 0) {
        continue
      }
      matchesPlayed += 1
      mapsPlayed += match.player1.score + match.player2.score
      team1maps += match.player1.score
      team2maps += match.player2.score
    }

    if (team1wins === team2wins) {
      // Teams had an equal number of wins.
      // In this case, check the number of map wins.
      if (team1maps === team2maps) {
        console.error(`Draw in number of wins and number of maps!`)
        console.error({season, week, type})
        console.error({team1, team2})
        teams[team1].matchupsDrawn += 1
        teams[team2].matchupsDrawn += 1
      }
      else if (team1maps > team2maps) {
        teams[team1].matchupsWon += 1
      }
      else {
        teams[team2].matchupsWon += 1
      }
    }
    else if (team1wins > team2wins) {
      teams[team1].matchupsWon += 1
    }
    else {
      teams[team2].matchupsWon += 1
    }

    teams[team1].matchesPlayed = matchesPlayed
    teams[team1].realMatchesPlayed = rMatchesPlayed
    teams[team1].matchesWon = team1wins
    teams[team1].realMatchesWon = team1rwins
    teams[team1].mapsPlayed = mapsPlayed
    teams[team1].mapsWon = team1maps

    teams[team2].matchesPlayed = matchesPlayed
    teams[team2].realMatchesPlayed = rMatchesPlayed
    teams[team2].matchesWon = team2wins
    teams[team2].realMatchesWon = team2rwins
    teams[team2].mapsPlayed = mapsPlayed
    teams[team2].mapsWon = team2maps
  }

  return teams
}

/**
 * Returns the matchup results for a given season.
 * 
 * Includes the data for all teams.
 */
async function getAllWeekResults(season, type = 'regular') {
  const weeksPlayed = await getCPLSeasonPlayedWeeks(season, type)

  let teams = {}
  for (let n = 0; n < weeksPlayed; ++n) {
    const results = await getWeekResults(season, n + 1, type)
    teams = mergeTeamStats(teams, results)
  }
  
  return [teams, weeksPlayed, type]
}

/**
 * Merges the stats of a team together.
 */
function mergeTeamStats(a, b) {
  for (const team of Object.keys(b)) {
    if (!a[team]) a[team] = {}
    for (const key of Object.keys(b[team])) {
      if (!a[team][key]) a[team][key] = 0
      a[team][key] += b[team][key]
    }
  }
  return a
}

module.exports = {
  getTeamDataByAlias,
  getAllWeekResults,
  getWeekResults
}
