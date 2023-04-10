const { initPrase, getYouNeed, notFound, delist, closeBrowser } = require('./praseHtml.js');
const chalk = require('chalk');
const Log = console.log;
const fs = require('fs');
const errorFilePath = './error.txt';
const NUM = 100;


process.on('message', async (tasks) => {
    console.log(`Worker process ${process.pid} received ${tasks.length} tasks.`);
    const page = await initPrase();
    for(let i = 0; i < tasks.length; i++) {
        const { f, s, t, row } = tasks[i];
        await hanldeData(f, s, t, row, page)
    }
    // closeBrowser();
    process.send(`${process.pid}success`);
  });

  async function hanldeData(c1, c2, c3, row, page) {
    const { col1, sku } = row;
    if (!col1 || !col1.includes('https://detail.1688.com/')) {
      return;
    }
    let testData;
    try {
      testData = await getYouNeed(page, col1);
    } catch {
      fs.appendFileSync(errorFilePath, `${sku}\n`);
      return;
    }
  
    Log(chalk.green.bgWhite(`\n正在处理${sku}的内容\n`));
    if(!testData) {
      return;
    }
    if(testData === notFound) {
      handleMessage(`${sku}链接404`, row, c3);
    } else if(testData === delist) {
      handleMessage(`${sku}商品已下架`, row, c3);
    } else {
        Object.entries(testData).forEach(([color, sizeDetail]) => {
            Log(chalk.green.bgWhite(`${color}\n`));
            sizeDetail.forEach(obj => {
                const num = getInventoryQuantity(obj.remain || '');
                if (isQuantitySufficient(num)) {
                  handleMessage(`${obj.size}库存满足数量>=${NUM}`, row, c3, 'success');
                } else {
                  handleMessage(`${color}-${obj.size}库存数量<${NUM}！！(当前数量${num})`, row, c3);
                }
            })
        })
       
    } 
  }

  
  function isQuantitySufficient(num) {
      return num >= NUM;
  }
  
  function getInventoryQuantity(str) {
      return parseInt(str.replace(/[^\d]+/g, ''));
  }

  function handleMessage(message, row, index = 'E', type = 'error') {
    process.send({ message, rowI: row.index, index, type });
  }