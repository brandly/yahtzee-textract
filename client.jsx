const React = require('react')
const { useState, useEffect } = React
const { render } = require('react-dom')
const { columnsToRows } = require('./read')
const { sum } = require('lodash')

const baseUrl =
  process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:1235/api'

const App = () => {
  const [games, setGames] = useState(null)

  useEffect(() => {
    fetch(`${baseUrl}/static-game`, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((res) => res.json())
      .then(setGames)
  }, [])
  if (games === null) return 'Loading...'
  const rows = columnsToRows(games)

  const gameForX = (x) => games.find((g) => g[0].coords.x === x)
  const setValue = (coords, value) => {
    const parsed = parseInt(value)
    setGames(
      games.map((g) =>
        g.map((c) =>
          c.coords.x === coords.x && c.coords.y === coords.y
            ? { ...c, user: Number.isNaN(parsed) ? value : parsed }
            : c
        )
      )
    )
  }

  return (
    <table>
      <thead>
        <tr>
          {rows[0].map(({ text }, index) => (
            <th key={index}>#{index + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.slice(1).map((row) => (
          <tr key={row[0].coords.y}>
            {row.map(({ coords, parsed, text, confidence, field, user }) => {
              const missing = parsed === undefined

              const game = gameForX(coords.x)
              const topSubtotal = getTopSubtotal(game)
              const topTotal =
                topSubtotal >= 63 ? 35 + topSubtotal : topSubtotal
              const lowerTotal = getLowerTotal(game)
              const computed = {
                topSubtotal: topSubtotal,
                '63Bonus': topSubtotal >= 63 ? 35 : '-',
                topTotal: topTotal,
                lowerTotal: lowerTotal,
                upperTotal: topTotal,
                grandTotal: topTotal + lowerTotal
              }

              if (field in computed) {
                return (
                  <td key={coords.x} style={{ fontWeight: 'bold' }}>
                    {computed[field]}
                  </td>
                )
              }

              return (
                <td
                  key={coords.x}
                  style={{ color: confidence < 70 ? 'red' : 'black' }}
                >
                  {missing ? (
                    <input
                      type="text"
                      value={user || ''}
                      onChange={(e) => {
                        setValue(coords, e.target.value)
                      }}
                    />
                  ) : (
                    parsed
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const getTopSubtotal = (game) =>
  sum(
    ['aces', 'twos', 'threes', 'fours', 'fives', 'sixes'].map((f) =>
      getCellValue(getFieldByName(game, f))
    )
  )

const getLowerTotal = (game) =>
  sum(
    [
      '3kind',
      '4kind',
      'fullHouse',
      'smallStraight',
      'largeStraight',
      'YAHTZEE',
      'Chance'
    ].map((f) => getCellValue(getFieldByName(game, f)))
  )
const getCellValue = (c) => {
  if (typeof c.parsed === 'number') return c.parsed
  if (typeof c.user === 'number') return c.user
  return undefined
}

const getFieldByName = (game, field) => game.find((c) => c.field === field)

render(<App />, document.getElementById('main'))
