exports.up = function (knex) {
    return knex.schema.createTable('trades', table => {
        table.increments()
        table.datetime('date')
        table.integer('trade_id')
        table.float('price')
        table.float('size')
        table.string('action')
        table.string('exchange')
    })
};

exports.down = function (knex) {
    return knex.schema.dropTable('trades');
};