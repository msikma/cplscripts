// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fs = require('fs').promises
const cheerio = require('cheerio')
const fetch = require('node-fetch')
const fetchCookie = require('fetch-cookie')
const {loadCookies} = require('./cookies')

const state = {
  cookies: {store: null, jar: null},
  fetch
}

/**
 * Loads the cookie file and stores it as a jar for use by fetch.
 */
const prepareCookies = async (cookiePath) => {
  try {
    const cookieStore = await loadCookies(cookiePath)
    const fetchWithCookie = fetchCookie(
      fetch,
      new fetchCookie.toughCookie.CookieJar(cookieStore, {
        allowSpecialUseDomain: true
      })
    )
    state.cookies.store = cookieStore
    state.fetch = fetchWithCookie
  }
  catch (err) {
    console.log(err)
    throw new Error(`an error occurred while loading the cookies: ${err.error}`)
  }
  return
}

/**
 * Fetches a URL and returns a parsed Cheerio object.
 */
async function fetchAndParse(url) {
  const res = await state.fetch(url)
  const html = await res.text()
  const $ = cheerio.load(html)
  return $
}

/**
 * Downloads a URL to a file.
 */
async function fetchDownload(url, target) {
  const res = await state.fetch(url)
  const buffer = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(target, buffer, null)
}

module.exports = {
  fetchAndParse,
  fetchDownload,
  prepareCookies
}
