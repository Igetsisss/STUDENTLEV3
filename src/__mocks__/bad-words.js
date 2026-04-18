// Minimal stub so Jest doesn't have to deal with bad-words' ESM package.
function Filter() {}
Filter.prototype.addWords = function () {}
Filter.prototype.clean = function (text) {
  return text
}
Filter.prototype.isProfane = function () {
  return false
}

module.exports = Filter
module.exports.default = Filter
