// create basic express server
const express = require('express');
const cron = require('node-cron')
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// create cron job that runs index.js every hour
cron.schedule('0 * * * *', () => {
  console.log('running a task every hour');
  // run index.js
  const index = require('./index.js');
  index();
}, null, true, 'America/Los_Angeles');
