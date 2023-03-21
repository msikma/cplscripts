// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const path = require('path')
const fg = require('fast-glob')
const {pathCPLEvents, pathCPLEvent} = require('./paths')

/**
 * Returns the data for an event.
 * 
 * Every event needs to have at least an 'info.json' file.
 */
const getEventData = async (eventName) => {
  const base = pathCPLEvent(eventName)
  const info = await fs.readFile(path.join(base, 'info.json'), 'utf8')
  return JSON.parse(info)
}

/**
 * Returns all events and their basic information.
 */
const getAllEvents = async () => {
  const base = pathCPLEvents()
  const eventsList = await fg('*', {onlyDirectories: true, deep: 1, cwd: base})
  const events = {}
  for (const event of eventsList) {
    const data = await getEventData(event)
    events[event] = {name: event, ...data}
  }
  return events
}

module.exports = {
  getAllEvents
}
