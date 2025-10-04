#!/usr/bin/env node

// Smart test: Remove just a few job IDs from posted_jobs.json to test posting

const fs = require('fs');
const path = require('path');

// Load the files
const postedJobsPath = './.github/data/posted_jobs.json';
const newJobsPath = './.github/data/new_jobs.json';

const postedJobs = JSON.parse(fs.readFileSync(postedJobsPath, 'utf8'));
const newJobs = JSON.parse(fs.readFileSync(newJobsPath, 'utf8'));

console.log('📊 Current Status:');
console.log(`  Posted jobs tracked: ${postedJobs.length}`);
console.log(`  New jobs available: ${newJobs.length}`);

// Get first 3 job IDs from new_jobs.json
const testJobs = newJobs.slice(0, 3);
console.log('\n🧪 Test Jobs:');
testJobs.forEach((job, i) => {
  console.log(`  ${i + 1}. ${job.job_title} @ ${job.employer_name}`);
  console.log(`     ID: ${job.id}`);

  const isPosted = postedJobs.includes(job.id);
  console.log(`     Currently marked as posted: ${isPosted ? '✅ YES' : '❌ NO'}`);
});

// Remove these IDs from posted_jobs.json
console.log('\n🔧 Removing these 3 IDs from posted_jobs.json...');
const idsToRemove = testJobs.map(j => j.id);
const updatedPostedJobs = postedJobs.filter(id => !idsToRemove.includes(id));

console.log(`  Before: ${postedJobs.length} IDs`);
console.log(`  After: ${updatedPostedJobs.length} IDs`);
console.log(`  Removed: ${postedJobs.length - updatedPostedJobs.length} IDs`);

// Save the updated file
fs.writeFileSync(postedJobsPath, JSON.stringify(updatedPostedJobs, null, 2));

console.log('\n✅ Done! These 3 jobs will now be posted on next bot run.');
console.log('\n📝 Next steps:');
console.log('  1. Commit this change');
console.log('  2. Push to trigger workflow');
console.log('  3. Watch Discord for these 3 specific jobs');
console.log('  4. Check logs to see if they actually post');