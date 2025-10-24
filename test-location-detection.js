#!/usr/bin/env node

// Test location detection logic locally
const fs = require('fs');

// Sample job data from actual Discord posts
const testJobs = [
  {
    job_title: "Senior Staff Software Engineer, Backend (Platform - Asset Data)",
    employer_name: "Coinbase",
    job_city: "Remote - USA",
    job_state: "CA",
    job_description: "Join Coinbase to build the future of cryptocurrency"
  },
  {
    job_title: "Software Engineer",
    employer_name: "DraftKings",
    job_city: "Remote in USA",
    job_state: "",
    job_description: "Join DraftKings in this exciting opportunity"
  },
  {
    job_title: "Software Engineer, Backend-leaning Full Stack or Backend (Runner Team)",
    employer_name: "Zapier",
    job_city: "Remote in USA",
    job_state: "",
    job_description: "Join Zapier in this exciting opportunity"
  },
  {
    job_title: "Software Engineer",
    employer_name: "Adobe",
    job_city: "San Francisco",
    job_state: "CA",
    job_description: "Work on amazing products"
  },
  {
    job_title: "Senior Software Engineer",
    employer_name: "Microsoft",
    job_city: "Redmond",
    job_state: "WA",
    job_description: "Build platform infrastructure"
  },
  {
    job_title: "Data Scientist",
    employer_name: "Google",
    job_city: "New York",
    job_state: "NY",
    job_description: "Analyze data and build models"
  },
  {
    job_title: "Software Engineer",
    employer_name: "Dell",
    job_city: "Dallas",
    job_state: "TX",
    job_description: "Backend engineering role"
  },
  {
    job_title: "Software Engineer - Remote",
    employer_name: "GitLab",
    job_city: "",
    job_state: "",
    job_description: "Remote position, work from anywhere in the USA"
  }
];

// Location detection function (same as in enhanced-discord-bot.js)
const LOCATION_CHANNEL_CONFIG = {
  'remote-usa': 'REMOTE_USA_CHANNEL',
  'new-york': 'NY_CHANNEL',
  'austin': 'AUSTIN_CHANNEL',
  'chicago': 'CHICAGO_CHANNEL',
  'seattle': 'SEATTLE_CHANNEL',
  'redmond': 'REDMOND_CHANNEL',
  'mountain-view': 'MV_CHANNEL',
  'san-francisco': 'SF_CHANNEL',
  'sunnyvale': 'SUNNYVALE_CHANNEL',
  'san-bruno': 'SAN_BRUNO_CHANNEL'
};

