const exchanges = require('../configs/exchanges')

const syncTrades = () => {
   exchanges.forEach((exchange) => {
      exchange.api
         .getTradingPairs()
         .then((tradingPairs) => {
            const getAllTrades = () => {
               tradingPairs.forEach((tradingPair) => {
                  exchange.api.getAllTrades(tradingPair)
               })
            }
            getAllTrades()
            setInterval(getAllTrades, exchange.interval)
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
