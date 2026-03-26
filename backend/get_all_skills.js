const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    console.log('Navigating to login...');
    await page.goto('https://vtu.internyet.in/sign-in', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input');
    const inputs = await page.$$('input');
    await inputs[0].type('sathwikms11@gmail.com');
    await inputs[1].type('Sathwikms@2304');
    for (const btn of await page.$$('button')) {
      const t = await page.evaluate(el => el.innerText, btn);
      if (t.toLowerCase().includes('login') || t.toLowerCase().includes('sign in')) { await btn.click(); break; }
    }
    console.log('Waiting for dashboard...');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Going to edit page...');
    await page.goto('https://vtu.internyet.in/dashboard/student/edit-diary-entry/2297736', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    await page.waitForSelector('.react-select__control');
    const allSkills = new Set();

    // Strategy 1: open dropdown and scroll
    await page.click('.react-select__control');
    await new Promise(r => setTimeout(r, 1200));
    for (let i = 0; i < 60; i++) {
      const opts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.react-select__option')).map(el => el.innerText.trim())
      );
      opts.forEach(s => allSkills.add(s));
      await page.evaluate(() => {
        const m = document.querySelector('.react-select__menu-list');
        if (m) m.scrollTop += 800;
      });
      await new Promise(r => setTimeout(r, 150));
    }
    console.log('After scroll:', allSkills.size, 'skills');

    // Strategy 2: type each letter a-z to force different subsets to appear
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const reactInput = await page.$('.react-select__input input');
    if (reactInput) {
      for (const letter of letters) {
        await page.evaluate(el => { el.value = ''; el.dispatchEvent(new Event('input', {bubbles:true})); }, reactInput);
        await reactInput.type(letter);
        await new Promise(r => setTimeout(r, 600));
        const opts = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.react-select__option')).map(el => el.innerText.trim())
        );
        opts.forEach(s => allSkills.add(s));
        console.log(`[${letter}] found ${opts.length}, total unique: ${allSkills.size}`);

        // scroll through filtered results too
        for (let i = 0; i < 10; i++) {
          await page.evaluate(() => {
            const m = document.querySelector('.react-select__menu-list');
            if (m) m.scrollTop += 800;
          });
          await new Promise(r => setTimeout(r, 100));
          const more = await page.evaluate(() =>
            Array.from(document.querySelectorAll('.react-select__option')).map(el => el.innerText.trim())
          );
          more.forEach(s => allSkills.add(s));
        }

        // clear input for next letter
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const skillsArray = [...allSkills].sort((a, b) => a.localeCompare(b));
    console.log('\n=== FINAL TOTAL:', skillsArray.length, '===');
    console.log(JSON.stringify(skillsArray, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  try {
    const page = await browser.newPage();
    console.log('Navigating to login...');
    await page.goto('https://vtu.internyet.in/sign-in', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input');

    const inputs = await page.$$('input');
    await inputs[0].type('sathwikms11@gmail.com');
    await inputs[1].type('Sathwikms@2304');
    for (const btn of await page.$$('button')) {
      const t = await page.evaluate(el => el.innerText, btn);
      if (t.toLowerCase().includes('login') || t.toLowerCase().includes('sign in')) { await btn.click(); break; }
    }
    console.log('Waiting for dashboard...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Going to edit page...');
    await page.goto('https://vtu.internyet.in/dashboard/student/edit-diary-entry/2297736', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 3000));

    await page.waitForSelector('.react-select__control');
    await page.click('.react-select__control');
    await new Promise(r => setTimeout(r, 1500));

    // Collect all options by scrolling the menu
    const allSkills = new Set();

    for (let attempt = 0; attempt < 40; attempt++) {
      const options = await page.evaluate(() => {
        const items = document.querySelectorAll('.react-select__option');
        return Array.from(items).map(el => el.innerText.trim());
      });
      options.forEach(s => allSkills.add(s));

      // Scroll the menu down
      await page.evaluate(() => {
        const menu = document.querySelector('.react-select__menu-list');
        if (menu) menu.scrollTop += 1500;
      });
      await new Promise(r => setTimeout(r, 200));
    }

    const skillsArray = [...allSkills].sort();
    console.log('TOTAL SKILLS FOUND:', skillsArray.length);
    console.log(JSON.stringify(skillsArray, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
