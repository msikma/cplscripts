#!/usr/bin/env node

// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const {makeArgParser} = require('dada-cli-tools/argparse')
const {ensurePeriod} = require('dada-cli-tools/util/text')
const {readJSON} = require('dada-cli-tools/util/fs')

const pkgPath = path.resolve(__dirname)
const pkgData = readJSON(`${pkgPath}/package.json`, false)

const parser = makeArgParser({
  version: pkgData.version,
  addHelp: true,
  description: ensurePeriod(pkgData.description)
})

parser.addArgument(['--cpl-vods'], {help: 'Saves a JSON file of CPL VODs from Youtube.', metavar: 'SEASON', dest: 'getVodsCPL'})
parser.addArgument(['--cpl-stats'], {help: 'Prints statistics for a given CPL season.', metavar: 'SEASON', dest: 'getStatsCPL'})
parser.addArgument(['--cpl-reps'], {help: 'Prints replay information for a given CPL season.', metavar: 'SEASON', dest: 'getRepStatsCPL'})
parser.addArgument(['--scrape-910map'], {help: 'Downloads maps from the ASL official map site.', action: 'storeTrue', dest: 'getASLMaps'})
parser.addArgument(['--mw-gen-pre'], {help: 'Generates and prints pre-season results from a JSON file, and a given season and week.', metavar: ['PATH', 'SEASON', 'WEEK'], dest: 'genPre', nargs: 3})
parser.addArgument(['--mw-gen-reg'], {help: 'Generates and prints regular season results from a JSON file, and a given season and week.', metavar: ['PATH', 'SEASON', 'WEEK'], dest: 'genReg', nargs: 3})
parser.addArgument(['--mw-gen-vods'], {help: 'Generates and prints a list of all VODs.', metavar: 'SEASON', dest: 'genVods'})

require('./main')({...parser.parseArgs()}, {parser, pkgData, baseDir: pkgPath})
