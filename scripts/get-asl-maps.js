// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const chalk = require('chalk')
const path = require('path')
const mkdirp = require('mkdirp')
const fs = require('fs').promises
const filenamify = require('filenamify')
const {arrUniq} = require('../lib/data')
const {sleep} = require('../lib/misc')
const {getPlaylistVideos} = require('../lib/youtube')
const {fetchAndParse, fetchDownload} = require('../lib/scrape')

/** URL on which we can find the ASL maps. */
const aslMapsBase = `https://910map.tistory.com`

/** Logs a category being scraped. */
function logCategory(title) {
  console.log(`${chalk.red(`Category: `)}${chalk.yellow(title)}`)
}

/** Logs a subcategory being scraped. */
function logSubCategory(name) {
  console.log(`  ${chalk.magenta(name)}`)
}

/** Logs a map being scraped. */
function logMap(title, filename, filesize) {
  console.log(`    ${chalk.blue(title)} - ${chalk.cyan(filename)}, ${chalk.gray(filesize)}`)
}

/** Logs a map being downloaded. */
function logMapDownload(basedir) {
  console.log(`    ${chalk.red(`Downloaded to:`)} ${chalk.cyanBright(basedir)}`)
}

/** Ensures that a URI is absolute. */
function ensureAbsoluteURI(url, base = aslMapsBase) {
  if (url.startsWith('/')) {
    return `${base}${url}`
  }
  return url
}

/**
 * Maps a list of subcategories.
 */
const mapSubCategories = $ => item => {
  const $item = $(item)
  return {
    name: $item.text().trim(),
    url: ensureAbsoluteURI($item.attr('href').trim())
  }
}

/**
 * Returns all links from the pagination section at the bottom of a page.
 */
function getPages($) {
  const $pages = $('#container #content .pagination > a')
  const validPages = $pages.get()
    .filter(page => {
      const href = $(page).attr('href')?.trim()
      return href && href.includes('page=')
    })
    .map(page => {
      return ensureAbsoluteURI($(page).attr('href'))
    })
  return arrUniq(validPages)
}

/**
 * Fetches and parses additional pages (in case of pagination).
 */
async function fetchOtherPages(pages) {
  const otherPages = []
  for (const page of pages) {
    const $ = await fetchAndParse(page)
    otherPages.push($)
  }
  return otherPages
}

/**
 * Returns all posts in a category.
 * 
 * Fetches additional pages if the category has pagination.
 */
async function getCategoryPosts($main, pages = []) {
  const otherPages = await fetchOtherPages(pages)
  const pageObjects = [$main, ...otherPages]
  const posts = []
  for (const $ of pageObjects) {
    const $pagePosts = $('#content .post-item a')
    posts.push(...$pagePosts.get().map(a => {
      const $a = $(a)
      const url = ensureAbsoluteURI($a.attr('href').trim())
      const title = $('.title', $a).text().trim()
      return {
        url,
        title
      }
    }))
  }
  return posts
}

/**
 * Returns the map posts for a given category.
 */
async function getCategoryMapPosts(url) {
  const $ = await fetchAndParse(url)
  const pages = getPages($)
  const posts = await getCategoryPosts($, pages)
  return posts
}

/**
 * Splits a filename up into basename and extension.
 */
function splitExtension(filename) {
  const split = filename.split('.')
  return [split.slice(0, -1).join('.'), split.slice(-1)[0]]
}

/**
 * Replaces one filename's extension with another filename's extension.
 */
function replaceExtension(fileA, fileB) {
  if (!fileB) return null
  const [fnA, extA] = splitExtension(fileA)
  const [fnB, extB] = splitExtension(fileB)
  return [fnA, extB].join('.')
}

/**
 * Extracts information about a given map from a map page.
 */
function extractMapData($) {
  const $content = $('#content')
  const $img = $('figure.imageblock > span', $content)
  const mainImage = $img.attr('data-url')?.trim()
  const $file  = $('figure.fileblock > a', $content)
  const filename = $('.filename .name', $file).text().trim()
  const filesize = $('.size', $file).text().trim()
  const fileURL = $file.attr('href').trim()
  return {
    imageURL: mainImage,
    image: replaceExtension(filename, mainImage),
    filename,
    filesize,
    fileURL
  }
}

/**
 * Returns all maps from a given array of map posts.
 */
async function getMaps(mapPosts) {
  const maps = []
  for (const mapPost of mapPosts) {
    const {title, url} = mapPost
    await sleep(2000)
    const $ = await fetchAndParse(url)
    const mapData = extractMapData($)
    logMap(title, mapData.filename, mapData.filesize)
    maps.push({...mapData, title})
  }
  return maps
}

/**
 * Downloads a given list of maps, after extracting their URLs and information from the site.
 */
async function downloadMaps(nameCategory, nameSubCategory, hasSubCategories, maps, basedir) {
  const base = path.join(...(hasSubCategories ? [nameCategory, nameSubCategory] : [nameCategory]))
  await mkdirp(path.join(basedir, base))
  for (const map of maps) {
    const mapPath = path.join(base, filenamify(map.filename))
    await fetchDownload(map.fileURL, path.join(basedir, mapPath))
    await sleep(1000)
    if (map.imageURL) {
      const imgPath = path.join(base, filenamify(map.image))
      await fetchDownload(map.imageURL, path.join(basedir, imgPath))
      await sleep(1000)
    }
    logMapDownload(mapPath)
  }
}

/**
 * Returns all maps for a given category.
 */
async function getAllCategoryMaps(categories, basedir) {
  const newCategories = []
  for (const category of categories) {
    const {title, items, hasSubCategories} = category
    const newItems = []
    logCategory(title)
    for (const item of items) {
      logSubCategory(item.name)
      const mapPosts = await getCategoryMapPosts(item.url)
      const maps = await getMaps(mapPosts)
      await downloadMaps(title, item.name, hasSubCategories, maps, basedir)
      newItems.push({...item, maps})
      await sleep(1000)
    }
    newCategories.push({
      ...category,
      items: newItems
    })
  }
  return newCategories
}

/**
 * Returns all categories.
 */
function getCategories($) {
  const subCategoryMap = mapSubCategories($)
  const blocks = $('#container #aside .category .category_list > li').get().map(block => {
    const $subCategories = $('.sub_category_list', block)
    const $mainItem = $('.link_item', block)
    const title = $mainItem.text().trim()
    const items = $subCategories.length === 0
      ? $mainItem.get().map(subCategoryMap)
      : $('> li .link_sub_item', $subCategories).get().map(subCategoryMap)
    return {
      title,
      hasSubCategories: $subCategories.length !== 0,
      items
    }
  })
  return blocks
}

/**
 * Returns the total amount of maps found in the content of map-data.json.
 */
function getMapCount(data) {
  const categoryMapCount = data.flatMap(category => category.items.flatMap(subcategory => subcategory.maps.length))
  const mapCount = categoryMapCount.reduce((total, amount) => total + amount, 0)
  return mapCount
}

/**
 * Parses the ASL official map site and downloads all content to a local directory.
 */
async function getASLMaps(basedir) {
  await mkdirp(basedir)
  const $ = await fetchAndParse(aslMapsBase)
  const categories = getCategories($)
  const data = await getAllCategoryMaps(categories, basedir)
  await fs.writeFile(path.join(basedir, 'map-data.json'), JSON.stringify(data, null, 2), 'utf8')
  const mapsDownloaded = getMapCount(data)
  return `Downloaded ${mapsDownloaded} maps: ${basedir}`
}

module.exports = {
  getASLMaps
}
