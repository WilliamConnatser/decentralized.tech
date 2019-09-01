const axios = require('axios');
const WebSocket = require('ws');
const objectToQuery = require('../../utility/objectToQuery');
const tradesApi = require('../db/trades');

function getTradingPairs() {

    //Get IDEX trading pairs
    //The id property can be used in API requests
    return axios.get(`${process.env.IDEX_REST}/returnTicker`)
        .then(res => {
            //Parse response
            return Object.keys(res.data).map(key => ({
                id: key,
                //IDEX has the base pair as first ticker in market pair
                //Almost (all?) other exchanges list base pair second
                //So here we normalize the ticker
                name: key.toLowerCase().split('_').reverse().join('')
            }));
        })
        .catch(err => {
            console.log(err)
        })
    /* Response:
    {
        TUSD_ETH: {
            last: '170.163150941',
            high: '171.382342010000000611',
            low: '169.9918239166',
            lowestAsk: '170.236647129',
            highestBid: '169.5102840592',
            percentChange: '-0.71138663',
            baseVolume: '4791.735822308546453036',
            quoteVolume: '28.103711783037124921'
        },
        ...
    }
    */
}

function getAllTrades(tradingPair, cursor=null) {
    //Construct query parameters
    let queryBody = {
        market: tradingPair.id,
        count: 100
    }
    //Add cursor to get paginated data
    if (cursor) {
        queryBody.cursor = cursor
    }

    //IDEX Syncing
    if (Number(cursor) % process.env.UPDATE_FREQ === 0)
        console.log(`INIT SYNC - IDEX - ${tradingPair.name} ${cursor}`)

    //Get IDEX trades for a specific trading pair ID
    axios.post(`${process.env.IDEX_REST}/returnTradeHistory`, queryBody)
        .then(res => {
            console.log(res.headers['idex-next-cursor'])
            //The header containers a idex-next-cursor property which can be used to get data
            //Which comes before the data included in this request via the before param
            if (res.headers['idex-next-cursor']) {
                //Delay calls .25 seconds to obey by rate limits
                setTimeout(() => getAllTrades(tradingPair, res.headers['idex-next-cursor']), 250)
            }
            //Add exchange and trading pair data to each object in array of objects
            const hydratedData = res.data.map(trade => {
                return {
                    time: new Date(trade.timestamp*1000),
                    trade_id: trade.tid,
                    price: Number(trade.price),
                    amount: Number(trade.total),
                    exchange: 'idex',
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
                type: 'buy',
                date: '2019-05-11 10:23:52',
                amount: '29048488.368259483593638827',
                total: '0.813032449156059712',
                uuid: 'dffdd260-73d6-11e9-be2b-b71e7e13e81b',
                tid: 3770997,
                timestamp: 1557570232,
                price: '0.000000027988804059',
                taker: '0xf23355adac24083b31f328847f58d36e4a7db761',
                maker: '0x51edc604fcf7499b7c2a9176059ef60a8b66ff7c',
                orderHash: '0x1d11fb470b29dc832cc65bb123fe04e9546559a82fb74d52b8f958706d8a6af3',
                transactionHash: '0x44f860193b7e91d1cc9be55c2998892640f375267ec1625e31ed14b9d4e495c7',
                tokenBuy: '0x0000000000000000000000000000000000000000',
                buyerFee: '58096.976736518967187278',
                gasFee: '46161.314976725249855418',
                sellerFee: '0.00081303244915606',
                tokenSell: '0xe9f9547c17fc9539df99a42dcb6ec38165994c45',
                usdValue: '156.058583771869365695'
            },
            ...
        ]
    */
}

function syncAllTrades(tradingPairs) {
    //Setup WS
    const ws = new WebSocket(process.env.IDEX_WS)

    //Open WS connection
    ws.on('open', () => {
        console.log(`IDEX WS Connected at ${process.env.IDEX_WS}`)
        //Send handshake message when the connection is established
        //  IDEX will send back a session id (sid) which must be included with every request thereafter
        const handshake = JSON.stringify({
            request: 'handshake',
            payload: {
                version: '1.0.0',
                key: process.env.IDEX_KEY
            }
        })
        ws.send(handshake);
    });

    //Handle messages received
    ws.on('message', (data) => {
        data = JSON.parse(data);
        console.log(data)
        //Subscribe to channels
        //Send subscription message
        // const tradingPairIds = tradingPairs.map(tradingPair => tradingPair.id)
        // const subscriptionConfig = JSON.stringify({
        //     type: 'subscribe',
        //     product_ids: tradingPairIds,
        //     channels: [{
        //         name: 'full',
        //         product_ids: tradingPairIds
        //     }]
        // })
        // ws.send(subscriptionConfig);

        // //Receive trades
        // //If message includes a successful trade
        // if (data.type === 'match') {
        //     //Construct trades row
        //     const trade = {
        //         time: data.time,
        //         trade_id: data.trade_id,
        //         price: data.price,
        //         amount: data.size,
        //         exchange: 'coinbase',
        //         trading_pair: tradingPairs.find(tradingPair=>tradingPair.id === data.product_id).display_name
        //     }
        //     //Insert it into the database
        //     tradesApi.insert(trade);
        //     //Update the console with the WS status
        //     if (trade.trade_id % process.env.UPDATE_FREQ === 0)
        //         console.log(`WS ALIVE - Coinbase - ${trade.time}`)
        // }
    });

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