const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('bitflyer')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')
const tradesApi = require('../db/trades')

function getTradingPairs() {
   //Get BitFlyer trading pairs
   //The product_code property can be used to get trading-pair-specific trades
   return axios
      .get(`${process.env.BITFLYER_REST}/getmarkets`)
      .then((res) => {
         //Filter out futures and CFDs
         //TODO: Currently not supporting either futures or CFDs...
         //Add support or continue to ignore?
         const filteredPairs = res.data.filter(
            (tradingPair) =>
               !tradingPair.product_code.includes('FX_') &&
               !tradingPair.product_code.includes('2019'),
         )
         return filteredPairs.map((tradingPair) => ({
            id: tradingPair.product_code,
            name: tradingPair.product_code.toLowerCase().replace('_', ''),
         }))
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ BITFLYER REST (TRADING PAIRS)')
      })
   /*
    Response:
    [
        { product_code: 'BTC_JPY' },
        { product_code: 'FX_BTC_JPY' },
        { product_code: 'ETH_BTC' },
        { product_code: 'BCH_BTC' },
        { product_code: 'BTCJPY27SEP2019', alias: 'BTCJPY_MAT3M' },
        { product_code: 'BTCJPY26JUL2019' },
        { product_code: 'BTCJPY02AUG2019', alias: 'BTCJPY_MAT1WK' },
        { product_code: 'BTCJPY09AUG2019', alias: 'BTCJPY_MAT2WK' }
    ]
    */
}

function getAllTrades(tradingPair, before) {
   //Get BitFlyer trades for a specific trading pair
   //Use the last before in the response to get older transactions
   const queryParams = {
      count: 100,
      product_code: tradingPair.id,
   }
   if (before) queryParams.before = before
   axios
      .get(
         `${process.env.BITFLYER_REST}/getexecutions/${objectToQuery(
            queryParams,
         )}`,
      )
      .then(({ data }) => {
         //Add exchange and trading pair data to each object in array of objects
         const parsedData = data.map((tradeData) => {
            return {
               time: new Date(
                  // tradeData.exec_date.replace('T', ' ').split('.')[0] +
                  //    ' UTC+09:00',
                  tradeData.exec_date.split('.')[0] + 'Z',
               ).toISOString(),
               trade_id: tradeData.id,
               price: tradeData.price,
               amount: tradeData.size,
               exchange: 'bitflyer',
               trading_pair: tradingPair.name,
            }
         })
         //Insert parsed trades into the database
         // tradesApi.insert(parsedData).catch((err) => {
         //    if (!err.message.includes('unique')) {
         //       console.log(err)
         //       console.log(err.message, '\n^^ BITFLYER REST INSERTION')
         //    }
         // })
         insertionBatcher.add(...parsedData)
         //console.log(`[BITFLYER] +${parsedData.length} Trades FROM ${tradingPair.name}`)
         //If the response consisted of 100 trades
         //Then recursively get the next 100 trades
         if (parsedData.length === 100) {
            const before = parsedData[parsedData.length - 1].trade_id
            if (
               tradingPair.name !== 'ethbtc' &&
               tradingPair.name !== 'bchbtc'
            ) {
               getAllTrades(tradingPair, before)
            }
         }
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ BITFLYER REST')
      })
   // Example response:
   // [
   //     {
   //         id: 1174942589,
   //         side: 'BUY',
   //         price: 1101499,
   //         size: 0.010255,
   //         exec_date: '2019-07-27T01:52:26.413',
   //         buy_child_order_acceptance_id: 'JRF20190727-015226-331774',
   //         sell_child_order_acceptance_id: 'JRF20190727-014757-061907'
   //     }
   // ]
}

//TODO: Unclear how to subscribe to web socket
//Example and documentation uses a different package than what I've used where
//.subscribe() is a package-level function...

function syncAllTrades(tradingPairs) {
   //Setup WS
   const ws = new WebSocket(process.env.BITFLYER_WS)

   //Open WS connection
   ws.on('open', () => {
      //console.log(`BitFlyer WS Connected at ${process.env.BITFLYER_WS}`)
      //Send subscription message for each trading pair
      tradingPairs.forEach((tradingPair) => {
         const subscriptionConfig = JSON.stringify({
            method: 'subscribe',
            params: {
               channel: `lightning_executions_${tradingPair.id}`,
            },
         })
         ws.send(subscriptionConfig)
      })
   })

   //Handle messages received
   ws.on('message', (data) => {
      data = JSON.parse(data)
      //Grab the trading pair from the channel property
      const tradingPairId = data.params.channel.replace(
         'lightning_executions_',
         '',
      )
      //Each message contains an array of trades
      const tradeDataArray = data.params.message
      const parsedData = tradeDataArray.map((tradeData) => {
         //Construct trade row
         return {
            time: new Date(
               // tradeData.exec_date.replace('T', ' ').split('.')[0] +
               //    ' UTC+09:00',
               tradeData.exec_date.split('.')[0] + 'Z',
            ).toISOString(),
            trade_id: tradeData.id,
            price: tradeData.price,
            amount: tradeData.size,
            exchange: 'bitflyer',
            trading_pair: tradingPairs.find(
               (tradingPair) => tradingPair.id === tradingPairId,
            ).name,
         }
         //Update the console with the WS status
         // if (trade.trade_id % process.env.UPDATE_FREQ === 0) {
         //    console.log(`WS ALIVE - Bitflyer - ${tradingPairId} - ${tradeData.exec_date}`)
         // }
      })
      //console.log(`[BITFLYER] WS +${parsedData.length} Trades FROM ${tradingPairId} - ${parsedData.exec_date}`)
      //Insert trades into the database
      // tradesApi.insert(parsedData).catch((err) => {
      //    if (!err.message.includes('unique')) {
      //       console.log(err)
      //       console.log(err.message, '\n^^ BITFLYER WS INSERTION')
      //    }
      // })
      insertionBatcher.add(...parsedData)
   })
   // Example message:
   // {
   //     id: 1202798746,
   //     side: 'SELL',
   //     price: 1192000,
   //     size: 0.199,
   //     exec_date: '2019-08-11T00:08:27.3619227Z',
   //     buy_child_order_acceptance_id: 'JRF20190811-000827-016860',
   //     sell_child_order_acceptance_id: 'JRF20190811-000827-411553'
   // }

   //Handle errors
   ws.on('error', (err) => {
      console.log(err)
      console.log(err.message, '\n^^ BITFLYER WS')
   })
}

module.exports = {
   getTradingPairs,
   getAllTrades,
   syncAllTrades,
}
