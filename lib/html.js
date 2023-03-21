// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

const sortBy = require('lodash.sortby')

/**
 * Finds a tag with a specific content.
 */
const findTagContent = ($, tag, contentHint) => {
  const contentHintList = Array.isArray(contentHint) ? contentHint : [contentHint]
  const tags = $(tag)
    .filter((_, el) => contentHintList.map(hint => $(el).html().indexOf(hint) > -1).filter(n => n).length > 0)
    .map((_, el) => $(el).html())
    .get()
  
  // If we have multiple results, return the longest one.
  const largestTags = sortBy(tags.map(tagContent => [tagContent.length, tagContent]), [0]).reverse()
  return largestTags[0][1]
}

module.exports = {
  findTagContent
}
