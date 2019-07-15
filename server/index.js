require("dotenv").config()
const server = require("./server");
const axios = require("axios");

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`));

//Get Coinbase trading pairs
//The ID can be used to get each trade
axios.get(`${process.env.COINBASE_URL}/products`)
    .then(res => {
        console.log(res.data)
    })
    .catch(err => {
        console.log(err)
    })
/* Response:
    [
        {
            id: 'BAT-USDC',
            base_currency: 'BAT',
            quote_currency: 'USDC',
            base_min_size: '1',
            base_max_size: '300000',
            base_increment: '1',
            quote_increment: '0.000001',
            display_name: 'BAT/USDC',
            status: 'online',
            margin_enabled: false,
            status_message: '',
            min_market_funds: '1',
            max_market_funds: '100000',
            post_only: false,
            limit_only: false,
            cancel_only: false
        },
        ...
    ]

*/

//Get Coinbase trades for a specific trading pair ID
axios.get(`${process.env.COINBASE_URL}/products/${"BTC-USD"}/trades`)
    .then(res => {
        //console.log(res.data)

        //The header containers a cb-before property which can be used to get data
        //Which comes before the data included in this request via the before param
        console.log(res.headers)

        axios.get(`${process.env.COINBASE_URL}/products/${"BTC-USD"}/trades?before=${res.headers['cb-before']}`)
            .then(res => {
                //console.log(res.data)

                //The header containers a cb-before property which can be used to get data
                //Which comes before the data included in this request via the before param
                console.log(res)


            })
            .catch(err => {
                console.log(err)
            })

    })
    .catch(err => {
        console.log(err)
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