function getJobLocationChannel(job) {
  const city = (job.job_city || '').toLowerCase().trim();
  const state = (job.job_state || '').toLowerCase().trim();
  const title = (job.job_title || '').toLowerCase();
  const description = (job.job_description || '').toLowerCase();
  const combined = `${title} ${description} ${city} ${state}`;

  // City name matching (specific city names)
  const cityMatches = {
    'san francisco': 'san-francisco',
    'mountain view': 'mountain-view',
    'sunnyvale': 'sunnyvale',
    'san bruno': 'san-bruno',
    'new york': 'new-york',
    'manhattan': 'new-york',
    'brooklyn': 'new-york',
    'austin': 'austin',
    'chicago': 'chicago',
    'seattle': 'seattle',
    'redmond': 'redmond'
  };

  // City abbreviations (check separately to avoid substring issues)
  const cityAbbreviations = {
    'sf': 'san-francisco',
    'nyc': 'new-york'
  };

  // Check job_city field first (most reliable)
  for (const [searchCity, channelKey] of Object.entries(cityMatches)) {
    if (city.includes(searchCity)) {
      return LOCATION_CHANNEL_CONFIG[channelKey];
    }
  }

  // Check abbreviations (exact match on words)
  for (const [abbr, channelKey] of Object.entries(cityAbbreviations)) {
    if (city === abbr || city.split(/\s+/).includes(abbr)) {
      return LOCATION_CHANNEL_CONFIG[channelKey];
    }
  }

  // Then check combined title + description for city names
  for (const [searchCity, channelKey] of Object.entries(cityMatches)) {
    if (combined.includes(searchCity)) {
      return LOCATION_CHANNEL_CONFIG[channelKey];
    }
  }

  // Check state codes ONLY when accompanied by "remote" keyword
  // This prevents matching random "CA" in company names
  if (/\b(remote|work from home|wfh)\b/.test(combined)) {
    // State to city mapping (only for remote jobs)
    if (state === 'ca' || /\bca\b/.test(combined)) {
      return LOCATION_CHANNEL_CONFIG['san-francisco'];
    }
    if (state === 'ny' || /\bny\b/.test(combined)) {
      return LOCATION_CHANNEL_CONFIG['new-york'];
    }
    if (state === 'tx' || /\btx\b/.test(combined)) {
      return LOCATION_CHANNEL_CONFIG['austin'];
    }
    if (state === 'wa' || /\bwa\b/.test(combined)) {
      // Check if Redmond is specifically mentioned
      if (combined.includes('redmond')) {
        return LOCATION_CHANNEL_CONFIG['redmond'];
      }
      return LOCATION_CHANNEL_CONFIG['seattle'];
    }
    if (state === 'il' || /\bil\b/.test(combined)) {
      return LOCATION_CHANNEL_CONFIG['chicago'];
    }
  }

  // ONLY if no specific city match, check for remote USA jobs
  // This ensures "Remote - USA, CA" goes to San Francisco, not remote-usa
  if (/\b(remote|work from home|wfh|distributed|anywhere)\b/.test(combined) &&
      /\b(usa|united states|u\.s\.|us only|us-based|us remote)\b/.test(combined)) {
    return LOCATION_CHANNEL_CONFIG['remote-usa'];
  }

  // No location match
  return null;
}

// Test each job
console.log('🔍 Testing Location Detection Logic\n');
console.log('=' .repeat(80));

testJobs.forEach((job, index) => {
  console.log(`\nTest ${index + 1}: ${job.job_title} @ ${job.employer_name}`);
  console.log(`  City: "${job.job_city}" | State: "${job.job_state}"`);

  const locationChannel = getJobLocationChannel(job);

  if (locationChannel) {
    console.log(`  ✅ MATCH: ${locationChannel}`);
    console.log(`  → Would post to industry channel + ${locationChannel}`);
  } else {
    console.log(`  ❌ NO MATCH`);
    console.log(`  → Would post to industry channel ONLY`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('\n📊 Summary:');
const matches = testJobs.filter(j => getJobLocationChannel(j) !== null).length;
console.log(`  - ${matches}/${testJobs.length} jobs matched location channels`);
console.log(`  - ${testJobs.length - matches}/${testJobs.length} jobs would be industry-only\n`);

// Check actual environment variables
console.log('🔧 Environment Variable Check:\n');
console.log('Location secrets that should be set:');
const requiredSecrets = [
  'DISCORD_REMOTE_USA_CHANNEL_ID',
  'DISCORD_NY_CHANNEL_ID',
  'DISCORD_AUSTIN_CHANNEL_ID',
  'DISCORD_CHICAGO_CHANNEL_ID',
  'DISCORD_SEATTLE_CHANNEL_ID',
  'DISCORD_REDMOND_CHANNEL_ID',
  'DISCORD_MV_CHANNEL_ID',
  'DISCORD_SF_CHANNEL_ID',
  'DISCORD_SUNNYVALE_CHANNEL_ID',
  'DISCORD_SAN_BRUNO_CHANNEL_ID'
];

requiredSecrets.forEach(secret => {
  const value = process.env[secret];
  if (value && value.trim() !== '') {
    console.log(`  ✅ ${secret}: Set (${value.substring(0, 4)}...)`);
  } else {
    console.log(`  ❌ ${secret}: NOT SET`);
  }
});

const enabledCount = requiredSecrets.filter(s => process.env[s] && process.env[s].trim() !== '').length;
console.log(`\n  Location Mode: ${enabledCount > 0 ? '✅ ENABLED' : '❌ DISABLED'} (${enabledCount}/10 secrets set)\n`);
