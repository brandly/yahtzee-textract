const fs = require('fs')
const { Textract } = require('aws-sdk')

const file = fs.readFileSync(process.argv[2])

const textract = new Textract({ region: 'us-east-1' })
textract.analyzeDocument(
  {
    Document: { Bytes: file },
    FeatureTypes: ['TABLES']
  },
  (err, data) => {
    if (err) {
      console.error(err)
    } else {
      console.log(JSON.stringify(data, null, 2))
    }
  }
)
