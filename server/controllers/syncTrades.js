const exchanges = require('../configs/exchanges')

const syncTrades = () => {
   exchanges.forEach((exchange) => {
      exchange.api
         .getTradingPairs()
         .then((tradingPairs) => {
            const getAllTrades = (lastLongPoll) => {
               if (lastLongPoll) {
                  console.log(exchange)
                  lastLongPoll = new Date().getTime() - lastLongPoll * 1000
               }
               tradingPairs.forEach((tradingPair) => {
                  //If a second argument is passed in
                  //Then we know we are longpolling
                  //And there's no need to sync full historical data
                  exchange.api.getAllTrades(tradingPair, null, lastLongPoll)
               })
            }
            getAllTrades()
            setInterval(
               () => getAllTrades(exchange.interval),
               exchange.interval,
            )
            if (exchange.ws) {
               exchange.api.syncAllTrades(tradingPairs)
            }
         })
         .catch((err) =>
            console.log(
               `[${exchange.name.toUpperCase()}] ERROR: ${err.message}`,
            ),
         )
   })
}

module.exports = syncTrades
