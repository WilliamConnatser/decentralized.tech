const SmartAxios = require('../../utility/SmartAxios')
const kraken = new SmartAxios('kraken')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {

    //Get Kraken trading pairs
    //The id property can be used in API requests
    return kraken.axios.get(`${process.env.KRAKEN_REST}/AssetPairs`)
        .then(res => {
            return Object.keys(res.data.result).map(tradingPair => {
                return {
                    id: tradingPair,
                    name: res.data.result[tradingPair].altname.replace('.d', '').toLowerCase(),
                    ws: res.data.result[tradingPair].wsname,
                }
            })
        })
        .catch(err => {
            console.log(err)
        })
}

function getAllTrades(tradingPair, since=null) {
    //Construct query parameters
    let queryParams = {
        pair: tradingPair.id
    };
    if (since) {
        queryParams.since = since;
    }
    queryParams = objectToQuery(queryParams)

    //Get Kraken trades for a specific trading pair ID
    kraken.axios.get(`${process.env.KRAKEN_REST}/Trades${queryParams}`)
        .then(({data}) => {
            //The response contains a `last` property which can be used via longpolling
            if (data.result.last) {
                //Update orders every 5 minutes
                setTimeout(() => getAllTrades(tradingPair, data.result.last), 25000)
            }
            //Parse each trade response
            data.result[tradingPair.id].forEach(trade => {
                const tradeDate = new Date(trade[2])
                //Insert parsed trade into the database
                tradesApi.insert({
                    time: tradeDate.toISOString(),
                    price: trade[0],
                    amount: trade[1],
                    exchange: 'kraken',
                    trading_pair: tradingPair.name
                }).catch(err => {
                    if(!err.message.includes('unique')) console.log(err.message)
                })
            })
            console.log(`[KRAKEN] +${data.result[tradingPair.id].length} Trades FROM ${tradingPair.name} (since = ${since})`)
        })
        .catch(err => {
            console.log(err)
        })
    /*
        [
            {
                time: '2019-07-15T03:05:17.697Z',
                trade_id: 4578270,
                price: '3905.06000000',
                size: '0.00100000',
                side: 'sell'
            },
            ...
        ]
    */
}

module.exports = {
    getTradingPairs,
    getAllTrades
}