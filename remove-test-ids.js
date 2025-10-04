#!/usr/bin/env node

const fs = require('fs');

// Test job IDs to remove from posted_jobs.json
const testIds = [
  "meta-software-engineer-backend-san-francisco",
  "google-product-manager-mountain-view",
  "salesforce-sales-development-representative-new-york",
  "microsoft-data-scientist-seattle",
  "adobe-marketing-manager-san-jose"
];

// Load posted jobs
const postedJobsPath = './.github/data/posted_jobs.json';
const postedJobs = JSON.parse(fs.readFileSync(postedJobsPath, 'utf8'));

console.log(`📊 Current posted jobs: ${postedJobs.length}`);

// Remove test IDs
const filtered = postedJobs.filter(id => !testIds.includes(id));
const removed = postedJobs.length - filtered.length;

// Save updated list
fs.writeFileSync(postedJobsPath, JSON.stringify(filtered, null, 2));

console.log(`✅ Removed ${removed} test IDs from posted_jobs.json`);
console.log(`📊 Updated posted jobs: ${filtered.length}`);

console.log('\n🎯 Test jobs ready to post:');
testIds.forEach((id, i) => {
  console.log(`  ${i + 1}. ${id}`);
});