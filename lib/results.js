// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const sortBy = require('lodash.sortby')
const {objRemoveNull} = require('./data')
const {simpleGMTDateDisplay} = require('./time')
const {getSafeName, toMwTemplate} = require('./mediawiki')
const {findGroupVods} = require('./vods')
const {getRaceLetter} = require('./starcraft')

/**
 * Returns a CPL article link for a player.
 */
function getCPLLink(name, addLinks = true) {
  if (addLinks) {
    return `${name} (CPL)`
  }
  return 'false'
}

/**
 * Converts a group data object into more conveniently accessible player and match data.
 * 
 *   https://liquipedia.net/starcraft/Template:MatchMaps
 */
function getPlayerAndMatchData(groupData, {displayMaps = true, addLinks = false} = {}) {
  const players = {}
  const matches = []
  for (const item of groupData) {
    players[item.player1.name] = {score: 0, played: 0, player: item.player1}
    players[item.player2.name] = {score: 0, played: 0, player: item.player2}
  }
  for (const item of groupData) {
    const p1 = item.player1
    const p2 = item.player2

    // Check if a match was actually played.
    const wasPlayed = p1.score > 0 || p2.score > 0
    if (!wasPlayed) continue
    
    players[p1.name].score += p1.score
    players[p1.name].played += 1
    players[p2.name].score += p2.score
    players[p2.name].played += 1

    const p1Name = getSafeName(p1.name)
    const p2Name = getSafeName(p2.name)
    const matchWinner = p1.score > p2.score ? '1' : '2'
    
    matches.push({
      player1: p1Name,
      player1race: getRaceLetter(p1.race),
      player1link: addLinks ? `${p1Name} (CPL)` : 'false',
      player2: p2Name,
      player2race: getRaceLetter(p2.race),
      player2link: addLinks ? `${p2Name} (CPL)` : 'false',
      winner: matchWinner,
      map1win: matchWinner,
      map1: 'Eclipse'
    })
  }
  const playersSorted = Object.values(players).sort((a, b) => {
    if (a.score === b.score) {
      return a.played > b.played ? -1 : 1
    }
    return a.score > b.score ? -1 : 1
  })
  const playerInfo = playersSorted.map(player => {
    return {
      name: player.player.name,
      nameSafe: getSafeName(player.player.name),
      race: getRaceLetter(player.player.race),
      score: player.score,
      played: player.played,
      flag: null
    }
  })
  
  return [playerInfo, matches]
}

/**
 * Generates a group table for a given group of preseason players.
 * 
 * This is the newer, but not very newest, style of templates.
 */
function generateGroupTableLeague(groupData, seasonNumber, weekNumber, isPreseason, playerArgs, dataVods) {
  const groupWidth = '24em'
  const groupVods = findGroupVods(dataVods, groupData.groupNumber, seasonNumber, weekNumber, isPreseason)
  const groupArgs = {
    title: groupData.groupName,
    finished: 'true',
    show_g: 'false',
    diff: 'false',
    width: groupWidth
  }
  if (groupVods.length) {
    groupArgs.vod = groupVods[0].url
  }
  return {
    template: toMwTemplate('GroupTableLeague', {...groupArgs, ...playerArgs}),
    groupWidth
  }
}

/**
 * Generates a group table for a given group of preseason players.
 * 
 * This is the older style of templates.
 */
function generateGroupTable(groupData, seasonNumber, weekNumber, isPreseason, dataVods) {
  const groupWidth = '300px'
  const groupVods = findGroupVods(dataVods, groupData.groupNumber, seasonNumber, weekNumber, isPreseason)
  const startArgs = {
    width: groupWidth,
    finished: 'true'
  }
  if (groupVods.length) {
    startArgs.vod = groupVods[0].url
  }
  const start = toMwTemplate('GroupTableStart', startArgs, [`${groupData.groupName}`])
  const slots = []
  for (let n = 0; n < groupData.players.length; ++n) {
    const player = groupData.players[n]
    slots.push(toMwTemplate('GroupTableSlot', objRemoveNull({
      place: n + 1,
      win_m: player.played === 0 ? '' : player.score,
      lose_m: player.played === 0 ? '' : player.played - player.score
    }), [
      toMwTemplate('playersp', {race: player.race ?? '', flag: ''}, [player.nameSafe])
    ]))
  }
  const end = toMwTemplate('GroupTableEnd')

  return {
    template: [start, slots.join('\n'), end].join('\n'),
    groupWidth
  }
}

