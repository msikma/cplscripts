// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const {getVodsLocal} = require('./getvods')
const {loadJSON, genParticipants, formatData, toMwTemplate, generateGroupBox} = require('../lib')

/**
 * Generates a notice text for the week's map.
 */
function genMapNotice(weekNumber, mapName) {
  return `All games for week ${weekNumber} were played on [[${mapName}]].`
}

/**
 * Generates Mediawiki code for a CPL preseason results week.
 * 
 * This takes a JSON file exported from the CPL web app database, formatted as follows:
 * 
 *   {
 *     "6": [
 *       {
 *         "player1": {
 *           "name": "Peru",
 *           "race": "Protoss",
 *           "score": 0
 *         },
 *         "player2": {
 *           "name": "rdn_user",
 *           "race": "Terran",
 *           "score": 1
 *         },
 *         "walkover": false,
 *         "draw": false,
 *         "inactive_players": []
 *       },
 *       ...
 * 
 * In this example, the object key indicates the group. The rest of the data should be self-explanatory.
 * 
 * We don't make use of the "inactive_players" value.
 */
async function generatePreseasonResults(file, seasonNumber = 8, weekNumber = 2) {
  const mapName = 'Eclipse'
  const singleMapNotice = genMapNotice(weekNumber, mapName)

  const fileLocal = path.basename(file).trim()
  const dataX = await loadJSON(file)
  const data = {1: dataX[1], 2: dataX[2]}

  const dataVods = await getVodsLocal(seasonNumber)
  const participantsSection =  genParticipants(data)
  const dataGroups = formatData(data)

  const buffer = []
  buffer.push(`<!-- these results are generated from the CPL database, keep in mind that edits can be lost if we regenerate! please contact us on discord if some information is wrong. -->`)
  buffer.push(`<!-- start of generated results (${fileLocal}) -->`)
  buffer.push(`==Week ${weekNumber}==`)
  buffer.push(``)
  buffer.push(singleMapNotice)
  buffer.push(``)
  buffer.push(`===Participants===`)
  buffer.push(participantsSection)
  buffer.push(`===Results===`)
  buffer.push(toMwTemplate('Toggle group start', {state: 'show'}))
  buffer.push(toMwTemplate('Box', {padding: '2em'}, ['start']))
  buffer.push(dataGroups.map(group => generateGroupBox(group, seasonNumber, weekNumber, true, dataVods)).join(`\n${toMwTemplate('Box', {padding: '4em'}, ['break'])}\n`))
  buffer.push(toMwTemplate('Box', {}, ['end']))
  buffer.push(toMwTemplate('Toggle group end'))
  buffer.push(`<!-- end of generated results (${fileLocal}) -->`)

  return buffer.join('\n')
}

module.exports = {
  generatePreseasonResults
}
