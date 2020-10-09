const express = require('express')
const fs = require('fs')
const { getGames, textractToColumns, viewGames } = require('./read')

const server = express()
const port = 1234

const api = express()
api.get('/static-game', (req, res) => {
  fs.readFile('./output-new.json', 'utf-8', (error, data) => {
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

server.use('/api', api)
server.listen(port, () => {
  console.log(`Listening http://localhost:${port}`)
})
