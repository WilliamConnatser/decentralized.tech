# decentralized.tech

# Setup

- Install Docker And Start Postgres Database
    - Once installed, you can start a Postgres container via `npm run db_start_dev`
    - After starting the postgres container, to run migrations run `npm run db_reset_dev`
    - `npm run db_reset_dev` can be ran at anytime to rollback the database
- Set up a .env file in the root server directory
    - There is a .env.example file is provided in the root directory as an example .env file
    - The .env.example should work on *nix and max, but on Windows there is one edit you must make
    - If using Windows, set the `DATABASE_URL` env variable to your docker-machine IP address
    - Your docker-machine IP can be obtained by running `docker-machine ip` in the console
- Start the server via `npm run dev`

# File Structure
```
/client (React App)
/server (Express Backend)
    /apis
        /db (Database APIs)
        /external   (External REST APIs And WebSockets)
    /data   (Database Configurations)
        /migrations (Database Migrations)
    /routers    (Express Routers)
    /middleware (Express Middleware)
    /engine (Automation And Orchestration Of Keeping Data In Sync)
    /utility (Utility Modules)
```

# About
- For now, the features and design of the frontend is TBD
- Data aggregation is the main focus as of now
- Collecting raw trading data is the ultimate form of market data because anything else (candle data, tickers, charts, etc) can be deduced directly from the trades
- Therefore, currently the focus is on writing modules which can aggregate raw trade data

# Todo
- Write Liquid API/WS Module
- Write Poloniex API/WS Module
- Write Belfrics API/WS Module
- Write IDEX API/WS Module
- Write Kraken API/WS Module
    - **ON HOLD**
    - It seems granular trade data is not accessible via their API?
- Write Binance API/WS Module 
    - **ON HOLD**
    - Americans can not register for an account, and therefore can not receive an API key
- Write Gate.io API/WS Module
    - **ON HOLD**
    - Unsure how to handle options and futures
- Write Deribit API/WS Module
    - **ON HOLD**
    - Unsure how to handle options and futures 
- Write Engine Module To Automate And Orchestrate Keeping Data In Sync
- Write Engine Module To Calculate Candle Data From Raw Trades
    - Runs every X Minutes ??
    - Stored in a separate DB table
- Write Engine Module To Calculate Tickers (Current Prices And Volume)
    - Runs every X Minutes ??
    - Stored in a separate DB table
- Brainstorm Frontend Features
    - Also, Routers And Endpoints Due To Features