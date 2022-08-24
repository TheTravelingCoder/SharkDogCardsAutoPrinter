const puppeteer = require('puppeteer');
const fs = require('fs');
const print = require("pdf-to-printer");
const configs = require('./configs.js');
var orders;
var lastOrder;
var movedFiles = [];

const tcgPlayerDownloadPrinter = async () => {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
    ],
    headless: false,
    slowMo: 10
  });
  try{
    await checkForlastOrderTxt();
    //Handles logging into tcgplayer.com
    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080});
    await page.goto(`${configs.url}/admin/orders/orderlist`);

    await loginToTCGPlayer(page);
    await page.waitForNavigation();

    await clickAllOpenOrdersButton(page);
    await changeTo500Orders(page);
    await waitForPageLoadWithScreenshots('1', page);
    await createListOfOrders(page);
    await dropAllUnneededOrders();
    console.log('orders', orders);
    await downloadAllOrderPDFs(page);

    setTimeout(async () => {
      await moveAllFiles();
    }, orders.length * 1000); 

    setTimeout(async () => {
      await browser.close();
    }, orders.length * 1000);
  }catch(err){
    await browser.close();
    console.log(err);
  }
}

function printAllOrders(){
  console.log('Printing all orders');
  // if movedFiles array is greater than 0, loop through and print
  if(movedFiles.length > 0){
    movedFiles.forEach(file => {
      console.log('Printing file', file);
      print.print(`${file}`, {printer: 'Brother HL-L3270CDW series'}).then(console.log).catch(console.error);
    });
  }
}

async function moveAllFiles(){
  console.log('Moving all files');
  new Promise((resolve, reject) => {
    // Open downloads folder, loop through all files, move them
    fs.readdir(configs.downloadPath, (err, files) => {
      console.log('files', files);
      if(files){
        files.forEach(file => {
          console.log('Moving file', file);
          // push new file location to movedFiles array
          movedFiles.push(`${configs.archivePath}\\${file}`);
          fs.rename(`${configs.downloadPath}\\${file}`, `${configs.archivePath}\\${file}`, function (err) {
            if (err) throw err;
            // if last file, resolve promise
            if(file === files[files.length - 1]){
              resolve();
            }
          });
        });
      }else{
        resolve();
      }
    });
  }).then(() => {
    // Once all files are moved, print all orders
    printAllOrders();
  });
}

async function dropAllUnneededOrders(){
  console.log('Dropping all unneeded orders');
  // Loop through orders and drop duplicates
  if(orders){
    for (var i = 0; i < orders.length; i++) {
      for (var j = i + 1; j < orders.length; j++) {
        if (orders[i] === orders[j]) {
          orders.splice(j, 1);
          i--;
        }
      }
    }
  }

  // Drop all in array before the last order
  if(lastOrder){
    var index = orders.indexOf(lastOrder);
    if (index > -1) {
      for(var i = 0; i < index + 1; i++){
        orders.shift();
      }
    }
  }
}

async function downloadAllOrderPDFs(page){
  console.log('Downloading all order PDFs');
  if(orders.length > 0){
    await writeFinalOrderNumber(orders[orders.length - 1]);
    // Loop through all orders
    for (var i = 0; i < orders.length; i++) {
      await page.goto(`${configs.url}/admin/orders/manageorder/${orders[i]}`);
      // Click parent link to download PDF
      const [button] = await page.$x("//a[contains(., 'Print Packing Slip')]");
      if (button) {
        await button.click();
      }
    }
  }
}

async function writeFinalOrderNumber(orderNumber){
  console.log('Writing final order number');
  fs.writeFile('./lastOrder.txt', orderNumber, (err) => {
    // In case of a error throw err.
    if (err) throw err;
  });
}

async function clickAllOpenOrdersButton(page){
  console.log('Clicking All Open Orders Button');
  const [button] = await page.$x("//button[contains(., 'All Open Orders')]");
  if (button) {
      await button.click();
  }
}

async function changeTo500Orders(page){
  console.log('Change to 500 orders per page');
  await page.select('.input-per-page', '500')
}


async function loginToTCGPlayer(page){
  console.log('Logging into TCGPlayer');
  await page.type('#UserName', configs.email);
  await page.type('#Password', configs.password);
  await page.keyboard.press('Enter');
}

async function checkForlastOrderTxt(){
  console.log('Checking for lastOrder.txt');
  // Check for lastOrder.txt
  if (fs.existsSync('./lastOrder.txt')) {
    fs.readFile('./lastOrder.txt', 'utf8', function(err, data) {
      if (err) throw err;
      lastOrder = data;
    });
  } 
}

async function createListOfOrders(page){
  console.log('Creating list of orders');
  var table = await page.$eval('table.table > tbody', el => el.innerHTML);

  // Parse String for array of hrefs
  var hrefs = table.match(/href="([^"]*)/g);
  if(hrefs){
    hrefs = hrefs.map(function(href){
      return href.replace('href="', '');
    });

    // Parse array for order numbers
    orders = hrefs.map(function(href){
      return href.match(/order\/([^"]*)/)[1];
    });
  }
}

async function waitForPageLoadWithScreenshots(filename, page){
  await page.screenshot({
    path: `${filename}.png`
  });
  await page.screenshot({
    path: `${filename}.png`
  });
  await page.screenshot({
    path: `${filename}.png`
  });
  await page.screenshot({
    path: `${filename}.png`
  });
  await page.screenshot({
    path: `${filename}.png`
  });
  await page.screenshot({
    path: `${filename}.png`
  });
}

tcgPlayerDownloadPrinter();

// async function ifPaginationExistsClickNextPage(page){
//   console.log('Checking for pagination');
//   // Find unordered list of pagination-list
//   const paginationList = await page.$('ul.pagination-list');
//   if(paginationList){
//     console.log('Pagination exists');
//     // Find all list items in pagination-list
//     const paginationListItems = await paginationList.$$('li');
//     // Count list items
//     const paginationListItemsCount = paginationListItems.length;
//     // If there is more than 1 list item, loop through and click each
//     if(paginationListItemsCount > 1){
//       console.log('There is more than 1 page of orders');
//       for(let i = 0; i < paginationListItemsCount; i++){
//         console.log('Clicking next page', paginationListItems[i]);
//         await paginationListItems[i].click();
//         await waitForPageLoadWithScreenshots('afterClickNextPage', page);
//         await createListOfOrders(page);
//         await dropAllUnneededOrders();
//       }
//     }
//   }
// }