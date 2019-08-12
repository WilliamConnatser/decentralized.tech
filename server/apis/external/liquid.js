//API users should not make more than 300 requests per 5 minute.

const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Liquid trading pairs
    //The id property can be used in API requests
    return axios.get(`${process.env.LIQUID_REST}/products`)
        .then(res => {
            //Filter and parse response
            const parsedPairs = res.data.filter(tradingPair => !tradingPair.disabled)
                .map(tradingPair => ({
                    id: tradingPair.id,
                    name: tradingPair.currency_pair_code.toLowerCase()
                }));
            return parsedPairs;
        })
        .catch(err => {
            console.log(err)
        })
    /* Response:
        [
            {
                id: '293',
                product_type: 'CurrencyPair',
                code: 'CASH',
                name: null,
                market_ask: 0.00004,
                market_bid: 0.00001108,
                indicator: -1,
                currency: 'ETH',
                currency_pair_code: 'SGNETH',
                symbol: 'SGN',
                btc_minimum_withdraw: null,
                fiat_minimum_withdraw: null,
                pusher_channel: 'product_cash_sgneth_293',
                taker_fee: '0.001',
                maker_fee: '0.001',
                low_market_bid: '0.0',
                high_market_ask: '0.0',
                volume_24h: '0.0',
                last_price_24h: '0.0',
                last_traded_price: '0.00002',
                last_traded_quantity: '15911.56585119',
                quoted_currency: 'ETH',
                base_currency: 'SGN',
                disabled: true,
                margin_enabled: false,
                cfd_enabled: false,
                last_event_timestamp: '1564807700.9005375'
            },
            ...
        ]
    
    */
}

function getAllTrades(tradingPair, page = 1) {
    //Construct query parameters
    const queryParam = objectToQuery({
        product_id: tradingPair.id,
        page,
        limit: 1000
    });

    //Console Message About Liquid Syncing
    if (Number(page) % process.env.UPDATE_FREQ === 0)
        console.log(`INIT SYNC - Liquid - ${tradingPair.name} ${page}`)

    //Get Liquid trades for a specific trading pair ID
    axios.get(`${process.env.LIQUID_REST}/executions${queryParam}`)
        .then(({data}) => {
            //If there was trades in the response, then continue getting more trades
            if (data.total_pages > data.current_page) {
                //Delay calls .25 seconds to obey by rate limits
                //Todo: Enforce rate limits across tradingpairs
                setTimeout(() => getAllTrades(tradingPair, page+1, 250));
            }
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = data.models.map(trade => {
                return {
                    time: new Date(trade.created_at * 1000).toISOString(),
                    trade_id: trade.id,
                    price: trade.price,
                    amount: trade.quantity,
                    exchange: 'liquid',
                    trading_pair: tradingPair.name
                }
            })
            console.log(hydratedData)
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

//TODO: Implement Pusher... Liquid does not seem to support regular web sockets??
function syncAllTrades(tradingPairs) {
    // //Setup WS
    // const ws = new WebSocket(process.env.LIQUID_WS)

    // //Open WS connection
    // ws.on(`open`, () => {
    //     console.log(`Liquid WS Connected at ${process.env.LIQUID_WS}`)
    //     //Send subscription message
    //     tradingPairs.forEach(tradingPair => {
    //         const subscriptionConfig = JSON.stringify({
    //             type: `subscribe`,
    //             channels: `executions_cash_${tradingPair.name.toUpperCase()}`
    //         })
    //         ws.send(subscriptionConfig);
    //     })
    // });

    // //Handle messages received
    // ws.on('message', (data) => {
    //     data = JSON.parse(data);
    //     console.log(data)
    //     // //If message includes a successful trade
    //     // if (data.type === 'match') {
    //     //     //Construct trades row
    //     //     const trade = {
    //     //         time: data.time,
    //     //         trade_id: data.trade_id,
    //     //         price: data.price,
    //     //         amount: data.size,
    //     //         exchange: 'coinbase',
    //     //         trading_pair: tradingPairs.find(tradingPair => tradingPair.id === data.product_id).display_name
    //     //     }
    //     //     //Insert it into the database
    //     //     tradesApi.insert(trade);
    //     //     //Update the console with the WS status
    //     //     if (trade.trade_id % process.env.UPDATE_FREQ === 0)
    //     //         console.log(`WS ALIVE - Coinbase - ${trade.time}`)
    //     // }
    // });

    // //Handle errors
    // ws.on('error', (error) => {
    //     console.log(`WebSocket error: ${error}`)
    // })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}