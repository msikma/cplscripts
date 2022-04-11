// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const range = require('lodash.range')
const {getVodsLocal} = require('./get-vods')
const {loadJSON, genTeamMatchResults, genWeeklyMapPool, getCPLSeasonData, genComments} = require('../lib')

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

async function generateRegularSeasonResults(file, seasonNumber, weekNumber, debugDataSlice = null) {
  const seasonData = await getCPLSeasonData(seasonNumber)

  const fileLocal = path.basename(file).trim()
  const data = debugSlice(await loadJSON(file), debugDataSlice)

  const dataVods = await getVodsLocal(seasonNumber)
  const matchSections = genTeamMatchResults(data, seasonData, seasonNumber, weekNumber, dataVods)
  const mapPool = genWeeklyMapPool(seasonData, weekNumber)

  const [startComments, endComments] = genComments(fileLocal)

  const buffer = []
  buffer.push(...startComments)
  buffer.push(`==Week ${weekNumber}==`)
  buffer.push(``)
  buffer.push(`===Map pool===`)
  buffer.push(mapPool)
  buffer.push(``)
  buffer.push(`===Results===`)
  for (const matchSection of matchSections) {
    buffer.push(matchSection.header)
    buffer.push(matchSection.results)
  }
  buffer.push(...endComments)

  return buffer.join('\n')
}

module.exports = {
  generateRegularSeasonResults
}
