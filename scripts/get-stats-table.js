// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const CliTable = require('cli-table3')
const sortBy = require('lodash.sortBy')
const {getAllWeekResults, getCPLSeasonData} = require('../lib')

/** Formats a float as a percentage. */
function formatPercentage(p, addSign = false) {
  return `${addSign && p > 0 ? '+' : ''}${(p * 100).toFixed(2)}%`
}

/**
 * Returns a table for the team stats.
 */
function outputTerminalTable(teams, teamsData, weeksPlayed, useRealMatches) {
  const table = new CliTable({head: ['#', 'Name', 'Score', 'Matches won', 'played', '%', 'w.o.', 'Maps won', 'played', '%']});

  const keyMatchesWon = useRealMatches ? 'realMatchesWon' : 'matchesWon'
  const keyMatchesPlayed = useRealMatches ? 'realMatchesPlayed' : 'matchesPlayed'
  const keyMatchesWonP = useRealMatches ? 'realMatchesWonP' : 'matchesWonP'

  for (let n = 0; n < teams.length; ++n) {
    const team = teams[n]
    table.push([
      n + 1,
      team.name,
      `${team.matchupsWon}-${weeksPlayed - team.matchupsWon}`,
      team[keyMatchesWon],
      team[keyMatchesPlayed],
      formatPercentage(team[keyMatchesWonP]),
      formatPercentage(team.matchesWonP - team.realMatchesWonP, true),
      team.mapsWon,
      team.mapsPlayed,
      formatPercentage(team.mapsWonP)
    ])
  }
  
  return table.toString()
}

/**
 * Returns a table for the team stats.
 */
