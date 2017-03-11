'use strict'

let links = [
    'http://localhost:5000',
    'https://www.classifiedads.com/search.php?cid=0&lid=gx628817&lname=Earth&keywords=cable+internet',
]

module.exports = {
    search: (query, cb) => {
      setTimeout(() => {
        cb(null, links)
      }, 1000)
    }
}
