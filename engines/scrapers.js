'use strict'

const ENGINES = require('./list')
const request = require('request')
const cheerio = require('cheerio')
let current = 0

class Engine {
  static search (query, cb) {

    if (current >= ENGINES.length) {
      current = 0
    }

    let engine = ENGINES[current]

    current += 1

    console.log(engine)
    console.log(query)

    request({
      baseUrl: engine,
      uri: '/',
      qs: {q: query.q},
      json: true
    }, (error, response, urls) => {
      let isArray = (Object.prototype.toString.call(urls) === '[object Array]')
      let validResult = isArray ? urls.length > 0 : false
      if (!error &&  validResult) {
        cb(null, urls)
      } else {
        Engine.search(query, cb)
      }
    })
  }
}

module.exports = Engine