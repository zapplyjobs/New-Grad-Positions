#!/usr/bin/env node

// Test script to verify job categorization logic
const fs = require('fs');
const path = require('path');

// Mock channel config for testing
const CHANNEL_CONFIG = {
  'tech': 'TECH_CHANNEL',
  'sales': 'SALES_CHANNEL',
  'marketing': 'MARKETING_CHANNEL',
  'finance': 'FINANCE_CHANNEL',
  'healthcare': 'HEALTHCARE_CHANNEL',
  'product': 'PRODUCT_CHANNEL',
  'supply-chain': 'SUPPLY_CHAIN_CHANNEL',
  'project-management': 'PM_CHANNEL',
  'hr': 'HR_CHANNEL'
};

// Copy of the getJobChannel function from enhanced-discord-bot.js
function getJobChannel(job) {
  const title = (job.job_title || '').toLowerCase();
  const description = (job.job_description || '').toLowerCase();
  const combined = `${title} ${description}`;

  // Sales roles - Check first as they're very specific
  if (/\b(sales|account executive|account manager|bdr|sdr|business development|customer success|revenue|quota)\b/.test(combined)) {
    return CHANNEL_CONFIG.sales;
  }

  // Marketing roles
  if (/\b(marketing|growth|seo|sem|content marketing|brand|campaign|digital marketing|social media|copywriter|creative director)\b/.test(combined)) {
    return CHANNEL_CONFIG.marketing;
  }

  // Finance roles
  if (/\b(finance|accounting|financial analyst|controller|treasury|audit|tax|bookkeep|cfo|actuarial|investment|banker)\b/.test(combined)) {
    return CHANNEL_CONFIG.finance;
  }

  // Healthcare roles
  if (/\b(healthcare|medical|clinical|health|nurse|doctor|physician|therapist|pharmaceutical|biotech|hospital|patient care)\b/.test(combined)) {
    return CHANNEL_CONFIG.healthcare;
  }

  // Product Management roles - Be specific to avoid false positives
  if (/\b(product manager|product owner|product marketing|(\bpm\b)|product lead|product strategy|product analyst)\b/.test(combined)) {
    return CHANNEL_CONFIG.product;
  }

  // Supply Chain/Operations roles
  if (/\b(supply chain|logistics|operations manager|procurement|inventory|warehouse|distribution|sourcing|fulfillment|shipping)\b/.test(combined)) {
    return CHANNEL_CONFIG['supply-chain'];
  }

  // Project Management roles - Be specific to avoid confusion with Product Management
  if (/\b(project manager|program manager|scrum master|agile coach|pmo|project coordinator|delivery manager)\b/.test(combined)) {
    return CHANNEL_CONFIG['project-management'];
  }

  // HR roles
  if (/\b(human resources|(\bhr\b)|recruiter|talent acquisition|people operations|compensation|benefits|hiring manager|recruitment|workforce)\b/.test(combined)) {
    return CHANNEL_CONFIG.hr;
  }

  // Default to tech for all engineering/technical roles
  // This includes: Software Engineer, Data Scientist, DevOps, QA, IT, Security, etc.
  return CHANNEL_CONFIG.tech;
}

