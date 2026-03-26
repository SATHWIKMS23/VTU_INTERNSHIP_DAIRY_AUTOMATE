import puppeteer, { Browser, Page } from 'puppeteer';
import Job from '../models/Job';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function updateJobLog(jobId: string, message: string) {
  console.log(`[Job ${jobId}] ${message}`);
  await Job.findByIdAndUpdate(jobId, { $push: { logs: message } });
}

const activeBrowsers = new Map<string, { docBrowser: Browser, vtuBrowser: Browser, vtuPage: Page | null }>();

export async function cancelJob(jobId: string) {
  const browsers = activeBrowsers.get(jobId);
  if (browsers) {
    try {
      if (browsers.docBrowser) await browsers.docBrowser.close();
      if (browsers.vtuBrowser) await browsers.vtuBrowser.close();
      activeBrowsers.delete(jobId);
      await updateJobLog(jobId, '⏹️ Job cancelled by user.');
      await Job.findByIdAndUpdate(jobId, { status: 'failed' });
    } catch(e) { /* ignore */ }
  }
}

export async function getJobScreenshot(jobId: string): Promise<string | null> {
  const entry = activeBrowsers.get(jobId);
  if (!entry || !entry.vtuPage) return null;
  try {
    const screenshot = await entry.vtuPage.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60 });
    return screenshot as string;
  } catch {
    return null;
  }
}

