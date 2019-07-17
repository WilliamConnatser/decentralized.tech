require("dotenv").config()
const server = require("./server");
const axios = require("axios");

const port = process.env.PORT || 5000;

server.listen(port, () => console.log(`Server Alive On http://localhost:${port}`));