// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/** Sleeps for a given number of ms. */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

module.exports = {
  sleep
}
