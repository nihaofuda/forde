const fs = require('fs');
const puppeteer = require('puppeteer')
// 滑动按钮标识；
const slideFlag = '#nc_1_n1z';
// 颜色按钮标识；
const colorFlag = '.prop-item-inner-wrapper';
const errorFilePath = './error.txt';
// 尺码标识
const sizeFlag = '.sku-item-left';
const sizeNameFlag = '.sku-item-name';
const sizePriceFlag = '.sku-item-left';
const sizeRemainFlag = '.sku-item-left';
const notFound = 404;
const delist = 405;
let browser;
let initFlag = false;
const executablePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe';

async function initPage() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless:false,
      ignoreHTTPSErrors: true,
      //executablePath,
      ignoreDefaultArgs:['--enable-automation']
    });
  }
  
  const UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36`
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  page.on('request',async (request) => {
    if (request.url().includes('sale.1688.com/factory/home.html')) {
      await page.goBack();
    }
  });
  // 监听Page.error事件
  page.on('error', async () => {
    fs.appendFileSync(errorFilePath, `Page crashed!\n`);

    // 刷新页面
    await page.reload();
  });
  await page.setViewport({
    width: 1200,
    height: 800
  });
  page.testNum = 1;
  return page;
}

async function goToDetail(page, url) {
  
  if (page.testNum++ > 10) {
    page.testNum =1;
    await page.goto('about:blank');
  }
  await page.goto(url, {timeout: 0});

  // 判断验证码拦截，模拟手动拖拽
  await page.waitForSelector('body');
  if (await page.title() === '验证码拦截') {
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
    await page.bringToFront();
    await page.mouse.up();
  }
  // 判断是否是404，下架，从而进入详情页。
  const waitReturn =  await Promise.any([page.waitForSelector('body[data-spm]'), page.waitForSelector('#nc_1_refresh1')]);
  const htmlContent = await (await waitReturn.getProperty('innerHTML')).jsonValue();
  if (htmlContent.includes('验证失败')) {
    fs.appendFileSync(errorFilePath, `验证失败!\n`);
    console.log(htmlContent);
    await waitReturn.click();
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
    await page.waitForSelector('body[data-spm]');
  }
  const title = await page.title();
  if(title.includes('404')) {
    await page.waitForNavigation();
    return notFound;
  } else {
    try {
      // 判断下架或者进入详情页
      const waitReturn =  await Promise.any([page.waitForSelector(colorFlag, { timeout: 10000 }), page.waitForSelector('.mod-detail-offline-title', { timeout: 10000 })])
      const htmlContent = await (await waitReturn.getProperty('innerHTML')).jsonValue();
      if (htmlContent.includes('商品已下架')) {
        return delist;
      }
    } catch (error) {
      console.warn(error);
    }
  }

}

async function getSizeRemaining(page) {
    const colorItems = await page.$$(colorFlag);
    const dataObj = {};
    let isHasImg = false;
    for (let e of colorItems) {
      const img = await e.$('.prop-img');
      if (img) {
        isHasImg = true;
      }
    }
    for (let e of colorItems) {
      const name = await e.$eval('.prop-name', d => d.innerText);
      const img = await e.$('.prop-img');
        if (isHasImg && !img) {
        continue;
      }
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
  const detailStatus = await goToDetail(page, url);
  if(detailStatus === notFound) {
    return notFound;
  } else if(detailStatus === delist ) {
    return delist;
  }
  return await getSizeRemaining(page);
}

async function closeBrowser() {
  await browser.close();
}

module.exports = { initPrase, closeBrowser, getYouNeed, notFound, delist };