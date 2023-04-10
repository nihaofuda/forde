const ExcelJS = require('exceljs');
const chalk = require('chalk');
const dayjs = require('dayjs');
const { fork } = require('child_process');
const fs = require('fs');
const { initPrase, closeBrowser, getYouNeed, notFound, delist } = require('./praseHtml.js');
// 最小库存量
const NUM = 100;

// excel文件类径
const excelFilePath = './D&Y产品编号对照表.xlsx';
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
const numBrower = 3;
const newSheet = Array.from(Array(numBrower), () => []);
const newSheetStatus = Array.from(Array(numBrower), () => false);
let index = 0;

const now = dayjs();
const dateStr = now.format('YYYY-MM-DD');
const chinese = excelFilePath.replace(/[^\u4e00-\u9fa5]/g, '') + '.xlsx';

for (let i = 0; i <= worksheet.rowCount; i++) {
    if (i>=4) {
        const row = worksheet.getRow(i);
        for (let j = 0; j<= 2;j++) {
            let obj = {};
            if (j === 0) {
            obj = {
                f: 'B',
                s: 'D',
                t: 'E',
            }
            } else if (j === 1) {
            obj = {
                f: 'G',
                s: 'I',
                t: 'J',
            }
            } else if (j === 2) {
            obj = {
                f: 'L',
                s: 'N',
                t: 'O',
            }
            }
            
            const col1 = String(getCellValue(row.getCell(obj.f).value));
            const sku = getCellValue(row.getCell(obj.s).value);
            obj.row = {
                col1,
                sku,
                index: i
            }
            newSheet[index].push(obj);
            index++;
            if (index >= numBrower) {
                index %= numBrower;
            }
        }
        }
  }
console.dir(newSheet);
  for (let i = 0; i < newSheet.length; i++) {
    const worker = fork('./worker.js');
    worker.on('message',async (message) => {
        if (typeof message === 'string') {
            // 修改任务状态
            newSheetStatus[i] = true;
        } else {
            console.log(message);
            const { message, rowI, index, type } = message;
            const row = worksheet.getRow(rowI);
            handleMessage(message, row,  index, type);
        }
            // 判断是否所有任务都已完成
        if (newSheetStatus.every(task => task === true)) {
            // 所有任务都已完成，将结果写入文件
            await workbook.xlsx.writeFile(chinese);
            Log(chalk.green.bgWhite(`成功!!`));
        }
    });
    worker.send(newSheet[i]);
  }
}

async function hanldeTask(list, pageList) {
  for(let i = 0; i < list.length; i++) {
    const {f,s,t,row} = list[i];
    await hanldeData(f,s,t,row, pageList[i]);
  }
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

function getCellValue(cellValue) {
    if (typeof cellValue === 'object' && cellValue !== null) {
      return cellValue.hyperlink;
    } else {
      return cellValue;
    }
  }
  

init();