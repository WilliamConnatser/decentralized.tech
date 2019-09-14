const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('bitstamp')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')
const tradesApi = require('../db/trades')

function getTradingPairs() {
   //Get Bitstamp trading pairs
   //The url_symbol property can be used to get trading-pair-specific trades
   return axios
      .get(`${process.env.BITSTAMP_REST}/trading-pairs-info`)
      .then((res) => {
         //Return parsed response
         return res.data.map((tradingPair) => {
            return {
               id: tradingPair.url_symbol,
            }
         })
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ BITSTAMP REST (TRADING PAIRS)')
      })
   /*
    Response:
    [
        {
            "base_decimals": 8,
            "minimum_order": "5.0 USD",
            "name": "LTC/USD",
            "counter_decimals": 2,
            "trading": "Enabled",
            "url_symbol": "ltcusd",
            "description": "Litecoin / U.S. dollar"
        },
    ]
    */
}

function getAllTrades(tradingPair) {
   //Get Bitstamp trades for a specific trading pair
   //Bitstamp only has previous 24hr data available.. :\
   //Will need to source historical data separately
   axios
      .get(
         `${process.env.BITSTAMP_REST}/transactions/${tradingPair.id}?time=day`,
      )
      .then((res) => {
         //Parse trade data
         const parsedData = res.data.map((tradeData) => {
            const tradeDate = new Date(tradeData.date * 1000)
            return {
               time: tradeDate.toISOString(),
               trade_id: tradeData.tid,
               price: tradeData.price,
               amount: tradeData.amount,
               exchange: 'bitstamp',
               trading_pair: tradingPair.id,
            }
         })
         //Insert all trades into the database
         //Only use insertMany when needed.. (When inserting 1000s)
         // if (parsedData.length > 2000) {
         //    var insertionMethod = tradesApi.insertMany
         // } else {
         //    var insertionMethod = tradesApi.insert
         // }
         // insertionMethod(parsedData).catch((err) => {
         //    if (!err.message.includes('unique')) {
         //       console.log(err)
         //       console.log(err.message, '\n^^ BITSTAMP REST INSERTION')
         //    }
         // })
         insertionBatcher.add(...parsedData)
         //console.log(`[BITSTAMP] +${res.data.length} Trades FROM ${tradingPair.id}`)
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ BITSTAMP REST (TRADES)')
      })
   /*
        [
            {
                date: '1563682032',
                tid: '94384551',
                price: '10650.00',
                type: '1',
                amount: '7.47150000'
            },
            ...
        ]
    */
}

function syncAllTrades(tradingPairs) {
   //Setup WS
   const ws = new WebSocket(process.env.BITSTAMP_WS)
   const tradingPairIds = tradingPairs.map((tradingPair) => tradingPair.id)

   //Open WS connection
   ws.on('open', () => {
      //console.log(`[BITSTAMP] - WS Connected at ${process.env.BITSTAMP_WS}`)
      //Send subscription message for each trading pair
      tradingPairIds.forEach((tradingPair) => {
         const subscriptionConfig = JSON.stringify({
            event: 'bts:subscribe',
            data: {
               channel: `live_trades_${tradingPair}`,
            },
         })
         ws.send(subscriptionConfig)
      })
   })

   //Handle messages received
   ws.on('message', (data) => {
      data = JSON.parse(data)
      //If message includes a successful trade
      if (data.event === 'trade') {
         //Grab the id from the channel property
         const id = data.channel.split('_')[data.channel.split('_').length - 1]
         //Construct trade row
         const tradeData = data.data
         const parsedData = {
            time: new Date(tradeData.timestamp * 1000).toISOString(),
            trade_id: tradeData.id,
            price: tradeData.price,
            amount: tradeData.amount,
            exchange: 'bitstamp',
            trading_pair: id,
         }
         console.log(`[BITSTAMP] WS +1 FROM ${id} - ${parsedData.time}`)
         insertionBatcher.add(parsedData)
      }
      //If the WS server is going down for maintenance
      else if (data.event == 'bts-request_reconnect') {
         //This message means the WS server we are connected to is going down for maintenance
         //By reconnecting it will automatically connect us to a new server
         syncAllTrades(tradingPairs)
      }
   })
   // Example message:
   // {
   //     type: 'match',
   //     trade_id: 1797465,
   //     maker_order_id: '6865cc86-7cd3-4ded-a6d2-e554a36f5a93',
   //     taker_order_id: '1be42c56-cac3-4a1b-a1a1-4248cb2b8d9b',
   //     side: 'buy',
   //     size: '1.00000000',
   //     price: '0.24200000',
   //     product_id: 'BAT-USDC',
   //     sequence: 503529021,
   //     time: '2019-07-21T19:14:57.457000Z'
   // }

   //Handle errors
   ws.on('error', (err) => {
      console.log(err)
      console.log(err.message, '\n^^ BITSTAMP WS')
   })
}

module.exports = {
   getTradingPairs,
   getAllTrades,
   syncAllTrades,
}
