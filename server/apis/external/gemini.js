const axios = require('axios');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Gemini trading pairs
    return axios.get(`${process.env.GEMINI_REST}/symbols`)
        .then(res => {
            //Returns a plain array of tickers as they should be included in requests
            //Todo: All other APIs insert trading pairs in the format of:
            //UPPERCASE tickers separated by a backslash
            //IE. BTC/USD
            //Need to either convert these trading pairs or other APIs trading pairs to normalize the data
            return res.data;
        })
        .catch(err => {
            console.log(err)
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

function getAllTrades(tradingPair, timestamp) {
    //Notify console API is alive
    if (timestamp && timestamp % process.env.UPDATE_FREQ === 0)
        console.log(`API ALIVE - Gemini - ${tradingPair}`)
    //Get Gemini trades for a specific trading pair
    //Use the last timestamp in the response to get older transactions
    //Gemini only provides data 7 days back
    const queryParams = {
        limit_trades: 500
    }
    if (timestamp)
        queryParams.since = timestamp;
    axios.get(`${process.env.GEMINI_REST}/trades/${tradingPair}${objectToQuery(queryParams)}`)
        .then(({
            data
        }) => {
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.map(trade => {
                return {
                    time: new Date(trade.timestampms).toISOString(),
                    trade_id: trade.tid,
                    price: trade.price,
                    amount: trade.amount,
                    exchange: 'gemini',
                    trading_pair: tradingPair
                }
            })
            //Insert it into the database
            tradesApi.insert(hydratedData);
            //If the response consisted of 500 trades
            //Then recursively get the next 500 trades
            if (hydratedData.length === 500) {
                const timestamp = data[data.length - 1].timestampms;
                //Rate limit requests by .25 seconds
                //Todo: There are 15 trading pairs and only 1 request "recommended" per second
                //Will need to figure out a way to rate limit requests across all trading pairs
                setTimeout(() => getAllTrades(tradingPair, timestamp), 1000)
            }
        })
        .catch(err => {
            console.log(err)
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

module.exports = {
    getTradingPairs,
    getAllTrades
}