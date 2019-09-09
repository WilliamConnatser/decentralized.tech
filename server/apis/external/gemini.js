const WebSocket = require('ws')
const SmartAxios = require('../../utility/SmartAxios')
const gemini = new SmartAxios('gemini')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

//Gets Gemini trading pairs
function getTradingPairs() {
    return gemini.axios.get(`${process.env.GEMINI_REST}/symbols`)
        .then(res => {
            //Returns a plain array of trading pairs
            return res.data;
        })
        .catch(err => {
            console.log(err.message, '<< GEMINI REST (TRADING PAIRS)')
        });
    /*
    [
        'btcusd',
        'ethbtc',
        'ethusd',
        'bchusd',
        'bchbtc',
        'bcheth',
        'ltcusd',
        'ltcbtc',
        'ltceth',
        'ltcbch',
        'zecusd',
        'zecbtc',
        'zeceth',
        'zecbch',
        'zecltc'
    ]
    */
}

//Get Gemini trades for a specific trading pair
//Use the last timestamp in the response to get older transactions
//Gemini only provides data 7 days back
function getAllTrades(tradingPair, timestamp) {
    //Setup query parameters
    const queryParams = {
        limit_trades: 500
    }
    if (timestamp) {
        queryParams.since = timestamp;
    }
    gemini.axios.get(`${process.env.GEMINI_REST}/trades/${tradingPair}${objectToQuery(queryParams)}`)
        .then(({
            data
        }) => {
            //Add exchange and trading pair data to each object in array of objects
            const parsedTrades = data.map(trade => {
                return {
                    time: new Date(trade.timestampms).toISOString(),
                    trade_id: trade.tid,
                    price: trade.price,
                    amount: trade.amount,
                    exchange: 'gemini',
                    trading_pair: tradingPair
                }
            })
            //Insert parsed trades into the database
            tradesApi.insertMany(parsedTrades)
                .catch(err => {
                    if(!err.message.includes('unique')) {
                        console.log(err.message, '<< GEMINI REST INSERTION')
                    }
                })
            //If the response consisted of 500 trades
            if (parsedTrades.length === 500) {
                const timestamp = data[data.length - 1].timestampms
                //Then recursively get the next 500 trades
                //Requests are rate limited by 1 second in SmartAxios
                getAllTrades(tradingPair, timestamp)
            }
            //console.log(`[BITSTAMP] +${parsedTrades.length} Trades FROM ${tradingPair}`)
        })
        .catch(err => {
            if(!err.message.includes('before the earliest available historical date')) {
                console.log(err.message, '<< GEMINI REST (TRADES)')
            }
        })
    // Example response:
    // [
    //     {
        //     timestamp: 1563852474,
        //     timestampms: 1563852474042,
        //     tid: 7544782407,
        //     price: '10261.99',
        //     amount: '0.00006',
        //     exchange: 'gemini',
        //     type: 'buy'
        // },
    //     ...
    // ]
}

function syncAllTrades(tradingPairs) {
    tradingPairs.forEach(tradingPair => {
        const queryParams = objectToQuery({trades: true})
        //Setup WS
        const ws = new WebSocket(`${process.env.GEMINI_WS}${tradingPair}${queryParams}`)
        //Open WS connection
        ws.on('open', () => {
            //console.log(`[GEMINI] WS Connected at ${process.env.GEMINI_WS}${tradingPair}${queryParams}`)
            //No need for a subscription message
            //Settings are handled via the WS path and query params
        });
    
        //Handle messages received
        ws.on('message', (data) => {
            data = JSON.parse(data);
            //Parse trade data from the message
            const tradeData = data.events.map((trade) => {
                return {
                    time: new Date(data.timestampms),
                    trade_id: trade.tid,
                    price: trade.price,
                    amount: trade.amount,
                    exchange: 'gemini',
                    trading_pair: tradingPair
                }
            })        
            //Insert the parsed trade into the database
            tradesApi.insert(tradeData)
                .catch(err => {
                    if(!err.message.includes('unique')) console.log(err.message, '<< GEMINI WS INSERTION')
                })
            //Update the console with the WS status
            if (data.timestampms % process.env.UPDATE_FREQ === 0) {
                //console.log(`[GEMINI] WS ALIVE - ${new Date(data.timestampms)} - ${tradingPair}`)
            }
        });    
        //Handle errors
        ws.on('error', (err) => {
            //TODO: Possible bug?
            //Not sure why this 429 is occuring occasionally when the server first boots up
            //Recursively call syncAllTrades again with only this trading pair to ensure full coverage
            if(err.message.includes('429')) {
                syncAllTrades([tradingPair])
            } else {
                console.log(err, '<< GEMINI WS', tradingPair)
            }
        })
    })}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}