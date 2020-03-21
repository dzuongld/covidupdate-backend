const express = require('express')
const path = require('path')

const { processData } = require('./utils/program')
const { getNews } = require('./utils/rssfeed')

const app = express()
const port = process.env.PORT || 5000

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
    processData().then((data) => {
        res.send(data)
    })
})

app.get('/news', (req, res, next) => {
    getNews().then((data) => {
        res.send(data)
    })
})

app.use(express.static(path.join('public')))

app.get('*', (request, response) => {
    response.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.listen(port)
