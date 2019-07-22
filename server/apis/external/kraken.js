const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Kraken trading pairs
    //The id property can be used in API requests
    return axios.get(`${process.env.KRAKEN_REST}/AssetPairs`)
        .then(res => {
            const parsedResult = Object.keys(res.data.result).map(tradingPair => {
                //Todo: I thought wsname property was the name of the trading pair
                //But it's undefined on some trading pairs???
                return res.data.result[tradingPair]
            })
            //Return response as-is
            return parsedResult;
        })
        .catch(err => {
            console.log(err)
        })
}

module.exports = {
    getTradingPairs,
}