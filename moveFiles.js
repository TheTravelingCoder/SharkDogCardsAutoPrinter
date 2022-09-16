const configs = require('./configs.js');
const fs = require('fs');
const path = require('path');
const print = require("pdf-to-printer");
let movedFiles = [];

async function printAllOrders(){
  console.log('Printing all orders');
  new Promise((resolve, reject) => {
    // if movedFiles array is greater than 0, loop through and print
    try{
      if(movedFiles.length > 0){
        movedFiles.forEach(async file => {
          await print.print(`${file}`, {printer: 'Brother HL-L3270CDW series'}).then((res) => {console.log(res)}).catch((err) => {console.error(err)});
        });
        console.log('All orders printed');
        resolve();
        return;
      }else{
        console.log('No files to print');
        resolve();
        return;
      }
    }catch(err){
      console.log(err);
      reject(err);
    }
  }).catch(err => {
    console.log(err);
    console.log('There was an error printing all orders');
    return;
  });
}

async function moveAllFiles(){
  console.log('Moving all files');
  movedFiles = [];
  new Promise((resolve, reject) => {
    // Open downloads folder, loop through all files, move them
    try{
      fs.readdir(path.resolve(configs.downloadPath), (err, files) => {
        if(err){ 
          console.log(err);
          reject(err);
        }
        console.log('files', files);
        if(files != []){
          files.forEach(file => {
            console.log('Moving file', file);
            // push new file location to movedFiles array
            // if windows
            if(process.platform === 'win32'){
              movedFiles.push(`${configs.archivePath}\\${file}`);
              fs.rename(`${configs.downloadPath}\\${file}`, `${configs.archivePath}\\${file}`, function (err) {
                if (err) throw err;
                // if last file, resolve promise
                if(file === files[files.length - 1]){
                  resolve();
                }
              });
            // if linux
            }else{
              movedFiles.push(`${configs.archivePath}/${file}`);
              fs.rename(`${configs.downloadPath}/${file}`, `${configs.archivePath}/${file}`, function (err) {
                if (err) throw err;
                // if last file, resolve promise
                if(file === files[files.length - 1]){
                  resolve();
                }
              });
            }
          });
        }else{
          reject();
        }
      });
    }catch(err){
      console.error('error', err);
      reject(err);
    }
  }).then(async () => {
    console.log('movedFiles', movedFiles);
    await printAllOrders();
  }).catch(err => {
    console.log('There was an error moving all files');
    console.log(err);
  });
}

module.exports = {
  moveAllFiles
}