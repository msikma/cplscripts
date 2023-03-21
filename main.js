// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const {isPlainObject, isArray, pathCPLSeasonVods, pathCPLReplays, pathCPLMaps} = require('./lib')
const {getVodsCPL, getEventVodsCPL} = require('./scripts/get-vods')
const {getStatsCPL} = require('./scripts/get-stats')
const {getTeamRankingCPL} = require('./scripts/get-stats-table')
const {getPlayersListCPL} = require('./scripts/get-players')
const {getRepStatsCPL} = require('./scripts/get-rep-stats')
const {getRepAnalysisCPL} = require('./scripts/get-rep-analysis')
const {getASLMaps} = require('./scripts/get-asl-maps')
const {generatePreseasonResults} = require('./scripts/gen-pre')
const {generateRegularSeasonResults} = require('./scripts/gen-reg')
const {generateVodsList} = require('./scripts/gen-vods')
const {generateVodsListDiscord} = require('./scripts/gen-vods-discord')
const {getPreseasonStatus} = require('./scripts/get-preseason-status')
const {getPreseasonMatches} = require('./scripts/get-preseason-matches')
const {genScoreboard} = require('./scripts/gen-scoreboard')

/** Prints output to the console. */
const out = (obj, destination) => {
  const objString = isPlainObject(obj) || isArray(obj) ? JSON.stringify(obj, null, 2) : obj

  if (destination == null) {
    return console.log(objString)
  }
  return fs.writeFile(destination, objString, 'utf8')
}

const main = async (args, {parser}) => {
  if (args.getVodsCPL) {
    return out(await getVodsCPL(args.getVodsCPL, args.noCache), pathCPLSeasonVods(args.getVodsCPL))
  }
  if (args.getEventVodsCPL) {
    return out(await getEventVodsCPL(args.noCache))
  }
  else if (args.getStatsCPL) {
    return out(await getStatsCPL(args.getStatsCPL, args.outCSV, args.noCache))
  }
  else if (args.getTeamsRankingCPL) {
    return out(await getTeamRankingCPL(args.getTeamsRankingCPL, {html: args.outHTML, terminal: args.outTerminal}))
  }
  else if (args.getPlayersListCPL) {
    return out(await getPlayersListCPL(args.getPlayersListCPL))
  }
  else if (args.getRepStatsCPL) {
    return out(await getRepStatsCPL(args.getRepStatsCPL, pathCPLReplays(args.getRepStatsCPL), args.onlyUncast, args.outTables))
  }
  else if (args.getRepAnalysisCPL) {
    return out(await getRepAnalysisCPL(args.getRepAnalysisCPL, pathCPLReplays(args.getRepAnalysisCPL), args.outCSV))
  }
  else if (args.getPreseasonStatusCPL) {
    return out(await getPreseasonStatus(...args.getPreseasonStatusCPL, args.configPath))
  }
  else if (args.getPreseasonMatchesCPL) {
    return out(await getPreseasonMatches(...args.getPreseasonStatusCPL, args.configPath))
  }
  else if (args.genScoreboard) {
    return out(await genScoreboard(...args.genScoreboard))
  }
  else if (args.genPre) {
    return out(await generatePreseasonResults(args.genPre[0], ...args.genPre.slice(1, 3).map(n => Number(n))))
  }
  else if (args.genReg) {
    return out(await generateRegularSeasonResults(args.genReg[0], ...args.genReg.slice(1, 3).map(n => Number(n))))
  }
  else if (args.genVods) {
    return out(await generateVodsList(args.genVods[0]))
  }
  else if (args.genVodsDiscord) {
    return out(await generateVodsListDiscord(args.genVodsDiscord[0]))
  }
  else if (args.getASLMaps) {
    return out(await getASLMaps(pathCPLMaps()))
  }
  else {
    parser.error('no action was selected')
  }
}

module.exports = main
