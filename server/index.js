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
        res.forEach(tradingPair => {
            gemini.getAllTrades(tradingPair)
        })
        //Todo: Implement Gemini WS
    })
    .catch(e => console.log(`[GEMINI] ERROR: ${e.message}`))

// bitflyer.getTradingPairs()
// .then(res=>console.log(res))
// bitflyer.getAllTrades({ id: 'BTC_JPY', name: 'btcjpy' })
// bitflyer.getTradingPairs()
// .then(res=>bitflyer.syncAllTrades(res))

// ethfinex.getTradingPairs()
// .then(pairs=> {
//     //ethfinex.getAllTrades(pairs[0])
//     ethfinex.syncAllTrades(pairs)
// })

// liquid.getTradingPairs().then(tradingPairs => {
//     //console.log(tradingPairs)
//     // liquid.getAllTrades(tradingPairs[0])
//     liquid.syncAllTrades(tradingPairs)
// })

// poloniex.getTradingPairs()
// .then(tradingPairs => {
//     console.log(tradingPairs)
//     // poloniex.getAllTrades(tradingPairs[0])
//     // poloniex.syncAllTrades(tradingPairs)
// })

// idex.getTradingPairs()
// .then(tradingPairs => {
//     // idex.getAllTrades(tradingPairs[0])
//     // idex.syncAllTrades(tradingPairs[0])
// })

// trades.getMany()
// .then(response => {
//     console.log(response)
// })

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`));