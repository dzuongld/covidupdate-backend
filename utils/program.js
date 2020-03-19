const https = require('https')
const parse = require('csv-parse/lib/sync')
const moment = require('moment')

const url =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/'

const getDate = (prevDate = null) => {
    return new Promise((resolve) => {
        let date = moment().format('MM-DD-YYYY')

        if (prevDate)
            date = moment(prevDate, 'MM-DD-YYYY')
                .subtract(1, 'days')
                .format('MM-DD-YYYY')

        const baseDate = '03-13-2020'
        if (date === baseDate) {
            console.log('Reached base date')
            resolve(baseDate)
        }

        https
            .get(url + date + '.csv', (res) => {
                if (res.statusCode === 200) {
                    resolve(date)
                } else if (res.statusCode === 404) {
                    resolve(getDate(date))
                } else {
                    resolve(null)
                }
            })
            .on('error', (e) => {
                resolve(null)
            })
    })
}

const getData = (date) => {
    return new Promise((resolve) => {
        https
            .get(url + date + '.csv', (res) => {
                if (res.statusCode !== 200) {
                    resolve(null)
                }

                res.setEncoding('utf8')
                let rawData = ''
                res.on('data', (chunk) => {
                    rawData += chunk
                })

                res.on('end', () => {
                    try {
                        const records = parse(rawData, {
                            columns: true
                        })

                        resolve(records)
                    } catch (e) {
                        resolve(null)
                    }
                })
            })
            .on('error', (e) => {
                resolve(null)
            })
    })
}

module.exports = { getData, getDate }
