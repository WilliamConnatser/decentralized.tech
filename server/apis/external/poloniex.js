const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('poloniex')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')
const tradesApi = require('../db/trades')

function getTradingPairs() {
   //Get Poloniex trading pairs
   //The product_code property can be used to get trading-pair-specific trades
   return axios
      .get(`${process.env.POLONIEX_REST}?command=returnTicker`)
      .then((res) => {
         //Parse trading pairs
         const tradingPairs = Object.keys(res.data).map((tradingPair) => ({
            id: tradingPair,
            name: tradingPair
               .split('_')
               .reverse()
               .join('')
               .toLowerCase(),
            wsId: res.data[tradingPair].id,
         }))
         return tradingPairs
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ POLONIEX REST (TRADING PAIR)')
      })
   /*
    Response:
    {
        BTC_OMG:
        {
            id: 196,
            last: '0.00012323',
            lowestAsk: '0.00012290',
            highestBid: '0.00012188',
            percentChange: '0.03537220',
            baseVolume: '0.22225613',
            quoteVolume: '1804.85134494',
            isFrozen: '0',
            high24hr: '0.00012671',
            low24hr: '0.00011932'
        },
        ...
    }
    */
}

function getAllTrades(tradingPair, end = null) {
   //Notify console API is alive
   // if (end % process.env.UPDATE_FREQ === 0) {
   //    console.log(`API ALIVE - Poloniex - ${tradingPair.name}`)
   // }
   //Get Poloniex trades for a specific trading pair
   //Use the last before in the response to get older transactions
   const queryParams = {
      command: 'returnTradeHistory',
      currencyPair: tradingPair.id,
   }
   if (end) {
      queryParams.end = end
   }
   axios
      .get(`${process.env.POLONIEX_REST}${objectToQuery(queryParams)}`)
      .then(({ data }) => {
         //Add exchange and trading pair data to each object in array of objects
         const parsedData = data.map((tradeData) => {
            return {
               time: tradeData.date.replace(' ', 'T') + 'Z',
               trade_id: tradeData.globalTradeID,
               price: tradeData.rate,
               amount: tradeData.total,
               exchange: 'poloniex',
               trading_pair: tradingPair.name,
            }
         })
         // If the response consisted of trades
         // Then recursively get the next trades
         if (parsedData.length > 0) {
            const end =
               new Date(parsedData[parsedData.length - 1].time).getTime() / 1000
            getAllTrades(tradingPair, end)
         }
         //Insert it into the database
         // tradesApi.insert(parsedData).catch((err) => {
         //    if (!err.message.includes('unique')) {
         //       console.log(err)
         //       console.log(err.message, `\n^^ POLONIEX REST INSERTION - Inserting ${parsedData.length} Trades`)
         //    }
         // })
         insertionBatcher.add(...parsedData)
         //console.log(`[POLONIEX] +${parsedTrades.length} Trades FROM ${tradingPair.name}`)
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ POLONIEX REST (TRADE)')
      })
   // Example response:
   // [
   // {
   //     globalTradeID: 424614307,
   //     tradeID: 3094009,
   //     date: '2019-08-12 03:24:56',
   //     type: 'sell',
   //     rate: '0.00000005',
   //     amount: '74880.64629788',
   //     total: '0.00374403',
   //     orderNumber: 14090569333
   // },
   // ...
   // ]
}

function syncAllTrades(tradingPairs) {
   //Setup WS
   const ws = new WebSocket(process.env.POLONIEX_WS)

   //Open WS connection
   ws.on('open', () => {
      //console.log(`Poloniex WS Connected at ${process.env.POLONIEX_WS}`)
      //Send subscription message for each trading pair
      tradingPairs.forEach((tradingPair) => {
         const subscriptionConfig = JSON.stringify({
            command: 'subscribe',
            channel: `${tradingPair.wsId}`,
         })
         ws.send(subscriptionConfig)
      })
   })

   //Handle messages received
   ws.on('message', (data) => {
      data = JSON.parse(data)
      //ocassionally data[2] was undefined which caused an error
      //added this check
      if (data[2]) {
         //Grab the trading pair from the channel property
         const tradingPairId = tradingPairs.find(
            (tradingPair) => tradingPair.wsId === data[0],
         )
         //Each message contains an array of trades and order book actions (asks and bids)
         //Trades are denoted by having a the letter t as the first item of the array
         let tradeDataArray = data[2].filter((action) => action[0] === 't')
         //Check to see if there were any trades
         if (tradeDataArray.length > 0) {
            //Parse data and construct trade rows
            const parsedData = tradeDataArray.map((tradeData) => ({
               time: new Date(tradeData[5] * 1000).toISOString(),
               trade_id: tradeData[1],
               price: tradeData[3],
               amount: tradeData[4],
               exchange: 'poloniex',
               trading_pair: tradingPairId.name,
            }))
            //Insert the trades into the database
            //console.log(`[POLONIEX] WS +${parsedData.length} Trades FROM ${tradingPairId.name} - ${parsedData[0].time}`)
            // tradesApi.insert(parsedData).catch((err) => {
            //    console.log(err)
            //    if (!err.message.includes('unique')) {
            //       console.log(err)
            //       console.log(
            //          err.message,
            //          `\n^^ POLONIEX WS INSERTION - Inserting ${tradeDataArray.length} Trades`,
            //       )
            //    }
            // })
            insertionBatcher.add(...parsedData)
            //Update the console with the WS status
            // if (trade.trade_id % process.env.UPDATE_FREQ === 0) {
            // console.log(`WS ALIVE - Poloniex - ${tradingPairId.name} - ${tradeData.exec_date}`)
            // }
         }
      } else {
         console.log(data, `Avoided Poloniex Error`)
      }
   })

   //Handle errors
   ws.on('error', (err) => {
      console.log(err)
      console.log(err.message, '\n^^ POLONIEX WS')
   })
}

module.exports = {
   getTradingPairs,
   getAllTrades,
   syncAllTrades,
}
