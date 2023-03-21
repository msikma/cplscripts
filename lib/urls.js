// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/** Root base URL. */
const urlBase = urlpath => `https://cplbw.com/${urlpath}`
/** Base URL for the web app. */
const urlBaseApp = urlpath => `${urlBase('cpl/')}${urlpath}`

/** URL for the preseason status page. */
const urlCPLPreseasonOverview = season => urlBaseApp(`view_matches/${season}/preseason/`)

/** URL for a preseason group reporting page. */
const urlCPLPreseasonReporting = (season, week, group) => urlBaseApp(`view_matches/${season}/preseason/report_results/${week}/${group}/`)

/** Converts a URL to absolute if it isn't already. */
const urlAbsolute = urlpath => urlpath.startsWith('http') ? urlpath : urlBase(urlpath.slice(1))

module.exports = {
  urlBase,
  urlBaseApp,
  urlAbsolute,
  urlCPLPreseasonOverview,
  urlCPLPreseasonReporting
}
