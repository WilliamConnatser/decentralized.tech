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

/*  
    COINBASE - REST API + WS
    Coinbase provides historical data
*/
coinbase.getTradingPairs().then(res => {
        res.forEach(tradingPair => {
            coinbase.getAllTrades(tradingPair)
        })
        coinbase.syncAllTrades(res)
    })
    .catch(e => console.log(`[COINBASE] ERROR: ${e.message}`))

/*  
    BITSTAMP - REST API + WS
    Bitstamp does not provide historical data
*/
bitstamp.getTradingPairs()
    .then(res => {
        res.forEach(tradingPair => {
            bitstamp.getAllTrades(tradingPair)
        })
        bitstamp.syncAllTrades(res)
    })
    .catch(e => console.log(`[BITSTAMP] ERROR: ${e.message}`))

/*
    BITHUMB - REST API
    Bithumb does not provide historical data
    Bithumb does not appear to have WS
*/
bithumb.getTradingPairs()
    .then(res => {
        res.forEach(tradingPair => {
            bithumb.getAllTrades(tradingPair)
        })
    })
    .catch(e => console.log(`[BITHUMB] ERROR: ${e.message}`))

/*
    KRAKEN - REST API + WS
    Kraken does not provide historical data
    REST API longpolling every 5 minutes
    WS receiving trades real-time
*/
kraken.getTradingPairs()
    .then(res => {
        res.forEach(tradingPair => {
            kraken.getAllTrades(tradingPair)
        })
        //Keep up with all trades via WS communication
        kraken.syncAllTrades(res)
    })
    .catch(e => console.log(`[KRAKEN] ERROR: ${e.message}`))
    
/*
    GEMINI - REST API + WS
    Gemini only provides 7 days worth of historical data
    WS receiving trades real-time
*/
gemini.getTradingPairs()
    .then(res => {
        res.forEach(tradingPair => {
            gemini.getAllTrades(tradingPair)
        })
        gemini.syncAllTrades(res)
    })
    .catch(e => console.log(`[GEMINI] ERROR: ${e.message}`))

/*
    BITFLYER - REST API + WS
    WS receiving trades real-time
*/
bitflyer.getTradingPairs()
    .then(res=> {
        res.forEach(tradingPair => {
            bitflyer.getAllTrades(tradingPair)
        })
        bitflyer.syncAllTrades(res)
    })
    .catch(e => console.log(`[BITFLYER] ERROR: ${e.message}`))

/*
    ETHFINEX - REST API + WS
    REST API only allows 30 requests per minute
    WS receiving trades real-time
*/
ethfinex.getTradingPairs()
.then(res => {
    res.forEach(tradingPair => {
        ethfinex.getAllTrades(tradingPair)
    })
    ethfinex.syncAllTrades(res)
})

/*
    LIQUID - REST API + PUSHER
*/
liquid.getTradingPairs().then(tradingPairs => {
    tradingPairs.forEach(tradingPair => {
        liquid.getAllTrades(tradingPair)
    })
    //Todo: Implement Pusher for WS syncing
    //Liquid does not appear to support regular WS communications
    liquid.syncAllTrades(tradingPairs)
})

/*
    POLONIEX - REST API + WS
    WS receiving trades real-time
*/
poloniex.getTradingPairs()
.then(tradingPairs => {
    tradingPairs.forEach(tradingPair => {
        poloniex.getAllTrades(tradingPair)
    })
    poloniex.syncAllTrades(tradingPairs)
})

/*
    IDEX - REST API + WS
    REST API only allows one request every .25 seconds
    WS receiving trades real-time
*/
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