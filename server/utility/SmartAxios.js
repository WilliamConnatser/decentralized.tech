const fs = require('fs')
const axios = require('axios')

class SmartAxios {
    constructor(exchange) {
        this.exchange = exchange
        this.axios = axios.create()
        this.queue = []
        this.headers = {}
        this.rateLimit = 0

        // Rate limit defaults to 1 second
        // Only the exchanges that specify in their API documentation
        // That they have faster/slower limits are defined in switch statement
        switch(this.exchange) {
            case 'coinbase':
                this.rateLimit = .25
                break
            case 'bithumb':
                this.rateLimit = .015
                break
            case 'ethfinex':
                this.rateLimit = 3
                break
            case 'idex':
                this.rateLimit = .25
                break
            case 'liquid':
                this.rateLimit = 1.25
                break
            default:
                this.rateLimit = 1

            //Use the rateLimit to set the initial cooldown
            //Only really necessary in development to ensure rate limits are enforced when the server is restarted
            this.cooldown = new Date().getTime() + this.rateLimit * 1000
        }

        // Add a request interceptor which pushes request to the queue
        // The request queue is what is used to store requests when the rate limit is triggered
        this.axios.interceptors.request.use((config) => {
            var res
            const promise = new Promise((resolve) => {
                res = resolve
            })
            promise.resolve = res
            this.queue.push({promise,config})
            if (this.queue.length === 1) {
                this.shift()
            }
            return promise
        }, (error) => {
            return Promise.reject(error.message);
        })

        //Update the rate limit cooldown after each request response is received
        this.axios.interceptors.response.use((response) => {
            this.cooldown = new Date(new Date().getTime() + 1000 * this.rateLimit);
            if (this.queue.length > 0) {
                this.shift();
            }
            return response;
        }, (error) => {
            return Promise.reject(error);
        })
    }

    //The controller for the request queue
    //If the rate limit has not been triggered then it immediately sends the request
    //Otherwise, it waits for the rate limit to pass before shifting a request off the queue and sending it
    shift() {
        const currentDate = new Date().getTime()
        let difference = this.cooldown - currentDate
        if (difference < 0) difference = 0
        setTimeout(() => {
            const {promise,config} = this.queue.shift()
            const parsedConfig = {
                ...config,
                headers: {
                    'Content-Type': 'application/json',
                    ...this.headers
                }
            }
            promise.resolve(parsedConfig)
        }, difference)
    }
}

module.exports = SmartAxios