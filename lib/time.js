// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const {serialize} = require('tinyduration')

// Durations of a second, a minute, an hour and a day.
const durationsMs = [1000, 1000 * 60, 1000 * 60 * 60, 1000 * 60 * 60 * 24]
const durationNames = ['seconds', 'minutes', 'hours', 'days']

/** Converts a DD:HH:MM:SS.MS duration to milliseconds. */
function durationInMs(duration, durations = durationsMs) {
  const [main, remainder] = duration.split('.')
  const values = main.split(':').map(v => parseInt(v))
  const valuesInMs = add(...values.reverse().map((v, n) => v * durations[n]))
  return valuesInMs + parseInt(remainder)
}

/** Returns a simple date display, e.g. 'Mon, 04 Apr 2022'. */
function simpleGMTDateDisplay(date) {
  return date.toGMTString().split('00:')[0].trim()
}

/** Returns a year-month formatted date string. */
function getYearMonth(date = new Date()) {
  const format = new Intl.DateTimeFormat('en-US', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})
  const parts = format.formatToParts(date)
  return [parts.find(part => part.type === 'year').value, parts.find(part => part.type === 'month').value]
}

/**
 * Converts a millisecond duration to DD:HH:MM:SS.MS format.
 * 
 * If 'omitDays' is true, the format is HH:MM:SS.MS instead.
 * If 'isoString' is true, an ISO 8601 string is returned.
 */
function msToDuration(ms, omitDays = false, omitMs = false, isoString = false) {
  const durations = omitDays
    ? durationsMs.slice(0, -1)
    : durationsMs
  const durationMsNames = omitDays
    ? durationNames.slice(0, -1)
    : durationNames

  let res = []
  for (let n = durations.length - 1, m = 0; n >= 0; --n, ++m) {
    const value = Math.floor(ms / durations[n])
    if (!res.length && value === 0) continue
    res.push(value)
    ms -= res[res.length - 1] * durations[n]
  }

  // Return as ISO 8601 string if needed.
  if (isoString) {
    return serialize(Object.fromEntries(res.reverse().map((value, n) => [durationMsNames[n], value])))
  }

  // Join with colon characters, after zero-padding all except the first item.
  const main = res.map((v, n) => n ? String(v).padStart(2, '0') : String(v)).join(':')
  const remainder = ms
  
  return `${main}${omitMs ? '' : `.${String(remainder).padStart(3, '0')}`}`
}

module.exports = {
  msToDuration,
  simpleGMTDateDisplay,
  getYearMonth,
  durationInMs
}
