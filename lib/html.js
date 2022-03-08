// cplscripts <https://github.com/msikma/cplscripts>
// © MIT license

/**
 * Finds a tag with a specific content.
 */
const findTagContent = ($, tag, contentHint) => {
  const contentHintList = Array.isArray(contentHint) ? contentHint : [contentHint]
  return $(tag)
    .filter((_, el) => contentHintList.map(hint => $(el).html().indexOf(hint) > -1).filter(n => n).length > 0)
    .map((_, el) => $(el).html())
    .get()[0]
}

module.exports = {
  findTagContent
}
