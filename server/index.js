require('dotenv').config()
const server = require('./server')
const bitflyer = require('./apis/external/bitflyer')
const bithumb = require('./apis/external/bithumb')
const bitstamp = require('./apis/external/bitstamp')
const coinbase = require('./apis/external/coinbase')
const ethfinex = require('./apis/external/ethfinex')
const gemini = require('./apis/external/gemini')
const kraken = require('./apis/external/kraken')
const liquid = require('./apis/external/liquid')
const poloniex = require('./apis/external/poloniex')
const idex = require('./apis/external/idex')
const trades = require('./apis/db/trades')

coinbase.getTradingPairs().then(res => {
        //For Each Trading Pair
        //Get All Trades VIA REST API
        //Coinbase supports historical data
        res.forEach(tradingPair => {
            coinbase.getAllTrades(tradingPair)
        })
        //Keep up with all trades via WS communication
        coinbase.syncAllTrades(res)
    })
    .catch(e => console.log(`[COINBASE] ERROR: ${e.message}`))

bitstamp.getTradingPairs()
    .then(res => {
        //For Each Trading Pair
        //Get All Trades VIA REST API
        //Bitstamp does not support historical data
        res.forEach(tradingPair => {
            bitstamp.getAllTrades(tradingPair)
        })
        //Keep up with all trades via WS communication
        bitstamp.syncAllTrades(res)
    })
    .catch(e => console.log(`[BITSTAMP] ERROR: ${e.message}`))

bithumb.getTradingPairs()
    .then(res => {
        // For Each Trading Pair
        // Get All Trades VIA REST API
        // Bithumb does not support historical data
        res.forEach(tradingPair => {
            bithumb.getAllTrades(tradingPair)
        })
        //Bithumb does not appear to have WS
    })
    .catch(e => console.log(`[BITHUMB] ERROR: ${e.message}`))

kraken.getTradingPairs()
    .then(res => {
        //For Each Trading Pair
        //Get All Trades VIA REST API
        //Kraken does not give historical data
        //REST API does support longpolling
        //Polls every 5 minutes
        res.forEach(tradingPair => {
            kraken.getAllTrades(tradingPair)
        })
        //Keep up with all trades via WS communication
        kraken.syncAllTrades(res)
    })
    .catch(e => console.log(`[KRAKEN] ERROR: ${e.message}`))
    

gemini.getTradingPairs()
    .then(res => {
        //For Each Trading Pair
        //Get All Trades VIA REST API
        //Gemini only provides 7 days worth of historical data
        // res.forEach(tradingPair => {
        //     gemini.getAllTrades(tradingPair)
        // })
        //Use Gemini WS to keep synced
        gemini.syncAllTrades(res)
    })
    .catch(e => console.log(`[GEMINI] ERROR: ${e.message}`))

bitflyer.getTradingPairs()
    .then(res=> {
        res.forEach(tradingPair => {
            bitflyer.getAllTrades(tradingPair)
        })
        bitflyer.syncAllTrades(res)
    })
    .catch(e => console.log(`[BITFLYER] ERROR: ${e.message}`))

ethfinex.getTradingPairs()
.then(res => {
    //Only 30 requests are allowed per minute
    res.forEach(tradingPair => {
        ethfinex.getAllTrades(tradingPair)
    })
    ethfinex.syncAllTrades(res)
})

liquid.getTradingPairs().then(tradingPairs => {
    tradingPairs.forEach(tradingPair => {
        liquid.getAllTrades(tradingPair)
    })
    //Todo: Implement Pusher for WS syncing
    //Liquid does not appear to support regular WS communications
    liquid.syncAllTrades(tradingPairs)
})

poloniex.getTradingPairs()
.then(tradingPairs => {
    tradingPairs.forEach(tradingPair => {
        poloniex.getAllTrades(tradingPair)
    })
    poloniex.syncAllTrades(tradingPairs)
})

//Delay calls .25 seconds to obey by rate limits
idex.getTradingPairs()
.then(tradingPairs => {
    tradingPairs.forEach(tradingPair => {
        idex.getAllTrades(tradingPair)
    })
    //TODO: TROUBLESHOOT WS
    // idex.syncAllTrades(tradingPairs)
})

trades.getMany()
.then(response => {
    console.log(response)
})

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`));