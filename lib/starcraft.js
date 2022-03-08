// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/** Returns a letter indicating a given race. */
const getRaceLetter = race => {
  if (race === 'Race Picker') {
    return null
  }
  return race[0].toLowerCase()
}

module.exports = {
  getRaceLetter
}
