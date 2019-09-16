const axios = require('axios')

function requestQueue(exchange, headers = {}) {
   const axiosWithQueue = axios.create()
   const queue = []
   let rateLimit
   let cooldown

   // Rate limit defaults to 1 second
   // Only the exchanges that specify in their API documentation
   // That they have faster/slower limits are defined in switch statement
   switch (exchange) {
      case 'coinbase':
         rateLimit = 0.25
         break
      case 'bithumb':
         rateLimit = 0.015
         break
      case 'ethfinex':
         rateLimit = 3
         break
      case 'idex':
         rateLimit = 0.25
         break
      case 'liquid':
         rateLimit = 1.25
         break
      case 'poloniex':
         rateLimit = 0.175
         break
      default:
         rateLimit = 1
   }

   //Use the rateLimit to set the initial cooldown
   //Only really necessary in development to ensure rate limits are enforced when the server is restarted
   cooldown = new Date().getTime() + rateLimit * 1000

   // Add a request interceptor which pushes request to the queue
   // The request queue is what is used to store requests when the rate limit is triggered
   axiosWithQueue.interceptors.request.use(
      (config) => {
         var res
         const promise = new Promise((resolve) => {
            res = resolve
         })
         promise.resolve = res
         queue.push({ promise, config })
         if (queue.length === 1) {
            shift()
         }
         return promise
      },
      (error) => {
         return Promise.reject(error.message)
      },
   )

   //Update the rate limit cooldown after each request response is received
   axiosWithQueue.interceptors.response.use(
      (response) => {
         cooldown = new Date(new Date().getTime() + rateLimit * 1000)
         if (queue.length > 0) {
            shift()
         }
         return response
      },
      (error) => {
         return Promise.reject(error)
      },
   )

   //The controller for the request queue
   //If the rate limit has not been triggered then it immediately sends the request
   //Otherwise, it waits for the rate limit to pass before shifting a request off the queue and sending it
   function shift() {
      const currentDate = new Date().getTime()
      let difference = cooldown - currentDate
      if (difference < 0) difference = 0
      setTimeout(() => {
         const { promise, config } = queue.shift()
         if (
            exchange === 'idex' ||
            (exchange === 'gemini' && queue.length % 9 === 0)
         ) {
            console.log(`${exchange} has ${queue.length} requests in its queue`)
         }
         const parsedConfig = {
            ...config,
            headers: {
               'Content-Type': 'application/json',
               ...headers,
            },
         }
         promise.resolve(parsedConfig)
      }, difference)
   }

   return axiosWithQueue
}

module.exports = requestQueue
