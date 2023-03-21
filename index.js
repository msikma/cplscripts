#!/usr/bin/env node

// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const os = require('os')
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
parser.addArgument(['--cpl-events'], {help: 'Saves a JSON file of CPL event VODs from Youtube.', action: 'storeTrue', dest: 'getEventVodsCPL'})
parser.addArgument(['--cpl-stats'], {help: 'Prints statistics for a given season.', metavar: 'SEASON', dest: 'getStatsCPL'})
parser.addArgument(['--cpl-ranking'], {help: 'Prints team ranking table for a given season.', metavar: 'SEASON', dest: 'getTeamsRankingCPL'})
parser.addArgument(['--cpl-reps'], {help: 'Prints replay information for a given season.', metavar: 'SEASON', dest: 'getRepStatsCPL'})
parser.addArgument(['--cpl-repstat'], {help: 'Prints replay analysis for a given season.', metavar: 'SEASON', dest: 'getRepAnalysisCPL'})
parser.addArgument(['--cpl-players'], {help: 'Prints list of all active players for a given season.', metavar: 'SEASON', dest: 'getPlayersListCPL'})
parser.addArgument(['--cpl-pre-status'], {help: 'Prints preseason match report status for all groups.', metavar: ['SEASON', 'WEEK'], nargs: 2, dest: 'getPreseasonStatusCPL'})
parser.addArgument(['--cpl-pre-matches'], {help: 'Prints preseason matches for all groups.', metavar: ['SEASON', 'WEEK'], nargs: 2, dest: 'getPreseasonMatchesCPL'})
parser.addArgument(['--cpl-scoreboard'], {help: 'Generates a scoreboard.', metavar: ['SEASON', 'WEEK', 'GROUP', 'TIER'], nargs: 4, dest: 'genScoreboard'})
parser.addArgument(['--scrape-910map'], {help: 'Downloads maps from the ASL official map site.', action: 'storeTrue', dest: 'getASLMaps'})
parser.addArgument(['--mw-gen-pre'], {help: 'Generates and prints pre-season results from a JSON file, and a given season and week.', metavar: ['PATH', 'SEASON', 'WEEK'], dest: 'genPre', nargs: 3})
parser.addArgument(['--mw-gen-reg'], {help: 'Generates and prints regular season results from a JSON file, and a given season and week.', metavar: ['PATH', 'SEASON', 'WEEK'], dest: 'genReg', nargs: 3})
parser.addArgument(['--mw-gen-vods'], {help: 'Generates and prints a list of all VODs.', metavar: 'SEASON', dest: 'genVods'})
parser.addArgument(['--ds-gen-vods'], {help: 'Generates and prints a list of all VODs for Discord.', metavar: 'SEASON', dest: 'genVodsDiscord'})

parser.addArgument(['--no-cache'], {help: 'Disables using relevant cache.', action: 'storeTrue', dest: 'noCache'})

parser.addArgument(['--only-uncast'], {help: 'For --cpl-reps, displays only uncast groups.', action: 'storeTrue', dest: 'onlyUncast'})
parser.addArgument(['--output-tables'], {help: 'For --cpl-reps, output tables for Google Sheets.', action: 'storeTrue', dest: 'outTables'})
parser.addArgument(['--output-html'], {help: 'Outputs the result as an HTML file.', action: 'storeTrue', dest: 'outHTML'})
parser.addArgument(['--output-csv'], {help: 'Outputs the result as a CSV file.', action: 'storeTrue', dest: 'outCSV'})
parser.addArgument(['--output-terminal'], {help: 'Outputs the result as a terminal table.', action: 'storeTrue', dest: 'outTerminal'})
parser.addArgument(['--config-path'], {help: 'Path to the config directory.', defaultValue: `${os.homedir()}/.config/cplscripts`, dest: 'configPath'})

require('./main')({...parser.parseArgs()}, {parser, pkgData, baseDir: pkgPath})
