require('dotenv').config()
const server = require('./server');
const bitflyer = require('./apis/external/bitflyer');
const bithumb = require('./apis/external/bithumb');
const bitstamp = require('./apis/external/bitstamp');
const coinbase = require('./apis/external/coinbase');
const ethfinex = require('./apis/external/ethfinex');
const gemini = require('./apis/external/gemini');
const kraken = require('./apis/external/kraken');
const liquid = require('./apis/external/liquid');
const poloniex = require('./apis/external/poloniex');
const trades = require('./apis/db/trades');

// coinbase.getAllTrades({
//     id: 'BAT-USDC',
//     base_currency: 'BAT',
//     quote_currency: 'USDC',
//     base_min_size: '1',
//     base_max_size: '300000',
//     base_increment: '1',
//     quote_increment: '0.000001',
//     display_name: 'BAT/USDC',
//     status: 'online',
//     margin_enabled: false,
//     status_message: '',
//     min_market_funds: '1',
//     max_market_funds: '100000',
//     post_only: false,
//     limit_only: false,
//     cancel_only: false
// });
// coinbase.syncAllTrades([{
//     id: 'BAT-USDC',
//     base_currency: 'BAT',
//     quote_currency: 'USDC',
//     base_min_size: '1',
//     base_max_size: '300000',
//     base_increment: '1',
//     quote_increment: '0.000001',
//     display_name: 'BAT/USDC',
//     status: 'online',
//     margin_enabled: false,
//     status_message: '',
//     min_market_funds: '1',
//     max_market_funds: '100000',
//     post_only: false,
//     limit_only: false,
//     cancel_only: false
// }]);

// bitstamp.getTradingPairs()
// .then(res => console.log(res))
// bitstamp.getAllTrades({
//     base_decimals: 8,
//     minimum_order: '5.0 USD',
//     name: 'BTC/USD',
//     counter_decimals: 2,
//     trading: 'Enabled',
//     url_symbol: 'btcusd',
//     description: 'Bitcoin / U.S. dollar'
// })
// bitstamp.syncAllTrades([{
//         base_decimals: 8,
//         minimum_order: '5.0 USD',
//         name: 'XRP/USD',
//         counter_decimals: 5,
//         trading: 'Enabled',
//         url_symbol: 'xrpusd',
//         description: 'XRP / U.S. dollar'
//     }
// ])

// console.log(bithumb.getTradingPairs())
// bithumb.getAllTrades({
//         id: 'BTC',
//         name: 'BTC/KRW'
//     })
// trades.getMany()
// .then(response => {
//     console.log(response)
// })

// kraken.getTradingPairs().then(
//     res => console.log(res)
// )

// gemini.getTradingPairs().then(
//     res => console.log(res)
// )
// gemini.getAllTrades('btcusd')

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

poloniex.getTradingPairs()
.then(traingPairs => {
    poloniex.getAllTrades(traingPairs[0])
})

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`));