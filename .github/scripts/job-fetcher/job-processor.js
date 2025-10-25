const fs = require('fs');
const path = require('path');
const { fetchAllRealJobs } = require('../real-career-scraper');
const { 
    companies, 
    ALL_COMPANIES, 
    COMPANY_BY_NAME, 
    generateJobId,
    migrateOldJobId,
    normalizeCompanyName, 
    getCompanyEmoji, 
    getCompanyCareerUrl,
    formatTimeAgo,
    isJobOlderThanWeek,
    isUSOnlyJob,
    getExperienceLevel,
    getJobCategory,
    formatLocation,
    delay 
} = require('./utils');

function filterTargetCompanyJobs(jobs) {
    console.log('🎯 Filtering for target companies...');
    
    const targetJobs = jobs.filter(job => {
        const companyName = (job.employer_name || '').toLowerCase();
        
        // Check against our comprehensive company list
        const isTargetCompany = COMPANY_BY_NAME[companyName] !== undefined;
        
        if (isTargetCompany) {
            // Normalize company name for consistency
            job.employer_name = normalizeCompanyName(job.employer_name);
            return true;
        }
        
        // Additional fuzzy matching for variations
        for (const company of ALL_COMPANIES) {
            for (const apiName of company.api_names) {
                if (companyName.includes(apiName.toLowerCase()) && apiName.length > 3) {
                    job.employer_name = company.name;
                    return true;
                }
            }
        }
        
        return false;
    });
    
    console.log(`✨ Filtered to ${targetJobs.length} target company jobs`);
    console.log('🏢 Companies found:', [...new Set(targetJobs.map(j => j.employer_name))]);
    
    // Remove duplicates more intelligently
    const uniqueJobs = targetJobs.filter((job, index, self) => {
        return index === self.findIndex(j => 
            j.job_title === job.job_title && 
            j.employer_name === job.employer_name &&
            j.job_city === job.job_city
        );
    });
    
    console.log(`🧹 After deduplication: ${uniqueJobs.length} unique jobs`);
    
    // Sort by company tier and recency
    uniqueJobs.sort((a, b) => {
        // Prioritize FAANG+ companies
        const aIsFAANG = companies.faang_plus.some(c => c.name === a.employer_name);
        const bIsFAANG = companies.faang_plus.some(c => c.name === b.employer_name);
        
        if (aIsFAANG && !bIsFAANG) return -1;
        if (!aIsFAANG && bIsFAANG) return 1;
        
        // Then by recency
        const aDate = new Date(a.job_posted_at_datetime_utc || 0);
        const bDate = new Date(b.job_posted_at_datetime_utc || 0);
        return bDate - aDate;
    });
    
    return uniqueJobs.slice(0, 50); // Top 50 jobs
}

// Generate company statistics with categories
function generateCompanyStats(jobs) {
    const stats = {
        byCategory: {},
        byLevel: { 'Entry-Level': 0, 'Mid-Level': 0, 'Senior': 0 },
        byLocation: {},
        totalByCompany: {}
    };
    
    jobs.forEach(job => {
        // Category stats
        const category = getJobCategory(job.job_title, job.job_description);
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        
        // Level stats
        const level = getExperienceLevel(job.job_title, job.job_description);
        stats.byLevel[level]++;
        
        // Location stats
        const location = formatLocation(job.job_city, job.job_state);
        stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
        
        // Company stats
        stats.totalByCompany[job.employer_name] = (stats.totalByCompany[job.employer_name] || 0) + 1;
    });
    
    return stats;
}

// Write the new jobs JSON for Discord with atomic writes
function writeNewJobsJson(jobs) {
    const dataDir = path.join(process.cwd(), '.github', 'data');
    
    try {
        // Ensure data folder exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Atomic write: write to temp file then rename
        const outPath = path.join(dataDir, 'new_jobs.json');
        const tempPath = path.join(dataDir, 'new_jobs.tmp.json');
        
        // Write to temporary file
        fs.writeFileSync(tempPath, JSON.stringify(jobs, null, 2), 'utf8');
        
        // Atomic rename - this prevents corruption if process is killed mid-write
        fs.renameSync(tempPath, outPath);
        
        console.log(`✨ Wrote ${jobs.length} new jobs to ${outPath}`);
        
    } catch (error) {
        console.error('❌ Error writing new_jobs.json:', error.message);
        
        // Clean up temp file if it exists
        const tempPath = path.join(dataDir, 'new_jobs.tmp.json');
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('⚠️ Could not clean up temp file:', cleanupError.message);
            }
        }
        
        throw error; // Re-throw to stop execution
    }
}

// Update seen jobs store with atomic writes to prevent corruption
function updateSeenJobsStore(jobs, seenIds) {
    const dataDir = path.join(process.cwd(), '.github', 'data');
    
    try {
        // Ensure data folder exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Mark new jobs as seen
        jobs.forEach(job => seenIds.add(job.id));
        
        // Convert Set to sorted array for consistency
        let seenJobsArray = [...seenIds].sort();
        
        // Cleanup: Remove entries older than 30 days to prevent infinite growth
        // This is safe because we only track jobs from the last week anyway
        const maxEntries = 10000; // Reasonable upper limit
        if (seenJobsArray.length > maxEntries) {
            seenJobsArray = seenJobsArray.slice(-maxEntries); // Keep most recent entries
            console.log(`🧹 Trimmed seen_jobs.json to ${maxEntries} most recent entries`);
        }
        
        // Atomic write: write to temp file then rename
        const seenPath = path.join(dataDir, 'seen_jobs.json');
        const tempPath = path.join(dataDir, 'seen_jobs.tmp.json');
        
        // Write to temporary file
        fs.writeFileSync(tempPath, JSON.stringify(seenJobsArray, null, 2), 'utf8');
        
        // Atomic rename - this prevents corruption if process is killed mid-write
        fs.renameSync(tempPath, seenPath);
        
        console.log(`✅ Updated seen_jobs.json with ${jobs.length} new entries (total: ${seenJobsArray.length})`);
        
    } catch (error) {
        console.error('❌ Error updating seen jobs store:', error.message);
        
        // Clean up temp file if it exists
        const tempPath = path.join(dataDir, 'seen_jobs.tmp.json');
        if (fs.existsSync(tempPath)) {
            try {
                fs.unlinkSync(tempPath);
            } catch (cleanupError) {
                console.error('⚠️ Could not clean up temp file:', cleanupError.message);
            }
        }
        
        throw error; // Re-throw to stop execution
    }
}

