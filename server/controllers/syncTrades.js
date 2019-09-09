const bitflyer = require('../apis/external/bitflyer')
const bithumb = require('../apis/external/bithumb')
const bitstamp = require('../apis/external/bitstamp')
const coinbase = require('../apis/external/coinbase')
const ethfinex = require('../apis/external/ethfinex')
const gemini = require('../apis/external/gemini')
const kraken = require('../apis/external/kraken')
const liquid = require('../apis/external/liquid')
const poloniex = require('../apis/external/poloniex')
const idex = require('../apis/external/idex')

const exchanges = [
    /*  
        COINBASE - REST API + WS
        Coinbase provides full historical data
        Check for missing trades once every day
        Syncing all trades via WS in real-time
        REST API only allows 4 requests per second
    */
    {
        name: 'COINBASE',
        ws: true,
        interval: 1000 * 60 * 60 * 24,
        api: coinbase
    },
    /*  
        BITSTAMP - REST API + WS
        Bitstamp does not provide historical data
        Only the last 24 hours worth of trades are available
        Check for missing trades three times daily
        Syncing all trades via WS in real-time
    */
    {
        name: 'BITSTAMP',
        ws: true,
        interval: 1000 * 60 * 60 * (24 / .33),
        api: bitstamp
    },
    /*
        BITHUMB - REST API
        Bithumb does not provide historical data
        Bithumb does not appear to have WS
        REST API only allows one request every 0.015 seconds
        93 trading pairs * 0.015 means we can at most longpoll at a 1.4 second interval
    */
    {
        name: 'BITHUMB',
        ws: false,
        interval: 1400,
        api: bithumb
    },
    /*
        KRAKEN - REST API + WS
        Kraken provides full historical data
        REST API longpolling every day
        WS receiving trades real-time
    */
    {
        name: 'KRAKEN',
        ws: true,
        interval: 1000 * 60 * 60 * 24,
        api: kraken
    },
    /*
        GEMINI - REST API + WS
        Gemini only provides 7 days worth of historical data
        REST API longpolling every day
        WS receiving trades real-time

        TODO: Bug?
    */
    {
        name: 'GEMINI',
        ws: true,
        interval: 1000 * 60 * 60 * 24,
        api: gemini
    },
    /*
        BITFLYER - REST API + WS
        Only 31 days worth of history is provided
        REST API longpolling every day
        WS receiving trades real-time

        TODO: Fix Bug...
        Ocassionally getting a 500 error when using the before query parameter
        Not sure why, but it looks fine after looking things over.
        Need to troubleshoot further...
    */
    {
        name: 'BITFLYER',
        ws: true,
        interval: 1000 * 60 * 60 * 24,
        api: bitflyer
    },
    /*
        ETHFINEX - REST API + WS
        Full historical data provided
        REST API longpolling every day
        WS receiving trades real-time
        REST API allows 2 requests per second**
        ** Getting rate limit errors with rate limit settings described in documentation
        ** Rate limit raised to one request every three seconds which does not get any errors

        TODO: Fix bug with REST API? Getting an error?
        TODO: Longpolling interval??
    */
    {
        name: 'ETHFINEX',
        ws: true,
        interval: 1000 * 60 * 60 * 24,
        api: ethfinex
    },
    /*
        LIQUID - REST API + PUSHER
        Provides full historical data
        Check for missing trades once every day
        Syncing trades using Pusher in real-time
        Liquid uses Pusher in place of WS communication
        REST API has a rate limit of one request per second**
        ** However, that was giving a rate limit error, and so raised rate limit to 1.25 seconds
    */
    {
        name: 'LIQUID',
        ws: true, //technically Pusher
        interval: 1000 * 60 * 60 * 24,
        api: liquid
    },
    /*
        POLONIEX - REST API + WS
        Provides full historical data
        Check for missing trades once every day
        WS receiving trades real-time
        REST API allows up to 6 calls per second
    */
    {
        name: 'POLONIEX',
        ws: true,
        interval: 1000 * 60 * 60 * 24,
        api: poloniex
    },
    /*
        IDEX - REST API + WS
        Provides full historical data
        Check for missing trades once every day
        REST API only allows 4 requests per second
        WS receiving trades real-time

        TODO: TROUBLESHOOT WS...
        Not getting any response from the WS handshake
        Not sure why, but this is a low volume exchange, so I will leave it for later

        TODO: WS IMPLEMENTATION
        Another engineering challenge that is unique to this exchange:
        There seems to be 640 markets, but according to IDEX documentation:
        You can only subscribe to 100 per connection...
        Not sure if worth the time to implement for a low-volume exchange?
    */
    {
        name: 'IDEX',
        ws: false, //Todo: Fix bug- Disabled for now
        interval: 1000 * 60 * 60 * 24,
        api: idex
    },
]

const syncTrades = () => {
    exchanges.forEach((exchange) => {
        exchange.api.getTradingPairs()
            .then((tradingPairs) => {
                const getAllTrades = () => {
                    tradingPairs.forEach(tradingPair => {
                        exchange.api.getAllTrades(tradingPair)
                    })
                }
                getAllTrades()
                setInterval(getAllTrades, exchange.interval)
                if (exchange.ws) {
                    exchange.api.syncAllTrades(tradingPairs)
                }
            })
            .catch(err => console.log(`[${exchange.name}] ERROR: ${err.message}`))
    })
}

module.exports = syncTrades