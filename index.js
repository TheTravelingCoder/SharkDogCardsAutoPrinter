const puppeteer = require('puppeteer');
const fs = require('fs');
const print = require("pdf-to-printer");
const configs = require('./configs.js');
var orders;
var lastOrder;

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
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);

    await createListOfOrders(page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);

    if(lastOrder){
      await dropAllUnneededOrders();
      await waitForPageLoadWithScreenshots('afterClickNextPage', page);
      await waitForPageLoadWithScreenshots('afterClickNextPage', page);
      await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    }

    await ifPaginationExistsClickNextPage(page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    console.log('orders', orders);
    await downloadAllOrderPDFs(page);
    setTimeout(async () => {
      await printAllOrders();
    }, orders.length * 1000);); 
    setTimeout(async () => {
      await moveAllFiles();
    }, orders.length * 3000);); 

    await browser.close();
  }catch(err){
    await browser.close();
    console.log(err);
  }
}

async function printAllOrders(){
  console.log('Printing all orders');
  // Open downloads folder, loop through all files, print them
  new Promise((resolve, reject) => {
    fs.readdir(configs.downloadPath, (err, files) => {
      console.log('files', files);
      files.forEach(file => {
        console.log('Printing file', file);
        // Print file if it is a PDF to device id 'Brother HL-L3270CDW series'
        if(file.includes('.pdf')){
          console.log('Printing PDF');
          print.print(`${configs.downloadPath}\\${file}`, {printer: 'Brother HL-L3270CDW series'}).then(console.log).catch(console.error);
        }
        // if last file, resolve promise
        if(file === files[files.length - 1]){
          resolve();
        }
      });
    });
  });
}

async function moveAllFiles(){
  console.log('Moving all files');
  // Open downloads folder, loop through all files, move them
  fs.readdir(configs.downloadPath, (err, files) => {
    console.log('files', files);
    files.forEach(file => {
      console.log('Moving file', file);
      fs.rename(`${configs.downloadPath}\\${file}`, `${configs.archivePath}\\${file}`, function (err) {
        if (err) throw err;
      });
    });
  });
}

async function ifPaginationExistsClickNextPage(page){
  console.log('Checking for pagination');
  // Find unordered list of pagination-list
  const paginationList = await page.$('ul.pagination-list');
  if(paginationList){
    console.log('Pagination exists');
    // Find all list items in pagination-list
    const paginationListItems = await paginationList.$$('li');
    // Count list items
    const paginationListItemsCount = paginationListItems.length;
    // If there is more than 1 list item, loop through and click each
    if(paginationListItemsCount > 1){
      console.log('There is more than 1 page of orders');
      for(let i = 0; i < paginationListItemsCount; i++){
        console.log('Clicking next page');
        await paginationListItems[i].click();
        await waitForPageLoadWithScreenshots('afterClickNextPage', page);
        await createListOfOrders(page);
        await dropAllUnneededOrders();
      }
    }
  }
}

async function dropAllUnneededOrders(){
  console.log('Dropping all unneeded orders');
  // Loop through orders and drop duplicates
  for (var i = 0; i < orders.length; i++) {
    for (var j = i + 1; j < orders.length; j++) {
      if (orders[i] === orders[j]) {
        orders.splice(j, 1);
        i--;
      }
    }
  }

  // Drop all in array before the last order
  var index = orders.indexOf(lastOrder);
  if (index > -1) {
    for(var i = 0; i < index + 1; i++){
      orders.shift();
    }
  }
}

async function downloadAllOrderPDFs(page){
  console.log('Downloading all order PDFs');
  await writeFinalOrderNumber(orders[orders.length - 1]);
  // Loop through all orders
  for (var i = 0; i < orders.length; i++) {
    await page.goto(`${configs.url}/admin/orders/manageorder/${orders[i]}`);
    await waitForPageLoadWithScreenshots('afterClickNextPage', page);
    // Click parent link to download PDF
    const [button] = await page.$x("//a[contains(., 'Print Packing Slip')]");
    if (button) {
      await button.click();
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
  var hrefs = hrefs.map(function(href){
    return href.replace('href="', '');
  });

  // Parse array for order numbers
  orders = hrefs.map(function(href){
    return href.match(/order\/([^"]*)/)[1];
  });
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