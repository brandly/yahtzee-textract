const express = require('express')
const fs = require('fs')
const multer = require('multer')
const { getGames, textractToColumns, viewGames } = require('./read')
const { analyzeDocument } = require('./textract')

const server = express()
if (process.env.NODE_ENV !== 'production') {
  server.use(require('cors')())
}
const port = process.env.PORT || 1235

const api = express()
api.get('/static-game', (req, res) => {
  fs.readFile('./output-new.json', 'utf-8', (error, data) => {
    if (error) {
      res.status(500).send(error.toString())
      return
    }
    const fromFile = JSON.parse(data)
    const columns = textractToColumns(fromFile)
    const games = getGames(columns)
    if (req.headers['content-type'] === 'application/json') {
      res.json(games)
      return
    } else {
      res.send(viewGames(games))
      return
    }
  })
})

const upload = multer()
api.post('/game', upload.single('file'), async (req, res) => {
  try {
    const data = await analyzeDocument(req.file.buffer)
    res.json(getGames(textractToColumns(data)))
  } catch (e) {
    console.error(e)
    res.status(500).send(e.toString())
  }
})

server.use('/api', api)
server.use(express.static('dist'))
server.listen(port, () => {
  console.log(`Listening http://localhost:${port}`)
})
