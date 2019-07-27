const axios = require('axios');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Bitflyer trading pairs
    //The product_code property can be used to get trading-pair-specific trades
    return axios.get(`${process.env.BITFLYER_REST}/getmarkets`)
        .then(res => {
            //Filter out futures and CFDs
            //TODO: Currently not supporting either..
            const filteredPairs = res.data.filter(tradingPair => !tradingPair.product_code.includes('FX_') && !tradingPair.product_code.includes('2019'));
            return filteredPairs.map(tradingPair => ({id:tradingPair.product_code,name: tradingPair.product_code.toLowerCase().replace('_','')}))
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

function getAllTrades(tradingPair, cont_no) {
    //Notify console API is alive
    if (cont_no % process.env.UPDATE_FREQ === 0)
    console.log(`API ALIVE - Bithumb - ${tradingPair.name}`)
    //Get Bithumb trades for a specific trading pair
    //Use the last cont_no in the response to get older transactions
    const queryParams = {
        count: 100
    }
    if (cont_no)
        queryParams.count_no = cont_no;
    axios.get(`${process.env.BITHUMB_REST}/transaction_history/${tradingPair.id}${objectToQuery(queryParams)}`)
        .then(({data}) => {
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.data.map(trade => {
                return {
                    time: new Date(trade.transaction_date).toISOString(),
                    trade_id: trade.cont_no,
                    price: trade.price,
                    amount: trade.units_traded,
                    exchange: 'bithumb',
                    trading_pair: tradingPair.name
                }
            })
            //Insert it into the database
            tradesApi.insert(hydratedData);
            //If the response consisted of 100 trades
            //Then recursively get the next 100 trades
            if(hydratedData.length === 100) {                
                const lastContNo = hydratedData[hydratedData.length-1].cont_no;
                //Rate limit requests by .25 seconds
                //Todo: There are 89 trading pairs and only 55 requests allowed per second
                //Will need to figure out a way to rate limit requests across all trading pairs
                setTimeout(() => getAllTrades(tradingPair,lastContNo),250)
            }
        })
        .catch(err => {
            console.log(err)
        })    
        // Example response:
        // [
        //     {
        //         cont_no: '37998960',
        //         transaction_date: '2019-07-22 08:07:03',
        //         type: 'ask',
        //         units_traded: '0.0267',
        //         price: '12563000',
        //         total: '335432'
        //     },
        //     ...
        // ]
}

module.exports = {
    getTradingPairs,
    getAllTrades
}