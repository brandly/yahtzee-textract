const fs = require('fs')
const { Textract } = require('aws-sdk')
const textract = new Textract({ region: 'us-east-1' })

const analyzeDocument = (file) =>
  new Promise((resolve, reject) => {
    textract.analyzeDocument(
      {
        Document: { Bytes: file },
        FeatureTypes: ['TABLES']
      },
      (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      }
    )
  })

module.exports = { analyzeDocument }
