//Used to reduce database operations
const tradesApi = require('../apis/db/trades')

class InsertionBatcher {
   constructor() {
      this.batch = []
      this.running = false
      this.insertions = 0
      this.lastInserted = {}
   }

   add(data) {
      this.batch.push(data)
      if (!this.running) {
         this.running = true
         this.processInsertions()
      }
   }

   processInsertions() {
      while (this.batch.length) {
         const trade = this.batch.shift()
         this.insertions++
         try {
            this.lastInserted[trade.exchange] = new Date().toUTCString()
         } catch (err) {
            console.log(trade)
            console.log(err)
         }
         tradesApi.insert(trade).catch((err) => {
            if (!err.message.includes('unique')) {
               console.log(err)
               console.log(err.message, '\n^^ BATCH INSERTION')
            }
         })
      }
      this.running = false
   }

   length() {
      return this.batch.length
   }
}

const batch = new InsertionBatcher()

setInterval(() => {
   console.log(
      `[INSERTIONBATCHER] ${batch.length()} IN QUEUE - ${
         batch.insertions
      } INSERTED`,
   )
   Object.keys(batch.lastInserted).forEach((key) =>
      console.log(`${key} - Last Inserted On: ${batch.lastInserted[key]}`),
   )
   console.log('\n\n\n')
}, 1000 * 60)

module.exports = batch
