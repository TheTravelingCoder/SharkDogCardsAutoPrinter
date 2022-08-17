const puppeteer = require('puppeteer');
const fs = require('fs');
const print = require("pdf-to-printer");

const configs = require('./configs.js');
var orders;
var lastOrder;

const tcgPlayerDownloadPrinter = async () => {
  const browser = await puppeteer.launch({
    // executablePath:"/usr/bin/chromium-browser",
    args: ['--no-sandbox',
  
    ],
    headless: false,
    slowMo: 100
  });
  try{
    //Handles logging into tcgplayer.com
    const page = await browser.newPage();
    await page.goto(`${configs.url}/admin/orders/orderlist`);

    await loginToTCGPlayer(page);
    await page.waitForNavigation();

    await clickAllOpenOrdersButton(page);
    await waitForPageLoadWithScreenshots('afterClickAllOpenOrders', page);

    await createListOfOrders(page);
    await checkForlastOrderTxt();

    if(lastOrder){
      await dropAllUnneededOrders();
    }

    await downloadAllOrderPDFs(page);
    await printAllOrders();

    await page.waitForNavigation();
    await browser.close();
  }catch(err){
    await browser.close();
    console.log(err);
  }
}

async function printAllOrders(){
  // Open downloads folder, loop through all files, print them
  fs.readdir(configs.downloadPath, (err, files) => {
    files.forEach(file => {
      print.print(`${configs.downloadPath}/${file}`);
    });
  });

  // Move all files to archive folder in Documents
  fs.readdir(configs.downloadPath, (err, files) => {
    files.forEach(file => {
      fs.rename(`${configs.downloadPath}/${file}`, `${configs.archivePath}/${file}`, (err) => {
        if (err) throw err;
      });
    });
  });
}

async function dropAllUnneededOrders(){
  // Loop through orders and drop duplicates
  for (var i = 0; i < orders.length; i++) {
    for (var j = i + 1; j < orders.length; j++) {
      if (orders[i].orderNumber === orders[j].orderNumber) {
        orders.splice(j, 1);
      }
    }
  }

  // Drop all orders after the last order
  var indexOfLastOrder = orders.indexOf(lastOrder);
  if(indexOfLastOrder > -1){
    orders = orders.slice(0, indexOfLastOrder);
  }
}

async function downloadAllOrderPDFs(page){
  await writeFinalOrderNumber(orders[0]);
  // Loop through all orders
  for (var i = 0; i < orders.length; i++) {
    await page.goto(`${configs.url}/admin/orders/manageorder/${orders[i]}`);
    await waitForPageLoadWithScreenshots('afterClickAllOpenOrders', page);
    // Click parent link to download PDF
    const [button] = await page.$x("//a[contains(., 'Print Packing Slip')]");
    if (button) {
      await button.click();
    }
  }
}

async function writeFinalOrderNumber(orderNumber){
  fs.writeFile('./lastOrder.txt', orderNumber, (err) => {
      
    // In case of a error throw err.
    if (err) throw err;
  });
}

async function clickAllOpenOrdersButton(page){
  const [button] = await page.$x("//button[contains(., 'All Open Orders')]");
  if (button) {
      await button.click();
  }
}

async function loginToTCGPlayer(page){
  await page.type('#UserName', configs.email);
  await page.type('#Password', configs.password);
  await page.keyboard.press('Enter');
}

async function checkForlastOrderTxt(){
  // Check for lastOrder.txt
  if (fs.existsSync('./lastOrder.txt')) {
    fs.readFile('./lastOrder.txt', 'utf8', function(err, data) {
      if (err) throw err;
      lastOrder = data;
    });
  } 
}

async function createListOfOrders(page){
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
}

tcgPlayerDownloadPrinter();

// Andrews Printer
// deviceId: 'Brother HL-L3270CDW series',
// name: 'Brother HL-L3270CDW series'