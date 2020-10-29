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
  // console.log('cols', cols)
  const flat = cols.flatMap((c) => c)
  const grouped = groupBy(flat, 'coords.y')
  return Object.keys(grouped).map((key) => grouped[key])
}

const getCardType = (rows) => {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (
      row[0].text === 'UPPER SECTION' &&
      row[1].text === 'HOW TO SCORE' &&
      row[2].text === ''
    ) {
      return { type: 'old', offset: i }
    }
    if (
      row[0].text === 'UPPER SECTION' &&
      row[1].text === '' &&
      row[2].text === 'HOW TO SCORE' &&
      row[3].text === 'GAME #1'
    ) {
      return { type: 'new', offset: i }
    }
  }
  return { type: null, offset: 0 }
}

const commonFields = {
  Aces: 2,
  Twos: 3,
  Threes: 4,
  Fours: 5,
  Fives: 6,
  Sixes: 7,
  'Top Subtotal': 8,
  '63 Bonus': 9,
  'Top Total': 10,
  '3 of a Kind': 12,
  '4 of a Kind': 13,
  'Full House': 14,
  'Small Straight': 15,
  'Large Straight': 16,
  YAHTZEE: 17,
  Chance: 18,
  yahtzeeExtras: 19,
  yahtzeeExtrasScore: 20,
  'Lower Total': 21,
  'Upper Total': 22,
  'Grand Total': 23
}

const tableMapping = {
  new: {
    firstGameColumn: 4,
    fields: commonFields
  },
  old: {
    firstGameColumn: 3,
    fields: commonFields
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
  const { type, offset } = getCardType(rows)
  if (!(type in tableMapping)) {
    console.error(JSON.stringify(rows, null, 2))
    throw new Error(`Unable to handle card type "${type}"`)
  }
  const { fields, firstGameColumn } = tableMapping[type]
  const games = columns.filter((c) => c[0].coords.x >= firstGameColumn)
  const yToField = Object.keys(fields).reduce((out, field) => {
    out[fields[field]] = field
    return out
  }, {})

  const relevantY = new Set(Object.keys(yToField).map((y) => parseInt(y)))
  return {
    yToField,
    games: games.map((g) =>
      g.flatMap((cell) =>
        relevantY.has(cell.coords.y - offset)
          ? [
              {
                ...cell,
                field: yToField[cell.coords.y - offset],
                parsed: extractNumber(cell.text)
              }
            ]
          : []
      )
    )
  }
}

const viewGames = ({ games }) => {
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
              .map(
                (cell) =>
                  `<td class="x${cell.coords.x} y${cell.coords.y}">${
                    cell[cellField] || ''
                  }</td>`
              )
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