function outputHTMLTable(teams, teamsData, weeksPlayed) {
  const lines = []
  lines.push(`<div>`)
  lines.push(`
    <style>
    :root {
      /* old: #CDCACA */
      --cpl-color-a: #CDCACA;
      --cpl-color-b: black;
      --cpl-color-c: white;
      --cpl-color-d: #CDCACA47;
      --cpl-block-rounding: 4px;
      --cpl-line-width: 2px;
      --cpl-font-regular: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
      --cpl-font-mono: ui-monospace,'SFMono-Regular','SF Mono','Menlo','Andale Mono','Liberation Mono','Ubuntu Mono',monospace;
    }
    body {
      color: var(--cpl-color-b);
      background: var(--cpl-color-c);
    }
    
    table {
      font-family: var(--cpl-font-regular);
      border-collapse: separate;
      border-spacing: 0;
      margin: 0.5rem 0;
    }
    table tbody td {
      font-family: var(--cpl-font-mono);
    }
    table tbody .regular {
      font-family: var(--cpl-font-regular);
    }
    table th, table td {
      border-color: var(--cpl-color-a);
      border-width: 0;
      border-style: solid;
      padding: 0.35rem 0.6rem;
      margin: 0;
      text-align: left;
    }
    table thead th, table thead td, table tbody th, table tbody td, table tfoot th, table tfoot td {
      border-top-width: var(--cpl-line-width);
      border-right-width: var(--cpl-line-width);
    }
    table thead th:first-child, table thead td:first-child, table tbody th:first-child, table tbody td:first-child, table tfoot th:first-child, table tfoot td:first-child {
      border-left-width: var(--cpl-line-width);
    }
    table thead:last-child tr:last-child th, table thead:last-child tr:last-child td, table tbody:last-child tr:last-child th, table tbody:last-child tr:last-child td, table tfoot:last-child tr:last-child th, table tfoot:last-child tr:last-child td {
      border-bottom-width: var(--cpl-line-width);
    }
    table thead:first-child tr:first-child th:first-child, table thead:first-child tr:first-child td:first-child, table tbody:first-child tr:first-child th:first-child, table tbody:first-child tr:first-child td:first-child, table tfoot:first-child tr:first-child th:first-child, table tfoot:first-child tr:first-child td:first-child {
      border-top-left-radius: var(--cpl-block-rounding);
    }
    table thead:first-child tr:first-child th:last-child, table thead:first-child tr:first-child td:last-child, table tbody:first-child tr:first-child th:last-child, table tbody:first-child tr:first-child td:last-child, table tfoot:first-child tr:first-child th:last-child, table tfoot:first-child tr:first-child td:last-child {
      border-top-right-radius: var(--cpl-block-rounding);
    }
    table thead:last-child tr:last-child th:first-child, table thead:last-child tr:last-child td:first-child, table tbody:last-child tr:last-child th:first-child, table tbody:last-child tr:last-child td:first-child, table tfoot:last-child tr:last-child th:first-child, table tfoot:last-child tr:last-child td:first-child {
      border-bottom-left-radius: var(--cpl-block-rounding);
    }
    table thead:last-child tr:last-child th:last-child, table thead:last-child tr:last-child td:last-child, table tbody:last-child tr:last-child th:last-child, table tbody:last-child tr:last-child td:last-child, table tfoot:last-child tr:last-child th:last-child, table tfoot:last-child tr:last-child td:last-child {
      border-bottom-right-radius: var(--cpl-block-rounding);
    }    
    table th {
      text-align: left;
    }
    .team-name {
      font-weight: 600;
      position: relative;
      background: var(--cpl-color-d);
      padding-left: 3ch;
    }
    .team-name .emoji {
      position: absolute;
      left: 0.6rem;
    }
    .right {
      text-align: right;
    }
    .r1 th {
      border-bottom: none;
    }
    .r2 th {
      border-top: none;
      padding-top: 0;
      font-size: 85%;
      font-weight: 600;
    }
    .not-last {
      border-right: none;
    }
    </style>
  `)
  lines.push(`<table>`)
  lines.push(`<thead>`)
  lines.push(`
    <tr class="r1">
      <th>#</th>
      <th>Team name</th>
      <th colspan="2">Weeks</th>
      <th colspan="4">Matches</th>
      <th colspan="4">Sets</th>
    </tr>
    <tr class="r2">
      <th></th>
      <th></th>
      <th class="not-last">Won</th>
      <th>Lost</th>
      <th class="not-last">Won</th>
      <th class="not-last">Lost</th>
      <th class="not-last">Played</th>
      <th>%</th>
      <th class="not-last">Won</th>
      <th class="not-last">Lost</th>
      <th class="not-last">Played</th>
      <th>%</th>
    </tr>
  `)
  lines.push(`</thead>`)
  lines.push(`<tbody>`)
  for (let n = 0; n < teams.length; ++n) {
    const team = teams[n]
    const teamData = teamsData.find(teamData => teamData.name === team.name)
    lines.push(`
      <tr>
        <td class="regular">${n + 1}</td>
        <td class="regular team-name"><span class="emoji">${teamData.emoji[0]}</span>${team.name}</td>

        <td>${team.matchupsWon}</td>
        <td>${weeksPlayed - team.matchupsWon}</td>

        <td class="right">${team.matchesWon}</td>
        <td class="right">${team.matchesPlayed - team.matchesWon}</td>
        <td>${team.matchesPlayed}</td>
        <td class="right">${formatPercentage(team.matchesWonP)}</td>

        <td class="right">${team.mapsWon}</td>
        <td class="right">${team.mapsPlayed - team.mapsWon}</td>
        <td>${team.mapsPlayed}</td>
        <td class="right">${formatPercentage(team.mapsWonP)}</td>
      </tr>
    `)
  }
  lines.push(`</tbody>`)
  lines.push(`</table>`)
  lines.push(`</div>`)
  
  return lines.join('\n')
}

/**
 * Returns the combinde duration of all VODs for a given season.
 */
async function getTeamRankingCPL(season, {html = false, terminal = false} = {}, useRealMatches = false) {
  // Get matchup results.
  const [teamResults, weeksPlayed] = await getAllWeekResults(season)
  const seasonData = await getCPLSeasonData(season)

  const teams = sortBy(Object.entries(teamResults).map(([key, value]) => ({
    ...value,
    name: key,
    matchesWonP: value.matchesWon / value.matchesPlayed,
    mapsWonP: value.mapsWon / value.mapsPlayed,
    realMatchesWonP: value.realMatchesWon / value.realMatchesPlayed
  })), ['matchupsWon', useRealMatches ? 'realMatchesWonP' : 'matchesWonP', 'mapsWonP']).reverse()

  if (html) {
    return outputHTMLTable(teams, seasonData.teams, weeksPlayed)
  }
  if (terminal) {
    return outputTerminalTable(teams, seasonData.teams, weeksPlayed, useRealMatches)
  }
  return teams
}

module.exports = {
  getTeamRankingCPL
}
