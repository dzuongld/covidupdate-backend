const https = require('https')
const parse = require('csv-parse/lib/sync')
const moment = require('moment')
const fields = require('./fields')

const url =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/'

const getDate = (prevDate = null) => {
    return new Promise((resolve) => {
        let date = moment().format('MM-DD-YYYY')

        if (prevDate)
            date = moment(prevDate, 'MM-DD-YYYY')
                .subtract(1, 'days')
                .format('MM-DD-YYYY')

        const baseDate = '03-23-2020'
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

const processData = async () => {
    const dateRecent = await getDate()
    const dateBeforeRecent = await getDate(dateRecent)

    const dataRecent = await getData(dateRecent)
    const dataBeforeRecent = await getData(dateBeforeRecent)

    if (!dateRecent || !dateBeforeRecent || !dataRecent || !dataBeforeRecent) {
        return null
    }

    const data = {}
    for (const record of dataRecent) {
        // exclude irrelevant records
        if (record[fields.CONFIRMED] == 0) continue

        const country = record[fields.COUNTRY]
        const state = record[fields.STATE]
        const key = country + state

        if (data[key]) {
            data[key][fields.CONFIRMED] += parseInt(record[fields.CONFIRMED])
            data[key][fields.DEATHS] += parseInt(record[fields.DEATHS])
            data[key][fields.RECOVERED] += parseInt(record[fields.RECOVERED])
            data[key][fields.NEW_CASES] = data[key][fields.CONFIRMED]
        } else {
            data[key] = { ...record }
            data[key][fields.CONFIRMED] = parseInt(record[fields.CONFIRMED])
            data[key][fields.DEATHS] = parseInt(record[fields.DEATHS])
            data[key][fields.RECOVERED] = parseInt(record[fields.RECOVERED])
            data[key][fields.NEW_CASES] = data[key][fields.CONFIRMED]
        }
    }

    for (const record of dataBeforeRecent) {
        const country = record[fields.COUNTRY]
        const state = record[fields.STATE]
        const key = country + state
        // increase in confirmed cases is new cases
        if (data[key]) {
            let newCases =
                parseInt(data[key][fields.NEW_CASES]) -
                parseInt(record[fields.CONFIRMED])
            if (newCases < 0) newCases = 0 // rare cases - prevent faulty data
            data[key][fields.NEW_CASES] = newCases
        }
    }

    return { covidData: data, date: dateRecent }
}

module.exports = { processData }
