const https = require('https')
const parseString = require('xml2js').parseString

const getNews = () => {
    return new Promise((resolve) => {
        https
            .get('https://www.health.gov.au/news/rss.xml', (res) => {
                // console.log('statusCode:', res.statusCode)

                if (res.statusCode !== 200) resolve(null)

                res.setEncoding('utf8')
                let rawData = ''
                res.on('data', (chunk) => {
                    rawData += chunk
                })

                res.on('end', () => {
                    try {
                        // console.log(rawData)

                        parseString(rawData, function(err, result) {
                            // console.log(result.rss.channel[0].item[0])
                            resolve(result.rss.channel[0].item)
                        })
                    } catch (e) {
                        console.error('Error:', e.message)
                        resolve(null)
                    }
                })
            })
            .on('error', (e) => {
                console.error(e)
                resolve(null)
            })
    })
}

module.exports = { getNews }
