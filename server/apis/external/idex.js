const requestQueue = require('../../utility/requestQueue')
const axios = requestQueue('idex')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const insertionBatcher = require('../../utility/insertionBatcher')
const tradesApi = require('../db/trades')

function getTradingPairs() {
   //Get IDEX trading pairs
   //The id property can be used in API requests
   return axios
      .get(`${process.env.IDEX_REST}/returnTicker`)
      .then((res) => {
         //Parse response
         return Object.keys(res.data).map((key) => ({
            id: key,
            //IDEX has the base pair as first ticker in market pair
            //Almost (all?) other exchanges list base pair second
            //So here we normalize the ticker
            name: key
               .toLowerCase()
               .split('_')
               .reverse()
               .join(''),
         }))
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ IDEX REST (TRADING PAIR)')
      })
   /* Response:
    {
        TUSD_ETH: {
            last: '170.163150941',
            high: '171.382342010000000611',
            low: '169.9918239166',
            lowestAsk: '170.236647129',
            highestBid: '169.5102840592',
            percentChange: '-0.71138663',
            baseVolume: '4791.735822308546453036',
            quoteVolume: '28.103711783037124921'
        },
        ...
    }
    */
}

function getAllTrades(tradingPair, cursor = null) {
   //Construct query parameters
   let queryBody = {
      market: tradingPair.id,
      count: 100,
   }
   //Add cursor to get paginated data
   if (cursor) {
      queryBody.cursor = cursor
   }
   //Get IDEX trades for a specific trading pair ID
   axios
      .post(`${process.env.IDEX_REST}/returnTradeHistory`, queryBody)
      .then((res) => {
         //The header containers a idex-next-cursor property which can be used to get data
         //Which comes before the data included in this request via the before param
         if (res.headers['idex-next-cursor']) {
            getAllTrades(tradingPair, res.headers['idex-next-cursor'])
         }

         if (res.data.length > 0) {
            //Add exchange and trading pair data to each object in array of objects
            const parsedTrades = res.data.map((tradeData) => {
               return {
                  time: new Date(tradeData.timestamp * 1000).toISOString(),
                  trade_id: tradeData.tid,
                  price: tradeData.price,
                  amount: tradeData.total,
                  exchange: 'idex',
                  trading_pair: tradingPair.name,
               }
            })
            //Insert it into the database
            // tradesApi.insert(parsedTrades).catch((err) => {
            //    if (!err.message.includes('unique')) {
            //       console.log(err)
            //       console.log(err.message, '\n^^ IDEX REST INSERTION')
            //    }
            // })
            insertionBatcher.add(...parsedTrades)
            //console.log(`[IDEX] REST API +${parsedTrades.length} Trades FROM ${tradingPair.name} - ${parsedTrades[0].time}`)
         }
      })
      .catch((err) => {
         console.log(err)
         console.log(err.message, '\n^^ IDEX REST (TRADES)')
      })
   /*
        [
            {
                type: 'buy',
                date: '2019-05-11 10:23:52',
                amount: '29048488.368259483593638827',
                total: '0.813032449156059712',
                uuid: 'dffdd260-73d6-11e9-be2b-b71e7e13e81b',
                tid: 3770997,
                timestamp: 1557570232,
                price: '0.000000027988804059',
                taker: '0xf23355adac24083b31f328847f58d36e4a7db761',
                maker: '0x51edc604fcf7499b7c2a9176059ef60a8b66ff7c',
                orderHash: '0x1d11fb470b29dc832cc65bb123fe04e9546559a82fb74d52b8f958706d8a6af3',
                transactionHash: '0x44f860193b7e91d1cc9be55c2998892640f375267ec1625e31ed14b9d4e495c7',
                tokenBuy: '0x0000000000000000000000000000000000000000',
                buyerFee: '58096.976736518967187278',
                gasFee: '46161.314976725249855418',
                sellerFee: '0.00081303244915606',
                tokenSell: '0xe9f9547c17fc9539df99a42dcb6ec38165994c45',
                usdValue: '156.058583771869365695'
            },
            ...
        ]
    */
}

//TODO: Not getting any response from the WS handshake
// Not sure why, but this is a low volume exchange, so I will leave it for later
// Another engineering challenge is that there seem to be 640 markets
// But according to IDEX documentation, you can only subscribe to 100 per connection...
// function syncAllTrades(tradingPairs) {
//     //Setup WS
//     const ws = new WebSocket(process.env.IDEX_WS, {
//         request: 'handshake',
//         payload: JSON.stringify({
//             version: '1.0.0',
//             key: process.env.IDEX_KEY
//         })
//     })

//     //Open WS connection
//     ws.on('open', () => {
//         console.log(`IDEX WS Connected at ${process.env.IDEX_WS}`)
//         //Send handshake message when the connection is established
//         //  IDEX will send back a session id (sid) which must be included with every request thereafter
//         const handshake = JSON.stringify({
//             request: 'handshake',
//             payload: {
//                 version: '1.0.0',
//                 key: process.env.IDEX_KEY
//             }
//         })
//         ws.send(handshake)
//     });

//     //Handle messages received
//     ws.on('message', (data) => {
//         data = JSON.parse(data)
//         console.log(data)
//         // You can only subscribe to 100 markets at a time...
//         // Subscribe to channels
//         // Send subscription message
//         const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.id)
//         const subscriptionConfig = JSON.stringify({
//             type: 'subscribe',
//             product_ids: tradingPairIds,
//             channels: [{
//                 name: 'full',
//                 product_ids: tradingPairIds
//             }]
//         })
//         ws.send(subscriptionConfig);

//         //Receive trades
//         //If message includes a successful trade
//         if (data.type === 'match') {
//             //Construct trades row
//             const trade = {
//                 time: data.time,
//                 trade_id: data.trade_id,
//                 price: data.price,
//                 amount: data.size,
//                 exchange: 'coinbase',
//                 trading_pair: tradingPairs.find(tradingPair=>tradingPair.id === data.product_id).display_name
//             }
//             //Insert it into the database
//             tradesApi.insert(trade);
//             //Update the console with the WS status
//             if (trade.trade_id % process.env.UPDATE_FREQ === 0) {
//                 console.log(`WS ALIVE - Coinbase - ${trade.time}`)
//             }
//         }
//     })

//     //Handle errors
//     ws.on('error', (error) => {
//         console.log(`WebSocket error: ${error}`,error)
//     })

//     //Handle upgrades
//     //Prob not needed- being used for troubleshooting
//     ws.on('upgrade', (error) => {
//         error.on('data', res=> console.log('hey',res))
//         error.on('event', res=> console.log('heyyy',res))
//         console.log(`WebSocket upgrade:`)
//     })
// }

module.exports = {
   getTradingPairs,
   getAllTrades,
   // syncAllTrades
}
