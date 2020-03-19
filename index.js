const express = require('express')
const path = require('path')

const { getData, getDate } = require('./utils/program')
const fields = require('./utils/fields')

const app = express()
const port = process.env.PORT || 5000

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

        const key = record[fields.COUNTRY] + record[fields.STATE]
        data[key] = { ...record, NewCases: record[fields.CONFIRMED] }
    }

    for (const record of dataBeforeRecent) {
        const key = record[fields.COUNTRY] + record[fields.STATE]
        if (data[key]) {
            let newCases =
                parseInt(data[key][fields.CONFIRMED]) -
                parseInt(record[fields.CONFIRMED])
            if (newCases < 0) newCases = 0 // rare cases - prevent faulty data
            data[key] = {
                ...data[key],
                NewCases: newCases.toString()
            }
        }
    }

    return { covidData: data, date: dateRecent }
}

app.use((req, res, next) => {
    // fix CORS issues
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin,X-Requested-With, Content-Type, Accept, Authorization'
    )
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    next()
})

app.get('/data', (req, res, next) => {
    res.setTimeout(1000, function() {
        processData().then((data) => {
            res.send(data)
        })
    })
})

app.use(express.static(path.join('public')))

app.get('*', (request, response) => {
    response.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(port)
