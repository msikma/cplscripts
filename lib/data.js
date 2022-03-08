// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const path = require('path')
const fs = require('fs').promises

/**
 * Reads a JSON file and returns its parsed data.
 */
async function loadJSON(file) {
  try {
    return JSON.parse(await fs.readFile(path.resolve(file), 'utf8'))
  }
  catch (err) {
    console.error('could not load data from file:', file)
    process.exit(1)
  }
}

/** Returns an object composed of a given list of keys. */
const objPick = (obj, keys) => {
  const extantKeys = Object.keys(obj)
  const toInclude = extantKeys.filter(key => keys.includes(key))
  return Object.fromEntries(toInclude.map(key => [key, obj[key]]))
}

/** Removes null values from an object. */
const objRemoveNull = obj => {
  return Object.fromEntries(Object.entries(obj).filter(([_, value]) => value !== null))
}

/** Replaces null values in an object with a single space character. */
const objNullToSpace = obj => {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, value === null ? ' ' : value]))
}

/** Returns true for objects (such as {} or new Object()), false otherwise. */
const isPlainObject = obj => obj != null && typeof obj === 'object' && obj.constructor === Object

/** Checks whether something is an array. */
const isArray = Array.isArray

module.exports = {
  isArray,
  isPlainObject,
  loadJSON,
  objNullToSpace,
  objPick,
  objRemoveNull
}
