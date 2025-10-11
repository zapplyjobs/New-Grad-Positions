const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = "https://jobs.careers.microsoft.com/global/en/search";
const DEFAULT_SEARCH_PARAMS = "q=software%20engineering&lc=United%20States&exp=Students%20and%20graduates&l=en_us&pg=1&pgSz=20&o=Relevance&flt=true&ulcs=false&ref=cms";
const MAX_PAGES = 1; // Reduced to 1 page for frequent 10-minute runs
const CONCURRENT_PAGES = 3; // Reduced for stability

const DELAYS = {
  BETWEEN_JOBS: 800,       
  AFTER_CLICK: 1200,        
  WAIT_FOR_DETAILS: 4000,  
  PAGE_LOAD: 3000,
  BETWEEN_BATCHES: 2000          
};

const SELECTORS = {
  jobListings: 'div.ms-List-cell',
  seeDetailsButton: [
    'button.ms-Link.seeDetailsLink-551',
    'button[aria-label*="details"]',
    'button[aria-label*="See details"]',
    '.seeDetailsLink',
    'button.ms-Link'
  ],
  jobTitle: [
    'div.ms-DocumentCard.SearchJobDetailsCard h1',
    'div[role="group"] h1',
    'h1[style*="font-weight: 700"]',
    'h1[style*="font-size: 26px"]',
    'h1'
  ],
  location: 'p',
  modal: [
    'div[role="dialog"]',
    '.ms-Modal',
    '.ms-DocumentCard.SearchJobDetailsCard'
  ]
};

// Utilities
function buildPageUrl(pageNumber, specificJobTitle = null) {
  if (specificJobTitle) {
    const encodedJobTitle = encodeURIComponent(specificJobTitle);
    return `${BASE_URL}?q=${encodedJobTitle}&lc=United%20States&l=en_us&pg=${pageNumber}&pgSz=20&o=Relevance&flt=true&ulcs=false&ref=cms`;
  } else {
    return `${BASE_URL}?${DEFAULT_SEARCH_PARAMS.replace('pg=1', `pg=${pageNumber}`)}`;
  }
}

function parseLocation(locationString) {
  if (!locationString || locationString === 'N/A') return { city: null, state: null };
  const parts = locationString.split(',').map(p => p.trim());
  return parts.length >= 2 ? { city: parts[0], state: parts[1] } : { city: parts[0], state: null };
}

function cleanJobTitle(title) {
  if (!title) return 'N/A';
  if (title.includes(' - ')) return title.split(' - ')[1].split(',')[0].trim();
  return title.split(',')[0].trim();
}

function extractCategory(title, specificJobTitle = null) {
  if (!title) return specificJobTitle || 'Software Engineering';
  if (title.includes(' - ')) return title.split(' - ')[0].trim();
  return specificJobTitle || 'Software Engineering';
}

function transformJobData(scrapedJob, specificJobTitle = null) {
  const { city, state } = parseLocation(scrapedJob.location);
  const fullTitle = scrapedJob.category && scrapedJob.role
    ? `${scrapedJob.category} - ${scrapedJob.role}`
    : (scrapedJob.role || scrapedJob.category || 'N/A');

  return {
    employer_name: "Microsoft",
    job_title: cleanJobTitle(fullTitle),
    job_city: city,
    job_state: state,
    job_posted_at: scrapedJob.posted,
    job_description: `Category: ${extractCategory(fullTitle, specificJobTitle)}. Level: ${scrapedJob.level}. Posted: ${scrapedJob.posted}. Full Title: ${fullTitle}`,
    job_apply_link: scrapedJob.apply
  };
}

// Enhanced element finder with better error handling
async function findElement(context, selectors, timeout = 3000) {
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
  for (const selector of selectorArray) {
    try {
      const element = await context.waitForSelector(selector, { timeout, visible: true });
      if (element) {
        // Double check element is clickable
        const isVisible = await element.isIntersectingViewport();
        if (isVisible) return element;
      }
    } catch (_) { 
      continue; 
    }
  }
  return null;
}

// Improved modal wait function
async function waitForModalContent(page, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));; // Small wait
      
      const modalReady = await page.evaluate(() => {
        // Check for modal presence
        const modals = document.querySelectorAll('div[role="dialog"], .ms-Modal, .ms-DocumentCard.SearchJobDetailsCard');
        let activeModal = null;
        
        for (const modal of modals) {
          const rect = modal.getBoundingClientRect();
          const style = window.getComputedStyle(modal);
          if (rect.height > 100 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            activeModal = modal;
            break;
          }
        }

        if (!activeModal) return false;

        // Check for title content
        const titleSelectors = [
          'div.ms-DocumentCard.SearchJobDetailsCard h1',
          'div[role="group"] h1',
          'h1[style*="font-weight: 700"]',
          'h1[style*="font-size: 26px"]',
          'h1'
        ];

        for (const selector of titleSelectors) {
          const el = activeModal.querySelector(selector) || document.querySelector(selector);
          if (el && el.textContent && el.textContent.trim() && el.offsetParent !== null) {
            return true;
          }
        }
        return false;
      });

      if (modalReady) {
        await new Promise(resolve => setTimeout(resolve, 1000));; // Extra wait for content to fully load
        return true;
      }

    } catch (error) {
      console.log(`Modal wait attempt ${attempt} failed`);
    }
  }
  return false;
}