// Test cases
const testJobs = [
  // Tech jobs
  { job_title: 'Software Engineer', job_description: 'Build scalable applications', expected: 'TECH_CHANNEL' },
  { job_title: 'Senior Backend Developer', job_description: 'API development', expected: 'TECH_CHANNEL' },
  { job_title: 'Data Scientist', job_description: 'Machine learning models', expected: 'TECH_CHANNEL' },
  { job_title: 'DevOps Engineer', job_description: 'Cloud infrastructure', expected: 'TECH_CHANNEL' },

  // Sales jobs
  { job_title: 'Account Executive', job_description: 'Drive revenue growth', expected: 'SALES_CHANNEL' },
  { job_title: 'Sales Development Representative (SDR)', job_description: 'Lead generation', expected: 'SALES_CHANNEL' },
  { job_title: 'Customer Success Manager', job_description: 'Client relationships', expected: 'SALES_CHANNEL' },

  // Marketing jobs
  { job_title: 'Digital Marketing Manager', job_description: 'SEO and SEM campaigns', expected: 'MARKETING_CHANNEL' },
  { job_title: 'Content Marketing Specialist', job_description: 'Blog and social media', expected: 'MARKETING_CHANNEL' },
  { job_title: 'Brand Manager', job_description: 'Brand strategy', expected: 'MARKETING_CHANNEL' },

  // Finance jobs
  { job_title: 'Financial Analyst', job_description: 'Financial modeling', expected: 'FINANCE_CHANNEL' },
  { job_title: 'Senior Accountant', job_description: 'Tax preparation', expected: 'FINANCE_CHANNEL' },
  { job_title: 'Treasury Manager', job_description: 'Cash management', expected: 'FINANCE_CHANNEL' },

  // Healthcare jobs
  { job_title: 'Clinical Research Coordinator', job_description: 'Medical trials', expected: 'HEALTHCARE_CHANNEL' },
  { job_title: 'Healthcare Data Analyst', job_description: 'Patient care analytics', expected: 'HEALTHCARE_CHANNEL' },

  // Product Management jobs
  { job_title: 'Product Manager', job_description: 'Product roadmap', expected: 'PRODUCT_CHANNEL' },
  { job_title: 'Senior PM', job_description: 'Feature prioritization', expected: 'PRODUCT_CHANNEL' },
  { job_title: 'Product Owner', job_description: 'Agile development', expected: 'PRODUCT_CHANNEL' },

  // Supply Chain jobs
  { job_title: 'Supply Chain Analyst', job_description: 'Inventory optimization', expected: 'SUPPLY_CHAIN_CHANNEL' },
  { job_title: 'Logistics Coordinator', job_description: 'Shipping and fulfillment', expected: 'SUPPLY_CHAIN_CHANNEL' },

  // Project Management jobs
  { job_title: 'Project Manager', job_description: 'Cross-functional teams', expected: 'PM_CHANNEL' },
  { job_title: 'Scrum Master', job_description: 'Agile ceremonies', expected: 'PM_CHANNEL' },
  { job_title: 'Program Manager', job_description: 'Multiple project delivery', expected: 'PM_CHANNEL' },

  // HR jobs
  { job_title: 'HR Business Partner', job_description: 'Employee relations', expected: 'HR_CHANNEL' },
  { job_title: 'Technical Recruiter', job_description: 'Talent acquisition', expected: 'HR_CHANNEL' },
  { job_title: 'People Operations Manager', job_description: 'Benefits administration', expected: 'HR_CHANNEL' },
];

// Run tests
console.log('🧪 Testing Job Categorization Logic\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

testJobs.forEach((testCase, index) => {
  const result = getJobChannel(testCase);
  const isCorrect = result === testCase.expected;

  if (isCorrect) {
    passed++;
    console.log(`✅ Test ${index + 1}: "${testCase.job_title}"`);
    console.log(`   Expected: ${testCase.expected} | Got: ${result}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: "${testCase.job_title}"`);
    console.log(`   Expected: ${testCase.expected} | Got: ${result}`);
  }
  console.log('');
});

console.log('=' .repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
console.log(`Success Rate: ${((passed / testJobs.length) * 100).toFixed(1)}%\n`);

// Test with actual job data if available
const newJobsPath = path.join(process.cwd(), '.github', 'data', 'new_jobs.json');
if (fs.existsSync(newJobsPath)) {
  console.log('\n📋 Testing with actual job data from new_jobs.json:');
  console.log('=' .repeat(50));

  const actualJobs = JSON.parse(fs.readFileSync(newJobsPath, 'utf8'));
  const sampleJobs = actualJobs.slice(0, 5); // Test first 5 jobs

  sampleJobs.forEach((job, index) => {
    const channel = getJobChannel(job);
    const channelName = Object.keys(CHANNEL_CONFIG).find(key => CHANNEL_CONFIG[key] === channel) || 'unknown';

    console.log(`\nJob ${index + 1}: ${job.job_title}`);
    console.log(`Company: ${job.employer_name}`);
    console.log(`→ Would be posted to: #${channelName}-jobs`);
  });
}

console.log('\n✅ Categorization test complete!');