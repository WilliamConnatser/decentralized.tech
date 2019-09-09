require('dotenv').config()
const server = require('./server')
const tradesDb = require('./apis/db/trades')
const syncTrades = require('./controllers/syncTrades')

syncTrades()

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`))