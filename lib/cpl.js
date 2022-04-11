// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises

async function getCPLSeasonData(season) {
  const content = await fs.readFile(`${__dirname}/../cpl/s${season}.json`, 'utf8')
  return JSON.parse(content)
}

module.exports = {
  getCPLSeasonData
}
