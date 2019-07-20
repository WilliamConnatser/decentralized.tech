const db = require('../../data/');

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
        .returning('id')
        .then(idArr => {
            const id = idArr[0];
            return db('trades')
                .where({
                    id
                }).first();
        });
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
    return db('trades').where(filter).orderBy('date', 'desc');
}