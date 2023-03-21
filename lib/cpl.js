// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fg = require('fast-glob')
const fs = require('fs').promises
const {getTypePrefix, pathCPLSeasonData, pathCPLSeasonMiscData, pathCPLSeasonWeekResults, pathCPLSeasonBase} = require('./paths')

async function getCPLSeasonData(season) {
  const content = await fs.readFile(pathCPLSeasonData(season), 'utf8')
  return JSON.parse(content)
}
async function getCPLSeasonMiscData(season) {
  const content = await fs.readFile(pathCPLSeasonMiscData(season), 'utf8')
  return JSON.parse(content)
}

async function getCPLSeasonPlayedWeeks(season, type = 'regular') {
  const weeks = await fg(`${getTypePrefix(type)}week*_results.json`, {cwd: pathCPLSeasonBase(season), deep: 1, onlyFiles: true})
  return weeks.length
}

async function getCPLSeasonWeekResults(season, week, type) {
  const content = await fs.readFile(pathCPLSeasonWeekResults(season, week, type), 'utf8')
  return JSON.parse(content)
}

async function getCPLSeasonAllWeekResultsForType(season, type = 'regular') {
  const weeksPlayed = await getCPLSeasonPlayedWeeks(season, type)
  const weeks = {}
  for (let n = 1; n <= weeksPlayed; ++n) {
    const data = await getCPLSeasonWeekResults(season, n, type)
    weeks[n] = data
  }
  return weeks
}

async function getCPLSeasonAllWeekResults(season) {
  return {
    regular: await getCPLSeasonAllWeekResultsForType(season, 'regular'),
    playoffs: await getCPLSeasonAllWeekResultsForType(season, 'playoffs')
  }
}

module.exports = {
  getCPLSeasonAllWeekResults,
  getCPLSeasonAllWeekResultsForType,
  getCPLSeasonData,
  getCPLSeasonMiscData,
  getCPLSeasonPlayedWeeks,
  getCPLSeasonWeekResults
}
