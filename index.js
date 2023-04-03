const ExcelJS = require('exceljs');
const chalk = require('chalk');
const dayjs = require('dayjs');
const fs = require('fs');
const { initPrase, closeBrowser, getYouNeed, notFound, delist } = require('./praseHtml.js');
// 最小库存量
const NUM = 100;

// excel文件类径
const excelFilePath = './副本工作簿1.xlsx';
const workbook = new ExcelJS.Workbook();
const redStyle = {
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0000' },
  },
};
const Log = console.log;

async function init() {
    //解析excel, 获取到所有sheets
Log(chalk.green.bgWhite(`解析表格，表格路径为${excelFilePath}`));
await workbook.xlsx.readFile(excelFilePath);
// 女装
const worksheet = workbook.getWorksheet('女装');
Log(chalk.green.bgWhite(`成功获取表格数据`));
Log(chalk.green.bgWhite(`正在初始化浏览器`));
const page = await initPrase();
Log(chalk.green.bgWhite(`初始化浏览器成功`));

for (let i = 0; i <= worksheet.rowCount; i++) {
    if (i>=4) {
        const row = worksheet.getRow(i);
        await hanldeData('B', 'D', 'E', row, page);
        await hanldeData('G', 'I', 'J', row, page);
        await hanldeData('L', 'N', 'O', row, page);
    }
  }

  const now = dayjs();
  const dateStr = now.format('YYYY-MM-DD');

  const chinese = excelFilePath.replace(/[^\u4e00-\u9fa5]/g, '') + '-' + dateStr + '.xlsx';
  await workbook.xlsx.writeFile(chinese);

  closeBrowser();
}

async function hanldeData(c1, c2, c3, row, page) {
  const col1 = getCellValue(row.getCell(c1).value);
  const sku = getCellValue(row.getCell(c2).value);
  if (!col1) {
    return;
  }
  const testData = await getYouNeed(page, col1);
  Log(chalk.green.bgWhite(`\n正在处理${sku}的内容\n`));
  if(testData === notFound) {
    handleErrorMessage(`${sku}链接404`, row, c3);
  } else if(testData === delist) {
    handleErrorMessage(`${sku}商品已下架`, row, c3);
  } else {
      Object.entries(testData).forEach(([color, sizeDetail]) => {
          Log(chalk.green.bgWhite(`${color}\n`));
          sizeDetail.forEach(obj => {
              const num = getInventoryQuantity(obj.remain || '');
              if (isQuantitySufficient(num)) {
                Log(chalk.blue(`${obj.size}库存满足数量>=${NUM}`));
              } else {
                handleErrorMessage(`${color}-${obj.size}库存数量<${NUM}！！(当前数量${num})`, row, c3);
              }
          })
      })
     
  } 
}

function getCellValue(cellValue) {
  if (typeof cellValue === 'object' && cellValue !== null) {
    return cellValue.hyperlink;
  } else {
    return cellValue;
  }
}

function isQuantitySufficient(num) {
    return num >= NUM;
}

function getInventoryQuantity(str) {
    return parseInt(str.replace(/[^\d]+/g, ''));
}

// 处理错误信息
function handleErrorMessage(errorMessage, row, index = 'E') {
  Log(chalk.red.bold(errorMessage));
  const cell = row.getCell(index);
  cell.value = `${cell.value || ''}\n${errorMessage}`
  cell.style = redStyle;
}

init();