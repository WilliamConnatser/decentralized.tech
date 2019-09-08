const SmartAxios = require('../../utility/SmartAxios')
const liquid = new SmartAxios('liquid')
const Pusher = require('pusher-js/node')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {
    //Get Liquid trading pairs
    //The id property can be used in API requests
    return liquid.axios.get(`${process.env.LIQUID_REST}/products`)
        .then(res => {
            //Filter and parse response
            const parsedPairs = res.data.filter(tradingPair => !tradingPair.disabled)
                .map(tradingPair => ({
                    id: tradingPair.id,
                    name: tradingPair.currency_pair_code.toLowerCase()
                }))
            return parsedPairs
        })
        .catch(err => {
            console.log(err.message, '<< LIQUID REST (TRADING PAIRS)')
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
    })

    //Get Liquid trades for a specific trading pair ID
    liquid.axios.get(`${process.env.LIQUID_REST}/executions${queryParam}`)
        .then(({data}) => {
            //If there was trades in the response, then continue getting more trades
            if (data.total_pages > data.current_page) {
                //Delay calls .25 seconds to obey by rate limits
                //Todo: Enforce rate limits across tradingpairs
                setTimeout(() => getAllTrades(tradingPair, page+1, 250));
            }
            //Add exchange and trading pair data to each object in array of objects
            const parsedTrades = data.models.map(trade => {
                return {
                    time: new Date(trade.created_at * 1000).toISOString(),
                    trade_id: trade.id,
                    price: trade.price,
                    amount: trade.quantity,
                    exchange: 'liquid',
                    trading_pair: tradingPair.name
                }
            })
            //Insert parsed trades into the database
            tradesApi.insert(parsedTrades)
                .catch(err => {
                    if(!err.message.includes('unique')) {
                        console.log(err.message, '<< LIQUID REST INSERTION')
                    }
                })
            console.log(`[LIQUID] +${parsedTrades.length} Trades FROM ${tradingPair.name}`)
        })
        .catch(err => {
            console.log(err.message, '<< LIQUID REST (TRADES)')
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
    console.log(`[LIQUID] Connecting to Pusher channels`)
    tradingPairs.forEach(tradingPair => {
        const pusherChannel = `executions_cash_${tradingPair.name}`
        const tapSocket = new Pusher(process.env.LIQUID_PUSHER_KEY, {
            wsHost: process.env.LIQUID_PUSHER_HOSTNAME
        })
    
        const channel = tapSocket.subscribe(pusherChannel);
        channel.bind('created', function (data) {
            const tradeDate = new Date(data.created_at * 1000)
            //Ocassionally update the console with the WS status
            if (tradeDate.getTime() % process.env.UPDATE_FREQ === 0)
                console.log(`[LIQUID] PUSHER ALIVE - ${tradeDate.toISOString()} - ${tradingPair.name}`)
            tradesApi.insert({
                time: tradeDate.toISOString(),
                trade_id: data.id,
                price: data.price,
                amount: data.quantity,
                exchange: 'liquid',
                trading_pair: tradingPair.name
            })
            .catch(err => {
                if(!err.message.includes('unique')) console.log(err.message, '<< LIQUID PUSHER INSERTION')
            })
        })
    })
}

module.exports = {
    getTradingPairs,
    getAllTrades,
    syncAllTrades
}