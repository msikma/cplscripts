// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const fetch = require('node-fetch')
const {getPlaylistVideos} = require('../lib/youtube')

async function getVods(id) {
  const url = `https://www.youtube.com/playlist?list=${id}`
  const res = await fetch(url)
  const html = await res.text()
  const data = getPlaylistVideos(html)
  return data
}

function getVodsCPLS8() {
  return getVods('PLo_7E8VFQPBNRRu7B4CzCwsgZFUMHeg8F')
}

module.exports = {
  getVodsCPLS8
}
