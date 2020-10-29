const express = require('express')
const fs = require('fs')
const multer = require('multer')
const {
  getGames,
  textractToColumns,
  viewGames,
  viewRows,
  columnsToRows
} = require('./read')
const { analyzeDocument } = require('./textract')

const server = express()
if (process.env.NODE_ENV !== 'production') {
  server.use(require('cors')())
}
const port = process.env.PORT || 1235

const api = express()
api.get('/static-game', (req, res) => {
  fs.readdir('./static', (err, data) => {
    if (err) {
      res.send(err)
      return
    }
    res.send(
      data
        .map((filename) => {
          const f = filename.split('.')[0]
          return `<a href="./static-game/${f}">${f}</a>`
        })
        .join('\n')
    )
  })
})

api.get('/static-game/:filename', (req, res) => {
  const { filename } = req.params
  fs.readFile(`./static/${filename}.json`, 'utf-8', (error, data) => {
    if (error) {
      res.status(500).send({ message: error.toString() })
      return
    }
    try {
      const fromFile = JSON.parse(data)
      const columns = textractToColumns(fromFile)
      const games = getGames(columns)
      if (req.headers['content-type'] === 'application/json') {
        res.json(games)
        return
      } else {
        if ('raw' in req.query) {
          res.send(viewRows(columnsToRows(columns)))
          return
        }
        res.send(viewGames(games))
        return
      }
    } catch (e) {
      res.status(500).send({ message: e.toString() })
      return
    }
  })
})

const upload = multer()
api.post('/game', upload.single('file'), async (req, res) => {
  let data
  try {
    data = await analyzeDocument(req.file.buffer)
    res.json(getGames(textractToColumns(data)))
  } catch (e) {
    fs.writeFileSync(
      `./static/fail-${Date.now()}.json`,
      JSON.stringify(data, null, 2)
    )
    console.error(e)
    res.status(500).send({ message: e.toString() })
  }
})

server.use('/api', api)
server.use(express.static('dist'))
server.listen(port, () => {
  console.log(`Listening http://localhost:${port}`)
})
