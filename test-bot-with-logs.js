#!/usr/bin/env node

// Quick test to verify the logging system works

const fs = require('fs');

console.log('🧪 Testing Discord Bot with Logging\n');

// Add one test job to new_jobs.json
const testJob = {
  job_title: "Test Software Engineer",
  employer_name: "TestCorp",
  job_city: "San Francisco",
  job_state: "CA",
  job_description: "Test job for debugging",
  job_apply_link: "https://example.com/apply",
  job_posted_at: "Recently",
  id: "testcorp-test-software-engineer-san-francisco"
};

// Save test job
fs.writeFileSync('./.github/data/new_jobs.json', JSON.stringify([testJob], null, 2));
console.log('✅ Created test job in new_jobs.json');

// Remove this ID from posted_jobs.json if it exists
const postedJobsPath = './.github/data/posted_jobs.json';
const postedJobs = JSON.parse(fs.readFileSync(postedJobsPath, 'utf8'));
const filtered = postedJobs.filter(id => id !== testJob.id);
fs.writeFileSync(postedJobsPath, JSON.stringify(filtered, null, 2));
console.log('✅ Removed test job ID from posted_jobs.json');

console.log('\n📋 Test job ready:');
console.log(`  Title: ${testJob.job_title}`);
console.log(`  Company: ${testJob.employer_name}`);
console.log(`  ID: ${testJob.id}`);

console.log('\n🚀 Ready to test! Run:');
console.log('  node .github/scripts/save-discord-logs.js');
console.log('\nThen check .github/logs/latest.log for results!');