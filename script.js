const xlsx = require('node-xlsx')
const { initPrase, closeBrowser, getYouNeed } = require('./praseHtml.js');

// excel文件类径
const excelFilePath = './工作簿1.xlsx'

async function init() {
    //解析excel, 获取到所有sheets
const sheets = xlsx.parse(excelFilePath);
const sheet = sheets[0];

const page = await initPrase();

for (let i = 0; i< sheet.data.length; i++) {
    if (i>1) {
        const row = sheet.data[i];
        const testData = await getYouNeed(page, sheet.data[i][0])
        console.dir(row[2]);
        console.dir(testData);
    }
}

closeBrowser();
}

init();