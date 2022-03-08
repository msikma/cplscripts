// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/**
 * Returns a list of VODs that match a given group.
 */
function findGroupVods(vods, groupNumber, seasonNumber, weekNumber, isPreseason) {
  return vods.filter(vod => vod.meta.isPreseason === isPreseason && vod.meta.season === seasonNumber && vod.meta.week === weekNumber && vod.meta.groups.includes(groupNumber))
}

module.exports = {
  findGroupVods
}
