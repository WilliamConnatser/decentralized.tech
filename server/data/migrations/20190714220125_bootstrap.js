exports.up = function (knex) {
    return knex.schema.createTable('trades', table => {
        table.primary(['exchange', 'trading_pair', 'time', 'price', 'amount'])
            .unique(['exchange', 'trading_pair', 'time', 'price', 'amount'])
        table.datetime('time')
        table.bigInteger('trade_id')
        table.float('price')
        table.float('amount')
        table.string('exchange')
        table.string('trading_pair')
    })
};

exports.down = function (knex) {
    return knex.schema.dropTable('trades');
};