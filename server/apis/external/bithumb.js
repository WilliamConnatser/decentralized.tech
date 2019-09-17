const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('bithumb')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')

function getTradingPairs() {
   return axios
      .get('https://api.bithumb.com/public/ticker/all')
      .then(({ data }) => {
         const tradingPairs = Object.keys(data.data).map((ticker) => ({
            id: ticker,
            name: `${ticker.toLowerCase()}krw`,
         }))
         //Needed because the last key `date` is not a trading pair
         tradingPairs.pop()
         return tradingPairs
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ BITHUMB REST (TRADINGPAIRS)')
      })
}

function getAllTrades(tradingPair) {
   //Get Bithumb trades for a specific trading pair
   //Bithumb does not have any way to retrieve historical trades
   const queryParams = {
      count: 100,
   }
   axios
      .get(
         `${process.env.BITHUMB_REST}/transaction_history/${
            tradingPair.id
         }${objectToQuery(queryParams)}`,
      )
      .then(({ data }) => {
         //Add exchange and trading pair data to each object in array of objects
         const parsedData = data.data.map((trade) => {
            const tradeDate = new Date(trade.transaction_date + ' UTC+09:00')
            return {
               time: tradeDate.toISOString(),
               price: trade.price,
               amount: trade.units_traded,
               exchange: 'bithumb',
               trading_pair: tradingPair.name,
            }
         })

         //Insert all trades into the database
         insertionBatcher.add(...parsedData)
         console.log(
            `[BITHUMB] +${data.data.length} Trades FROM ${tradingPair.name}`,
         )
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ BITHUMB REST (TRADES)')
      })
   // Example response:
   // [
   //     {
   //         transaction_date: '2019-07-22 08:07:03',
   //         type: 'ask',
   //         units_traded: '0.0267',
   //         price: '12563000',
   //         total: '335432'
   //     },
   //     ...
   // ]
}

module.exports = {
   getTradingPairs,
   getAllTrades,
}
