const exchanges = require('../configs/exchanges')

const syncTrades = () => {
   //For each exchange declared in the exchange configs
   exchanges.forEach((exchange) => {
      //Get available trading pairs
      exchange.api
         .getTradingPairs()
         .then((tradingPairs) => {
            //Declare function which is used on both initial sync and longpolling
            const getAllTrades = (lastLongPoll) => {
               if (lastLongPoll) {
                  lastLongPoll = new Date().getTime() - lastLongPoll * 1000
               }
               tradingPairs.forEach((tradingPair) => {
                  //If a second argument is passed into getAllTrades
                  //Then we know we are longpolling, have already completed an initial
                  //sync, and there's no need to sync full historical data
                  exchange.api.getAllTrades(tradingPair, null, lastLongPoll)
               })
            }
            //Initial sync
            getAllTrades()
            //Longpoll syncing
            setInterval(
               () => getAllTrades(exchange.interval),
               exchange.interval,
            )
            //If the exchange has WS support then connect and start syncing
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
