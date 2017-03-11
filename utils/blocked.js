let blocked = [
  'wow.com',
  'when.com',
  'youtube.com',
  'about.com',
  'symptomfind.com',
  'alhea.com',
  'netfind.com',
  'classifiedads.com',
  'webcrawler.com',
  'r.search.yahoo.com',
]

let reg = blocked.join('|')

module.exports = new RegExp(reg)