#!/usr/bin/env node

// Test script with YOUR actual Discord channel IDs
const fs = require('fs');

// Your actual channel IDs
const CHANNEL_CONFIG = {
  'tech': '1391083454665588819',
  'sales': '1391466110137663632',
  'marketing': '1391083610156564570',
  'finance': '1391466200911052941',
  'healthcare': '1391083735088234716',
  'product': '1391466259534708889',
  'supply-chain': '1391466325787939058',
  'project-management': '1391466474387931276',
  'hr': '1391466508097687674'
};

// Check if multi-channel mode would be activated
const MULTI_CHANNEL_MODE = Object.values(CHANNEL_CONFIG).some(id => id !== undefined);
console.log('🔍 Multi-channel mode active:', MULTI_CHANNEL_MODE ? '✅ YES' : '❌ NO');
console.log('');

// Copy of the getJobChannel function
function getJobChannel(job) {
  const title = (job.job_title || '').toLowerCase();
  const description = (job.job_description || '').toLowerCase();
  const combined = `${title} ${description}`;

  if (/\b(sales|account executive|account manager|bdr|sdr|business development|customer success|revenue|quota)\b/.test(combined)) {
    return CHANNEL_CONFIG.sales;
  }
  if (/\b(marketing|growth|seo|sem|content marketing|brand|campaign|digital marketing|social media|copywriter|creative director)\b/.test(combined)) {
    return CHANNEL_CONFIG.marketing;
  }
  if (/\b(finance|accounting|financial analyst|controller|treasury|audit|tax|bookkeep|cfo|actuarial|investment|banker)\b/.test(combined)) {
    return CHANNEL_CONFIG.finance;
  }
  if (/\b(healthcare|medical|clinical|health|nurse|doctor|physician|therapist|pharmaceutical|biotech|hospital|patient care)\b/.test(combined)) {
    return CHANNEL_CONFIG.healthcare;
  }
  if (/\b(product manager|product owner|product marketing|(\bpm\b)|product lead|product strategy|product analyst)\b/.test(combined)) {
    return CHANNEL_CONFIG.product;
  }
  if (/\b(supply chain|logistics|(?<!people )operations manager|procurement|inventory|warehouse|distribution|sourcing|fulfillment|shipping)\b/.test(combined)) {
    return CHANNEL_CONFIG['supply-chain'];
  }
  if (/\b(project manager|program manager|scrum master|agile coach|pmo|project coordinator|delivery manager)\b/.test(combined)) {
    return CHANNEL_CONFIG['project-management'];
  }
  if (/\b(human resources|(\bhr\b)|recruiter|talent acquisition|people operations|compensation|benefits|hiring manager|recruitment|workforce)\b/.test(combined)) {
    return CHANNEL_CONFIG.hr;
  }
  return CHANNEL_CONFIG.tech;
}

// Test with sample jobs
console.log('📋 Testing Job Routing with Your Channel IDs:\n');
console.log('=' .repeat(60));

const testJobs = [
  { job_title: 'Senior Software Engineer', job_description: 'Build scalable systems' },
  { job_title: 'Account Executive', job_description: 'Drive sales growth' },
  { job_title: 'Marketing Manager', job_description: 'Lead marketing campaigns' },
  { job_title: 'Financial Analyst', job_description: 'Financial modeling and analysis' },
  { job_title: 'Product Manager', job_description: 'Own product roadmap' },
  { job_title: 'Clinical Research Coordinator', job_description: 'Medical trials' },
  { job_title: 'Supply Chain Manager', job_description: 'Optimize logistics' },
  { job_title: 'Project Manager', job_description: 'Manage cross-functional teams' },
  { job_title: 'HR Business Partner', job_description: 'Support people operations' }
];

testJobs.forEach((job, i) => {
  const channelId = getJobChannel(job);
  const channelName = Object.keys(CHANNEL_CONFIG).find(key => CHANNEL_CONFIG[key] === channelId);

  console.log(`\nJob ${i + 1}: ${job.job_title}`);
  console.log(`  → Channel: #${channelName}-jobs`);
  console.log(`  → Channel ID: ${channelId}`);
  console.log(`  ✅ Will post to Discord channel ${channelId}`);
});

console.log('\n' + '=' .repeat(60));

// Test with actual new_jobs.json if it exists
const newJobsPath = './.github/data/new_jobs.json';
if (fs.existsSync(newJobsPath)) {
  console.log('\n📊 Testing with REAL job data:\n');

  const jobs = JSON.parse(fs.readFileSync(newJobsPath, 'utf8'));
  const sample = jobs.slice(0, 5);

  sample.forEach((job, i) => {
    const channelId = getJobChannel(job);
    const channelName = Object.keys(CHANNEL_CONFIG).find(key => CHANNEL_CONFIG[key] === channelId);

    console.log(`\nReal Job ${i + 1}: ${job.job_title}`);
    console.log(`  Company: ${job.employer_name}`);
    console.log(`  → Will post to: #${channelName}-jobs (${channelId})`);
  });
}

console.log('\n✅ Configuration Test Complete!');
console.log('\n🚀 Ready to deploy with these channel IDs!');
console.log('\nNext steps:');
console.log('1. Add these IDs to GitHub Secrets');
console.log('2. Push the code');
console.log('3. Watch jobs get routed to correct channels!');