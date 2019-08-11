const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get EthFinex trading pairs
    return axios.get(`${process.env.ETHFINEX_REST}/tickers?symbols=ALL`)
        .then(res => {
            //The response can include both trading pairs and single currencies
            //Filter for only the trading pairs
            let tradingPairs = res.data.filter(responseArray => responseArray.length == 11);
            //Convert to id / name convention
            tradingPairs = tradingPairs.map(tradingPair => {
                return {
                    id: tradingPair[0],
                    name: tradingPair[0].replace("t", "").toLowerCase()
                }
            })
            //Return sanitized trading pairs
            return tradingPairs;
        })
        .catch(err => {
            console.log(err)
        })
    /* Response:
        [
            [
                'tBFTUSD',
                0.022,
                230801.28077544,
                0.025469,
                333829.46719618,
                -0.001403,
                -0.0582,
                0.022722,
                11194.47255804,
                0.024125,
                0.022722
            ],
            ...
        ]
    
    */
}

function getAllTrades(tradingPair, end) {
    //Construct query parameters
    var queryParams
    if (end) {
        queryParams = objectToQuery({
            limit: 5000,
            end
        });
    } else {
        queryParams = objectToQuery({
            limit: 5000
        });
    }

    //Log To Console About Syncing
    if (Number(end) % process.env.UPDATE_FREQ === 0)
        console.log(`INIT SYNC - EthFinex - ${tradingPair.name} ${end}`)

    //Get EthFinex trades for a specific trading pair
    //TODO: Only 30 requests are allowed per minute
    axios.get(`${process.env.ETHFINEX_REST}/trades/${tradingPair.id}/hist${queryParams}`)
        .then(({data}) => {
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.map(trade => {
                return {
                    time: new Date(trade[1]).toISOString(),
                    trade_id: trade[0],
                    price: trade[3],
                    amount: trade[2],
                    exchange: 'ethfinex',
                    trading_pair: tradingPair.name
                }
            })
            console.log(hydratedData)
            //Insert it into the database
            tradesApi.insert(hydratedData);
        })
        .catch(err => {
            console.log(err)
        })
    /*
        [
            [
                384454718,
                1565496195252,
                1.4062102,
                211.08
            ],
            ...
        ]
    */
}

// Todo: Implement Ethfinex Websockets
// I have not edited any of the code copied from another modules below...


// function syncAllTrades(tradingPairs) {
//     //Setup WS
//     const ws = new WebSocket(process.env.COINBASE_WS)

//     //Open WS connection
//     ws.on('open', () => {
//         console.log(`Coinbase WS Connected at ${process.env.COINBASE_WS}`)
//         //Send subscription message
//         const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.id)
//         const subscriptionConfig = JSON.stringify({
//             type: "subscribe",
//             product_ids: tradingPairIds,
//             channels: [{
//                 name: "full",
//                 product_ids: tradingPairIds
//             }]
//         })
//         ws.send(subscriptionConfig);
//     });

//     //Handle messages received
//     ws.on('message', (data) => {
//         data = JSON.parse(data);
//         //If message includes a successful trade
//         if (data.type === 'match') {
//             //Construct trades row
//             const trade = {
//                 time: data.time,
//                 trade_id: data.trade_id,
//                 price: data.price,
//                 amount: data.size,
//                 exchange: 'coinbase',
//                 trading_pair: tradingPairs.find(tradingPair => tradingPair.id === data.product_id).display_name
//             }
//             //Insert it into the database
//             tradesApi.insert(trade);
//             //Update the console with the WS status
//             if (trade.trade_id % process.env.UPDATE_FREQ === 0)
//                 console.log(`WS ALIVE - Coinbase - ${trade.time}`)
//         }
//     });

//     //Handle errors
//     ws.on('error', (error) => {
//         console.log(`WebSocket error: ${error}`)
//     })
// }

// module.exports = {
//     getTradingPairs,
//     getAllTrades,
//     syncAllTrades
// }