export async function runAutomation(jobId: string, password: string, preview: boolean = false, userSkills: string[] = [], hours: number = 6) {
  const job = await Job.findById(jobId);
  if (!job) return;

  try {
    await Job.findByIdAndUpdate(jobId, { status: 'processing' });
    await updateJobLog(jobId, '🚀 Launching browser instance...');

    const docBrowser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 900 },
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage'
      ]
    });
    
    const vtuBrowser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 900 },
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage'
      ]
    });
    
    activeBrowsers.set(jobId, { docBrowser, vtuBrowser, vtuPage: null });

    try {
      // ==========================
      // 🔹 STEP 1: GET DATA FROM GOOGLE DOC
      // ==========================
      await updateJobLog(jobId, '🔹 Fetching data from Google Document...');
      const page = await docBrowser.newPage();
      await page.goto(job.docUrl, { waitUntil: 'networkidle2' });
      await page.waitForSelector('body');

      const fullText = await page.evaluate(() => document.body.innerText);
      
      function parseEntries(text: string) {
        const entries: any[] = [];
        
        // Robust regex to find various date formats:
        // 1. DD/MM/YYYY or DD-MM-YYYY
        // 2. YYYY/MM/DD or YYYY-MM-DD
        // 3. DD/Month/YYYY or DD-Month-YYYY
        // 4. YYYY/Month/DD or YYYY-Month-DD
        const dateRegex = /(\d{4}[-/](?:\d{1,2}|[a-zA-Z]{3,9})[-/]\d{1,2})|(\d{1,2}[-/](?:\d{1,2}|[a-zA-Z]{3,9})[-/]\d{4})/g;
        
        const dates = text.match(dateRegex);
        if (!dates) return [];

        const blocks = text.split(dateRegex).filter(b => b !== undefined).slice(1);
        
        // Since splitting with multiple groups returns match results in the split array, 
        // we need to be careful. A better way is to find all matches and indices.
        const normalizedEntries: any[] = [];
        let match;
        const matches = [];
        const re = new RegExp(dateRegex);
        while ((match = re.exec(text)) !== null) {
          matches.push({ date: match[0], index: match.index });
        }

        const monthsMap: Record<string, string> = {
          jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", 
          jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
        };

        function normalize(dStr: string) {
          const parts = dStr.split(/[-/]/);
          let d = "", m = "", y = "";
          
          if (parts[0].length === 4) { // YYYY/MM/DD
            y = parts[0];
            m = parts[1];
            d = parts[2];
          } else { // DD/MM/YYYY
            d = parts[0];
            m = parts[1];
            y = parts[2];
          }

          // Handle month names
          if (isNaN(parseInt(m))) {
            const lowM = m.toLowerCase().substring(0, 3);
            m = monthsMap[lowM] || "01";
          }
          
          const pad = (n: string) => n.length === 1 ? '0' + n : n;
          return {
            formatted: `${pad(d)}/${pad(m)}/${y}`,
            iso: `${y}-${pad(m)}-${pad(d)}`
          };
        }

        for (let i = 0; i < matches.length; i++) {
          const start = matches[i].index + matches[i].date.length;
          const end = (i + 1 < matches.length) ? matches[i+1].index : text.length;
          const block = text.substring(start, end);
          
          const workMatch = block.match(/Work Summary([\s\S]*?)(?:Learnings|Reference Links|Blockers)/i);
          const learnMatch = block.match(/Learnings([\s\S]*?)(?:Reference Links|Blockers|$)/i);
          const refMatch = block.match(/Reference Links([\s\S]*?)(?:Blockers|$)/i);
          const blockerMatch = block.match(/Blockers\s*\/\s*Risks([\s\S]*?)$/i) || block.match(/Blockers([\s\S]*?)$/i);

          const { formatted, iso } = normalize(matches[i].date);

          entries.push({
            date: formatted,
            isoDate: iso,
            work_summary: workMatch ? workMatch[1].trim() : "",
            learning_outcomes: learnMatch ? learnMatch[1].trim().split('\n').filter((l: string) => l.trim()) : [],
            reference_links: refMatch ? refMatch[1].trim() : "",
            blockers: blockerMatch ? blockerMatch[1].trim() : ""
          });
        }
        return entries;
      }

      const entries = parseEntries(fullText);
      await updateJobLog(jobId, `Found ${entries.length} total entries in document.`);

      if (entries.length === 0) {
        await updateJobLog(jobId, '❌ No entries found in the document.');
        await Job.findByIdAndUpdate(jobId, { status: 'failed' });
        await docBrowser.close();
        await vtuBrowser.close();
        return;
      }

      // ==========================
      // 🔹 STEP 2: OPEN VTU & LOGIN
      // ==========================
      await updateJobLog(jobId, '🔹 Navigating to VTU Login...');
      const vtuPage = await vtuBrowser.newPage();
      await vtuPage.goto('https://vtu.internyet.in/sign-in', { waitUntil: 'networkidle2' });
      await sleep(3000);

      const isLoggedIn = await vtuPage.evaluate((el: HTMLElement) =>
        el.innerText.includes('Internship Diary'), (await vtuPage.$('body'))!
      );

      if (!isLoggedIn) {
        await vtuPage.waitForSelector('input');
        const inputs = await vtuPage.$$('input');

        if (inputs.length < 2) {
          await updateJobLog(jobId, '❌ Login inputs not found');
          await Job.findByIdAndUpdate(jobId, { status: 'failed' });
          await docBrowser.close();
          await vtuBrowser.close();
          return;
        }

        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type(job.email, { delay: 50 });

        await inputs[1].click({ clickCount: 3 });
        await inputs[1].type(password, { delay: 50 });

        const buttons = await vtuPage.$$('button');
        let clickedLogin = false;
        for (const btn of buttons) {
          const text = await vtuPage.evaluate((el: Element) => (el as HTMLElement).innerText, btn);
          if (text.toLowerCase().includes('login') || text.toLowerCase().includes('sign in')) {
            await btn.click();
            clickedLogin = true;
            break;
          }
        }
        
        if (!clickedLogin) {
            await updateJobLog(jobId, '❌ Login button not found');
            await Job.findByIdAndUpdate(jobId, { status: 'failed' });
            await docBrowser.close();
            await vtuBrowser.close();
            return;
        }

        await sleep(5000);
      }

      // ==========================
      // 🔍 CHECK EXISTING ENTRIES
      // ==========================
      await updateJobLog(jobId, "🔍 Checking already submitted entries...");
      await vtuPage.goto('https://vtu.internyet.in/dashboard/student/diary-entries', { waitUntil: 'networkidle2' });
      try {
        await vtuPage.waitForFunction(() => {
          return document.body.innerText.replace(/\s+/g, '').match(/\d{4}-\d{2}-\d{2}/) !== null;
        }, { timeout: 10000 });
      } catch (e) {
        await updateJobLog(jobId, "⚠️ No existing entries found in table (or API took too long to load).");
      }

      const existingDates = await vtuPage.evaluate((b: HTMLElement) => {
        const text = b.innerText.replace(/\s+/g, '');
        const matches = text.match(/\d{4}-\d{2}-\d{2}/g);
        return matches || []; 
      }, (await vtuPage.$('body'))!);

      let unsubmittedEntries = entries;

      if (existingDates.length > 0) {
        const latestDateStr = existingDates[0]; // Assuming the first match is the latest
        await updateJobLog(jobId, `✅ Last submitted date: ${latestDateStr}. Filtering entries strictly AFTER this date.`);
        const filtered = entries.filter(e => !existingDates.some((iso: string) => iso === e.isoDate));
        unsubmittedEntries = filtered;
      } else {
        await updateJobLog(jobId, `✅ No existing entries found. Proceeding with all.`);
      }
      await updateJobLog(jobId, `➡️ Remaining entries to submit: ${unsubmittedEntries.length}`);
      await Job.findByIdAndUpdate(jobId, { totalEntries: unsubmittedEntries.length, currentEntry: 0 });

      // ==========================
      // 🔁 LOOP ENTRIES
      // ==========================
      const VTU_URL = "https://vtu.internyet.in/dashboard/student/student-diary";

      for (const data of unsubmittedEntries) {
        await updateJobLog(jobId, `➡️ Filling entry for: ${data.date}`);

        await vtuPage.goto(VTU_URL, { waitUntil: 'networkidle2' });
        await sleep(1000);

        // Internship dropdown (AUTO-SELECT FIRST)
        try {
          await vtuPage.waitForSelector('button[role="combobox"]', { visible: true, timeout: 15000 });
        } catch (err) {
          await updateJobLog(jobId, `❌ Timeout waiting for combobox on date ${data.date}.`);
          throw new Error('Timeout waiting for combobox');
        }
        await vtuPage.click('button[role="combobox"]');
        await sleep(300);
        await vtuPage.keyboard.press('ArrowDown');
        await sleep(100);
        await vtuPage.keyboard.press('Enter');
        await sleep(300);

        // Date
        await vtuPage.click('button[data-slot="popover-trigger"]');
        await vtuPage.waitForSelector('select[aria-label="Choose the Year"]', { visible: true, timeout: 10000 });

        const [dayStr, monthStr, yearStr] = data.date.split('/');
        // monthStr is now a number string like "03"
        const monthIndex = parseInt(monthStr, 10) - 1;

        await vtuPage.select('select[aria-label="Choose the Year"]', yearStr);
        await sleep(100);
        await vtuPage.select('select[aria-label="Choose the Month"]', monthIndex.toString());
        await sleep(100);

        const dayNum = parseInt(dayStr, 10).toString();
        await vtuPage.evaluate((dTxt: string) => {
          const buttons = Array.from(document.querySelectorAll('button.rdp-day_button'));
          for (const btn of buttons) {
            const td = btn.closest('td');
            if (td && td.getAttribute('data-outside') !== 'true' && (btn as HTMLElement).innerText.trim() === dTxt) {
              (btn as HTMLElement).click();
              break;
            }
          }
        }, dayNum);

        // Continue
        const buttons = await vtuPage.$$('button');
        let continueClicked = false;
        for (const btn of buttons) {
          const text = await vtuPage.evaluate((el: Element) => (el as HTMLElement).innerText, btn);
          if (text.toLowerCase().includes('continue')) {
            await btn.click();
            continueClicked = true;
            break;
          }
        }

        if (!continueClicked) {
            await updateJobLog(jobId, `❌ Continue button not found for ${data.date}.`);
            continue;
        }

        await sleep(1000);

        // Work Summary & Form Lookup
        const textareas = await vtuPage.$$('textarea');
        const taInfo = await vtuPage.evaluate(() => {
          const tas = Array.from(document.querySelectorAll('textarea'));
          let workIdx = -1;
          let learnIdx = -1;
          for (let i = 0; i < tas.length; i++) {
            if (tas[i].offsetParent === null) continue;

            const text = (tas[i].id + ' ' + tas[i].name + ' ' + (tas[i].placeholder || '')).toLowerCase();
            let label = '';
            if (tas[i].id) {
              const l = document.querySelector(`label[for="${tas[i].id}"]`) as HTMLElement;
              if (l) label = l.innerText.toLowerCase();
            }
            if (!label && tas[i].closest('label')) label = (tas[i].closest('label') as HTMLElement).innerText.toLowerCase();

            const full = text + ' ' + label;
            if (full.includes('work') || full.includes('summary')) workIdx = i;
            else if (full.includes('learn') || full.includes('outcome')) learnIdx = i;
          }

          if (workIdx === -1 || learnIdx === -1) {
            const vis = [];
            for (let i = 0; i < tas.length; i++) { if (tas[i].offsetParent !== null) vis.push(i); }
            if (vis.length >= 2) {
              if (workIdx === -1) workIdx = vis[0];
              if (learnIdx === -1) learnIdx = vis[vis.length - 1];
            }
          }
          return { workIdx, learnIdx };
        });

        if (taInfo.workIdx === -1 || taInfo.learnIdx === -1) {
          await updateJobLog(jobId, `⏭️ Entry for ${data.date} already exists or the form is read-only. Skipping...`);
          continue;
        }

        await textareas[taInfo.workIdx].click();
        await textareas[taInfo.workIdx].type(data.work_summary, { delay: 5 });

        // Hours
        const hoursInput = await vtuPage.$('input[type="number"]');
        if (hoursInput) {
          await hoursInput.click({ clickCount: 3 });
          await hoursInput.type(String(hours), { delay: 50 });
        } else {
          await updateJobLog(jobId, "⚠️ Could not locate the Hours text field!");
        }

        // Learnings
        await textareas[taInfo.learnIdx].click();
        await textareas[taInfo.learnIdx].type(data.learning_outcomes.join('\n'), { delay: 5 });

        // Reference Links (optional)
        if (data.reference_links) {
          const refIdx = await vtuPage.evaluate(() => {
            const tas = Array.from(document.querySelectorAll('textarea'));
            for (let i = 0; i < tas.length; i++) {
              if (tas[i].offsetParent === null) continue;
              const lbl = (() => { const l = document.querySelector(`label[for="${tas[i].id}"]`) as HTMLElement; return l ? l.innerText.toLowerCase() : ''; })();
              const full = (tas[i].placeholder || '') + ' ' + lbl;
              if (full.toLowerCase().includes('reference') || full.toLowerCase().includes('link')) return i;
            }
            return -1;
          });
          if (refIdx !== -1) {
            await textareas[refIdx].click();
            await textareas[refIdx].type(data.reference_links, { delay: 5 });
          }
        }

        // Blockers / Risks (optional)
        if (data.blockers) {
          const blockIdx = await vtuPage.evaluate(() => {
            const tas = Array.from(document.querySelectorAll('textarea'));
            for (let i = 0; i < tas.length; i++) {
              if (tas[i].offsetParent === null) continue;
              const lbl = (() => { const l = document.querySelector(`label[for="${tas[i].id}"]`) as HTMLElement; return l ? l.innerText.toLowerCase() : ''; })();
              const full = (tas[i].placeholder || '') + ' ' + lbl;
              if (full.toLowerCase().includes('blocker') || full.toLowerCase().includes('risk')) return i;
            }
            return -1;
          });
          if (blockIdx !== -1) {
            await textareas[blockIdx].click();
            await textareas[blockIdx].type(data.blockers, { delay: 5 });
          }
        }

        // Skills
        const reactSelectContainer = await vtuPage.$('.react-select__control');
        if (reactSelectContainer && userSkills.length > 0) {
          await reactSelectContainer.click();
          await sleep(300);

          for (const skill of userSkills) {
            await vtuPage.keyboard.type(skill, { delay: 5 });
            await sleep(600);
            await vtuPage.keyboard.press('Enter');
            await sleep(100);
          }
        } else {
          // No skills provided or container not found
        }

        // Save
        const submitBtn = await vtuPage.$('button[type="submit"]');
        if (submitBtn) {
          await vtuPage.evaluate((b: HTMLElement) => b.click(), submitBtn);
        } else {
          await updateJobLog(jobId, "⚠️ Could not locate the Submit button directly!");
        }

        await updateJobLog(jobId, `⏳ Waiting for submission to process for ${data.date}...`);
        await sleep(1500);

        // Verification step
        await vtuPage.goto('https://vtu.internyet.in/dashboard/student/diary-entries', { waitUntil: 'networkidle2' });
        try {
          await vtuPage.waitForFunction((iso: unknown) => {
            return document.body.innerText.replace(/\s+/g, '').includes(iso as string);
          }, { timeout: 15000 }, data.isoDate);
        } catch(e) {
          await updateJobLog(jobId, `⚠️ Timed out waiting for ${data.isoDate} to appear in the table!`);
        }

        const isSaved = await vtuPage.evaluate((iso: unknown) => {
          const text = document.body.innerText.replace(/\s+/g, '');
          return text.includes(iso as string);
        }, data.isoDate);

        if (isSaved) {
          await updateJobLog(jobId, `✅ Success! Entry for ${data.date} is confirmed saved!`);
          await Job.findByIdAndUpdate(jobId, { $inc: { currentEntry: 1 } });
        } else {
          await updateJobLog(jobId, `❌ ERROR: Entry for ${data.date} was not found in the portal!`);
          throw new Error(`CRITICAL: Failed to verify submission for ${data.date}.`);
        }

        await sleep(500);
      }

      await updateJobLog(jobId, "🎉 ALL DONE");
      await Job.findByIdAndUpdate(jobId, { status: 'completed' });
    } finally {
      activeBrowsers.delete(jobId);
      try { await docBrowser.close(); } catch(e) {}
      try { await vtuBrowser.close(); } catch(e) {}
    }
  } catch (error: any) {
    await updateJobLog(jobId, `❌ Critical Error: ${error.message}`);
    await Job.findByIdAndUpdate(jobId, { status: 'failed' });
  }
}
