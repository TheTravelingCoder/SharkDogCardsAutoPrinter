// create basic express server
const express = require('express');
const cron = require('node-cron')
const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 3000;
const index = require('./index.js');
const moveFiles = require('./moveFiles.js');

async function runDownloader(){
  await index.tcgPlayerDownloadPrinter().then(async () => {
    console.log('index.js finished');
    // move all files from downloads folder to print folder
    try{
      await moveFiles.moveAllFiles();
    }catch(err){console.log(err);}
  }).then(() => {
    console.log('moveFiles.js finished');
    // set up cron job to run every hour
    cron.schedule('0 * * * *', async () => {
      console.log('running a task every hour');
      // run index.js
      await index.tcgPlayerDownloadPrinter().then(async () => {
        console.log('index.js finished');
        // move all files from downloads folder to print folder
        try{
          await moveFiles.moveAllFiles();
        }catch(err){console.log(err);}
      }).catch((err) => {
        console.log(err);
      });
    });
  }).catch((err) => {
    console.log(err);
  });
}

runDownloader();