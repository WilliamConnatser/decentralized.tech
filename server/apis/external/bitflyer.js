const SmartAxios = require('../../utility/SmartAxios')
const bitflyer = new SmartAxios('bitflyer')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {
    //Get BitFlyer trading pairs
    //The product_code property can be used to get trading-pair-specific trades
    return bitflyer.axios.get(`${process.env.BITFLYER_REST}/getmarkets`)
        .then(res => {
            //Filter out futures and CFDs
            //TODO: Currently not supporting either futures or CFDs...
            //Add support or continue to ignore?
            const filteredPairs = res.data.filter(tradingPair => !tradingPair.product_code.includes('FX_') && !tradingPair.product_code.includes('2019'));
            return filteredPairs.map(tradingPair => ({
                id: tradingPair.product_code,
                name: tradingPair.product_code.toLowerCase().replace('_', '')
            }))
        })
        .catch(err => {
            console.log(err.message, '<< BITFLYER REST (TRADING PAIRS)')
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
        product_code: tradingPair.id
    }
    if (before)
        queryParams.before = before;
    bitflyer.axios.get(`${process.env.BITFLYER_REST}/getexecutions/${objectToQuery(queryParams)}`)
        .then(({
            data
        }) => {
            //Add exchange and trading pair data to each object in array of objects
            const parsedData = data.map(trade => {
                return {
                    time: new Date(trade.exec_date).toISOString(),
                    trade_id: trade.id,
                    price: trade.price,
                    amount: trade.size,
                    exchange: 'bitflyer',
                    trading_pair: tradingPair.name
                }
            })
            //Insert parsed trades into the database
            tradesApi.insert(parsedData)
                .catch(err => {
                    if(!err.message.includes('unique')) {
                        console.log(err.message, '<< BITFLYER REST INSERTION')
                    }
                })
            //console.log(`[BITFLYER] +${parsedData.length} Trades FROM ${tradingPair.name}`)
            //If the response consisted of 100 trades
            //Then recursively get the next 100 trades
            if (parsedData.length === 100) {
                const before = parsedData[parsedData.length - 1].trade_id
                //Todo: No mention of rate limits for this API ???
                if(tradingPair.name !== 'bchbtc')
                    getAllTrades(tradingPair, before)
            }
        })
        .catch(err => {
            console.log(err.message, '<< BITFLYER REST')
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
        tradingPairs.forEach(tradingPair => {
            const subscriptionConfig = JSON.stringify({
                method: "subscribe",
                params: {
                    channel: `lightning_executions_${tradingPair.id}`
                }
            })
            ws.send(subscriptionConfig)
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
            tradesApi.insert(trade)
                .catch(err => {
                    if(!err.message.includes('unique')) {
                        console.log(err.message, '<< BITFLYER WS INSERTION')
                    }
                })
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0) {
                //console.log(`WS ALIVE - Bitflyer - ${tradingPairId} - ${tradeData.exec_date}`)
            }
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
        console.log(err.message, '<< BITFLYER WS')
    })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}