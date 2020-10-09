const fs = require('fs')
const { groupBy, sortBy, sum } = require('lodash')

const { Blocks } = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'))
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
const columns = Object.keys(grouped)
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
        x: c.ColumnIndex,
        y: c.RowIndex,
        // hm
        confidence: sum(confidences) / confidences.length,
        text: words.map(({ Text }) => Text).join(' ')
      }
    })
  })

const columnsToRows = (cols) => {
  const flat = cols.flatMap((c) => c)
  const grouped = groupBy(flat, 'y')
  return Object.keys(grouped).map((key) => grouped[key])
}
const rows = columnsToRows(columns)

// TODO:
// decide old/new card type, decide where game columns start

console.log(`<!DOCTYPE html>
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
            `<tr>${row.map(({ text }) => `<td>${text}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
`)
