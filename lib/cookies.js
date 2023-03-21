// dada-cli-tools - Libraries for making CLI programs <https://github.com/msikma/dada-cli-tools>
// © MIT license

const {existsSync} = require('fs')
const FileCookieStore = require('file-cookie-store')

/**
 * Loads cookies from a specified cookies.txt file into a jar object.
 */
const loadCookies = cookiePath => (
  new Promise(async (resolve, reject) => {
    try {
      if (!existsSync(cookiePath)) {
        return reject({error: new Error(`Could not find cookies file: ${cookiePath}`)})
      }
      // Cookies must be in Netscape cookie file format.
      const cookieStore = new FileCookieStore(cookiePath, {no_file_error: true})
      return resolve(cookieStore)
    }
    catch (error) {
      return reject({error})
    }
  })
)

module.exports = {
  loadCookies
}
