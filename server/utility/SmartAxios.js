const fs = require('fs')
const axios = require('axios')

class SmartAxios {
    constructor(exchange) {
        this.exchange = exchange
        this.axios = axios.create()
        this._cooldown = null
        this.queue = []
        this.headers = {}
        this.rateLimit = 0

        switch(this.exchange) {
            case 'coinbase':
                this.rateLimit = .25
                break
            case 'bithumb':
                this.rateLimit = .015
                break
            case 'kraken':
                this.rateLimit = 1
                break
            default:
                this.rateLimit = 0
        }

        // Add a request interceptor which pushes request to the queue
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
        });

        this.axios.interceptors.response.use((response) => {
            this._cooldown = new Date(new Date().getTime() + 1000 * this.rateLimit);
            if (this.queue.length > 0) {
                this.shift();
            }
            return response;
        }, (error) => {
            console.log(error.message)
            return Promise.reject(error);
        });
    }

    //On initialization it gets cooldown timestamp from the hard drive
    //Each time cooldown is set, it writes the current cooldown timestamp to the hard drive
    set cooldown(date) {
        if(!date) {
            try {
                if(!this.cooldown) {
                    const newDate = fs.readFileSync(`./utility/cooldowns/${this.exchange}`, 'utf8')
                    this.cooldown = new Date(newDate)
                }
            } catch(e) {
                this.cooldown = new Date()
            }
        } else {
            this.cooldown = date
        }
        fs.writeFileSync(`./utility/cooldowns/${this.exchange}`, this.cooldown.getTime())
    }

    shift() {
        const currentDate = new Date().getTime()
        let difference = this._cooldown - currentDate
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