// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const {getCastingGroupsOverview} = require('../lib')

/**
 * Returns the combined duration of all casting groups.
 */
async function getRepStatsCPL(season, basedir) {
  return getCastingGroupsOverview(season, basedir)
}

module.exports = {
  getRepStatsCPL
}
