const puppeteer = require('puppeteer');
const fs = require('fs');
const print = require("pdf-to-printer");
const configs = require('./configs.js');
let orders;
let lastOrdersArray;
let movedFiles = [];

async function tcgPlayerDownloadPrinter(){
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
    await writeFinalOrderNumber(orders.toString());
    await filterOrders();
    console.log('orders', orders);
    await downloadAllOrderPDFs(page);
    await page.waitForTimeout(2000);
    await browser.close();
    return;
  }catch(err){
    await browser.close();
    console.log(err);
    return 1;
  }
}

async function dropAllUnneededOrders(){
  console.log('Dropping all unneeded orders');
  // Loop through orders and drop duplicates
  if(orders){
    let count = orders.length;
    for (var i = 0; i < orders.length; i++) {
      for (var j = i + 1; j < orders.length; j++) {
        if (orders[i] === orders[j]) {
          console.log('Duplicate order found', orders[i]);
          orders.splice(i, 1);
          i--;
        }
      }
    }
  }
}

async function filterOrders(){
  // Loop through orders and drop any orders that are in lastOrdersArray
  if(lastOrdersArray){
    console.log('Filtering orders', lastOrdersArray);
    for (var i = 0; i < orders.length; i++) {
      for (var j = 0; j < lastOrdersArray.length; j++) {
        if (orders[i] == lastOrdersArray[j]) {
          console.log('Order found in lastOrdersArray', orders[i]);
          // Remove order from orders array
          orders.splice(i, 1);
          i--;
        }
      }
    }
  }
}

async function downloadAllOrderPDFs(page){
  console.log('Downloading all order PDFs');
  if(orders.length > 0){    
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
  await page.waitForSelector('.input-per-page');
  await page.select('.input-per-page', '500')
}


async function loginToTCGPlayer(page){
  console.log('Logging into TCGPlayer');
  // type username into box with name='email'
  await page.waitForSelector('input[name="Email"]');
  await page.type('input[name="Email"]', configs.email);
  await page.type('input[name="Password"]', configs.password);
  await page.keyboard.press('Enter');
}

async function checkForlastOrderTxt(){
  console.log('Checking for lastOrder.txt');
  // Check for lastOrder.txt
  if (fs.existsSync('./lastOrder.txt')) {
    let lastOrdersList = fs.readFileSync("./lastOrder.txt").toString('utf-8');
    lastOrdersArray = lastOrdersList.split(',');
    console.log(lastOrdersArray)
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

module.exports = {
  tcgPlayerDownloadPrinter,
}