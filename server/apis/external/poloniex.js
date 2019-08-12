const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {
    //Get Poloniex trading pairs
    //The product_code property can be used to get trading-pair-specific trades
    return axios.get(`${process.env.POLONIEX_REST}?command=returnTicker`)
        .then(res => {
            //Parse trading pairs
            const tradingPairs = Object.keys(res.data).map(tradingPair => ({
                id: tradingPair,
                name: tradingPair.replace('_', '').toLowerCase()
            }))
            return tradingPairs;
        })
        .catch(err => {
            console.log(err)
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

function getAllTrades(tradingPair, end=Date.now()) {
    //Notify console API is alive
    if (end % process.env.UPDATE_FREQ === 0)
        console.log(`API ALIVE - Poloniex - ${tradingPair.name}`)
    //Get Poloniex trades for a specific trading pair
    //Use the last before in the response to get older transactions
    const queryParams = {
        command: 'returnTradeHistory',
        currencyPair: tradingPair.id,
        end
    }
    axios.get(`${process.env.POLONIEX_REST}${objectToQuery(queryParams)}`)
        .then(({
            data
        }) => {
            console.log(data[0].date)
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.map(trade => {
                return {
                    time: new Date(trade.date).toISOString(),
                    trade_id: trade.globalTradeID,
                    price: trade.rate,
                    amount: trade.total,
                    exchange: 'poloniex',
                    trading_pair: tradingPair.name
                }
            })
            //Insert it into the database
            tradesApi.insert(hydratedData);
            // If the response consisted of trades
            // Then recursively get the next trades
            if (hydratedData.length > 0) {
                const end = new Date(data[data.length - 1].date).getTime() / 1000;
                //Todo: No mention of rate limits for this API ???
                setTimeout(() => getAllTrades(tradingPair, end), 250)
            }
        })
        .catch(err => {
            console.log(err)
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

//TODO: Implement Poloniex WS
// The following was copied from another module.. need to edit

// function syncAllTrades(tradingPairs) {
//     //Setup WS
//     const ws = new WebSocket(process.env.BITFLYER_WS)

//     //Open WS connection
//     ws.on('open', () => {
//         console.log(`BitFlyer WS Connected at ${process.env.BITFLYER_WS}`)
//         //Send subscription message for each trading pair
//         tradingPairs.forEach(tradingPair => {
//             const subscriptionConfig = JSON.stringify({
//                 method: "subscribe",
//                 params: {
//                     channel: `lightning_executions_${tradingPair.id}`
//                 }
//             });
//             ws.send(subscriptionConfig);
//         })
//     });

//     //Handle messages received
//     ws.on('message', (data) => {
//         data = JSON.parse(data);        
//         //Grab the trading pair from the channel property
//         const tradingPairId = data.params.channel.replace("lightning_executions_","")
//         //Each message contains an array of trades
//         const tradeDataArray = data.params.message
//         for(tradeData of tradeDataArray) {            
//             //Construct trade row
//             const trade = {
//                 time: tradeData.exec_date,
//                 trade_id: tradeData.id,
//                 price: tradeData.price,
//                 amount: tradeData.size,
//                 exchange: 'bitflyer',
//                 trading_pair: tradingPairs.find(tradingPair => tradingPair.id === tradingPairId).name
//             }
//             //Insert trade into the database
//             tradesApi.insert(trade);
//             //Update the console with the WS status
//             if (trade.trade_id % process.env.UPDATE_FREQ === 0)
//                 console.log(`WS ALIVE - Bitflyer - ${tradingPairId} - ${tradeData.exec_date}`)
//         }
//     });
//     // Example message:
//     // { 
//     //     id: 1202798746,
//     //     side: 'SELL',
//     //     price: 1192000,
//     //     size: 0.199,
//     //     exec_date: '2019-08-11T00:08:27.3619227Z',
//     //     buy_child_order_acceptance_id: 'JRF20190811-000827-016860',
//     //     sell_child_order_acceptance_id: 'JRF20190811-000827-411553'
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