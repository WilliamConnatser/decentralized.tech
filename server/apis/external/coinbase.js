const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Coinbase trading pairs
    //The id property can be used in API requests
    return axios.get(`${process.env.COINBASE_REST}/products`)
        .then(res => {
            //Return response as-is
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

function getAllTrades(tradingPair, cbAfter) {
    //Construct query parameters
    let queryParam = '';
    if (cbAfter) {
        queryParam = objectToQuery({
            after: cbAfter
        });
    }

    //Coinbase Syncing
    if (Number(cbAfter) % process.env.UPDATE_FREQ === 0)
        console.log(`INIT SYNC - Coinbase - ${tradingPair.display_name} ${cbAfter}`)

    //Get Coinbase trades for a specific trading pair ID
    axios.get(`${process.env.COINBASE_REST}/products/${tradingPair.id}/trades${queryParam}`)
        .then(res => {
            //The header containers a cb-after property which can be used to get data
            //Which comes before the data included in this request via the before param
            if (res.headers['cb-after']) {
                //Delay calls .25 seconds to obey by rate limits
                setTimeout(() => getAllTrades(tradingPair, res.headers['cb-after']), 250)
            }
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = res.data.map(trade => {
                return {
                    time: trade.time,
                    trade_id: trade.trade_id,
                    price: trade.price,
                    amount: trade.size,
                    exchange: 'coinbase',
                    trading_pair: tradingPair.display_name
                }
            })
            //Insert it into the database
            tradesApi.insert(hydratedData);
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
    //Setup WS
    const ws = new WebSocket(process.env.COINBASE_WS)

    //Open WS connection
    ws.on('open', () => {
        console.log(`Coinbase WS Connected at ${process.env.COINBASE_WS}`)
        //Send subscription message
        const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.id)
        const subscriptionConfig = JSON.stringify({
            type: "subscribe",
            product_ids: tradingPairIds,
            channels: [{
                name: "full",
                product_ids: tradingPairIds
            }]
        })
        ws.send(subscriptionConfig);
    });

    //Handle messages received
    ws.on('message', (data) => {
        data = JSON.parse(data);
        //If message includes a successful trade
        if (data.type === 'match') {
            //Construct trades row
            const trade = {
                time: data.time,
                trade_id: data.trade_id,
                price: data.price,
                amount: data.size,
                exchange: 'coinbase',
                trading_pair: tradingPairs.find(tradingPair=>tradingPair.id === data.product_id).display_name
            }
            //Insert it into the database
            tradesApi.insert(trade);
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0)
                console.log(`WS ALIVE - Coinbase - ${trade.time}`)
        }
    });

    //Handle errors
    ws.on('error', (error) => {
        console.log(`WebSocket error: ${error}`)
    })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}