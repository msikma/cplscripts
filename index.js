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

parser.addArgument(['--cpls8-vods'], {help: 'Saves a JSON file of CPL S8 VODs from Youtube.', action: 'storeTrue', dest: 'getVodsCPLS8'})
parser.addArgument(['--gen-pre'], {help: 'Generates and prints pre-season results from a JSON file.', metavar: 'PATH', dest: 'genPre'})

require('./main')({...parser.parseArgs()}, {parser, pkgData, baseDir: pkgPath})
