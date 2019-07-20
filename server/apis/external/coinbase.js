const axios = require('axios');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades')

function getTradingPairs() {

    //Get Coinbase trading pairs
    //The ID can be used to get each trade
    return axios.get(`${process.env.COINBASE_URL}/products`)
        .then(res => {
            //Array of trading pairs
            return res.data;
        })
        .catch(err => {
            console.log(err)
        })
    /* Response:
        [
            {
                id: 'BAT-USDC',
                base_currency: 'BAT',
                quote_currency: 'USDC',
                base_min_size: '1',
                base_max_size: '300000',
                base_increment: '1',
                quote_increment: '0.000001',
                display_name: 'BAT/USDC',
                status: 'online',
                margin_enabled: false,
                status_message: '',
                min_market_funds: '1',
                max_market_funds: '100000',
                post_only: false,
                limit_only: false,
                cancel_only: false
            },
            ...
        ]
    
    */
}

function getAllTrades(ticker = "BTC-USD", cbAfter) {

    let queryParam = '';
    if (cbAfter) {
        queryParam = objectToQuery({
            after: cbAfter
        })
    }

    console.log("yolo")

    //Get Coinbase trades for a specific trading pair ID
    axios.get(`${process.env.COINBASE_URL}/products/${ticker}/trades${queryParam}`)
        .then(res => {
            //The header containers a cb-after property which can be used to get data
            //Which comes before the data included in this request via the before param
            if (res.headers['cb-after']) {
                //Delay calls .25 seconds to obey by rate limits
                setTimeout(() => getAllTrades(ticker, res.headers['cb-after']), 250)
            } else {
                return true;
            }

            //Add exchange data to each object in array of objects
            const dataWithExchange = res.data.map(trade => {
                return {
                    ...trade,
                    exchange: 'coinbase'
                }
            })

            //Insert it into the database
            tradesApi.insert(dataWithExchange);
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