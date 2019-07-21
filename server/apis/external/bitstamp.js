const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get Bitstamp trading pairs
    //The url_symbol property can be used to get trading-pair-specific trades
    return axios.get(`${process.env.BITSTAMP_REST}/trading-pairs-info`)
        .then(res => {
            //Return response as-is
            return res.data;
        })
        .catch(err => {
            console.log(err)
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
    axios.get(`${process.env.BITSTAMP_REST}/transactions/${tradingPair.url_symbol}?time=day`)
        .then(res => {
            //Notify console API is alive
            console.log(`REST ALIVE - Bitstamp - ${new Date(res.data[0].date*1000).toISOString()}`)
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = res.data.map(trade => {
                return {
                    time: new Date(trade.date * 1000).toISOString(),
                    trade_id: trade.tid,
                    price: trade.price,
                    amount: trade.amount,
                    buy: !Number(trade.type),
                    exchange: 'bitstamp',
                    trading_pair: tradingPair.name
                }
            })
            //Insert it into the database
            tradesApi.insert(hydratedData);
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
    const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.url_symbol)

    //Open WS connection
    ws.on('open', () => {
        console.log(`Bitstamp WS Connected at ${process.env.BITSTAMP_WS}`)
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
            //Grab the url_symbol from the channel property
            const url_symbol = data.channel.split('_')[data.channel.split('_').length - 1]
            //Construct trade row
            const tradeData = data.data;
            const trade = {
                time: new Date(tradeData.timestamp * 1000).toISOString(),
                trade_id: tradeData.id,
                price: tradeData.price,
                amount: tradeData.amount,
                buy: !Number(tradeData.type),
                exchange: 'bitstamp',
                trading_pair: tradingPairs.find(tradingPair => tradingPair.url_symbol === url_symbol).name
            }
            //Insert trade into the database
            tradesApi.insert(trade);
            //Update the console with the WS status
            if (trade.trade_id % process.env.UPDATE_FREQ === 0)
                console.log(`WS ALIVE - Bitstamp - ${url_symbol} - ${new Date(tradeData.timestamp * 1000).toISOString()}`)
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