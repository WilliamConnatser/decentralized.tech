const axios = require('axios');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {
    /*
        Bithumb does not currently have and endpoint to get available trading pairs
        All of them involve the South Korean Won IE. CYPTO/KRW
        There are 89 trading pairs as of 7/21/19
    */

    const tickersTraded = [
        'BTC',
        'ETH',
        'XRP',
        'LTC',
        'BCH',
        'EOS',
        'BSV',
        'TRX',
        'XLM',
        'ADA',
        'XMR',
        'DASH',
        'LINK',
        'ETC',
        'XEM',
        'ZEC',
        'BTG',
        'VET',
        'BAT',
        'QTUM',
        'OMG',
        'BTT',
        'BCD',
        'ICX',
        'WAVES',
        'NPXS',
        'ZRX',
        'REP',
        'HC',
        'IOST',
        'LAMB',
        'THETA',
        'ZIL',
        'XVG',
        'GXC',
        'AE',
        'STEEM',
        'MIX',
        'WTC',
        'MCO',
        'SNT',
        'ENJ',
        'VALOR',
        'ELF',
        'GNT',
        'WAX',
        'STRAT',
        'HDAC',
        'CON',
        'ORBS',
        'LOOM',
        'PPT',
        'CMT',
        'LRC',
        'POWR',
        'TRUE',
        'KNC',
        'PIVX',
        'ABT',
        'ANKR',
        'BHP',
        'ETZ',
        'POLY',
        'ROM',
        'ITC',
        'CTXC',
        'MTL',
        'DAC',
        'MITH',
        'PAY',
        'HYC',
        'APIS',
        'GTO',
        'RDN',
        'SALT',
        'ETHOS',
        'LBA',
        'BZNT',
        'OCN',
        'AUTO',
        'INS',
        'RNT',
        'TMTG',
        'PST',
        'ARN',
        'AMO',
        'DACC',
        'WET',
        'PLY',
    ]

    return tickersTraded.map(ticker => ({
        id: ticker,
        name: `${ticker}/KRW`
    }));
}

function getAllTrades(tradingPair, cont_no) {
    //Notify console API is alive
    if (cont_no % process.env.UPDATE_FREQ === 0)
    console.log(`WS ALIVE - Bithumb - ${tradingPair.name}`)
    //Get Bithumb trades for a specific trading pair
    //Use the last cont_no in the response to get older transactions
    const queryParams = {
        count: 100
    }
    if (cont_no)
        queryParams.count_no = cont_no;
    axios.get(`${process.env.BITHUMB_REST}/transaction_history/${tradingPair.id}${objectToQuery(queryParams)}`)
        .then(({data}) => {
            console.log(data.data[0])
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.data.map(trade => {
                return {
                    time: new Date(trade.transaction_date).toISOString(),
                    trade_id: trade.cont_no,
                    price: trade.price,
                    amount: trade.units_traded,
                    buy: trade.type === 'ask' ? true : false,
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