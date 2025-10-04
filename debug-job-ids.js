#!/usr/bin/env node

const fs = require('fs');

// Copy of generateJobId from utils.js
function generateJobId(job) {
    const title = (job.job_title || '').toLowerCase().trim().replace(/\s+/g, '-');
    const company = (job.employer_name || '').toLowerCase().trim().replace(/\s+/g, '-');
    const city = (job.job_city || '').toLowerCase().trim().replace(/\s+/g, '-');

    // Remove special characters and normalize
    const normalize = (str) => str
        .replace(/[^\w-]/g, '-')  // Replace special chars with dashes
        .replace(/-+/g, '-')     // Collapse multiple dashes
        .replace(/^-|-$/g, '');  // Remove leading/trailing dashes

    return `${normalize(company)}-${normalize(title)}-${normalize(city)}`;
}

// Load new jobs
const newJobs = JSON.parse(fs.readFileSync('./.github/data/new_jobs.json', 'utf8'));
const postedJobs = JSON.parse(fs.readFileSync('./.github/data/posted_jobs.json', 'utf8'));

console.log('🔍 Debugging Job ID Mismatch Issue\n');
console.log('=' .repeat(60));

// Check first few jobs
newJobs.slice(0, 5).forEach((job, i) => {
    console.log(`\nJob ${i + 1}: ${job.job_title}`);
    console.log(`  Company: ${job.employer_name}`);
    console.log(`  City: ${job.job_city}`);
    console.log(`  ID in JSON: ${job.id}`);

    const generatedId = generateJobId(job);
    console.log(`  Generated ID: ${generatedId}`);

    const isPosted = postedJobs.includes(generatedId);
    const isPostedWithJsonId = postedJobs.includes(job.id);

    console.log(`  ❌ ID MISMATCH: ${job.id !== generatedId}`);
    console.log(`  Posted (by generated): ${isPosted ? '✅ YES' : '❌ NO'}`);
    console.log(`  Posted (by JSON id): ${isPostedWithJsonId ? '✅ YES' : '❌ NO'}`);
});

console.log('\n' + '=' .repeat(60));
console.log('\n🚨 PROBLEM FOUND:');
console.log('The IDs in new_jobs.json don\'t match what generateJobId() creates!');
console.log('This causes the bot to think jobs are not posted when they might be.');
console.log('\nExample:');
const firstJob = newJobs[0];
console.log(`  JSON ID: ${firstJob.id}`);
console.log(`  Generated: ${generateJobId(firstJob)}`);