'use strict'

const env = process.env.NODE_ENV || 'development'
const config = require('config')
const MAIN_SERVER = process.env.MAIN || config.get('main')
const PORT = process.env.PORT || config.get('port')
const blocked = require('./blocked')
const webshot = require('./webshot')
const request = require('request')

class QueryProcessor {

    constructor(engine, sender_id, query, query_id, max) {
        this.engine = engine
        this.sender_id = sender_id
        this.query = query
        this.query_id = query_id
        this.max = max
        this.successCount = 0
        this.linkProcessIndex = 0
        this.imageSendIndex = 0
        this.processQuery()

        return this
    }

    processQuery() {
        this.engine.search({
            q: this.query,
            max: 10
        }, (err, result) => {
            console.log('Search results')
            console.log(result)
            if (err) {
                this.finished(err)
                return
            }

            this.links = result.filter(function(link) {
                return !blocked.test(link) && (link ? (link.indexOf('http') > -1) : false)
            })

            if (this.links.length === 0) {
                this.finished()
                return
            }

            this.max = this.links.length > this.max ? this.max : this.links.length

            this.generateImageUrls()
        })
    }

    generateImageUrls() {
        let link = this.links[this.linkProcessIndex]
        console.log(`includeImages: ${this.includeImages()}`)
        webshot(link, this.sender_id, this.includeImages(), (err, image_urls) => {
            if (err) {
                next()
            } else {
                this.successCount += 1
                this.eachLinkResult(image_urls)
            }
        })
    }

    eachLinkResult(image_urls) {
        console.log(image_urls)
        if (image_urls.length > 0) {
            this.imageSendIndex = 0
            this.sendBatchImage(image_urls)
        } else
            this.nextLink()
    }

    nextLink() {
        if (this.successCount >= this.max || this.linkProcessIndex === this.links.length - 1) {
            this.finished()
        } else {
            this.linkProcessIndex += 1
            this.generateImageUrls()
        }
    }

    includeImages() {
        let image_keywords = [
            'photo',
            'image',
            'picture',
            'pics',
            'background',
            'wallpaper',
            'graphic',
        ]

        let imgReg = new RegExp(`(\\s)?(${image_keywords.join('|')})(\\s|s)?`)

        return imgReg.test(this.query.toLowerCase())
    }

    sendText(text) {
        request({
            baseUrl: MAIN_SERVER,
            uri: '/send-text',
            qs: {
                sender_id: this.sender_id,
                text,
                query_id: this.query_id
            }
        }, function(err) {
            if (err)
                console.log(err.toString())
            else
                console.log(`Successfully sent message: ${text}`)
        })
    }

    sendImage(image_url, callback) {
        request({
            baseUrl: MAIN_SERVER,
            uri: '/send-image',
            qs: {
                sender_id: this.sender_id,
                image_url,
                query_id: this.query_id
            }
        }, (err) => {
            if (err)
                console.log(err.toString())
            else
                console.log(`Successfully sent ${image_url}`)

            callback()

        })
    }

    sendBatchImage(image_urls) {

        this.sendImage(image_urls[this.imageSendIndex], () => {
            if (this.imageSendIndex < image_urls.length - 1) {
                this.imageSendIndex += 1
                setTimeout(() => {
                    this.sendBatchImage(image_urls)
                }, 1500)
            } else {
                this.imageSendIndex = 0
                this.nextLink()
            }
        })

    }

    finished() {
        setTimeout(() => {
            if (this.successCount > 0)
                this.sendText(`End of search results for "${this.query}".`)
            else
                this.sendText(`No results found for "${this.query}".`)
        }, 2500)
        this.doneCallback()
    }

    done(fn) {
        this.doneCallback = fn
    }

}


module.exports = QueryProcessor
    // let qp = new QueryProcessor(require('ddg-scraper'), 1234, 'query...', 2)