/**
 * Generates a single box representing the results of one group's matches.
 * 
 * "type" has to be one of {"A", "B"}:
 * 
 *   A: uses {{GroupTableLeague}} and {{MatchList}}
 *   B: uses {{GroupTableStart}}, {{GroupTableSlot}}, {{GroupTableEnd}} and {{MatchList}}
 * 
 */
function generateGroupBox(type, groupData, seasonNumber, weekNumber, isPreseason, dataVods) {
  const title = `====${toMwTemplate('HiddenSort', {}, [groupData.groupName])}====`
  let groupTplData
  if (type === 'A') {
    const playerArgs = Object.fromEntries(groupData.players.map((player, n) => [`p${n + 1}`, player.nameSafe]))
    groupTplData = generateGroupTableLeague(groupData, seasonNumber, weekNumber, isPreseason, playerArgs, dataVods)
  }
  if (type === 'B') {
    groupTplData = generateGroupTable(groupData, seasonNumber, weekNumber, isPreseason, dataVods)
  }
  const matchArgs = Object.fromEntries(groupData.matches.map((match, n) => [`match${n + 1}`, toMwTemplate('MatchMaps', match)]))
  const matchListTpl = toMwTemplate('MatchList', {title: 'Detailed Results', 'uncollapsed-maps': 'false', width: groupTplData.groupWidth, ...matchArgs})
  return [title, groupTplData.template, matchListTpl].join('\n')
}

/**
 * Modifies the input data to be what we expect.
 * 
 *   const testData = {
 *     groupName: 'Group A',
 *     stream: null,
 *     finished: true,
 *     date: null,
 *     lrthread: null,
 *     preview: null,
 *     review: null,
 *     players: [
 *       {
 *         name: 'Bisu',
 *         race: 'p',
 *         flag: 'kr',
 *         place: 1,
 *         win_m: 2,
 *         lose_m: 0,
 *         win_g: null,
 *         lose_g: null,
 *         bg: 'up'
 *       },
 *       ...
 *     matches: [
 *       {
 *         player1: 'Bisu',
 *         player1race: 'p',
 *         player2: 'Larva',
 *         player2race: 'z',
 *         winner: 1,
 *         map1win: 1,
 *         map1: 'Polypoid',
 *         vodgame1: null,
 *         lrthread: null
 *       }
 *     ]
 */
function formatData(rawData) {
  const groups = Object.entries(rawData).map(([number, data]) => {
    const [players, matches] = getPlayerAndMatchData(data)
    return {
      groupName: `Group ${number}`,
      groupNumber: Number(number),
      finished: true,
      players,
      matches
    }
  })
  return groups
}

/**
 * Helper function for wrapping a player's information.
 */
function packPlayer(p, group, team) {
  return objRemoveNull({
    name: p.name,
    nameSafe: getSafeName(p.name),
    nameSort: p.name.trim().toLowerCase(),
    link: getCPLLink(p.name),
    race: getRaceLetter(p.race),
    tier: p.tier ?? null,
    score: p.score ?? null,
    flag: p.flag ?? '',
    group,
    team
  })
}

/**
 * Returns an array of all players with their name and race.
 */
function getAllPlayers(data) {
  const players = {}
  for (const [groupKey, groupData] of Object.entries(data)) {
    const group = Number(groupKey)
    // If we're in regular season, groupData will actually be an object containing two
    // team names and a 'matches' list. In that case 'group' will be meaningless.
    // In preseason, groupData will straight up be an array of matches.
    const matches = groupData.matches ?? groupData
    const team1 = groupData.team1 ?? null
    const team2 = groupData.team2 ?? null
    for (const match of matches) {
      const p1 = match.player1
      const p2 = match.player2
      players[p1.name] = packPlayer(p1, group, team1)
      players[p2.name] = packPlayer(p2, group, team2)
    }
  }
  const playerList = Object.values(players)
  const teams = {}
  if (playerList[0]?.team) {
    for (const player of playerList) {
      if (!teams[player.team]) teams[player.team] = []
      teams[player.team].push(player)
    }
    for (const [teamName, teamPlayers] of Object.entries(teams)) {
      teams[teamName] = sortBy(teamPlayers, ['tier', 'race', 'nameSort'])
    }
  }
  return [playerList, teams]
}

/**
 * Generates a list of active participants from the given data.
 * 
 * Uses the {{ParticipantTable}} and {{ParticipantSection}} templates.
 */
