// create basic express server
const express = require('express');
const cron = require('node-cron')
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 3000;
const index = require('./index.js');
const moveFiles = require('./moveFiles.js');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// create cron job that runs index.js every hour
cron.schedule('0 * * * *', async () => {
  console.log('running a task every hour');
  // run index.js
  await index.tcgPlayerDownloadPrinter().then(() => {
    console.log('index.js finished');
    // move all files from downloads folder to print folder
    try{
      moveFiles.moveAllFiles();
    }catch(err){console.log(err);}
  }).catch((err) => {
    console.log(err);
  });

}, null, true, 'America/Los_Angeles');
