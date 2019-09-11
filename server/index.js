require('dotenv').config()
const server = require('./server')
const tradesDb = require('./apis/db/trades')
const exchanges = require('./configs/exchanges')
const syncTrades = require('./controllers/syncTrades')
const syncForexRates = require('./controllers/syncForexRates')

syncTrades()

//Last Trade
tradesDb.getOne().then((res) => console.log(res, 'last trade \n'))

//First Trade
tradesDb
   .getOne({}, ['time', 'asc'])
   .then((res) => console.log(res, 'first trade \n'))

//First / Last Trade Per Exchange
setInterval(
   () =>
      exchanges.forEach(({ name }) => {
         const promiseArray = [
            tradesDb.getOne({ exchange: name }, ['time', 'asc']),
            tradesDb.getOne({ exchange: name }),
         ]
         Promise.all(promiseArray).then((res) => {
            first = res[0]
            last = res[1]
            console.log(
               `${name.toUpperCase()}
        First: ${new Date(first.time).toUTCString()}
        Last: ${new Date(last.time).toUTCString()}`,
            )
         })
      }),
   1000 * 60 * 2.5,
)

syncForexRates().then((res) => console.log(res))

const port = process.env.PORT || 5000

server.listen(port, () =>
   console.log(`Server Alive On http://localhost:${port}`),
)
