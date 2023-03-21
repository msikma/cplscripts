// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const chalk = require('chalk')
const {getPreseasonMatches} = require('./get-preseason-matches')

/**
 * Returns the preseason match report statistics.
 */
async function getPreseasonStatus(season, week, configPath) {
  const {groupMatchups, meta} = await getPreseasonMatches(season, week, configPath)

  console.log('Group status:\n')

  for (const matchup of groupMatchups) {
    if (matchup.isDecided) {
      console.log(`* ${chalk.whiteBright.bold(`Group ${matchup.group}:`)} ${chalk.green(`Group decided`)}`)
    }
    if (matchup.isInactive) {
      console.log(`* ${chalk.whiteBright.bold(`Group ${matchup.group}:`)} ${chalk.red(`Fully inactive`)}`)
    }
  }

  console.log('\nMissing replays:\n')

  let hasMissingReplays = false
  for (const matchup of groupMatchups) {
    if (matchup.missingReplays.length) {
      hasMissingReplays = true
      console.log(`${chalk.whiteBright.bold(`Group ${matchup.group}:`)} ${chalk.magenta(`Missing replays:`)}`)
      for (const missingReplay of matchup.missingReplays) {
        console.log(`${chalk.magenta(`* `)}${missingReplay}`)
      }
    }
  }
  if (!hasMissingReplays) {
    console.log('* None.')
  }

  console.log('\nMissing results (matches that have a replay but no winner set):\n')

  let hasMissingResults = false
  for (const matchup of groupMatchups) {
    if (matchup.missingInactivePlayerIDs.length) {
      hasMissingResults = true
      console.log(`${chalk.whiteBright.bold(`Group ${matchup.group}:`)} ${chalk.magenta(`Missing results:`)}`)
      for (const missingReplay of matchup.missingResults) {
        console.log(`${chalk.magenta(`* `)}${missingReplay}`)
      }
    }
  }
  if (!hasMissingResults) {
    console.log('* None.')
  }

  console.log(`\nMissing inactive players (matches that are a walkover but don't have an inactive player set):\n`)

  let hasMissingInactivePlayerIDs = false
  for (const matchup of groupMatchups) {
    if (matchup.missingInactivePlayerIDs.length) {
      hasMissingInactivePlayerIDs = true
      console.log(`${chalk.whiteBright.bold(`Group ${matchup.group}:`)} ${chalk.magenta(`Missing inactive player IDs:`)}`)
      for (const missingReplay of matchup.missingInactivePlayerIDs) {
        console.log(`${chalk.magenta(`* `)}${missingReplay}`)
      }
    }
  }
  if (!hasMissingInactivePlayerIDs) {
    console.log('* None.')
  }

  console.log(`\nAmount of matches submitted:\n`)
  console.log(chalk.green(`* ${meta.amountDecided} submitted`))
  console.log(chalk.red(`* ${meta.amountTotal - meta.amountDecided} not yet submitted`))
  console.log(chalk.magenta(`* ${((meta.amountDecided / meta.amountTotal) * 100).toFixed(1)}% submitted`))
  console.log('')
  
  return null
}

module.exports = {
  getPreseasonStatus
}
