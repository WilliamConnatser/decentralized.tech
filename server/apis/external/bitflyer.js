const axios = require('axios');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get BitFlyer trading pairs
    //The product_code property can be used to get trading-pair-specific trades
    return axios.get(`${process.env.BITFLYER_REST}/getmarkets`)
        .then(res => {
            //Filter out futures and CFDs
            //TODO: Currently not supporting either..
            const filteredPairs = res.data.filter(tradingPair => !tradingPair.product_code.includes('FX_') && !tradingPair.product_code.includes('2019'));
            return filteredPairs.map(tradingPair => ({id:tradingPair.product_code,name: tradingPair.product_code.toLowerCase().replace('_','')}))
        })
        .catch(err => {
            console.log(err)
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
    //Notify console API is alive
    if (before % process.env.UPDATE_FREQ === 0)
    console.log(`API ALIVE - BitFlyer - ${tradingPair.name}`)
    //Get BitFlyer trades for a specific trading pair
    //Use the last before in the response to get older transactions
    const queryParams = {
        count: 100,
        product_code: tradingPair.id
    }
    if (before)
        queryParams.before = before;
    axios.get(`${process.env.BITFLYER_REST}/getexecutions/${objectToQuery(queryParams)}`)
        .then(({data}) => {
            console.log(data)
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.map(trade => {
                return {
                    time: new Date(trade.exec_date).toISOString(),
                    trade_id: trade.id,
                    price: trade.price,
                    amount: trade.size,
                    exchange: 'bitflyer',
                    trading_pair: tradingPair.name
                }
            })
            //Insert it into the database
            tradesApi.insert(hydratedData);
            //If the response consisted of 100 trades
            //Then recursively get the next 100 trades
            if(hydratedData.length === 100) {                
                const before = hydratedData[hydratedData.length-1].trade_id;
                //Todo: No mention of rate limits for this API ???
                setTimeout(() => getAllTrades(tradingPair,before),250)
            }
        })
        .catch(err => {
            console.log(err)
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

// function syncAllTrades(tradingPairs) {
//     //Setup WS
//     const ws = new WebSocket(process.env.BITFLYER_WS)
//     const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.id)

//     //Open WS connection
//     ws.on('open', () => {
//         console.log(`BitFlyer WS Connected at ${process.env.BITFLYER_WS}`)
//         //Send subscription message for each trading pair
//         tradingPairIds.forEach(tradingPair => {
//             const subscriptionConfig = JSON.stringify({
//                 channel: 'bts:subscribe',
//                 data: {
//                     channel: `live_trades_${tradingPair}`
//                 }
//             });
//             ws.send(subscriptionConfig);
//         })
//     });

//     //Handle messages received
//     ws.on('message', (data) => {
//         data = JSON.parse(data);
//         //If message includes a successful trade
//         if (data.event === 'trade') {
//             //Grab the url_symbol from the channel property
//             const url_symbol = data.channel.split('_')[data.channel.split('_').length - 1]
//             //Construct trade row
//             const tradeData = data.data;
//             const trade = {
//                 time: new Date(tradeData.timestamp * 1000).toISOString(),
//                 trade_id: tradeData.id,
//                 price: tradeData.price,
//                 amount: tradeData.amount,
//                 exchange: 'bitstamp',
//                 trading_pair: tradingPairs.find(tradingPair => tradingPair.url_symbol === url_symbol).name
//             }
//             //Insert trade into the database
//             tradesApi.insert(trade);
//             //Update the console with the WS status
//             if (trade.trade_id % process.env.UPDATE_FREQ === 0)
//                 console.log(`WS ALIVE - Bitstamp - ${url_symbol} - ${new Date(tradeData.timestamp * 1000).toISOString()}`)
//         }
//         //If the WS server is going down for maintenance
//         else if (data.event == 'bts-request_reconnect') {
//             //This message means the WS server we are connected to is going down for maintenance
//             //By reconnecting it will automatically connect us to a new server
//             syncAllTrades(tradingPairs)
//         }
//     });
//     // Example message:
//     // {
//     //     type: 'match',
//     //     trade_id: 1797465,
//     //     maker_order_id: '6865cc86-7cd3-4ded-a6d2-e554a36f5a93',
//     //     taker_order_id: '1be42c56-cac3-4a1b-a1a1-4248cb2b8d9b',
//     //     side: 'buy',
//     //     size: '1.00000000',
//     //     price: '0.24200000',
//     //     product_id: 'BAT-USDC',
//     //     sequence: 503529021,
//     //     time: '2019-07-21T19:14:57.457000Z'
//     // }

//     //Handle errors
//     ws.on('error', (error) => {
//         console.log(`WebSocket error: ${error}`)
//     })
// }

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}