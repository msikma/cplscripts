// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/** Returns a 'safe' version of a name that can be embedded in Mediawiki templates. */
const getSafeName = name => {
  // Replace square brackets with parentheses.
  return name.replace(/\[/g, '(').replace(/\]/g, ')')
}

/** Converts an object of key/value pairs into Mediawiki template arguments. */
const toMwKwArguments = obj => {
  return Object.entries(obj).map(([key, value]) => `|${key}=${value}`)
}

/** Converts an array into nameless Mediawiki template arguments. */
const toMwArguments = arr => {
  return arr.map(value => `|${value}`)
}

/** Returns a Mediawiki template invocation from a template name and arguments object/array. */
const toMwTemplate = (name, kwArgs = {}, args = [], oneLineLimit = 4) => {
  const join = arr => arr.length > oneLineLimit ? `\n${arr.join('\n')}` : arr.join('')
  const mwKwArgs = toMwKwArguments(kwArgs)
  const mwArgs = toMwArguments(args)
  return `{{${name}${join(mwKwArgs)}${join(mwArgs)}}}`
}

module.exports = {
  getSafeName,
  toMwArguments,
  toMwKwArguments,
  toMwTemplate
}
