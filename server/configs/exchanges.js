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
   // /*
   //      COINBASE - REST API + WS
   //      Coinbase provides full historical data
   //      Check for missing trades once every day
   //      Syncing all trades via WS in real-time
   //      REST API only allows 4 requests per second
   //  */
   // {
   //    name: 'coinbase',
   //    ws: true,
   //    interval: 1000 * 60 * 60 * 24,
   //    api: coinbase,
   // },
   // /*
   //      BITSTAMP - REST API + WS
   //      Bitstamp does not provide historical data
   //      Only the last 24 hours worth of trades are available
   //      Check for missing trades three times daily
   //      Syncing all trades via WS in real-time
   //  */
   // {
   //    name: 'bitstamp',
   //    ws: true,
   //    interval: 1000 * 60 * 60 * 2.5, //TODO: WS not syncing properly?? Longpolling every 2.5 minutes
   //    api: bitstamp,
   // },
   /*
        BITHUMB - REST API
        Bithumb does not provide historical data
        Bithumb does not appear to have WS
        REST API only allows one request every 0.015 seconds
        93 trading pairs * 0.015 means we can at most longpoll at a 1.4 second interval
        EDIT:
         Although the math is good, 1.4 seconds was not working well...
         The requests were not finishing before getAllTrades was called again
         Resulting in an ever-growing request queue
    */
   {
      name: 'bithumb',
      ws: false,
      interval: 1000 * 45,
      api: bithumb,
   },
   // /*
   //      KRAKEN - REST API + WS
   //      Kraken provides full historical data
   //      REST API longpolling every day
   //      WS receiving trades real-time
   //  */
   // {
   //    name: 'kraken',
   //    ws: true,
   //    interval: 1000 * 60 * 60 * 24,
   //    api: kraken,
   // },
   /*
        GEMINI - REST API + WS
        Gemini only provides 7 days worth of historical data
        REST API longpolling every day
        WS receiving trades real-time

        TODO: Bug?
    */
   {
      name: 'gemini',
      ws: true,
      interval: 1000 * 60, //Gemini WS is broken- longpoll every minute
      api: gemini,
   },
   // /*
   //      BITFLYER - REST API + WS
   //      Only 31 days worth of history is provided
   //      REST API longpolling every day
   //      WS receiving trades real-time

   //      TODO: Fix Bug...
   //      Ocassionally getting a 500 error when using the before query parameter
   //      Not sure why, but it looks fine after looking things over.
   //      Need to troubleshoot further...

   //      UPDATE:
   //      I have narrowed the error down to the ETH_BTC trading pair
   //      I tweeted at Bitflyer about the bug and hope it is resolved soon.
   //      For now we can not longpoll the ETH_BTC trading pair
   //  */
   // {
   //    name: 'bitflyer',
   //    ws: true,
   //    interval: 1000 * 60 * 2.5, //While WS is broken, longpoll every 2.5 minutes
   //    api: bitflyer,
   // },
   // /*
   //      ETHFINEX - REST API + WS
   //      Full historical data provided
   //      REST API longpolling every day
   //      WS receiving trades real-time
   //      REST API allows 2 requests per second**
   //      ** Getting rate limit errors with rate limit settings described in documentation
   //      ** Rate limit raised to one request every three seconds which does not get any errors

   //      TODO: Fix bug with REST API? Getting an error?
   //      TODO: Longpolling interval??
   //  */
   // {
   //    name: 'ethfinex',
   //    ws: true,
   //    interval: 1000 * 60 * 60 * 24,
   //    api: ethfinex,
   // },
   // /*
   //      LIQUID - REST API + PUSHER
   //      Provides full historical data
   //      Check for missing trades once every day
   //      Syncing trades using Pusher in real-time
   //      Liquid uses Pusher in place of WS communication
   //      REST API has a rate limit of one request per second**
   //      ** However, that was giving a rate limit error, and so raised rate limit to 1.25 seconds
   //  */
   // {
   //    name: 'liquid',
   //    ws: true, //technically Pusher
   //    interval: 1000 * 60 * 60 * 24,
   //    api: liquid,
   // },
   // /*
   //      POLONIEX - REST API + WS
   //      Provides full historical data
   //      Check for missing trades once every day
   //      WS receiving trades real-time
   //      REST API allows up to 6 calls per second
   //  */
   // {
   //    name: 'poloniex',
   //    ws: true,
   //    interval: 1000 * 60 * 60 * 24,
   //    api: poloniex,
   // },
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
      name: 'idex',
      ws: false, //Todo: Fix bug- Disabled for now
      interval: 1000 * 60 * 5, //Until WS are working. Longpoll every 5 minutes...
      api: idex,
   },
]

module.exports = exchanges
