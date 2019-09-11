const SmartAxios = require('../../utility/SmartAxios')
const kraken = new SmartAxios('kraken')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {
   //Get Kraken trading pairs
   //The id property can be used in API requests
   return kraken.axios
      .get(`${process.env.KRAKEN_REST}/AssetPairs`)
      .then((res) => {
         return Object.keys(res.data.result).map((tradingPair) => {
            return {
               id: tradingPair,
               name: res.data.result[tradingPair].altname
                  .replace('.d', '')
                  .toLowerCase(),
               ws: res.data.result[tradingPair].wsname,
            }
         })
      })
      .catch((err) => {
         console.log(err)
      })
}

function getAllTrades(tradingPair, since = null) {
   //Construct query parameters
   let queryParams = {
      pair: tradingPair.id,
   }
   if (since) {
      queryParams.since = since
   }
   queryParams = objectToQuery(queryParams)

   //Get Kraken trades for a specific trading pair ID
   kraken.axios
      .get(`${process.env.KRAKEN_REST}/Trades${queryParams}`)
      .then(({ data }) => {
         //The response contains a `last` property which can be used via longpolling
         if (data.result.last) {
            //Update orders every 5 minutes
            setTimeout(() => getAllTrades(tradingPair, data.result.last), 25000)
         }
         //Parse each trade response
         const tradeData = data.result[tradingPair.id].map((trade) => {
            const tradeDate = new Date(trade[2] * 1000)
            return {
               time: tradeDate.toISOString(),
               price: trade[0],
               amount: trade[1],
               exchange: 'kraken',
               trading_pair: tradingPair.name,
            }
         })
         //Insert parsed trade into the database
         tradesApi.insert(tradeData).catch((err) => {
            if (!err.message.includes('unique')) {
               console.log(err)
               console.log(err.message, '<< KRAKEN REST')
            }
         })
         //console.log(`[KRAKEN] +${tradeData.length} Trades FROM ${tradingPair.name} (since = ${since})`)
      })
      .catch((err) => {
         console.log(err)
      })
   /*
        [
            {
                time: '2019-07-15T03:05:17.697Z',
                trade_id: 4578270,
                price: '3905.06000000',
                size: '0.00100000',
                side: 'sell'
            },
            ...
        ]
    */
}

function syncAllTrades(tradingPairs) {
   //Setup WS
   const ws = new WebSocket(process.env.KRAKEN_WS)
   //Channel Dictionary
   //Maps channels to trading pairs
   const channelLookup = {}

   //Open WS connection
   ws.on('open', () => {
      //console.log(`[KRAKEN] WS Connected At ${process.env.KRAKEN_WS}`)
      //Send subscription message
      const tradingPairIds = tradingPairs.map((tradingPair) => tradingPair.ws)
      const subscriptionConfig = JSON.stringify({
         event: 'subscribe',
         pair: tradingPairIds,
         subscription: {
            name: 'trade',
         },
      })
      ws.send(subscriptionConfig)
   })

   //Handle messages received
   ws.on('message', (data) => {
      data = JSON.parse(data)
      if (Array.isArray(data)) {
         //Parse trades
         const tradeData = data[1].map((trade) => {
            const tradeDate = new Date(Number(trade[2] * 1000))
            //Ocassionally update the console with the WS status
            if (tradeDate.getTime() % process.env.UPDATE_FREQ === 0) {
               //console.log(`[KRAKEN] WS ALIVE - ${tradeDate.toISOString()} - ${channelLookup[data[0]]}`)
            }
            //Parse trade data
            return {
               time: tradeDate.toISOString(),
               price: trade[0],
               amount: trade[1],
               exchange: 'kraken',
               trading_pair: channelLookup[data[0]],
            }
         })
         //Insert the parsed trades into the database
         tradesApi.insert(tradeData).catch((err) => {
            if (!err.message.includes('unique')) {
               console.log(err)
               console.log(err.message, '<< KRAKEN WS (INSERTION)')
            }
         })
      } else {
         if (
            data.event &&
            data.event === 'subscriptionStatus' &&
            data.status !== 'error'
         ) {
            channelLookup[data.channelID] = tradingPairs.find(
               (tradingPair) => tradingPair.ws === data.pair,
            ).name
         }
      }
   })

   //Handle errors
   ws.on('error', (error) => {
      console.log(error.message, '<< KRAKEN WS')
   })
}

module.exports = {
   getTradingPairs,
   getAllTrades,
   syncAllTrades,
}
