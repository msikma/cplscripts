// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/** Types of dates we can generate. */
const types = {
  'date': 'dD',
  'time': 'tT',
  'datetime': 'fF',
  'relative': 'RR'
}

/**
 * Returns a Hammertime string for Discord.
 */
const getHammerTime = (date, type = '', isShort = false) => {
  const typeLetter = types[type][isShort ? 0 : 1]
  const unix = Math.floor(Number(date) / 1000)
  return `<t:${unix}:${typeLetter}>`
}

module.exports = {
  getHammerTime
}
