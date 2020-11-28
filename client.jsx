const React = require('react')
const { useState, useEffect } = React
const { render } = require('react-dom')
const { columnsToRows } = require('./read')
const { sum } = require('lodash')
const downscale = require('downscale')

const baseUrl =
  process.env.NODE_ENV === 'production'
    ? '/api'
    : `http://${document.location.hostname}:1235/api`

const App = () => {
  const [games, setGames] = useState(null)
  const [yToField, setYToField] = useState({})
  const [img, setImg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewStatic, setViewStatic] = useState(false)

  if (games === null)
    return (
      <>
        <input
          disabled={loading}
          type="file"
          accept="image/*"
          onChange={(e) => {
            setLoading(true)
            downscale(e.target.files[0], 600, 900)
              .then((dataUri) => {
                setImg(dataUri)
                const formData = new FormData()
                formData.append('name', name)
                formData.append('file', dataURItoBlob(dataUri))

                return fetch(`${baseUrl}/game`, {
                  method: 'post',
                  body: formData
                })
              })
              .then((res) => {
                if (res.ok) return res.json()

                return res.json().then(({ message }) => {
                  throw new Error(message)
                })
              })
              .then(({ games, yToField }) => {
                setGames(games)
                setYToField(yToField)
              })
              .catch((err) => alert(err.toString()))
              .finally(() => setLoading(false))
          }}
        />
        {process.env.NODE_ENV !== 'production' && (
          <button
            onClick={() => {
              setViewStatic(true)
            }}
          >
            view static
          </button>
        )}
        {loading && <p>Loading...</p>}
        {viewStatic && (
          <StaticList
            onSelect={({ games, yToField }) => {
              setGames(games)
              setYToField(yToField)
            }}
          />
        )}
        {img && <img src={img} />}
      </>
    )
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
          <th />
          {rows[0].map((_, index) => (
            <th key={index}>#{index + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row[0].coords.y}>
            <td>{yToField[row[0].coords.y]}</td>
            {row.map(({ coords, parsed, text, confidence, field, user }) => {
              const missing = parsed === undefined

              const game = gameForX(coords.x)
              const topSubtotal = getTopSubtotal(game)
              const topTotal =
                topSubtotal >= 63 ? 35 + topSubtotal : topSubtotal
              const lowerTotal = getLowerTotal(game)
              const computed = {
                'Top Subtotal': topSubtotal,
                '63 Bonus': topSubtotal >= 63 ? 35 : '-',
                'Top Total': topTotal,
                'Lower Total': lowerTotal,
                'Upper Total': topTotal,
                'Grand Total': topTotal + lowerTotal
              }

              if (field in computed) {
                const value = Number.isNaN(computed[field])
                  ? '--'
                  : computed[field]
                return (
                  <td
                    key={coords.x}
                    style={{ fontWeight: 'bold', padding: '2px 4px' }}
                  >
                    {value}
                  </td>
                )
              }

              let value = ''
              if (typeof user !== 'undefined') {
                value = user
              } else if (typeof parsed === 'number') {
                value = parsed
              }

              const { step, max } = (() => {
                switch (field) {
                  case 'Aces':
                    return { step: 1, max: 5 }
                  case 'Twos':
                    return { step: 2, max: 10 }
                  case 'Threes':
                    return { step: 3, max: 15 }
                  case 'Fours':
                    return { step: 4, max: 20 }
                  case 'Fives':
                    return { step: 5, max: 25 }
                  case 'Sixes':
                    return { step: 6, max: 30 }
                  case '3 of a Kind':
                    return { step: 1, max: 30 }
                  case '4 of a Kind':
                    return { step: 1, max: 30 }
                  case 'Full House':
                    return { step: 25, max: 25 }
                  case 'Small Straight':
                    return { step: 30, max: 30 }
                  case 'Large Straight':
                    return { step: 40, max: 40 }
                  case 'YAHTZEE':
                    return { step: 50, max: 50 }
                  case 'Chance':
                    return { step: 1, max: 30 }
                  default:
                    return { step: 1 }
                }
              })()

              return (
                <td key={coords.x}>
                  <input
                    tabIndex={coords.x * 100 + coords.y}
                    type="number"
                    style={{
                      border: '1px solid black',
                      borderColor:
                        confidence < 70 && !missing ? '#c33939' : 'transparent'
                    }}
                    value={value}
                    onChange={(e) => {
                      setValue(coords, e.target.value)
                    }}
                    step={step}
                    min={0}
                    max={max}
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const StaticList = ({ onSelect }) => {
  const [list, setList] = useState([])
  useEffect(() => {
    fetch(`${baseUrl}/static-game`, {
      headers: {
        Accept: 'application/json'
      }
    })
      .then((res) => res.json())
      .then(setList)
  }, [])
  return (
    <ul>
      {list.map((file) => (
        <li
          key={file}
          onClick={() => {
            fetch(`${baseUrl}/static-game/${file}`, {
              headers: {
                Accept: 'application/json'
              }
            })
              .then((res) => res.json())
              .then(onSelect)
          }}
        >
          {file}
        </li>
      ))}
    </ul>
  )
}

const getTopSubtotal = (game) =>
  sum(
    ['Aces', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'].map((f) =>
      getCellValue(getFieldByName(game, f))
    )
  )

const getLowerTotal = (game) =>
  // TODO: bonus yahtzees
  sum(
    [
      '3 of a Kind',
      '4 of a Kind',
      'Full House',
      'Small Straight',
      'Large Straight',
      'YAHTZEE',
      'Chance'
    ].map((f) => getCellValue(getFieldByName(game, f)))
  )
const getCellValue = (c) => {
  if (typeof c.user === 'number') return c.user
  if (c.user === '') return 0
  if (typeof c.parsed === 'number') return c.parsed
  return undefined
}

const getFieldByName = (game, field) => game.find((c) => c.field === field)

render(<App />, document.getElementById('main'))

// https://stackoverflow.com/a/7261048
function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1])

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length)
  var ia = new Uint8Array(ab)
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }

  //Old Code
  //write the ArrayBuffer to a blob, and you're done
  //var bb = new BlobBuilder();
  //bb.append(ab);
  //return bb.getBlob(mimeString);

  //New Code
  return new Blob([ab], { type: mimeString })
}