function genParticipants(data) {
  const [players, teams] = getAllPlayers(data)
  const playerObj = Object.fromEntries(players.flatMap((player, n) => [
    // Note: the name has square brackets replaced with parentheses.
    [`p${n + 1}`, player.nameSafe],
    [`p${n + 1}race`, player.race],
    [`p${n + 1}flag`, ''],
    // Note: we use this link to prevent the template from fetching data from the page named after nameSafe.
    // The link isn't actually ever shown because links: false in the ParticipantTable.
    [`p${n + 1}link`, `${player.nameSafe} (CPL)`]
  ]))
  return toMwTemplate(
    'ParticipantTable',
    {count: 'true', disable_teams: 'true', links: 'false'},
    [toMwTemplate('ParticipantSection', playerObj)]
  )
}

function abbreviateTeamName(team) {
  if (team.useAliasInResults) {
    return [team.titleAliases[0], `<abbr title="${team.name}">${team.titleAliases[0]}</abbr>`]
  }
  else {
    return [team.name, team.name]
  }
}

function createTeamMatchupHeader(team1, team2, winsTeam1, winsTeam2, mapWinsTeam1, mapWinsTeam2, nameTeam1, nameTeam2, abbrTeam1, abbrTeam2) {
  const winner = winsTeam1 > winsTeam2 ? '1' : '2'
  const mapWinner = mapWinsTeam1 > mapWinsTeam2 ? '1' : '2'
  
  const loserHasMoreMapWins = winner !== mapWinner
  const loserMapString = winner === '1'
    ? `<abbr title="${nameTeam2} won ${mapWinsTeam2} maps to ${nameTeam1}'s ${mapWinsTeam1}">${winsTeam2}</abbr>`
    : `<abbr title="${nameTeam1} won ${mapWinsTeam1} maps to ${nameTeam2}'s ${mapWinsTeam2}">${winsTeam1}</abbr>`

  const winStringTeam1 = winner === '1' ? winsTeam1 : (loserHasMoreMapWins ? loserMapString : winsTeam1)
  const winStringTeam2 = winner === '2' ? winsTeam2 : (loserHasMoreMapWins ? loserMapString : winsTeam2)

  const buffer = []
  buffer.push(`{| class="wikitable" style="width:600px; text-align: center; margin-bottom: 0; line-height: 30px"`)
  buffer.push(`|-`)
  buffer.push(`|style="width: 250px${winner === '1' ? `; font-weight: bold` : ''}"|[[File:${team1.tlLogoImage}|x30px|bottom]] ${abbrTeam1}`)
  buffer.push(`|style="width: 50px${winner === '1' ? `; font-weight: bold` : ''}"|${winStringTeam1}`)
  buffer.push(`|style="width: 50px${winner === '2' ? `; font-weight: bold` : ''}"|${winStringTeam2}`)
  buffer.push(`|style="width: 250px${winner === '2' ? `; font-weight: bold` : ''}"|[[File:${team2.tlLogoImage}|x30px|bottom]] ${abbrTeam2}`)
  buffer.push(`|}`)
  return buffer
}

