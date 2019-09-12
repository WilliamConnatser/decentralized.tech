const db = require('../../configs/db')

//Add a trade to the database
function insert(trade) {
   return db('trades').insert(trade)
}

//Add many trades to the database
function insertMany(trades) {
   return db.batchInsert('trades', trades)
}

//Get a single trade
//Arg1 = Filterable by sending in an object literal that matches the trades schema
//Arg2 = Change the order by sending in an array with the column and order
function getOne(filter = {}, orderBy = ['time', 'desc']) {
   return db('trades')
      .where(filter)
      .orderBy(...orderBy)
      .first()
}

//Get multiple trades
//Arg1 = Filterable by sending in an object literal that matches the trades schema
//Arg2 = Change the order by sending in an array with the column and order
function getMany(filter = {}, orderBy = ['time', 'desc']) {
   return db('trades')
      .where(filter)
      .orderBy(...orderBy)
}

//Get unique trading pairs
function getUniquePairs() {
   return db('trades')
      .distinct()
      .pluck('trading_pair')
}

//Get all exchanges which have a certain trading pair
function getExchangesByTP(trading_pair) {
   return db('trades')
      .where({trading_pair})
      .distinct()
      .pluck('exchange')
}

module.exports = {
   insert,
   insertMany,
   getOne,
   getMany,
   getUniquePairs,
   getExchangesByTP
}
