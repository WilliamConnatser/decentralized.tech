const axios = require('axios')
const objectToQuery = require('../../utility/objectToQuery')

const getForexRates = () => {
   const queryParams = {
      access_key: process.env.FIXER_KEY,
      base: 'USD'
   }
   return axios
      .get(`${process.env.FIXER_REST}/latest${objectToQuery(queryParams)}`)
      .catch((err) => {
         console.log(err)
         console.log(err.message, 'FIXER REST')
      })
}

module.exports = { getForexRates }
