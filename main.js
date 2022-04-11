// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const {isPlainObject, isArray} = require('./lib')
const {getVodsCPL} = require('./scripts/get-vods')
const {getStatsCPL} = require('./scripts/get-stats')
const {getASLMaps} = require('./scripts/get-asl-maps')
const {generatePreseasonResults} = require('./scripts/gen-pre')
const {generateRegularSeasonResults} = require('./scripts/gen-reg')
const {generateVodsList} = require('./scripts/gen-vods')

/** Prints output to the console. */
const out = (obj, destination) => {
  const objString = isPlainObject(obj) || isArray(obj) ? JSON.stringify(obj, null, 2) : obj

  if (destination == null) {
    return console.log(objString)
  }
  return fs.writeFile(destination, objString, 'utf8')
}

const main = async (args, {parser}) => {
  if (args.getVodsCPL) {
    return out(await getVodsCPL(args.getVodsCPL), path.resolve(path.join(__dirname, 'data', `s${args.getVodsCPL}_vods.json`)))
  }
  else if (args.getStatsCPL) {
    return out(await getStatsCPL(args.getStatsCPL))
  }
  else if (args.genPre) {
    return out(await generatePreseasonResults(args.genPre[0], ...args.genPre.slice(1, 3).map(n => Number(n))))
  }
  else if (args.genReg) {
    return out(await generateRegularSeasonResults(args.genReg[0], ...args.genReg.slice(1, 3).map(n => Number(n))))
  }
  else if (args.genVods) {
    return out(await generateVodsList(args.genVods[0]))
  }
  else if (args.getASLMaps) {
    return out(await getASLMaps(path.resolve(path.join(__dirname, 'data', 'maps'))))
  }
  else {
    parser.error('no action was selected')
  }
}

module.exports = main
