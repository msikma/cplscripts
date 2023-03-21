// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const sortBy = require('lodash.sortBy')
const {getCPLSeasonData, getCPLSeasonAllWeekResults} = require('../lib')

/**
 * Returns a list of all players for each team of a season.
 */
async function getTeamPlayersListCPL(season) {
  // Season data; contains static information about the teams.
  const seasonData = await getCPLSeasonData(season)

  // Get matchup results.
  const resultsData = await getCPLSeasonAllWeekResults(season)

  // Collate all the team data from our results JSON.
  const teams = {}

  for (const [type, typeData] of Object.entries(resultsData)) {
    for (const week of Object.values(typeData)) {
      for (const teamMatchup of week) {
        for (const team of ['team1', 'team2']) {
          if (!teams[teamMatchup[team]]) {
            teams[teamMatchup[team]] = {
              name: teamMatchup[team],
              players: {},
              n: `T${(seasonData.teams.findIndex(t => t.name === teamMatchup[team])) + 1}`
            }
          }
        }
        for (const match of teamMatchup.matches) {
          for (const player of ['1', '2']) {
            const team = teams[teamMatchup[`team${player}`]]
            const playerData = match[`player${player}`]
            if (!team.players[playerData.name]) {
              team.players[playerData.name] = playerData
            }
          }
        }
      }
    }
  }

  // Convert into sorted arrays of players.
  const teamList = Object.values(teams).map(team => ({
    ...team,
    players: sortBy(Object.values(team.players), ['tier', 'name', 'score', 'race'])
  }))

  return teamList
}

/**
 * Returns a list of players for each team as a single flat array.
 */
async function getPlayersListCPL(season) {
  const teamList = await getTeamPlayersListCPL(season)
  const flatPlayersList = teamList.flatMap(team => team.players.map(player => ({...player, teamName: team.name, teamN: team.n})))
  return flatPlayersList
}

module.exports = {
  getPlayersListCPL
}
