const SmartAxios = require('../../utility/SmartAxios')
const coinbase = new SmartAxios('coinbase')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {
    //Get Coinbase trading pairs
    //The id property can be used in API requests
    return coinbase.axios.get(`${process.env.COINBASE_REST}/products`)
        .then(res => {
            //Return parsed response
            return res.data.map(pair => ({
                id: pair.id,
                name: pair.id.replace('-','').toLowerCase()
            }))
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

function getAllTrades(tradingPair, cbAfter=null) {
    //Construct query parameters
    let queryParam = '';
    if (cbAfter) {
        queryParam = objectToQuery({
            after: cbAfter
        });
    }

    //Get Coinbase trades for a specific trading pair ID
    coinbase.axios.get(`${process.env.COINBASE_REST}/products/${tradingPair.id}/trades${queryParam}`)
        .then(res => {
            //The header containers a cb-after property which can be used to get data
            //Which comes before the data included in this request via the before param
            if (res.headers['cb-after']) {
                //Delay calls .25 seconds to obey by rate limits
                setTimeout(() => getAllTrades(tradingPair, res.headers['cb-after']), 250)
            }
            //Parse each trade response
            const tradeData = res.data.map(trade => {
                return {
                    time: new Date(trade.time).toISOString(),
                    trade_id: trade.trade_id,
                    price: trade.price,
                    amount: trade.size,
                    exchange: 'coinbase',
                    trading_pair: tradingPair.name
                }
            })
            //Insert parsed trades into the database
            tradesApi.insert(tradeData)
                .catch(err => {
                    if(!err.message.includes('unique')) console.log(err.message, '<< COINBASE REST')
                })
            console.log(`[COINBASE] +${res.data.length} Trades FROM ${tradingPair.name} (cbAfter = ${cbAfter})`)
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
        console.log(`[COINBASE] WS Connected at ${process.env.COINBASE_WS}`)
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
            const tradingPair = tradingPairs.find(tradingPair=>tradingPair.id === data.product_id).name
            const trade = {
                time: data.time,
                trade_id: data.trade_id,
                price: data.price,
                amount: data.size,
                exchange: 'coinbase',
                trading_pair: tradingPair
            }
            //Insert it into the database
            tradesApi.insert(trade)
                .catch(err => {
                    if(!err.message.includes('unique')) console.log(err.message, '<< COINBASE WS')
                })
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0)
                console.log(`[COINBASE] WS ALIVE - ${trade.time} - ${tradingPair}`)
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