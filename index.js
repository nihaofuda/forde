const ExcelJS = require('exceljs');
const chalk = require('chalk');
const dayjs = require('dayjs');
const fs = require('fs');
const { initPrase, closeBrowser, getYouNeed, notFound, delist } = require('./praseHtml.js');
// 最小库存量
const NUM = 100;

// excel文件类径
const excelFilePath = './D&Y产品编号对照表.xlsx';
const filePath = './file.txt';
const errorFilePath = './error.txt';
const infoFilePath = './info.txt';
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, '4');
}
if (!fs.existsSync(errorFilePath)) {
  fs.writeFileSync(errorFilePath, '');
}
if (!fs.existsSync(infoFilePath)) {
  fs.writeFileSync(infoFilePath, '');
}
const fileContent = Number(fs.readFileSync(filePath, 'utf8'));
const workbook = new ExcelJS.Workbook();
const redStyle = {
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0000' },
  },
};
const greenStyle = {
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '7CFC00' },
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
const newSheet = Array.from(Array(10), () => []);
const pageList = []
for (let i =0; i< 1; i ++) {
  pageList.push(await initPrase());
}
Log(chalk.green.bgWhite(`成功初始化浏览器`));
const index = 0;

const now = dayjs();
const dateStr = now.format('YYYY-MM-DD');
const chinese = excelFilePath.replace(/[^\u4e00-\u9fa5]/g, '') + '.xlsx';

for (let i = 0; i <= worksheet.rowCount; i++) {
    try {
      if (i>=fileContent) {
        const row = worksheet.getRow(i);
        for (let j = 0; j<= 2;j++) {
          if (index > 10) {
            index %=10;
          }
          let obj = {};
          if (j === 0) {
            obj = {
              f: 'B',
              s: 'D',
              t: 'E',
              row: row
            }
          } else if (j === 1) {
            obj = {
              f: 'G',
              s: 'I',
              t: 'J',
              row: row
            }
          } else if (j === 2) {
            obj = {
              f: 'L',
              s: 'N',
              t: 'O',
              row: row
            }
          }
          newSheet[index].push(obj);
          const {f,s,t} = obj;
          await hanldeData(f,s,t,row, pageList[0]);
        }
      }
      if (i !==0 && i %20 ===0) {
        await workbook.xlsx.writeFile(chinese);
        fs.appendFileSync(infoFilePath, `${i+1}行处理完成\n`);
        fs.writeFileSync(filePath, `${i}`);
      }
    } catch (error) {
      fs.appendFileSync(errorFilePath, `${error}\n`);
    } finally {
      Log(chalk.green.bgWhite(`${i}成功`));
    }
  }

  // await Promise.all(newSheet.map(e => hanldeTask(e, pageList)));


  await workbook.xlsx.writeFile(chinese);
  fs.writeFileSync(filePath, `4`);
  Log(chalk.green.bgWhite(`成功!!`));

  closeBrowser();
}

async function hanldeTask(list, pageList) {
  for(let i = 0; i < list.length; i++) {
    const {f,s,t,row} = list[i];
    await hanldeData(f,s,t,row, pageList[i]);
  }
}

async function hanldeData(c1, c2, c3, row, page) {
  const col1 = String(getCellValue(row.getCell(c1).value));
  const sku = getCellValue(row.getCell(c2).value);
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
function handleMessage(message, row, index = 'E', type = 'error') {
  if (type ==='error') {
    Log(chalk.red.bold(message));
    const cell = row.getCell(index);
    cell.value = `${cell.value || ''}\n${message}`
    cell.style = redStyle;
  } else if (type === 'success') {
    Log(chalk.blue(message));
    const cell = row.getCell(index);
    cell.value = `${cell.value || ''}\n${message}`
    cell.style = cell.style === redStyle ? redStyle : greenStyle;
  }
  
}

init();