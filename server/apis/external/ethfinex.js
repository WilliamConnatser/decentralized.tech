const SmartAxios = require('../../utility/SmartAxios')
const ethfinex = new SmartAxios('ethfinex')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {
    //Get EthFinex trading pairs
    return ethfinex.axios.get(`${process.env.ETHFINEX_REST}/tickers?symbols=ALL`)
        .then(res => {
            //The response can include both trading pairs and single currencies
            //Filter for only the trading pairs
            let tradingPairs = res.data.filter(responseArray => responseArray.length == 11)
            //Convert to id / name convention
            tradingPairs = tradingPairs.map(tradingPair => {
                return {
                    id: tradingPair[0],
                    name: tradingPair[0].replace("t", "").toLowerCase()
                }
            })
            //Return sanitized trading pairs
            return tradingPairs
        })
        .catch(err => {
            console.log(err.message, '<< ETHFINEX REST (TRADING PAIRS)')
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
    var queryParams = {
        limit: 5000
    }
    if (end) {
        queryParams.end = end
    }    
    queryParams = objectToQuery(queryParams)

    //Get EthFinex trades for a specific trading pair
    ethfinex.axios.get(`${process.env.ETHFINEX_REST}/trades/${tradingPair.id}/hist${queryParams}`)
        .then(({
            data
        }) => {
            //Add exchange and trading pair data to each object in array of objects
            const parsedData = data.map(trade => {
                return {
                    time: new Date(trade[1]).toISOString(),
                    trade_id: trade[0],
                    price: trade[3],
                    amount: trade[2],
                    exchange: 'ethfinex',
                    trading_pair: tradingPair.name
                }
            })
            //Insert it into the database
            tradesApi.insert(parsedData)
                .catch(err => {
                    if(!err.message.includes('unique')) {
                        console.log(err.message, '<< ETHFINEX REST INSERTION')
                    }
                })
            console.log(`[ETHFINEX] +${parsedData.length} Trades FROM ${tradingPair.name}`)
        })
        .catch(err => {
            console.log(err.message, '<< ETHFINEX REST (TRADES)')
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

function syncAllTrades(tradingPairs) {
    //Setup WS
    const ws = new WebSocket(process.env.ETHFINEX_WS)
    //Used to connect channel IDs to trading pairs
    const channelLookup = {}

    //Open WS connection
    ws.on('open', () => {
        console.log(`EthFinex WS Connected at ${process.env.ETHFINEX_WS}`)
        //Send subscription messages for each trading pair
        tradingPairs.forEach((tradingPair,i) => {
            setTimeout(() => {
                const subscriptionConfig = JSON.stringify({
                    event: 'subscribe',
                    channel: 'trades',
                    pair: tradingPair.id
                })
                ws.send(subscriptionConfig)
            },1000*i)      
        })
    })

    //Handle messages received
    ws.on('message', (data) => {
        data = JSON.parse(data)
        //Subscription responses are sent as objects
        //Trades are sent as arrays
        if (!Array.isArray(data)) {
            if(data.event === 'subscribed') {
                channelLookup[data.chanId] = data.pair.toLowerCase()
            }
        } else {
            let tradingPair = channelLookup[data[0]]
            //When first subscribing an array of recent trades is sent
            if (Array.isArray(data[1])) {
                data[1].forEach(trade => {
                    const tradeData = {
                        time: new Date(trade[1]).toISOString(),
                        trade_id: trade[0],
                        price: trade[2],
                        amount: trade[3],
                        exchange: 'ethfinex',
                        trading_pair: tradingPair
                    }
                    tradesApi.insert(tradeData)
                });
            }
            //Otherwise data[1] will === "te" or "tu"
            //For each trade both a "te" and "tu" message will be sent
            //"tu" trades supposedly contain real trade IDs
            else if(data[1] === "tu") {
                const trade = data[2]
                const tradeData = {
                    time: new Date(trade[1]).toISOString(),
                    trade_id: trade[0],
                    price: trade[2],
                    amount: trade[3],
                    exchange: 'ethfinex',
                    trading_pair: tradingPair
                }
                tradesApi.insert()
                    .catch(err => {
                        console.log(err.message, '<< ETHFINEX WS INSERTION')
                    })
            }
        }
    });

    //Handle errors
    ws.on('error', (err) => {
        console.log(err.message, '<< ETHFINEX WS')
    })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}