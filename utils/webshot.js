const config = require('config')
const ENV = process.env.NODE_ENV || 'development'
const SERVER = process.env.SERVER || config.get('server')
const PORT = process.env.PORT || config.get('port')
const SERVER_URL = (ENV === 'development') ? `${SERVER}:${PORT}` : SERVER
const phantom = require('phantom')
const path = require('path')

const shotSize = {
    width: 1024,
    height: 1024 * (3 / 2) // aspec ratio 3:2
}

const viewportSize = {
    top: 0,
    left: 0,
    width: 1024,
    height: 768
}

const format = 'jpg'
const javascriptEnabled = false
const delay = 2000

function preparePhantom(done, errCb) {

    var sitepage = null;
    var phInstance = null;

    phantom.create()
        .then(instance => {
            phInstance = instance
            return instance.createPage()
        })
        .then(page => {
            sitepage = page
            done(phInstance, page)
        })
        .catch(function(err) {
            errCb(err, phInstance, sitepage)
        })
}


function processUrl(url, filePrefix, includeImages, doneCb) {

    var image_urls = []

    preparePhantom(function(phInstance, page) {

        function grabScreen(dims) {

            var numH = Math.floor(dims.height / shotSize.height)

            shot(0)

            function shot(index) {

                var fileName = `${filePrefix}-${(new Date()).getTime()}.${format}`
                fileName = path.join(__dirname, '../public', fileName)
                var top = index * shotSize.height
                var bottom = index === numH ? dims.height % shotSize.height : shotSize.height + 20

                page.property('clipRect', {
                        top: top,
                        left: 0,
                        width: shotSize.width,
                        height: bottom
                    })
                    .then(() => {
                        page.render(fileName)
                            .then(function() {
                                console.log(`File saved ${fileName}`)
                                image_urls.push(`${SERVER_URL}/${path.basename(fileName)}`)
                                if (numH > 0 ? index === numH - 1 : index === numH) {
                                    // done take webshots
                                    if (includeImages) {
                                        // retrive image urls as well
                                        setTimeout(function() {

                                            page.evaluate(function() {
                                                    var list,
                                                        max = 10,
                                                        images = [],
                                                        index;

                                                    list = document.getElementsByTagName("img");
                                                    for (index = 0; index < list.length && images.length < max; ++index) {
                                                        var img = list[index]
                                                        var src = img.getAttribute('src')
                                                        if (src && src.indexOf('http') > -1)
                                                            images.push(src)
                                                    }

                                                    return images
                                                })
                                                .then((urls) => {
                                                    image_urls = image_urls.concat(urls)
                                                    doneCb(null, image_urls)
                                                    phInstance.exit()
                                                })
                                                .catch(function() {
                                                    doneCb(null, image_urls)
                                                    phInstance.exit()
                                                })
                                        }, delay)
                                        return
                                    }

                                    image_urls = image_urls.concat(urls)
                                    doneCb(null, image_urls)
                                    phInstance.exit()
                                    return

                                }
                                shot(index + 1)
                            })
                            .catch(function() {
                                doneCb(null, image_urls)
                                phInstance.exit()
                            })
                    })
                    .catch(function() {
                        doneCb(null, image_urls)
                        phInstance.exit()
                    })

            } // end shot()

        }


        console.log(`Openning URL: ${url}`)
        page.open(url).then(function() {
                console.log(`Done loading page: ${url}`)

                setTimeout(function() {

                    page.property('viewportSize', viewportSize)
                        .then(() => {

                            page.evaluate(function() {
                                    if (document) {
                                        if (document.head) {
                                            // set default background to white
                                            var style = document.createElement('style');
                                            var text = document.createTextNode('body { background: #fff }');
                                            style.setAttribute('type', 'text/css');
                                            style.appendChild(text);

                                            document.head.insertBefore(style, document.head.firstChild);
                                        }
                                    }

                                    return JSON.stringify({
                                        width: Math.max(
                                            document.body.offsetWidth,
                                            document.body.scrollWidth,
                                            document.documentElement.clientWidth,
                                            document.documentElement.scrollWidth,
                                            document.documentElement.offsetWidth
                                        ),
                                        height: Math.max(
                                            document.body.offsetHeight,
                                            document.body.scrollHeight,
                                            document.documentElement.clientHeight,
                                            document.documentElement.scrollHeight,
                                            document.documentElement.offsetHeight
                                        )
                                    })
                                })
                                .then((dimension) => {

                                    dimension = JSON.parse(dimension)

                                    page.setting('javascriptEnabled', javascriptEnabled)
                                        .then(function() {
                                            grabScreen(dimension)
                                        })
                                        .catch(function() {
                                            grabScreen(dimension)
                                        })


                                })
                                .catch(function() {
                                    grabScreen(shotSize)
                                })


                        })
                        .catch(function() {
                            grabScreen(shotSize)
                        })
                }, delay)

            })
            .catch(function(err) {
                phInstance.exit()
                doneCb(err)
            })

    }, function(err, phInstance, page) {
        phInstance.exit()
        doneCb(err)

    })

}

module.exports = processUrl

// processUrl('https://github.com/amir20/phantomjs-node', 123456, function (err, results) {
//   console.log(results)
// })
