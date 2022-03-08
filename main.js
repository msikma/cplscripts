// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const {isPlainObject, isArray} = require('./lib')
const {getVodsCPLS8} = require('./scripts/getvods')
const {generatePreseasonResults} = require('./scripts/genpre')

/** Prints output to the console. */
const out = (obj, destination) => {
  const objString = isPlainObject(obj) || isArray(obj) ? JSON.stringify(obj, null, 2) : obj

  if (destination == null) {
    return console.log(objString)
  }
  return fs.writeFile(destination, objString, 'utf8')
}

const main = async (args, {parser}) => {
  if (args.getVodsCPLS8) {
    return out(await getVodsCPLS8(), `${__dirname}/data/s8_vods.json`)
  }
  else if (args.genPre) {
    return out(await generatePreseasonResults(args.genPre))
  }
  else {
    parser.error('no action was selected')
  }
}

module.exports = main
