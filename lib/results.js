// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const {getSafeName, toMwTemplate} = require('./mediawiki')
const {getRaceLetter} = require('./starcraft')

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
      flag: null
    }
  })
  
  return [playerInfo, matches]
}

/**
 * Generates a single box representing the results of one group's matches.
 */
function generateGroupBox(groupData) {
  const title = `====${toMwTemplate('HiddenSort', {}, [groupData.groupName])}====`
  const playerArgs = Object.fromEntries(groupData.players.map((player, n) => [`p${n + 1}`, player.nameSafe]))
  const groupTpl = toMwTemplate('GroupTableLeague', {title: groupData.groupName, finished: 'true', show_g: 'false', diff: 'false', width: '24em', ...playerArgs})
  const matchArgs = Object.fromEntries(groupData.matches.map((match, n) => [`match${n + 1}`, toMwTemplate('MatchMaps', match)]))
  const matchListTpl = toMwTemplate('MatchList', {title: 'Detailed Results', 'uncollapsed-maps': 'false', width: '24em', ...matchArgs})
  return [title, groupTpl, matchListTpl].join('\n')
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
      finished: true,
      players,
      matches
    }
  })
  return groups
}

/**
 * Returns an array of all players with their name and race.
 */
function getAllPlayers(data) {
  const players = {}
  for (const [groupKey, matches] of Object.entries(data)) {
    const group = Number(groupKey)
    for (const match of matches) {
      const p1 = match.player1
      const p2 = match.player2
      players[p1.name] = {name: p1.name, nameSafe: getSafeName(p1.name), race: getRaceLetter(p1.race), group}
      players[p2.name] = {name: p2.name, nameSafe: getSafeName(p2.name), race: getRaceLetter(p2.race), group}
    }
  }
  return Object.values(players)
}

/**
 * Generates a list of active participants from the given data.
 * 
 * Uses the {{ParticipantTable}} and {{ParticipantSection}} templates.
 */
function genParticipants(data) {
  const players = getAllPlayers(data)
  const playerObj = Object.fromEntries(players.flatMap((player, n) => [
    // Note: the name has square brackets replaced with parentheses.
    [`p${n + 1}`, player.nameSafe],
    [`p${n + 1}race`, player.race],
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

module.exports = {
  formatData,
  generateGroupBox,
  genParticipants,
  getAllPlayers,
  getPlayerAndMatchData
}
