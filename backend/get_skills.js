const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();

    console.log("Navigating to login...");
    await page.goto('https://vtu.internyet.in/sign-in', { waitUntil: 'networkidle2' });

    await page.waitForSelector('input');
    const inputs = await page.$$('input');
    
    await inputs[0].type("sathwikms11@gmail.com");
    await inputs[1].type("Sathwikms@2304");

    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in')) {
        await btn.click();
        break;
      }
    }

    console.log("Waiting for dashboard...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("Going to edit page...");
    await page.goto('https://vtu.internyet.in/dashboard/student/edit-diary-entry/2297736', { waitUntil: 'networkidle2' });

    console.log("Looking for skills dropdown...");
    await page.waitForSelector('.react-select__control');
    await page.click('.react-select__control');
    
    await new Promise(r => setTimeout(r, 1000));

    const allText = await page.evaluate(() => {
      const menu = document.querySelector('.react-select__menu');
      return menu ? menu.innerText : 'Menu not found';
    });
    console.log("--- SKILLS EXTRACTED ---");
    console.log(allText);
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
