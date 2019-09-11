const db = require('../../configs/db')

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

//Get multiple rates
//Arg1 = Filterable by sending in an object literal that matches the forex_rates schema
function getMany(filter = {}) {
   return db('forex_rates').where(filter)
}

module.exports = {
   insert,
   update,
   insertMany,
   getOne,
   getMany,
}
