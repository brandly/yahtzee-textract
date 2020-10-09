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
              .then((res) => res.json())
              .then(({ games, yToField }) => {
                setGames(games)
                setYToField(yToField)
              })
              .catch((err) => alert('File Upload Error'))
              .finally(() => setLoading(false))
          }}
        />
        <button
          onClick={() => {
            fetch(`${baseUrl}/static-game`, {
              headers: {
                'Content-Type': 'application/json'
              }
            })
              .then((res) => res.json())
              .then(({ games, yToField }) => {
                setGames(games)
                setYToField(yToField)
              })
          }}
        >
          view static
        </button>
        {loading && <p>Loading...</p>}
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
                <td key={coords.x}>
                  <input
                    type="number"
                    style={{
                      border: '1px solid black',
                      borderColor: confidence < 70 ? 'red' : 'black'
                    }}
                    value={typeof user === 'number' ? user : parsed || ''}
                    onChange={(e) => {
                      setValue(coords, e.target.value)
                    }}
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
  if (typeof c.user === 'number') return c.user
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
