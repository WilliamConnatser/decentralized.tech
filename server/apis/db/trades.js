const db = require('../../data/config');

module.exports = {
    insert,
    getOne,
    getMany
}

//Add a trade to the database
//Returns the new trade object
function insert(trade) {
    return db('trades')
        .insert(trade)
}

//Get a single trade object
//Filterable by sending in an object literal that matches the trades schema
function getOne(filter = null) {
    if (!filter) return new Error('No filter provided for the query');
    return db('trades')
        .where(filter)
        .first();
}

//Get multiple trades in the database
//Filterable by sending in an object literal that matches the trades schema
function getMany(filter = {}) {
    return db('trades').where(filter).orderBy('time', 'desc')
}