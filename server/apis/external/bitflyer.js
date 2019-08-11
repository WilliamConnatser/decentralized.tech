const axios = require('axios');
const WebSocket = require('ws');
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
            return filteredPairs.map(tradingPair => ({
                id: tradingPair.product_code,
                name: tradingPair.product_code.toLowerCase().replace('_', '')
            }))
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
        .then(({
            data
        }) => {
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
            if (hydratedData.length === 100) {
                const before = hydratedData[hydratedData.length - 1].trade_id;
                //Todo: No mention of rate limits for this API ???
                setTimeout(() => getAllTrades(tradingPair, before), 250)
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

function syncAllTrades(tradingPairs) {
    //Setup WS
    const ws = new WebSocket(process.env.BITFLYER_WS)

    //Open WS connection
    ws.on('open', () => {
        console.log(`BitFlyer WS Connected at ${process.env.BITFLYER_WS}`)
        //Send subscription message for each trading pair
        tradingPairs.forEach(tradingPair => {
            const subscriptionConfig = JSON.stringify({
                method: "subscribe",
                params: {
                    channel: `lightning_executions_${tradingPair.id}`
                }
            });
            ws.send(subscriptionConfig);
        })
    });

    //Handle messages received
    ws.on('message', (data) => {
        data = JSON.parse(data);        
        //Grab the trading pair from the channel property
        const tradingPairId = data.params.channel.replace("lightning_executions_","")
        //Each message contains an array of trades
        const tradeDataArray = data.params.message
        for(tradeData of tradeDataArray) {            
            //Construct trade row
            const trade = {
                time: tradeData.exec_date,
                trade_id: tradeData.id,
                price: tradeData.price,
                amount: tradeData.size,
                exchange: 'bitflyer',
                trading_pair: tradingPairs.find(tradingPair => tradingPair.id === tradingPairId).name
            }
            //Insert trade into the database
            tradesApi.insert(trade);
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0)
                console.log(`WS ALIVE - Bitflyer - ${tradingPairId} - ${tradeData.exec_date}`)
        }
    });
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
    ws.on('error', (error) => {
        console.log(`WebSocket error: ${error}`)
    })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}