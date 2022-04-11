// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const range = require('lodash.range')
const {getVodsLocal} = require('./get-vods')
const {loadJSON, genParticipants, formatData, toMwTemplate, generateGroupBox, getCPLSeasonData} = require('../lib')

/**
 * Generates a notice text for the week's map.
 */
function genMapNotice(weekNumber, mapName) {
  return `All games for week ${weekNumber} were played on [[${mapName}]].`
}

/**
 * Returns a slice of the data for debugging purposes.
 */
function debugSlice(data, slice) {
  if (!slice) return data
  const slicedData = {}
  const dataRange = range(...slice)
  for (const n of dataRange) {
    if (data[n]) slicedData[n] = data[n]
  }
  return slicedData
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
async function generatePreseasonResults(file, seasonNumber, weekNumber, debugDataSlice = null) {
  const seasonData = await getCPLSeasonData(seasonNumber)
  const mapName = seasonData.preseason.mapPool[weekNumber]
  const singleMapNotice = genMapNotice(weekNumber, mapName)

  const fileLocal = path.basename(file).trim()
  const data = debugSlice(await loadJSON(file), debugDataSlice)

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
  buffer.push(dataGroups.map(group => generateGroupBox('B', group, seasonNumber, weekNumber, true, dataVods)).join(`\n${toMwTemplate('Box', {padding: '2em'}, ['break'])}\n`))
  buffer.push(toMwTemplate('Box', {}, ['end']))
  buffer.push(toMwTemplate('Toggle group end'))
  buffer.push(`<!-- end of generated results (${fileLocal}) -->`)

  return buffer.join('\n')
}

module.exports = {
  generatePreseasonResults
}
