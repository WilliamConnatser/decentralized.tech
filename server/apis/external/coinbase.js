const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Coinbase trading pairs
    //The ID can be used to get each trade
    return axios.get(`${process.env.COINBASE_URL_REST}/products`)
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

function getAllTrades(tradingPair = "BTC-USD", cbAfter) {

    let queryParam = '';
    if (cbAfter) {
        queryParam = objectToQuery({
            after: cbAfter
        })
    }

    //Coinbase Syncing
    if (Number(cbAfter) % process.env.UPDATE_FREQ === 0)
        console.log(`INIT SYNC - Coinbase - ${cbAfter}`)

    //Get Coinbase trades for a specific trading pair ID
    axios.get(`${process.env.COINBASE_URL_REST}/products/${tradingPair}/trades${queryParam}`)
        .then(res => {
            //The header containers a cb-after property which can be used to get data
            //Which comes before the data included in this request via the before param
            if (res.headers['cb-after']) {
                //Delay calls .25 seconds to obey by rate limits
                setTimeout(() => getAllTrades(tradingPair, res.headers['cb-after']), 250)
            }
            //Otherwise, start up the web socket where updates will be received
            else {
                syncAllTrades()
            }

            //Add exchange data to each object in array of objects
            const dataWithExchange = res.data.map(trade => {
                return {
                    ...trade,
                    exchange: 'coinbase',
                    trading_pair: tradingPair
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

function syncAllTrades(tradingPairs) {
    const ws = new WebSocket(process.env.COINBASE_URL_WS)
    console.log(`Coinbase WS Connected at ${process.env.COINBASE_URL_WS}`)

    ws.on('open', () => {
        const subscriptionConfig = JSON.stringify({
            type: "subscribe",
            product_ids: tradingPairs,
            channels: [{
                name: "full",
                product_ids: tradingPairs
            }]
        })
        ws.send(subscriptionConfig);
    });

    ws.on('message', (data) => {
        data = JSON.parse(data);
        if (data.type === 'match') {
            //Construct trades row
            const trade = {
                time: data.time,
                trade_id: data.trade_id,
                price: data.price,
                size: data.size,
                side: data.side,
                exchange: 'coinbase',
                trading_pair: data.product_id
            }
            //Insert it into the database
            tradesApi.insert(trade);
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0)
                console.log(`WS ALIVE - Coinbase - ${trade.trade_id}`)
        }
    });

    ws.on('error', (error) => {
        console.log(`WebSocket error: ${error}`)
    })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}