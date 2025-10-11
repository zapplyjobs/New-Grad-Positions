const Puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeMetaJobs(specificJobTitle = null) {
    console.log('🔍 Starting Meta job scraping...');
    
    if (specificJobTitle) {
        console.log(`🎯 Searching for specific job: "${specificJobTitle}"`);
    } else {
        console.log('🔍 Using default search: All tech roles');
    }

    const browser = await Puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    const maxPages = 2; // Reduced to 2 pages for frequent 10-minute runs
    let allJobs = [];

    // Build base URL based on whether specific job title is provided
    const baseUrl = buildBaseUrl(specificJobTitle);

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const searchType = specificJobTitle || 'software engineering';
        console.log(`📄 Scraping ${searchType} - Meta page ${pageNum}...`);

        try {
            const url = pageNum === 1 ? baseUrl : `${baseUrl}&page=${pageNum}`;
            console.log(`🔗 URL: ${url}`);

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 10000
            });
            

            await page.waitForSelector('a[href*="/jobs/"]', { timeout: 5000 });

            const jobs = await page.evaluate((specificJobTitle) => {
                // Find all job links
                const jobLinks = document.querySelectorAll('a[href*="/jobs/"]');
                const jobsArray = [];

                jobLinks.forEach(jobLink => {
                    try {
                        const titleElement = jobLink.querySelector('div._6g3g.x10lme4x.x26uert.xngnso2.x117nqv4.x1mnlqng.x1e096f4');
                        const title = titleElement ? titleElement.innerText.trim() : '';

                        if (!title) return;

                        const url = jobLink.href;

                        const locationSpans = jobLink.querySelectorAll('span.x26uert.x8xxdc5.x1jchvi3');
                        let location = '';

                        for (const span of locationSpans) {
                            const text = span.innerText.trim();
                            if (text.includes(',') && (text.includes('NY') || text.includes('CA') || text.includes('WA'))) {
                                location = text;
                                break;
                            }
                            // Handle "Remote, US" format
                            if (text.includes('Remote') || text.includes('Multiple Locations')) {
                                location = text;
                                break;
                            }
                        }

                        // Get department/category from spans
                        let department = '';
                        for (const span of locationSpans) {
                            const text = span.innerText.trim();
                            if (text.includes('Engineering') || text.includes('Software') ||
                                text.includes('Product') || text.includes('Design') ||
                                text.includes('Research') || text.includes('Machine Learning')) {
                                department = text;
                                break;
                            }
                        }

                        // Filter jobs based on specific job title or default criteria
                        let shouldInclude = false;
                        
                        if (specificJobTitle) {
                            // If specific job title is provided, check if title contains it (case insensitive)
                            shouldInclude = title.toLowerCase().includes(specificJobTitle.toLowerCase());
                        } else {
                            // Default filtering for tech roles
                            shouldInclude = title.toLowerCase().includes('engineer') ||
                                title.toLowerCase().includes('developer') ||
                                title.toLowerCase().includes('product') ||
                                title.toLowerCase().includes('design') ||
                                title.toLowerCase().includes('research') ||
                                title.toLowerCase().includes('scientist');
                        }

                        if (shouldInclude) {
                            jobsArray.push({
                                title: title,
                                location: location || 'Multiple Locations',
                                url: url,
                                department: department || (specificJobTitle || 'Software Engineering'),
                                postedDate: '',
                                timeElapsed: ''
                            });
                        }
                    } catch (error) {
                        console.warn('Error parsing job:', error);
                    }
                });

                return jobsArray;
            }, specificJobTitle);

            console.log(`   Found ${jobs.length} jobs`);

            if (jobs.length === 0) {
                console.log('   No more jobs found, stopping...');
                break;
            }

            allJobs = [...allJobs, ...jobs];

            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`❌ Error scraping page ${pageNum}:`, error.message);
            continue;
        }
    }

    console.log('Jobs found:', allJobs.length);

    // Log all job details like Amazon scraper
    allJobs.forEach((job) => {
        console.log(`job-details`, job);
    });

    await browser.close();

    const uniqueJobs = allJobs.filter((job, index, self) =>
        index === self.findIndex(j => j.url === job.url)
    );

    // Transform to standard format
    const transformedJobs = uniqueJobs.map(job => ({
        job_title: job.title,
        employer_name: 'Meta',
        job_city: parseLocation(job.location).city,
        job_state: parseLocation(job.location).state,
        job_description: job.department || 'Join Meta to build the future of social connection.',
        job_apply_link: job.url,
        job_posted_at: job.postedDate || 'Recently',
        job_posted_at_datetime_utc: job.postedDate || "Recently",
    }));

    console.log(`🎯 Meta scraping completed: ${transformedJobs.length} unique jobs found`);

    // Determine the filename based on whether it's a specific job search
    // let fileName;
    // if (specificJobTitle) {
    //     // Convert job title to a safe filename (replace spaces with underscores, remove special characters)
    //     const safeJobTitle = specificJobTitle.toLowerCase()
    //         .replace(/[^a-z0-9\s]/g, '')
    //         .replace(/\s+/g, '_');
    //     fileName = `meta_${safeJobTitle}_jobs.json`;
    // } else {
    //     fileName = 'metajobs.json';
    // }

    // // Save to JSON file
    // try {
    //     const filename = path.join(__dirname, fileName);
    //     fs.writeFileSync(filename, JSON.stringify(transformedJobs, null, 2));
    //     console.log(`💾 Saved ${transformedJobs.length} jobs to ${filename}`);
    //     console.log(`📅 Save time: ${new Date().toLocaleString()}`);
    // } catch (error) {
    //     console.error('❌ Error saving jobs to file:', error);
    // }

    return transformedJobs;
}

// Helper function to build base URL based on search type
function buildBaseUrl(specificJobTitle = null) {
    const baseUrl = 'https://www.metacareers.com/jobs?roles[0]=Full%20time%20employment&roles[1]=Internship';
    
    if (specificJobTitle) {
        // Add the specific job title as a query parameter
        const encodedJobTitle = encodeURIComponent(specificJobTitle);
        return `${baseUrl}&q=${encodedJobTitle}`;
    } else {
        // Return base URL for general tech roles
        return baseUrl;
    }
}

// Helper function to parse location
function parseLocation(locationStr) {
    if (!locationStr || locationStr === 'Multiple Locations') {
        return { city: 'Multiple', state: 'Locations' };
    }

    if (locationStr.includes('Remote')) {
        return { city: 'Remote', state: 'US' };
    }

    // Parse "City, State" format
    const parts = locationStr.split(', ');
    if (parts.length >= 2) {
        return {
            city: parts[0].trim(),
            state: parts[1].trim()
        };
    }

    return { city: locationStr, state: '' };
}

// Export the function for use in other modules
module.exports = scrapeMetaJobs;

// Execute the script if run directly
// if (require.main === module) {
//     // Check if a specific job title was provided as a command line argument
//     const args = process.argv.slice(2);
//     // Join all arguments with spaces to handle multi-word job titles
//     const specificJobTitle = args.length > 0 ? args.join(' ') : null;
    
//     if (specificJobTitle) {
//         console.log(`🎯 Job title argument received: "${specificJobTitle}"`);
//     }
    
//     scrapeMetaJobs(specificJobTitle)
//         .then(() => {
//             console.log('\n✅ Meta job scraping and saving completed!');
//             process.exit(0);
//         })
//         .catch(error => {
//             console.error('\n❌ Meta job scraping failed:', error);
//             process.exit(1);
//         });
// }