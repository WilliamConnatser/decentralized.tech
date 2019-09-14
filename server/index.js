require('dotenv').config()
const server = require('./server')
const tradesDb = require('./apis/db/trades')
const exchanges = require('./configs/exchanges')
const syncTrades = require('./controllers/syncTrades')
const forexRatesApi = require('./apis/db/forexRates')

//TODO:
//Look at Idex, Ethfinex, Gemini, and Bitstamp
//They seem to be falling behind on updates after the server runs for hours
syncTrades()

// //Last Trade
// tradesDb.getOne().then((res) => console.log(res, 'last trade \n'))

// //First Trade
// tradesDb
//    .getOne({}, ['time', 'asc'])
//    .then((res) => console.log(res, 'first trade \n'))

//First / Last Trade Per Exchange
setInterval(() => {
   console.log('\n\n\n')
   exchanges.forEach(({ name }, index) => {
      const promiseArray = [
         tradesDb.getOne({ exchange: name }, ['time', 'asc']),
         tradesDb.getOne({ exchange: name }),
      ]
      Promise.all(promiseArray).then((res) => {
         if (res[0]) {
            first = res[0]
            last = res[1]
            console.log(
               `${name.toUpperCase()}
           First: ${new Date(first.time).toUTCString()}
           Last: ${new Date(last.time).toUTCString()}`,
            )
         } else {
            console.log(
               `${name.toUpperCase()}
               NO TRADES`,
            )
         }
      })
   })
}, 1000 * 30)

// //Get all forex rates
// forexRatesApi.getAll().then((res) => console.log(res))

// //Get all forex symbols
// forexRatesApi.getAll().then((res) => console.log(res.map(rate => rate.symbol)))

// //Get all unique trading pairs
// tradesDb.getUniquePairs().then((res) => console.log(res))

//Get all unique FIAT trading pairs
//Separate base symbol from quote symbol and add quote rate
//Get last price from each exchance for each trading pair
// const fiatTPRequests = [
//    forexRatesApi.getAll(),
//    tradesDb.getUniquePairs()
// ]
// Promise.all(fiatTPRequests)
//    .then(res => {
//       const [forexSymbols, tradingPairs] = res
//       let fiatPairs = []
//       for (currency of forexSymbols) {
//          const tradingPair = tradingPairs.filter(tradingPair => currency.symbol !== 'btc' && tradingPair.endsWith(currency.symbol)).map(tradingPair => ({
//             tradingPair,
//             quoteSymbol: currency.symbol,
//             currencyRate: currency.rate,
//             baseSymbol: tradingPair.replace(currency.symbol, ''),
//          }))
//          fiatPairs = fiatPairs.concat(tradingPair)
//       }
//       fiatPairs = fiatPairs.map(async tradingPair => {
//          const exchanges = await tradesDb.getExchangesByTP(tradingPair.tradingPair)
//          return {
//             ...tradingPair,
//             exchanges: await Promise.all(exchanges.map(exchange => tradesDb.getOne({ exchange, trading_pair: tradingPair.tradingPair })))
//       }})
//       return Promise.all(fiatPairs)
//    })
//    .then(res=>console.log(res))

//Find a random trade in a certain trading pair
// tradesDb.getOne({ trading_pair: 'ethhkd'}).then(res => console.log(res, 'okkkkk'))

//Get number of all trades
tradesDb.getMany().then((res) => console.log(res.length))

const port = process.env.PORT || 5000

server.listen(port, () =>
   console.log(`Server Alive On http://localhost:${port}`),
)
