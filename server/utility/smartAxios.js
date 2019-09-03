const fs = require('fs')

function smartAxios(exchange) {
    const customAxios = require('axios').create()
    let queue = []
    var apiKey = {}
    var rateLimit = 0

    switch(exchange) {
        case 'coinbase':
            rateLimit = .25
        default:
            rateLimit = 0
    }

    //Gets cooldown timestamp - Writes curent timestamp to file if .cooldown file does not exits yet
    function getCooldown() {
        try {
            const data = fs.readFileSync(`./utility/cooldowns/${exchange}`, 'utf8')
            return Number(data.toString())
        } catch(e) {
            const now = new Date().getTime()
            fs.writeFileSync(`./utility/cooldowns/${exchange}`, now.toString())
            return now
        }
    }

    //Sets cooldown timestamp by writing it to the .cooldown file
    function setCooldown(date) {
        fs.writeFileSync(`./utility/cooldowns/${exchange}`, date.getTime().toString())
    }

    function shift() {
        const currentDate = new Date().getTime()
        const nextAvailableRequest = getCooldown()
        let difference = nextAvailableRequest - currentDate
        if (difference < 0) difference = 0
        console.log(`\u{26A0} \u{26A0} \u{26A0} Seconds Until Next Request: ${difference/1000} \u{26A0} \u{26A0} \u{26A0}`)
        setTimeout(() => {
            const {promise,config} = queue.shift()
            console.log(`Processing Next Request In Queue... (${queue.length} other requests waiting)`)
            const parsedConfig = {
                ...config,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
            promise.resolve(parsedConfig)
        }, difference)
    }

    // Add a request interceptor which pushes request to the queue
    customAxios.interceptors.request.use(function (config) {
        var res
        const promise = new Promise((resolve) => {
            res = resolve
        })
        promise.resolve = res
        queue.push({promise,config})
        if (queue.length === 1) {
            shift()
        }
        return promise
    }, function (error) {
        return Promise.reject(error);
    });

    customAxios.interceptors.response.use((response) => {
        setCooldown(new Date(new Date().getTime() + 1000 * rateLimit));
        if (queue.length > 0) {
            shift();
        }
        return response;
    }, (error) => {
        console.log(error)
        console.log("Error...");
        return Promise.reject(error);
    });

    return customAxios
}

module.exports = smartAxios