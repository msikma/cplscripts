// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const chalk = require('chalk')
const {fetchAndParse} = require('../lib/scrape')
const {urlCPLPreseasonOverview, urlCPLPreseasonReporting, urlAbsolute, prepareCookies, logObject} = require('../lib')

function getPreseasonGroups($, season, week) {
  const $container = $(`#week_${week}_matches`)
  const $tables = $('.data-table', $container)
  const groups = $tables.get().map(table => {
    const $table = $(table)

    // Get the group number.
    const name = $('thead th:first-child', $table).text().trim()
    const match = name.match(/Group\s+([0-9]+)/i)
    const number = match ? Number(match[1]) : null

    // Get all regular table rows and extract players from them.
    const $rows = $('tbody tr', $table)
    const playerRows = $rows.get().map(row => {
      const $row = $(row)
      
      // Use the existence of a /view_player/ link to detect that this row is for a player.
      const viewPlayer = $('a[href*="view_player"]', $row)
      if (!viewPlayer.length) return null

      const tdClass = $('td', $row).attr('class')
      const race = tdClass.includes('bg-protoss')
        ? 'p'
        : tdClass.includes('bg-zerg')
          ? 'z'
          : tdClass.includes('bg-terran')
          ? 't'
          : tdClass.includes('bg-other')
          ? 'rp'
          : '?' // unknown

      const $player = $('a:first-child', $row)
      const playerName = $player.text().trim()
      const playerURL = urlAbsolute($player.attr('href'))
      const playerIDMatch = playerURL.match(/view_player\/([0-9]+)/)
      const playerID = playerIDMatch ? Number(playerIDMatch[1]) : null

      const $discord = $('span:nth-child(2)', $row)
      const discordID = $discord.text().trim().slice(1, -1)

      const $cplmmr = $('b:nth-child(3)', $row)
      const cplMMR = $cplmmr.text().trim().slice(1, -1)

      // Sanity check: if we don't see the CPL MMR row, that means we're not logged in.
      if (!$cplmmr.length) {
        console.log('cplscripts: error: not logged in on the CPL Web App.')
        process.exit(1)
      }

      return {
        name: playerName,
        url: playerURL,
        race,
        id: playerID,
        discordID,
        mmr: cplMMR ? Number(cplMMR) : null
      }
    })

    return {
      group: number,
      url: urlCPLPreseasonReporting(season, week, number),
      players: playerRows.filter(player => player)
    }
  })

  return groups.filter(group => group.group)
}

function colorRace(race, str) {
  if (race === 'p') return chalk.green(str)
  if (race === 't') return chalk.blue(str)
  if (race === 'z') return chalk.red(str)
  if (race === 'rp') return chalk.magenta(str)
  if (race === 'p') return chalk.gray(str)
  return str
}

function getGroupMatches($, players) {
  const $forms = $('main form')
  const playersByID = Object.fromEntries(players.map(player => [player.id, player]))
  const matches = $forms.get().map((form, n) => {
    const $form = $(form)
    const $winner = $('select[name*="winner"]', $form)
    const $options = $('option:not([value=""])', $winner)
    const playerIDs = $options.get().map(option => Number($(option).attr('value')))
    const $winningOption = $('option[selected]:not([value=""])', $winner)
    const winningValue = Number($winningOption.attr('value'))
    const winningID = winningValue ? Number(winningValue) : null

    const $draw = $('input[type="checkbox"][name*="is_draw"]', $form)
    const $walkover = $('input[type="checkbox"][name*="is_walkover"]', $form)
    const isDraw = $draw.is(":checked")
    const isWalkover = $walkover.is(":checked")

    const $inactive = $('select[name*="inactive_players"]', $form)
    const $inactiveOption = $('option:selected', $inactive)
    const inactiveID = $inactiveOption.length ? Number($inactiveOption.attr('value')) : null

    const $replay = $('a[href*="/replays/"]', $form)
    const replayHref = $replay.attr('href')
    const replayLink = replayHref ? urlAbsolute(replayHref) : null
    
    const playerA = playersByID[playerIDs[0]]
    const playerB = playersByID[playerIDs[1]]

    const infoLine = `Match ${n + 1}: ${colorRace(playerA.race, `${playerA.name} (${playerA.race.toUpperCase()})`)} vs ${colorRace(playerB.race, `${playerB.name} (${playerB.race.toUpperCase()})`)}`
    
    const isMissingReplay = winningID && !replayLink
    const isMissingResult = !winningID && replayLink
    const isMissingInactivePlayerID = isWalkover && !inactiveID
    const isDecided = Boolean(isDraw || isWalkover || inactiveID || winningID)

    return {
      playerIDs,
      infoLine,
      winningPlayerID: winningID,
      replayLink,
      isMissingReplay,
      isMissingResult,
      isMissingInactivePlayerID,
      isDraw,
      isWalkover,
      isDecided,
      inactivePlayerID: inactiveID
    }
  })
  
  const getInfoLines = field => matches
    .map(match => !match[field] ? null : match.infoLine)
    .filter(n => n)
  
  const groupMissingInactivePlayerIDs = getInfoLines('isMissingInactivePlayerID')
  const groupMissingReplays = getInfoLines('isMissingReplay')
  const groupMissingResults = getInfoLines('isMissingResult')
  const groupIsDecided = matches.every(match => match.isDecided)
  const groupIsInactive = matches.every(match => !match.isDecided)

  const amountDecided = matches.filter(match => match.isDecided).length
  const amountTotal = matches.length

  return {
    missingReplays: groupMissingReplays,
    missingResults: groupMissingResults,
    missingInactivePlayerIDs: groupMissingInactivePlayerIDs,
    isDecided: groupIsDecided,
    isInactive: groupIsInactive,
    amountDecided,
    amountTotal,
    matches
  }
}

async function getPreseasonMatchups(groups) {
  const groupMatchups = []
  const meta = {
    amountDecided: 0,
    amountTotal: 0
  }
  for (const group of groups) {
    const urlReport = group.url
    const $report = await fetchAndParse(urlReport)
    const groupMatches = getGroupMatches($report, group.players)
    meta.amountDecided += groupMatches.amountDecided
    meta.amountTotal += groupMatches.amountTotal
    groupMatchups.push({...group, ...groupMatches})
  }
  return [groupMatchups, meta]
}

/**
 * Returns the preseason match report statistics.
 */
async function getPreseasonMatches(season, week, configPath) {
  await prepareCookies(path.join(configPath, 'cookies.txt'))
  const urlOverview = urlCPLPreseasonOverview(season)
  const $overview = await fetchAndParse(urlOverview)
  const groups = getPreseasonGroups($overview, season, week)
  const [groupMatchups, matchupMeta] = await getPreseasonMatchups(groups)
  
  return {groupMatchups, meta: matchupMeta}
}

module.exports = {
  getPreseasonMatches
}
