const React = require('react')
const { useState, useEffect } = React
const { render } = require('react-dom')
const { columnsToRows } = require('./read')

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
            {row.map((cell) => {
              const missing = cell.parsed === undefined
              return (
                <td
                  key={cell.coords.x}
                  style={{ color: missing ? 'red' : 'black' }}
                >
                  {missing ? <input type="text" /> : cell.parsed}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

render(<App />, document.getElementById('main'))
