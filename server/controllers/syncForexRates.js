const fixer = require('../apis/external/fixer')
const forexRatesApi = require('../apis/db/forexRates')

const syncForexRates = () => {
   console.log('heyyy')
   return forexRatesApi
      .getMany()
      .then(async (res) => {
         console.log(res, 'res')
         if (res.length > 0) {
            //Get current date and subtract one day
            //because fixer API has 1 req/day rate limit
            var now = new Date()
            now.setDate(now.getDate() - 1)
            console.log(res, 'date comparison')
            console.log(`${new Date(res.time).getTime()}, ${now.getTime()}`)
            if (new Date(res.time).getTime() < now.getTime()) {
               return {
                  updated: true,
                  data: await fixer.getForexRates(),
               }
            } else {
               return {
                  updated: false,
                  data: res,
               }
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
         console.log(res, 'res before')
         if (res.updated) {
            const rates = res.data.data.rates
            const actions = []
            console.log(rates, 'forex rates gathered..')
            Object.keys(rates).forEach(async (symbol) => {
               console.log('getting', symbol)
               const applicableSymbol = await forexRatesApi.getOne({ symbol })
               console.log(applicableSymbol, 'applicableSymbol')
               if (applicableSymbol !== undefined) {
                  console.log(`found ${symbol}`)
                  actions.push(
                     forexRatesApi.update(
                        { symbol },
                        {
                           time: new Date(
                              res.data.data.timestamp,
                           ).toISOString(),
                           rate: rates[symbol],
                        },
                     ),
                  )
               } else {
                  console.log(`inserting ${symbol}`)
                  console.log({
                     symbol,
                     time: new Date(res.data.data.timestamp).toISOString(),
                     rate: rates[symbol],
                  })
                  actions.push(
                     forexRatesApi.insert({
                        symbol,
                        time: new Date(res.data.data.timestamp).toISOString(),
                        rate: rates[symbol],
                     }),
                  )
               }
            })
            return Promise.all(actions).then((res) => {
               console.log(res, 'after')
               return forexRatesApi.getMany()
            })
         } else {
            return res
         }
      })
}

module.exports = syncForexRates
