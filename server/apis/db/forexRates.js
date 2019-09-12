const db = require('../../configs/db')
const fixer = require('../external/fixer')

//Add a rate to the database
function insert(rate) {
   return db('forex_rates').insert(rate)
}

//Update a rate to the database
function update(symbol, data) {
   return db('forex_rates')
      .where(symbol)
      .update(data)
}

//Add many rates to the database
function insertMany(rate) {
   return db.batchInsert('forex_rates', rate)
}

//Get a single rate
//Arg1 = Filterable by sending in an object literal that matches the forex_rates schema
function getOne(filter = {}) {
   return db('forex_rates')
      .where(filter)
      .first()
}

//Get many rates
//Arg1 = Filterable by sending in an object literal that matches the forex_rates schema
function getMany(filter={}) {
   return db('forex_rates').where(filter)
}

//Get all rates
function getAll() {
   return db('forex_rates')
      .then(async (res) => {
         if (res.length > 0) {
            //Get current date and subtract one day
            //because fixer API has 1 req/day rate limit
            var now = new Date()
            now.setDate(now.getDate() - 1)
            /*
               TODO: Only 10000 requests are allowed per month
               Due to database resets, in development we need to reduce API calls as much as possible
               Not only will we be receiving forexRates, but will receive historical data too
               Comment out the return statement and uncomment the if/else block in production
            */
            // if (new Date(res.time).getTime() < now.getTime()) {
            //    return {
            //       updated: true,
            //       data: await fixer.getForexRates(),
            //    }
            // } else {
            //    console.log('rates as-is')
            //    return {
            //       updated: false,
            //       data: res,
            //    }
            // }
            return {
               updated: false,
               data: res,
            }
         } else {
            return {
               updated: true,
               data: await fixer.getForexRates(),
            }
         }
      })
      .then((res) => {
         //If Forex rates were updated or first gathered
         //Then update or create them
         if (res.updated) {
            const rates = res.data.data.rates
            const actions = []
            const symbols = Object.keys(rates)
            for (const symbol of symbols) {
               const symbolHandler = getOne({ symbol: symbol.toLowerCase() })
                  .then(applicableSymbol => {
                     if (applicableSymbol !== undefined) {
                        return update(
                           { symbol: symbol.toLowerCase() },
                           {
                              time: new Date(
                                 res.data.data.timestamp * 1000,
                              ).toISOString(),
                              rate: rates[symbol],
                           },
                        )
                     } else {
                        return insert({
                           symbol: symbol.toLowerCase(),
                           time: new Date(res.data.data.timestamp * 1000).toISOString(),
                           rate: rates[symbol],
                        })
                     }
                  })
               actions.push(symbolHandler)
            }
            return Promise.all(actions)
         } else {
            return
         }
      })
   .then(()=> getMany())
   
}

module.exports = {
   insert,
   update,
   insertMany,
   getOne,
   getMany,
   getAll,
}
