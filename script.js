const xlsx = require('node-xlsx');
const chalk = require('chalk');
const { initPrase, closeBrowser, getYouNeed, notFound, delist } = require('./praseHtml.js');
// 最小库存量
const NUM = 100;

// excel文件类径
const excelFilePath = './副本工作簿1.xlsx'
const Log = console.log;

async function init() {
    //解析excel, 获取到所有sheets
Log(chalk.green.bgWhite(`解析表格，表格路径为${excelFilePath}`));
const sheets = xlsx.parse(excelFilePath);
const sheet = sheets[0];
Log(chalk.green.bgWhite(`成功获取表格数据`));

Log(chalk.green.bgWhite(`正在初始化浏览器`));
const page = await initPrase();
Log(chalk.green.bgWhite(`初始化浏览器成功`));

for (let i = 0; i< sheet.data.length; i++) {
    if (i>1) {
        const row = sheet.data[i];
        const testData = await getYouNeed(page, sheet.data[i][0]);
        const sku = row[2];
        Log(chalk.green.bgWhite(`\n正在处理${sku}的内容\n`));
        if(testData === notFound) {
            Log(chalk.red.bold(`${sku}链接404`));
        } else if(testData === delist) {
            Log(chalk.red.bold(`${sku}商品已下架`));
        } else {
            Object.entries(testData).forEach(([color, sizeDetail]) => {
                Log(chalk.green.bgWhite(`${color}\n`));
                sizeDetail.forEach(obj => {
                    const num = getInventoryQuantity(obj.remain || '');
                    if (isQuantitySufficient(num)) {
                        Log(chalk.blue(`${obj.size}库存满足数量>=${NUM}`));
                    } else {
                        Log(chalk.red.bold(`${obj.size}库存数量<${NUM}！！(当前数量${num})`));
                    }
                })
            })
           
        } 
    }
}

closeBrowser();
}

function isQuantitySufficient(num) {
    return num >= NUM;
}

function getInventoryQuantity(str) {
    return parseInt(str.replace(/[^\d]+/g, ''));
}

init();