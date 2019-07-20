require('dotenv').config()
const server = require('./server');
const coinbase = require('./apis/external/coinbase');
const trades = require('./apis/db/trades');

//coinbase.getAllTrades();
trades.getMany()
.then(response => {
    console.log(response)
})

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`));