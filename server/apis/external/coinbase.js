const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('coinbase')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')
const tradesApi = require('../db/trades')

function getTradingPairs() {
   //Get Coinbase trading pairs
   //The id property can be used in API requests
   return axios
      .get(`${process.env.COINBASE_REST}/products`)
      .then((res) => {
         //Return parsed response
         return res.data.map((pair) => ({
            id: pair.id,
            name: pair.id.replace('-', '').toLowerCase(),
         }))
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ COINBASE REST (TRADING PAIRS)')
      })
   /* Response:
        [
            {
                id: 'BAT-USDC',
                base_currency: 'BAT',
                quote_currency: 'USDC',
                base_min_size: '1',
                base_max_size: '300000',
                base_increment: '1',
                quote_increment: '0.000001',
                display_name: 'BAT/USDC',
                status: 'online',
                margin_enabled: false,
                status_message: '',
                min_market_funds: '1',
                max_market_funds: '100000',
                post_only: false,
                limit_only: false,
                cancel_only: false
            },
            ...
        ]
    
    */
}

function getAllTrades(tradingPair, cbAfter = null) {
   //Construct query parameters
   let queryParam = ''
   if (cbAfter) {
      queryParam = objectToQuery({
         after: cbAfter,
      })
   }

   //Get Coinbase trades for a specific trading pair ID
   axios
      .get(
         `${process.env.COINBASE_REST}/products/${tradingPair.id}/trades${queryParam}`,
      )
      .then((res) => {
         //The header containers a cb-after property which can be used to get data
         //Which comes before the data included in this request via the before param
         if (res.headers['cb-after']) {
            //Delay calls .25 seconds to obey by rate limits
            setTimeout(
               () => getAllTrades(tradingPair, res.headers['cb-after']),
               250,
            )
         }
         //Parse each trade response
         const parsedData = res.data.map((tradeData) => {
            return {
               time: new Date(tradeData.time).toISOString(),
               trade_id: tradeData.trade_id,
               price: tradeData.price,
               amount: tradeData.size,
               exchange: 'coinbase',
               trading_pair: tradingPair.name,
            }
         })
         //Insert parsed trades into the database
         // tradesApi.insert(parsedData).catch((err) => {
         //    if (!err.message.includes('unique')) {
         //       console.log(err)
         //       console.log(err.message, '\n^^ COINBASE REST INSERTION')
         //    }
         // })
         insertionBatcher.add(...parsedData)
         //console.log(`[COINBASE] +${res.data.length} Trades FROM ${tradingPair.name} (cbAfter = ${cbAfter})`)
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ COINBASE REST (TRADES)')
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
   const ws = new WebSocket(process.env.COINBASE_WS)

   //Open WS connection
   ws.on('open', () => {
      //console.log(`[COINBASE] WS Connected at ${process.env.COINBASE_WS}`)
      //Send subscription message
      const tradingPairIds = tradingPairs.map((tradingPair) => tradingPair.id)
      const subscriptionConfig = JSON.stringify({
         type: 'subscribe',
         product_ids: tradingPairIds,
         channels: [
            {
               name: 'full',
               product_ids: tradingPairIds,
            },
         ],
      })
      ws.send(subscriptionConfig)
   })

   //Handle messages received
   ws.on('message', (data) => {
      data = JSON.parse(data)
      //If message includes a successful trade
      if (data.type === 'match') {
         //Construct trades row
         const tradingPair = tradingPairs.find(
            (tradingPair) => tradingPair.id === data.product_id,
         ).name
         const parsedTrade = {
            time: new Date(data.time).toISOString(),
            trade_id: data.trade_id,
            price: data.price,
            amount: data.size,
            exchange: 'coinbase',
            trading_pair: tradingPair,
         }
         // console.log(`[COINBASE] WS +1 Trade FROM ${tradingPair} - ${parsedTrade.time}`)
         //Insert it into the database
         // tradesApi.insert(parsedTrade).catch((err) => {
         //    if (!err.message.includes('unique')) {
         //       console.log(err)
         //       console.log(err.message, '\n^^ COINBASE WS INSERTION')
         //    }
         // })
         insertionBatcher.add(parsedTrade)
         //Update the console with the WS status
         // if (trade.trade_id % process.env.UPDATE_FREQ === 0) {
         //    console.log(`[COINBASE] WS ALIVE - ${trade.time} - ${tradingPair}`)
         // }
      }
   })

   //Handle errors
   ws.on('error', (err) => {
      console.log(err)
      console.log(err.message, '\n^^ COINBASE WS')
   })
}

module.exports = {
   getTradingPairs,
   getAllTrades,
   syncAllTrades,
}