function createTeamMatchupTierTitle(firstOfTier, tierNumber, vodObjs) {
  if (!firstOfTier) return null
  const vods = vodObjs.map((obj, n) => `[[File:VOD Icon.png|link=${obj.url}|x14px|Watch VOD${vodObjs.length > 1 ? ` #${n + 1}` : ''}]]`)
  return `<div style="position: relative">Tier ${tierNumber}${vodObjs.length ? `<span style="position: absolute; right: 0">${vods.join('')}</span>` : ''}</div>`
}

function findMatchupVods(dataVods, team1, team2, seasonNumber, weekNumber, tierNumber) {
  const matchingVods = []
  for (const vod of dataVods) {
    if (vod.meta.isPreseason) continue
    if (!vod.meta.teamMatchup || !vod.meta.teamMatchup.includes(team1) || !vod.meta.teamMatchup.includes(team2)) continue
    if (vod.meta.season !== seasonNumber) continue
    if (vod.meta.week !== weekNumber) continue
    if (!vod.meta.tiers.includes(tierNumber)) continue
    matchingVods.push(vod)
  }
  return matchingVods
}

function getWalkoverWinner(player1, player2, isWalkover, inactivePlayers) {
  if (!isWalkover) return null
  if (player1.name === inactivePlayers[0]) return '2'
  if (player2.name === inactivePlayers[0]) return '1'
  throw new Error(`invalid value for walkover win: 1 "${player1.name}", 2 "${player2.name}", inactive: ${JSON.stringify(inactivePlayers)}`)
}

function getWinner(score1, score2, walkoverWinner) {
  if (walkoverWinner) return walkoverWinner
  if (score1 === score2) return '0'
  return score1 > score2 ? '1' : '2'
}

function createTeamMatchupResults(matchup, matchupMatches, team1, team2, mapPool, seasonNumber, weekNumber, dataVods) {
  const [nameTeam1, abbrTeam1] = abbreviateTeamName(team1)
  const [nameTeam2, abbrTeam2] = abbreviateTeamName(team2)
  const teamWins = {'1': 0, '2': 0}
  const teamMapWins = {'1': 0, '2': 0}
  const matches = []
  let currentTier = null
  for (const match of matchupMatches) {
    const player1 = packPlayer(match.player1)
    const player2 = packPlayer(match.player2)
    const walkoverWin = getWalkoverWinner(match.player1, match.player2, match.walkover, match.inactive_players)
    const vods = findMatchupVods(dataVods, team1.name, team2.name, seasonNumber, weekNumber, player1.tier)
    const winner = getWinner(player1.score, player2.score, walkoverWin)
    teamWins[winner] += 1
    teamMapWins['1'] += walkoverWin ? 0 : match.player1.score
    teamMapWins['2'] += walkoverWin ? 0 : match.player2.score
    matches.push(toMwTemplate('MatchMaps', objRemoveNull({
      player1: player1.nameSafe,
      player1race: player1.race ?? null,
      player1flag: player1.flag ?? null,
      player1link: player1.link,
      player2: player2.nameSafe,
      player2race: player2.race,
      player2flag: player2.flag,
      player2link: player2.link,
      walkover: walkoverWin,
      p1score: player1.score,
      p2score: player2.score,
      winner,
      title: createTeamMatchupTierTitle(currentTier !== player1.tier, player1.tier, vods)
    })).split('\n').join(''))

    currentTier = player1.tier
  }
  const matchArgs = Object.fromEntries(matches.map((match, n) => [`match${n + 1}`, match]))
  const matchTable = toMwTemplate('MatchList', {title: 'Detailed Results', width: '600px', 'hide': 'false', 'uncollapsed-maps': 'false', ...matchArgs})

  const buffer = []
  buffer.push(...createTeamMatchupHeader(team1, team2, teamWins['1'], teamWins['2'], teamMapWins['1'], teamMapWins['2'], nameTeam1, nameTeam2, abbrTeam1, abbrTeam2))
  buffer.push(matchTable)

  return {header: `====${abbrTeam1} vs ${abbrTeam2}====`, results: buffer.join('\n')}
}

function genTeamMatchResults(data, seasonData, seasonNumber, weekNumber, dataVods) {
  const mapPool = seasonData.regularSeason.mapPool[weekNumber]
  const sections = []
  for (const matchup of data) {
    const team1 = seasonData.teams.find(t => t.name === matchup.team1)
    const team2 = seasonData.teams.find(t => t.name === matchup.team2)
    const sortedMatches = sortBy(matchup.matches.map((match, n) => ({...match, n})), ['player1.tier', 'n'])
    sections.push(createTeamMatchupResults(matchup, sortedMatches, team1, team2, mapPool, seasonNumber, weekNumber, dataVods))
  }
  return sections
}

function genWeeklyMapPool(seasonData, weekNumber) {
  const maps = seasonData.regularSeason.mapPool[weekNumber]
  const week = new Date(seasonData.regularSeason.weeks[weekNumber])
  const weekEnd = new Date(week)
  weekEnd.setDate(week.getDate() + 6)
  const buffer = []
  buffer.push(`For this week, the following maps were used:`)
  buffer.push(``)
  buffer.push(toMwTemplate('Maps', {...Object.fromEntries(maps.map((map, n) => [`map${n + 1}`, map]))}))
  buffer.push(``)
  buffer.push(`Matches could be played from <time>${simpleGMTDateDisplay(week)}</time> until <time>${simpleGMTDateDisplay(weekEnd)} 19:00 UTC</time>.`)
  return buffer.join('\n')
}

/**
 * Generates comments to show at the start and end of a generated section.
 */
function genComments(fileLocal) {
  const identifier = `${fileLocal} ${new Date().toISOString()}`
  const notice = `<!-- these results are generated from the CPL database, keep in mind that edits can be lost if we regenerate! please contact us on discord if some information is wrong. -->`
  const start = `<!-- start of generated results (${identifier}) -->`
  const end = `<!-- end of generated results (${identifier}) -->`
  return [[notice, start], [end]]
}

module.exports = {
  formatData,
  generateGroupBox,
  genComments,
  genTeamMatchResults,
  genParticipants,
  getAllPlayers,
  genWeeklyMapPool,
  getPlayerAndMatchData
}
