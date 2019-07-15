// Update with your config settings.

module.exports = {

  development: {
    client: 'postgresql',
    connection: {
      host : process.env.DATABASE_URL,
      port: '6000',
      user : 'postgres',
      password : 'password',
      database : 'postgres'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './data/migrations'
    },
    seeds: {
      directory: './data/seeds'
    }
  },
  testing: {
    client: 'postgresql',
    connection: {
      host: process.env.DATABASE_URL,
      port: '7000',
      user : 'postgres',
      password : 'password',
      database : 'postgres'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './data/migrations'
    },
    seeds: {
      directory: './data/seeds'
    }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './data/migrations'
    },
    seeds: {
      directory: './data/seeds'
    }
  }
}