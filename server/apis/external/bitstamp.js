const SmartAxios = require('../../utility/SmartAxios')
const bitstamp = new SmartAxios('bitstamp')
const WebSocket = require('ws')
const objectToQuery = require('../../utility/objectToQuery')
const tradesApi = require('../db/trades')

function getTradingPairs() {
    //Get Bitstamp trading pairs
    //The url_symbol property can be used to get trading-pair-specific trades
    return bitstamp.axios.get(`${process.env.BITSTAMP_REST}/trading-pairs-info`)
        .then(res => {
            //Return parsed response
            return res.data.map(tradingPair => {
                return {
                    id: tradingPair.url_symbol
                }
            });
        })
        .catch(err => {
            console.log(err.message)
        })
    /*
    Response:
    [
        {
            "base_decimals": 8,
            "minimum_order": "5.0 USD",
            "name": "LTC/USD",
            "counter_decimals": 2,
            "trading": "Enabled",
            "url_symbol": "ltcusd",
            "description": "Litecoin / U.S. dollar"
        },
    ]
    */
}

function getAllTrades(tradingPair) {
    //Get Bitstamp trades for a specific trading pair
    //Bitstamp only has previous 24hr data available.. :\
    //Will need to source historical data separately
    bitstamp.axios.get(`${process.env.BITSTAMP_REST}/transactions/${tradingPair.id}?time=day`)
        .then(res => {
            //Parse trade data
            const tradeData = res.data.map(trade => {
                return {
                    time: new Date(trade.date * 1000).toISOString(),
                    trade_id: trade.tid,
                    price: trade.price,
                    amount: trade.amount,
                    exchange: 'bitstamp',
                    trading_pair: tradingPair.id
                }
            })
            //Insert all trades into the database
            tradesApi.insert(tradeData)
                .catch(err => {
                    if(!err.message.includes('unique')) console.log(err.message, '<< BITSTAMP REST')
                })
            console.log(`[BITSTAMP] +${res.data.length} Trades FROM ${tradingPair.id}`)
        })
        .catch(err => {
            console.log(err)
        })
    /*
        [
            {
                date: '1563682032',
                tid: '94384551',
                price: '10650.00',
                type: '1',
                amount: '7.47150000'
            },
            ...
        ]
    */
}

function syncAllTrades(tradingPairs) {
    //Setup WS
    const ws = new WebSocket(process.env.BITSTAMP_WS)
    const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.id)

    //Open WS connection
    ws.on('open', () => {
        console.log(`[BITSTAMP] - WS Connected at ${process.env.BITSTAMP_WS}`)
        //Send subscription message for each trading pair
        tradingPairIds.forEach(tradingPair => {
            const subscriptionConfig = JSON.stringify({
                event: 'bts:subscribe',
                data: {
                    channel: `live_trades_${tradingPair}`
                }
            });
            ws.send(subscriptionConfig);
        })
    });

    //Handle messages received
    ws.on('message', (data) => {
        data = JSON.parse(data);
        //If message includes a successful trade
        if (data.event === 'trade') {
            //Grab the id from the channel property
            const id = data.channel.split('_')[data.channel.split('_').length - 1]
            //Construct trade row
            const tradeData = data.data;
            const trade = {
                time: new Date(tradeData.timestamp * 1000).toISOString(),
                trade_id: tradeData.id,
                price: tradeData.price,
                amount: tradeData.amount,
                exchange: 'bitstamp',
                trading_pair: id
            }
            //Insert trade into the database
            tradesApi.insert(trade)
                .catch(err => {
                    if(!err.message.includes('unique')) console.log(err.message, '<< BITSTAMP WS')
                })
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0)
                console.log(`[BITSTAMP] - WS ALIVE - ${id} - ${new Date(tradeData.timestamp * 1000).toISOString()}`)
        }
        //If the WS server is going down for maintenance
        else if (data.event == 'bts-request_reconnect') {
            //This message means the WS server we are connected to is going down for maintenance
            //By reconnecting it will automatically connect us to a new server
            syncAllTrades(tradingPairs)
        }
    });
    // Example message:
    // {
    //     type: 'match',
    //     trade_id: 1797465,
    //     maker_order_id: '6865cc86-7cd3-4ded-a6d2-e554a36f5a93',
    //     taker_order_id: '1be42c56-cac3-4a1b-a1a1-4248cb2b8d9b',
    //     side: 'buy',
    //     size: '1.00000000',
    //     price: '0.24200000',
    //     product_id: 'BAT-USDC',
    //     sequence: 503529021,
    //     time: '2019-07-21T19:14:57.457000Z'
    // }

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