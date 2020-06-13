const https = require('https')
const parse = require('csv-parse/lib/sync')
const moment = require('moment')
const fields = require('./fields')

const baseUrl =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports/'

const usUrl =
    'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports_us/'

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
            .get(baseUrl + date + '.csv', (res) => {
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

const getData = (date, url) => {
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
                            columns: true,
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

const extractData = (data, dataRecent, dataBeforeRecent, isUS = false) => {
    for (const record of dataRecent) {
        // exclude irrelevant records
        if (record[fields.CONFIRMED] == 0) continue

        const country = record[fields.COUNTRY]
        const state = record[fields.STATE]
        const key = country + state

        if ((!isUS && country === 'US') || (isUS && country !== 'US')) continue

        if (data[key]) {
            data[key][fields.CONFIRMED] +=
                parseInt(record[fields.CONFIRMED]) || 0
            data[key][fields.DEATHS] += parseInt(record[fields.DEATHS]) || 0
            data[key][fields.RECOVERED] +=
                parseInt(record[fields.RECOVERED]) || 0
            data[key][fields.ACTIVE] += parseInt(record[fields.ACTIVE]) || 0
            data[key][fields.NEW_CASES] = data[key][fields.CONFIRMED]
        } else {
            data[key] = { ...record }
            data[key][fields.CONFIRMED] =
                parseInt(record[fields.CONFIRMED]) || 0
            data[key][fields.DEATHS] = parseInt(record[fields.DEATHS]) || 0
            data[key][fields.RECOVERED] =
                parseInt(record[fields.RECOVERED]) || 0
            data[key][fields.ACTIVE] = parseInt(record[fields.ACTIVE]) || 0
            data[key][fields.NEW_CASES] = data[key][fields.CONFIRMED]
        }
    }

    for (const record of dataBeforeRecent) {
        const country = record[fields.COUNTRY]
        const state = record[fields.STATE]
        const key = country + state

        if ((!isUS && country === 'US') || (isUS && country !== 'US')) continue

        // increase in confirmed cases is new cases
        if (data[key]) {
            let newCases =
                parseInt(data[key][fields.NEW_CASES]) -
                parseInt(record[fields.CONFIRMED])
            if (newCases < 0) newCases = 0 // rare cases - prevent faulty data
            data[key][fields.NEW_CASES] = newCases
        }
    }
}

const processData = async () => {
    const dateRecent = await getDate()
    const dateBeforeRecent = await getDate(dateRecent)

    const dataRecent = await getData(dateRecent, baseUrl)
    const dataBeforeRecent = await getData(dateBeforeRecent, baseUrl)

    const dataRecentUS = await getData(dateRecent, usUrl)
    const dataBeforeRecentUS = await getData(dateBeforeRecent, usUrl)

    if (!dateRecent || !dateBeforeRecent || !dataRecent || !dataBeforeRecent) {
        return null
    }

    const data = {}
    extractData(data, dataRecent, dataBeforeRecent) // world
    extractData(data, dataRecentUS, dataBeforeRecentUS, true) // US

    return { covidData: data, date: dateRecent }
}

module.exports = { processData }
