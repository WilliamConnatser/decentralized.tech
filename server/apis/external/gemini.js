const WebSocket = require('ws')
const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('gemini')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')

//Gets Gemini trading pairs
function getTradingPairs() {
   return axios
      .get(`${process.env.GEMINI_REST}/symbols`)
      .then((res) => {
         //Returns a plain array of trading pairs
         return res.data
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ GEMINI REST (TRADING PAIRS)')
      })
   /*
    [
        'btcusd',
        'ethbtc',
        'ethusd',
        'bchusd',
        'bchbtc',
        'bcheth',
        'ltcusd',
        'ltcbtc',
        'ltceth',
        'ltcbch',
        'zecusd',
        'zecbtc',
        'zeceth',
        'zecbch',
        'zecltc'
    ]
    */
}

//Get Gemini trades for a specific trading pair
//Use the last timestamp in the response to get older transactions
//Gemini only provides data 7 days back
function getAllTrades(tradingPair, timestamp) {
   //Setup query parameters
   const queryParams = {
      limit_trades: 500,
   }
   if (timestamp) {
      queryParams.since = timestamp
   }
   axios
      .get(
         `${process.env.GEMINI_REST}/trades/${tradingPair}${objectToQuery(
            queryParams,
         )}`,
      )
      .then(({ data }) => {
         //Add exchange and trading pair data to each object in array of objects
         const parsedTrades = data.map((tradeData) => {
            return {
               time: new Date(tradeData.timestampms).toISOString(),
               trade_id: tradeData.tid,
               price: tradeData.price,
               amount: tradeData.amount,
               exchange: 'gemini',
               trading_pair: tradingPair,
            }
         })
         console.log(
            `[GEMINI] REST +${parsedTrades.length} Trades FROM ${tradingPair} - ${parsedTrades[0].time}`,
         )
         insertionBatcher.add(...parsedTrades)
         //If the response consisted of 500 trades
         if (parsedTrades.length === 500) {
            const timestamp = data[data.length - 1].timestampms
            //Then recursively get the next 500 trades
            //Requests are rate limited by 1 second in SmartAxios
            getAllTrades(tradingPair, timestamp)
         }
      })
      .catch((err) => {
         if (!err.response.data.reason === 'HistoricalDataNotAvailable') {
            console.log(err)
            console.log(err.message, '\n^^ GEMINI REST (TRADES)')
         }
      })
   // Example response:
   // [
   //     {
   //     timestamp: 1563852474,
   //     timestampms: 1563852474042,
   //     tid: 7544782407,
   //     price: '10261.99',
   //     amount: '0.00006',
   //     exchange: 'gemini',
   //     type: 'buy'
   // },
   //     ...
   // ]
}

function syncAllTrades(tradingPairs) {
   tradingPairs.forEach((tradingPair, index) => {
      //Gemini recommends only one WS request per trading pair per minute
      //So delay each WS by 1 minute * index + 1
      setTimeout(() => {
         const queryParams = objectToQuery({ trades: true })
         //Setup WS
         const ws = new WebSocket(
            `${process.env.GEMINI_WS}${tradingPair}${queryParams}`,
         )
         //Open WS connection
         ws.on('open', () => {
            //console.log(`[GEMINI] WS Connected at ${process.env.GEMINI_WS}${tradingPair}${queryParams}`)
            //No need for a subscription message
            //Settings are handled via the WS path and query params
         })

         //Handle messages received
         ws.on('message', (data) => {
            data = JSON.parse(data)
            console.log(data, 'GEMINI MESSAGE')
            if (data.events.length > 0) {
               //Parse trade data from the message
               const parsedData = data.events.map((tradeData) => {
                  return {
                     time: new Date(data.timestampms).toISOString(),
                     trade_id: tradeData.tid,
                     price: tradeData.price,
                     amount: tradeData.amount,
                     exchange: 'gemini',
                     trading_pair: tradingPair,
                  }
               })
               console.log(
                  `[GEMINI] WS +${parsedData.length} FROM ${tradingPair} - ${parsedData[0].time}`,
               )
               insertionBatcher.add(...parsedData)
            }
         })
         //Handle errors
         ws.on('error', (err) => {
            console.log(err)
            console.log(err.message, '\n^^ GEMINI WS', tradingPair)
         })
      }, 1000 * 60 * (index + 1))
   })
}

module.exports = {
   getTradingPairs,
   getAllTrades,
   syncAllTrades,
}
