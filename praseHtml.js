const puppeteer = require('puppeteer-core')
const executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// 滑动按钮标识；
const slideFlag = '#nc_1_n1z';
// 颜色按钮标识；
const colorFlag = '.prop-item-inner-wrapper';
// 尺码标识
const sizeFlag = '.sku-item-left';
const sizeNameFlag = '.sku-item-name';
const sizePriceFlag = '.sku-item-left';
const sizeRemainFlag = '.sku-item-left';
let browser;
let initFlag = false;


async function initPage() {
  if (!browser) {
    browser = await puppeteer.launch({
      executablePath,
      headless:false,
      ignoreDefaultArgs:['--enable-automation']
    });
  }
  
  const UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36`
  const page = await browser.newPage();
  await page.setUserAgent(UA)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  await page.setViewport({
    width: 1200,
    height: 800
  });
  return page;
}

async function goToDetail(page, url) {
  await page.goto(url);

  if (!initFlag) {
    await page.waitForSelector(slideFlag);

    const item = await page.$(slideFlag);
    let { x, y } = await item.boundingBox();
    x+=10;
    y+=10;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 0 ; i< 300; i+=10) {
      await page.mouse.move(x+i, y);
    }
    await page.mouse.up();
  }
  initFlag = true;
  await page.waitForSelector(colorFlag);

}

async function getSizeRemaining(page) {
    const colorItems = await page.$$(colorFlag);
    const dataObj = {};
    for (let e of colorItems) {
      const name = await e.$eval('.prop-name', d => d.innerText);
      const { x, y } = await e.boundingBox();
      await page.mouse.click(x, y);
      const returnData = await page.$$eval(sizeFlag, async(sizeItems) => {
        return JSON.stringify(sizeItems.map(sizeItem => {
          return {
            size: sizeItem.children[0].innerText,
            price: sizeItem.children[1].innerText,
            remain: sizeItem.children[2].innerText
          }
          }));
      });
      dataObj[name] = JSON.parse(returnData);
    }
    return dataObj;
}


async function initPrase() {
  return await initPage();
}

async function getYouNeed(page, url) {
  await goToDetail(page, url)
  return await getSizeRemaining(page);
}

async function closeBrowser() {
  await browser.close();
}


module.exports = { initPrase, closeBrowser, getYouNeed };