// Load seen jobs for deduplication with error handling and validation
function loadSeenJobsStore() {
    const dataDir = path.join(process.cwd(), '.github', 'data');
    const seenPath = path.join(dataDir, 'seen_jobs.json');
    
    try {
        if (!fs.existsSync(seenPath)) {
            console.log('ℹ️ No existing seen_jobs.json found - starting fresh');
            return new Set();
        }
        
        const fileContent = fs.readFileSync(seenPath, 'utf8');
        if (!fileContent.trim()) {
            console.log('⚠️ Empty seen_jobs.json file - starting fresh');
            return new Set();
        }
        
        const seenJobs = JSON.parse(fileContent);
        if (!Array.isArray(seenJobs)) {
            console.log('⚠️ Invalid seen_jobs.json format - expected array, starting fresh');
            return new Set();
        }
        
        // Filter out invalid entries (non-strings or empty strings)
        const validSeenJobs = seenJobs.filter(id => typeof id === 'string' && id.trim().length > 0);
        
        if (validSeenJobs.length !== seenJobs.length) {
            console.log(`⚠️ Filtered ${seenJobs.length - validSeenJobs.length} invalid entries from seen_jobs.json`);
        }
        
        console.log(`✅ Loaded ${validSeenJobs.length} previously seen jobs`);
        
        // Migration check: if all IDs are in old format, we need to regenerate them
        // Old format contains commas and multiple dashes, new format doesn't
        const hasOldFormatIds = validSeenJobs.some(id => id.includes(',') || id.includes('---'));
        
        if (hasOldFormatIds && validSeenJobs.length > 0) {
            console.log('⚠️ Detected old job ID format - migrating to new standardized format');
            
            // Migrate old IDs to new format to minimize re-posting
            const migratedIds = validSeenJobs.map(oldId => {
                if (oldId.includes(',') || oldId.includes('---')) {
                    return migrateOldJobId(oldId);
                }
                return oldId; // Already in new format
            });
            
            const uniqueMigratedIds = [...new Set(migratedIds)];
            console.log(`📝 Migrated ${validSeenJobs.length} old IDs to ${uniqueMigratedIds.length} new format IDs`);
            
            return new Set(uniqueMigratedIds);
        }
        
        return new Set(validSeenJobs);
        
    } catch (error) {
        console.error('❌ Error loading seen_jobs.json:', error.message);
        console.log('ℹ️ Creating backup and starting fresh');
        
        // Create backup of corrupted file
        try {
            const backupPath = path.join(dataDir, `seen_jobs_backup_${Date.now()}.json`);
            fs.copyFileSync(seenPath, backupPath);
            console.log(`📁 Backup created: ${backupPath}`);
        } catch (backupError) {
            console.error('⚠️ Could not create backup:', backupError.message);
        }
        
        return new Set();
    }
}

// Main job processing function
async function processJobs() {
    console.log('🚀 Starting job processing...');
    
    try {
        // Load seen jobs for deduplication
        const seenIds = loadSeenJobsStore();
        
        // Fetch jobs from both API and real career pages
        const allJobs = await fetchAllRealJobs();
        const usJobs = allJobs.filter(isUSOnlyJob);
        const currentJobs = usJobs.filter(j => !isJobOlderThanWeek(j.job_posted_at_datetime_utc));
        
        // Add unique IDs for deduplication using standardized generation
        currentJobs.forEach(job => {
            job.id = generateJobId(job);
        });
        
        // Filter for truly new jobs (not previously seen)
        const freshJobs = currentJobs.filter(job => !seenIds.has(job.id));
        
        if (freshJobs.length === 0) {
            console.log('ℹ️ No new jobs found - all current openings already processed');
            // Write empty array to clear stale data
            writeNewJobsJson([]);
        } else {
            console.log(`📬 Found ${freshJobs.length} new jobs to process`);
            // Write new jobs for Discord bot consumption
            writeNewJobsJson(freshJobs);
            // Update seen jobs store
            updateSeenJobsStore(freshJobs, seenIds);
        }
        
        // Calculate archived jobs
        const archivedJobs = usJobs.filter(j => isJobOlderThanWeek(j.job_posted_at_datetime_utc));
        
        console.log(`✅ Job processing complete - ${currentJobs.length} current, ${archivedJobs.length} archived`);
        
        return {
            currentJobs,
            archivedJobs,
            freshJobs,
            stats: generateCompanyStats(currentJobs)
        };
        
    } catch (error) {
        console.error('❌ Error in job processing:', error);
        throw error;
    }
}

module.exports = {
    
    
    
    generateCompanyStats,
    writeNewJobsJson,
    updateSeenJobsStore,
    loadSeenJobsStore,
    processJobs
};