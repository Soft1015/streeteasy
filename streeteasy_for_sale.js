const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const fs = require('fs');
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const puppeteer = require('puppeteer-extra');
const { executablePath } = require("puppeteer");
const ObjectsToCsv = require("objects-to-csv");
const fileName = "home.csv";
const UrlList = [
    {
        url: 'https://streeteasy.com/for-rent/nyc',
        city: 'NYC'
    },
];

let browser = null;
let page = null;
const getForSaleData = async () => {

    let scrapeData = [];
    puppeteer.use(StealthPlugin());
    browser = await puppeteer.launch({ executablePath: executablePath(), headless: false });
    for (let i = 0; i < UrlList.length; i++) {

        console.log("processing: " + UrlList[i].city + "(" + i + "/" + UrlList.length + " cities)");
        try {
            page = await browser.newPage();
            await page.goto(`${UrlList[i].url}`, { waitUntil: 'load', timeout: 0 });
            const html = await page.content();
            const dom = new JSDOM(html);
            const total = dom.window.document.querySelector("#srp-results-criteria > h1").textContent;
            let pageLength = Number(dom.window.document.querySelector("#result-details > div > div.pagination.center_aligned.bottom_pagination.big_space > nav > ul > li:nth-child(5)").textContent);
            await getDetailOfRoom(pageLength, UrlList[i].url, UrlList[i].city, total);
        } catch (err) {
            console.log(err);
        }
    }
};
function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

const getDetailOfRoom = async (length, url, city, total) => {
    let partData = [];
    let iCnt = 1;
    for (let i = 0 + 1; i <= length; i++) {
        try {

            await sleep(1000);            
            await page.goto(`${url}?page=${i}`, { waitUntil: 'load', timeout: 0 });
            const html = await page.content();
            const dom = new JSDOM(html);
            const details = dom.window.document.querySelectorAll('#result-details > div > ul > li');
            for(let j = 0; j < details.length; j ++){
                const obj = {};
                obj.sqrt = "";
                obj.room = "";
                obj.bed = "";
                obj.bath = "";
                obj.description = "";
                obj.Link = details[j].querySelector('a').getAttribute('href');
                console.log("processing: " + iCnt + " of " + total);
                try {
                    await page.goto(`${obj.Link}`, { waitUntil: 'load', timeout: 0 });
                    const html_detail = await page.content();
                    const dom_detail = new JSDOM(html_detail);
                    obj.address = dom_detail.window.document.querySelector('a.incognito').textContent;
                    obj.price = dom_detail.window.document.querySelector('div.price').textContent;
                    const span =  dom_detail.window.document.querySelector('div.price').querySelector('span.secondary_text') ? dom_detail.window.document.querySelector('div.price').querySelector('span.secondary_text').textContent : '';
                    const priceArrow =  dom_detail.window.document.querySelector('div.price').querySelector('span.price_arrow') ? dom_detail.window.document.querySelector('div.price').querySelector('span.price_arrow').textContent : '';
                    obj.price = obj.price.replace(span, '').replace(priceArrow, '').replace(/\s/g, "");
                    let detail_cell = dom_detail.window.document.querySelectorAll('ul > li.detail_cell');
                    
                    for(let k = 0; k < detail_cell.length; k ++){
                        if(detail_cell[k].textContent.includes('ft²')){
                            if(!detail_cell[k].textContent.includes('per')){
                                obj.sqrt = detail_cell[k].textContent.split(" ")[0];
                            }
                        }else if(detail_cell[k].textContent.includes('rooms')){
                            obj.room = detail_cell[k].textContent.split(" ")[0];
                        }else if(detail_cell[k].textContent.includes('bed')){
                            obj.bed = detail_cell[k].textContent.split(" ")[0];
                        }else if(detail_cell[k].textContent.includes('bath')){
                            obj.bath = detail_cell[k].textContent.split(" ")[0];
                        }
                    }
                    //description
                    let desc = dom_detail.window.document.querySelectorAll('div > div.styled__InitialContentWrapper-sc-1nmrr8h-1.gsChKp > p');
                    if(desc){
                        obj.description = desc[desc.length - 1]?.textContent.replace('<br>', '');
                    }
                    const Vitals = dom_detail.window.document.querySelectorAll('div.Vitals > div');
                    if(Vitals){
                        //AVAILABLE ON
                        obj.acitve = Vitals[0].querySelector('div.Vitals-data').textContent.replace(/\n/g, '').replace(/\s/g, "");
                        obj.dayOnMarket = Vitals[1].querySelector('div.Vitals-data').textContent.replace(/\n/g, '').replace(/\s/g, "");
                    }
                    //built
                    let built = dom_detail.window.document.querySelectorAll("ul[data-qa^='property-detail-building-info-building-detail'] > li");
                    if(built){
                        for(let k = 0; k < built.length; k ++){
                            if(built[k]){
                                if(built[k].textContent.includes('built'))
                                    obj.built = built[k].textContent.split(' ')[0];
                            }
                        }
                    }
                    //agent
                    let agent = dom_detail.window.document.querySelector('div.ListingAgents-agentListItem');
                    obj.agentName = agent.querySelector('a.ListingAgents-agentNameLink') ? agent.querySelector('a.ListingAgents-agentNameLink').textContent.replace(/\s/g, "") : '';
                    obj.agentLicenseType = agent.querySelector('span.ListingAgents-agentLicenseType') ? agent.querySelector('span.ListingAgents-agentLicenseType').textContent.replace(/\s/g, "") : '';
                    obj.agentInfo = agent.querySelector('span.ListingAgents-agentInfo') ? agent.querySelector('span.ListingAgents-agentInfo').textContent.replace(/\s/g, "") : '';
                    obj.agentPhone = agent.querySelector('span.ListingAgents-hiddenPhone') ? agent.querySelector('span.ListingAgents-hiddenPhone').textContent.replace(/\s/g, "") : '';
                    //imgs
                    let imgs = dom_detail.window.document.querySelector('div.flickity-slider').querySelectorAll('img');
                    for(let i = 0; i < 40; i ++){
                        obj["image_" + i] = '';
                    }
                    let len = imgs.length > 40 ? 40 :imgs.length;
                    for(let k = 0; k < len; k ++){
                        obj["image_" + k] = imgs[k].getAttribute('data-src-large');
                    }
                } catch (err){
                    // console.log(err);
                }
                partData.push(obj);
                // console.log(obj);
                iCnt ++;
            }
        } catch (err) {
            // console.log(err);
        }
    }
    if(partData){
        new ObjectsToCsv(partData).toDisk(`./${fileName}`, { append: true });
    }
};

module.exports = { getForSaleData };