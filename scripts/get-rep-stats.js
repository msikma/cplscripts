// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const {getCastingGroupsOverview, getCastingSectionTypes, filterOutUncast, makeCastingGroupsOutput, logObject} = require('../lib')

/**
 * Returns the combined duration of all casting groups.
 */
async function getRepStatsCPL(season, repPath, onlyUncast = false, outputTables = false) {
  // Get a list of the section types: 'playoffs' and 'regular' are type 'weekly_team_matchups',
  // as they are always structured by week, by team and then by match.
  // All other sections are type 'static', which means all the replays are tallied up as one group.
  const types = await getCastingSectionTypes(season, repPath)
  const groups = await getCastingGroupsOverview(season, repPath, types)
  const groupsFiltered = filterOutUncast(groups, onlyUncast)
  
  return makeCastingGroupsOutput(season, groupsFiltered, outputTables ? 'tables' : 'markdown', onlyUncast)
}

module.exports = {
  getRepStatsCPL
}
