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

module.exports = {
   insert,
   insertMany,
   getOne,
   getMany,
}
