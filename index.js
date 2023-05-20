require('dotenv').config({ path: '.env' });
const http = require("http");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const puppeteer = require('puppeteer-extra');
const { executablePath } = require("puppeteer");
const { JSDOM } = require("jsdom");
const ObjectsToCsv = require("objects-to-csv");
const { getForSaleData } = require('./streeteasy_for_sale');
const fs = require('fs');
const fileName = "connection.csv";
const homeName = "home.csv";
const main = async () => {
    let scrapeData = [];
    console.log(process.env.PORT);
    puppeteer.use(StealthPlugin());
    try {
        const browser = await puppeteer.launch({ executablePath: executablePath(), headless: false });
        const page = await browser.newPage();
        await page.goto("https://streeteasy.com/manage/experts/connections?nav_agent_tools", { waitUntil: 'load', timeout: 0 });
        await page.$eval('input[name=login]', el => el.value = 's.batra@casa-blanca.com');
        await page.$eval('input[name=password]', el => el.value = 'FytbqqigpHuO(Py5Vtb0');
        await page.click('button[name=do_login]');
        await page.waitForSelector('#content > main > div.grid-container > div.grid-span-9.grid-span-12-sm.grid-span-12-xs > div > div > div.styled__ListFooter-z1i1bc-3.fBymWM')
            .then(async () => {
                let html = await page.content();
                let dom = new JSDOM(html);
                const lenEm = dom.window.document.querySelector("div.styled__ListFooter-z1i1bc-3.fBymWM > div > div");
                if (lenEm) {
                    let i = 0;
                    const Len = Number(lenEm.textContent.split(" ").pop()) / process.env.UNIT;
                    do {
                        items = dom.window.document.querySelectorAll('div.styled__List-sp6nl9-0.eXfShH > div');
                        for (let j = 1; j < items.length; j++) {
                            const name = items[j].querySelector("a[aria-label^='Connection name']");
                            const phone = items[j].querySelector("div[aria-label^='Connection phone number']");
                            const email = items[j].querySelector("div[aria-label^='Connection email']");
                            const inquiry = items[j].querySelector("a[aria-label^='Connection property']");
                            const date = items[j].querySelector("div[aria-label^='Connection date']");
                            const obj = {
                                Name: name?.textContent,
                                Phone: phone?.textContent,
                                Email: email?.textContent,
                                Address: inquiry?.textContent,
                                Date: date?.textContent
                            };
                            scrapeData.push(obj);
                        }
                        await page.click('div.styled__ListFooter-z1i1bc-3.fBymWM > div > nav > button');
                        await page.waitForSelector('#content > main > div.grid-container > div.grid-span-9.grid-span-12-sm.grid-span-12-xs > div > div > div.styled__ListFooter-z1i1bc-3.fBymWM');
                        html = await page.content();
                        dom = new JSDOM(html);
                        i++;
                    } while (i < Len);
                }
            });
        console.log(scrapeData);
        if(scrapeData){
            new ObjectsToCsv(scrapeData).toDisk(`./${fileName}`, { append: true });
        }
    } catch (error) {
        console.log(error);
    }
}
function checkFile() {
    if (fs.existsSync(`./${fileName}`)) {
      fs.unlinkSync(`./${fileName}`);
    }
    if (fs.existsSync(`./${homeName}`)) {
        fs.unlinkSync(`./${homeName}`);
    }
}

http.createServer().listen(process.env.PORT, process.env.HOST, () => {
    checkFile();
    console.log(`Server is running on http://${process.env.HOST}:${process.env.PORT}`);
    // main();
    getForSaleData();
});