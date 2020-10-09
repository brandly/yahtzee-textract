const { groupBy, sortBy, sum } = require('lodash')

const textractToColumns = ({ Blocks }) => {
  const byId = Blocks.reduce((out, block) => {
    out[block.Id] = block
    return out
  }, {})
  const cells = Blocks.filter(({ BlockType }) => BlockType === 'CELL').map(
    (block) => ({
      ...block,
      children: (block.Relationships || []).flatMap((r) =>
        r.Ids.map((id) => byId[id])
      )
    })
  )
  const grouped = groupBy(cells, 'ColumnIndex')
  return Object.keys(grouped)
    .map((k) => parseInt(k))
    .sort((a, b) => {
      if (a < b) return -1
      if (a > b) return 1
      return 0
    })
    .map((key) => {
      const column = grouped[key]
      return column.map((c) => {
        const words = c.children.filter(({ BlockType }) => BlockType === 'WORD')
        const confidences = words.map(({ Confidence }) => Confidence)
        return {
          coords: {
            x: c.ColumnIndex,
            y: c.RowIndex
          },
          // hm
          confidence: sum(confidences) / confidences.length,
          text: words.map(({ Text }) => Text).join(' ')
        }
      })
    })
}

const columnsToRows = (cols) => {
  const flat = cols.flatMap((c) => c)
  const grouped = groupBy(flat, 'coords.y')
  return Object.keys(grouped).map((key) => grouped[key])
}

// TODO:
// decide old/new card type, decide where game columns start
// be forgiving of certain characters
//    helps to know which cells should be numbers
//    also knowing that e.g. you're in 6s, the value is a multiple of 6

const getCardType = (rows) => {
  const header = rows[0]
  if (
    header[0].text === 'UPPER SECTION' &&
    header[1].text === 'HOW TO SCORE' &&
    header[2].text === ''
  ) {
    return 'old'
  }
  if (
    header[0].text === 'UPPER SECTION' &&
    header[1].text === '' &&
    header[2].text === 'HOW TO SCORE' &&
    header[3].text === 'GAME #1'
  ) {
    return 'new'
  }
  return null
}

const tableMapping = {
  new: {
    firstGameColumn: 4,
    fields: {
      aces: 2,
      twos: 3,
      threes: 4,
      fours: 5,
      fives: 6,
      sixes: 7,
      topSubtotal: 8,
      '63Bonus': 9,
      topTotal: 10,
      '3kind': 12,
      '4kind': 13,
      fullHouse: 14,
      smallStraight: 15,
      largeStraight: 16,
      YAHTZEE: 17,
      Chance: 18,
      yahtzeeExtras: 19,
      yahtzeeExtras: 20,
      lowerTotal: 21,
      upperTotal: 22,
      grandTotal: 23
    }
  }
}

const extractNumber = (value) => {
  if (value === undefined) return value

  let int = parseInt(value)
  if (!Number.isNaN(int)) {
    return int
  }

  const guess = value
    .replace(/\//g, '1')
    .replace(/I/g, '1')
    .replace(/LO/g, '10')
    .replace(/O/g, '0')
    .replace(/g/g, '9')
    .replace(/q/g, '9')
    .replace(/lo/g, '6')
    .replace(/is/g, '15')

  int = parseInt(guess)
  if (!Number.isNaN(int)) {
    return int
  }
}

const getGames = (columns) => {
  const rows = columnsToRows(columns)
  const { fields, firstGameColumn } = tableMapping[getCardType(rows)]
  const games = columns.filter((c) => c[0].coords.x >= firstGameColumn)
  const xToField = Object.keys(fields).reduce((out, field) => {
    out[fields[field]] = field
    return out
  }, {})
  return games.map((g) =>
    g.map((cell) => ({
      ...cell,
      field: xToField[cell.coords.x],
      parsed: extractNumber(cell.text)
    }))
  )
}

const viewGames = (games) => {
  const rows = columnsToRows(games)
  const cellField = 'parsed'
  return `<!DOCTYPE html>
<body>
  <head>
    <style>
      input {
        width: 24px;
      }
      tbody td {
        text-align: right;
      }
    </style>
  </head>
  <table>
    <thead><tr>${rows[0]
      .map(({ text }, index) => `<th>#${index + 1}</th>`)
      .join('')}</tr></thead>
    <tbody>
      ${rows
        .slice(1)
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => {
                const missing = cell[cellField] === undefined
                return `<td style="color: ${missing ? 'red' : 'black'}">${
                  missing ? `<input type="text" />` : cell[cellField]
                }</td>`
              })
              .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
`
}

const viewRows = (rows, cellField = 'text') => {
  return `<!DOCTYPE html>
<body>
  <table>
    <thead><tr>${rows[0]
      .map(({ text }) => `<th>${text}</th>`)
      .join('')}</tr></thead>
    <tbody>
      ${rows
        .slice(1)
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${cell[cellField] || ''}</td>`)
              .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
`
}

module.exports = {
  textractToColumns,
  columnsToRows,
  getGames,
  viewGames,
  viewRows
}
