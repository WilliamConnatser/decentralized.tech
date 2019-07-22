exports.up = function (knex) {
    return knex.schema.createTable('trades', table => {
        table.primary(['exchange', 'trading_pair', 'trade_id']);
        table.datetime('time')
        table.integer('trade_id')
        table.float('price')
        table.float('amount')
        table.string('exchange')
        table.string('trading_pair')
    })
};

exports.down = function (knex) {
    return knex.schema.dropTable('trades');
};