// Enhanced modal close function
async function closeModal(page) {
  try {
    // Try multiple methods to close modal
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if modal is still open
    const modalStillOpen = await page.evaluate(() => {
      const modals = document.querySelectorAll('div[role="dialog"], .ms-Modal, .ms-DocumentCard.SearchJobDetailsCard');
      return Array.from(modals).some(modal => {
        const rect = modal.getBoundingClientRect();
        const style = window.getComputedStyle(modal);
        return rect.height > 100 && style.display !== 'none' && style.visibility !== 'hidden';
      });
    });
    
    if (modalStillOpen) {
      // Fallback: click outside
      await page.click('body', { offset: { x: 10, y: 10 } });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Single page scraping function with better error handling
async function scrapePage(pageNumber, specificJobTitle = null) {
  let browser = null;
  let page = null;
  
  try {
    // Create individual browser for each page to avoid conflicts
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1366, height: 768 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    page = await browser.newPage();
    
    // Setup page
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Less aggressive resource blocking for stability
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'media') {
        req.abort();
      } else {
        req.continue();
      }
    });

    const url = buildPageUrl(pageNumber, specificJobTitle);
    console.log(`📄 Page ${pageNumber}: Starting scrape`);

    // Navigate with longer timeout
    await page.goto(url, { 
      waitUntil: 'networkidle0', 
      timeout: 60000 
    });
    
    await new Promise(resolve => setTimeout(resolve, DELAYS.PAGE_LOAD));

    // Wait for job listings
    try {
      await page.waitForSelector(SELECTORS.jobListings, { timeout: 10000, visible: true });
    } catch (error) {
      console.log(`❌ Page ${pageNumber}: No job listings found`);
      return { pageNumber, jobs: [] };
    }

    const jobCount = await page.$$eval(SELECTORS.jobListings, divs => divs.length);
    if (jobCount === 0) {
      console.log(`❌ Page ${pageNumber}: No jobs available`);
      return { pageNumber, jobs: [] };
    }

    console.log(`📋 Page ${pageNumber}: Processing ${jobCount} jobs`);
    const jobs = [];
    
    // Process jobs with better error handling
    for (let i = 0; i < Math.min(jobCount, 20); i++) { // Limit per page for stability
      try {
        // Get fresh job elements
        const jobDivs = await page.$$(SELECTORS.jobListings);
        if (i >= jobDivs.length) continue;
        
        const jobDiv = jobDivs[i];
        
        // Scroll to job
        await page.evaluate(el => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, jobDiv);
        
         await new Promise(resolve => setTimeout(resolve, 500));

        // Find details button
        const seeDetailsButton = await findElement(jobDiv, SELECTORS.seeDetailsButton, 5000);
        if (!seeDetailsButton) {
          console.log(`⚠️ Page ${pageNumber}, Job ${i + 1}: No details button found`);
          continue;
        }

        // Click details button
        await seeDetailsButton.click();
                 await new Promise(resolve => setTimeout(resolve, DELAYS.AFTER_CLICK));


        // Wait for modal
        const modalLoaded = await waitForModalContent(page);
        if (!modalLoaded) {
          console.log(`⚠️ Page ${pageNumber}, Job ${i + 1}: Modal failed to load`);
          await closeModal(page);
          continue;
        }

        // Extract job data
        const jobData = await page.evaluate((specificJobTitle) => {
          const job = {
            role: 'N/A',
            location: 'N/A',
            posted: 'Recently',
            level: specificJobTitle ? 'All Levels' : 'Students and graduates',
            category: specificJobTitle || 'Software Engineering',
            apply: window.location.href
          };

          // Extract title
          const titleSelectors = [
            'div.ms-DocumentCard.SearchJobDetailsCard h1',
            'div[role="group"] h1',
            'h1[style*="font-weight: 700"]',
            'h1'
          ];

          for (const selector of titleSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent && el.textContent.trim() && el.offsetParent !== null) {
              const fullTitle = el.textContent.trim();
              const parts = fullTitle.split(' - ');
              if (parts.length >= 2) {
                job.category = parts[0].trim();
                job.role = parts[1].split(',')[0].trim();
              } else {
                job.role = fullTitle.split(',')[0].trim();
              }
              break;
            }
          }

          // Extract location
          const locationElements = document.querySelectorAll('p');
          for (const locationEl of locationElements) {
            if (locationEl && locationEl.textContent && locationEl.textContent.trim() && locationEl.offsetParent !== null) {
              const text = locationEl.textContent.trim();
              if ((text.includes(',') && text.length < 100) || text.match(/\b[A-Z]{2}\b/) || text.includes('United States')) {
                job.location = text;
                break;
              }
            }
          }

          return job;
        }, specificJobTitle);

        if (jobData.role !== 'N/A' && jobData.role.length > 0) {
          jobs.push(jobData);
          console.log(`✅ Page ${pageNumber}, Job ${i + 1}/${jobCount}: ${jobData.role}`);
        }

        // Close modal
        await closeModal(page);
                 await new Promise(resolve => setTimeout(resolve, DELAYS.BETWEEN_JOBS));


      } catch (error) {
        console.log(`❌ Page ${pageNumber}, Job ${i + 1}: Error - ${error.message}`);
        await closeModal(page);
        continue;
      }
    }

    console.log(`✅ Page ${pageNumber}: Completed - ${jobs.length}/${jobCount} jobs scraped`);
    return { pageNumber, jobs };

  } catch (error) {
    console.error(`❌ Page ${pageNumber} failed completely:`, error.message);
    return { pageNumber, jobs: [] };
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

// Sequential processing with controlled parallelism
async function scrapePages(pageNumbers, specificJobTitle = null) {
  const results = [];
  
  // Process in smaller parallel batches
  for (let i = 0; i < pageNumbers.length; i += CONCURRENT_PAGES) {
    const batch = pageNumbers.slice(i, i + CONCURRENT_PAGES);
    console.log(`\n🔥 Processing batch: Pages ${batch.join(', ')}`);
    
    const batchPromises = batch.map(pageNum => 
      scrapePage(pageNum, specificJobTitle)
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch item failed:', result.reason?.message);
      }
    }
    
    // Delay between batches
    if (i + CONCURRENT_PAGES < pageNumbers.length) {
      console.log(`⏳ Waiting before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAYS.BETWEEN_BATCHES));
    }
  }
  
  return results;
}

// Main scraper function
async function microsoftScraper(specificJobTitle = null) {
  console.log('🚀 Starting Improved Parallel Microsoft Scraper...');
  
  if (specificJobTitle) {
    console.log(`🎯 Searching for: "${specificJobTitle}"`);
  } else {
    console.log('🔍 Default search: Software Engineering');
  }

  console.log(`⚡ Processing ${CONCURRENT_PAGES} pages in parallel per batch`);

  try {
    const startTime = Date.now();
    
    // Create page numbers array
    const pageNumbers = Array.from({ length: MAX_PAGES }, (_, i) => i + 1);
    
    // Scrape pages
    const pageResults = await scrapePages(pageNumbers, specificJobTitle);
    
    // Collect all jobs
    const allJobs = pageResults.flatMap(result => result.jobs);
    
    // Process results
    const transformed = allJobs.map(job => transformJobData(job, specificJobTitle))
                              .filter(job => job.job_title !== 'N/A');
    
    const uniqueJobs = transformed.filter((job, index, self) =>
      index === self.findIndex(j => 
        j.job_title === job.job_title && 
        j.job_city === job.job_city
      )
    );

    // Performance summary
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const jobsPerSecond = (uniqueJobs.length / duration).toFixed(2);

    console.log(`\n🎉 SCRAPING COMPLETED!`);
    console.log(`⚡ Duration: ${duration.toFixed(1)} seconds`);
    console.log(`📊 Raw jobs: ${allJobs.length}`);
    console.log(`✅ Valid jobs: ${transformed.length}`);
    console.log(`🔄 Unique jobs: ${uniqueJobs.length}`);
    console.log(`🚀 Speed: ${jobsPerSecond} jobs/second`);

    return uniqueJobs;

  } catch (error) {
    console.error(`❌ Scraping failed:`, error.message);
    return [];
  }
}

// Export the function
module.exports = microsoftScraper;

// Execute if run directly
// if (require.main === module) {
//   const args = process.argv.slice(2);
//   const specificJobTitle = args.length > 0 ? args.join(' ') : null;
  
//   if (specificJobTitle) {
//     console.log(`🎯 Job title argument: "${specificJobTitle}"`);
//   }
  
//   microsoftScraper(specificJobTitle).then(data => {
//     console.log(`\n✅ Final count: ${data.length} jobs`);
//   }).catch(console.error);
// }