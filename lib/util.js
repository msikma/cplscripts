// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const util = require('util')

/** Logs an object completely. */
const logObject = obj => console.log(util.inspect(obj, {showHidden: false, depth: null, colors: true, maxArrayLength: Infinity}))

module.exports = {
  logObject
}
