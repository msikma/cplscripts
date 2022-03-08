// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const vm = require('vm')

// Provides 'window' by default to be more compatible with common <script> contents.
const DEFAULT_SANDBOX = {window: {}}

/**
 * Runs a script inside of a sandboxed VM to extract its data.
 */
const extractScriptResult = (scriptContent, sandbox = DEFAULT_SANDBOX) => {
  try {
    const script = new vm.Script(scriptContent)
    const context = new vm.createContext(sandbox)
    const returnValue = script.runInContext(context)
    return {
      success: true,
      error: null,
      returnValue,
      context
    }
  }
  catch (err) {
    return {
      success: false,
      error: err,
      returnValue: null,
      context: {}
    }
  }
}

module.exports = {
  extractScriptResult
}
