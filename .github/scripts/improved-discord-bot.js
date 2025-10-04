#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ForumChannel
} = require('discord.js');

// Environment variables
const TOKEN = process.env.DISCORD_TOKEN;

// Channel configuration - can be provided as JSON string or individual IDs
const CHANNEL_CONFIG = process.env.DISCORD_CHANNELS_JSON ?
  JSON.parse(process.env.DISCORD_CHANNELS_JSON) : {
    'tech-jobs': process.env.DISCORD_TECH_CHANNEL_ID,
    'sales-jobs': process.env.DISCORD_SALES_CHANNEL_ID,
    'marketing-jobs': process.env.DISCORD_MARKETING_CHANNEL_ID,
    'finance-jobs': process.env.DISCORD_FINANCE_CHANNEL_ID,
    'healthcare-jobs': process.env.DISCORD_HEALTHCARE_CHANNEL_ID,
    'product-jobs': process.env.DISCORD_PRODUCT_CHANNEL_ID,
    'supply-chain-jobs': process.env.DISCORD_SUPPLY_CHANNEL_ID,
    'project-management-jobs': process.env.DISCORD_PM_CHANNEL_ID,
    'human-resources-jobs': process.env.DISCORD_HR_CHANNEL_ID,
    // Fallback for uncategorized jobs
    'general-jobs': process.env.DISCORD_GENERAL_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID
  };

// Remove undefined channel IDs
Object.keys(CHANNEL_CONFIG).forEach(key => {
  if (!CHANNEL_CONFIG[key]) delete CHANNEL_CONFIG[key];
});

// Data paths
const dataDir = path.join(process.cwd(), '.github', 'data');
const postedJobsPath = path.join(dataDir, 'posted_jobs.json');

// Load company data for tier detection
const companies = JSON.parse(fs.readFileSync('./.github/scripts/job-fetcher/companies.json', 'utf8'));

// Import job ID generation for consistency
const { generateJobId, getJobCategory } = require('./job-fetcher/utils');

// Initialize client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Job role emoji mapping
const JOB_ROLE_EMOJIS = {
  'Software Engineering': '💻',
  'Frontend Development': '🎨',
  'Backend Development': '⚙️',
  'Full Stack Development': '🔄',
  'Mobile Development': '📱',
  'Data Science & Analytics': '📊',
  'Machine Learning & AI': '🤖',
  'DevOps & Infrastructure': '🔧',
  'Security Engineering': '🔐',
  'Product Management': '📦',
  'Design': '🎨',
  'Sales': '💰',
  'Marketing': '📣',
  'Finance': '💸',
  'Healthcare': '🏥',
  'Supply Chain': '🚚',
  'Project Management': '📋',
  'Human Resources': '👥',
  'Default': '💼'
};

// Channel category mapping - maps job categories to Discord channels
const CATEGORY_TO_CHANNEL = {
  // Tech roles
  'Software Engineering': 'tech-jobs',
  'Frontend Development': 'tech-jobs',
  'Backend Development': 'tech-jobs',
  'Full Stack Development': 'tech-jobs',
  'Mobile Development': 'tech-jobs',
  'Data Science & Analytics': 'tech-jobs',
  'Machine Learning & AI': 'tech-jobs',
  'DevOps & Infrastructure': 'tech-jobs',
  'Security Engineering': 'tech-jobs',

  // Business roles
  'Product Management': 'product-jobs',
  'Design': 'tech-jobs', // Often grouped with tech
  'Sales': 'sales-jobs',
  'Marketing': 'marketing-jobs',
  'Finance': 'finance-jobs',
  'Healthcare': 'healthcare-jobs',
  'Supply Chain': 'supply-chain-jobs',
  'Project Management': 'project-management-jobs',
  'Human Resources': 'human-resources-jobs'
};

// Enhanced job categorization based on title and description
function categorizeJob(job) {
  const title = (job.job_title || '').toLowerCase();
  const description = (job.job_description || '').toLowerCase();
  const text = `${title} ${description}`;

  // Sales roles
  if (text.match(/\b(sales|account executive|business development|bdr|sdr|account manager|customer success)\b/)) {
    return 'Sales';
  }

  // Marketing roles
  if (text.match(/\b(marketing|growth|seo|sem|content marketing|brand|campaign|digital marketing)\b/)) {
    return 'Marketing';
  }

  // Finance roles
  if (text.match(/\b(finance|accounting|financial analyst|controller|treasury|audit|tax)\b/)) {
    return 'Finance';
  }

  // Healthcare roles
  if (text.match(/\b(healthcare|medical|clinical|health|nurse|doctor|physician|therapist)\b/)) {
    return 'Healthcare';
  }

  // Supply chain roles
  if (text.match(/\b(supply chain|logistics|operations|procurement|inventory|warehouse)\b/)) {
    return 'Supply Chain';
  }

  // Project management roles
  if (text.match(/\b(project manager|program manager|scrum master|agile coach|pmo)\b/)) {
    return 'Project Management';
  }

  // HR roles
  if (text.match(/\b(human resources|hr|recruiter|talent|people operations|compensation|benefits)\b/)) {
    return 'Human Resources';
  }

  // Product roles
  if (text.match(/\b(product manager|product owner|product marketing|pm\s)\b/)) {
    return 'Product Management';
  }

  // Use existing tech categorization from utils
  return getJobCategory(job.job_title, job.job_description);
}

// Get the appropriate Discord channel for a job
function getChannelForJob(job) {
  const category = categorizeJob(job);
  const channelKey = CATEGORY_TO_CHANNEL[category] || 'general-jobs';
  return CHANNEL_CONFIG[channelKey] || CHANNEL_CONFIG['general-jobs'];
}

// Get emoji for job role
function getJobRoleEmoji(job) {
  const category = categorizeJob(job);
  return JOB_ROLE_EMOJIS[category] || JOB_ROLE_EMOJIS['Default'];
}

// Format date safely with fallback
function formatJobDate(dateString) {
  if (!dateString) {
    return 'Recently';
  }

  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Recently';
    }

    // Calculate how long ago
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    } else {
      // Fallback to formatted date for older posts
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Recently';
  }
}

// Clean job description text
function cleanJobDescription(description) {
  if (!description || typeof description !== 'string') {
    return null;
  }

  // Remove common metadata patterns
  let cleaned = description
    // Remove debug metadata like "Category: X, Level: Y"
    .replace(/Category:\s*[\w\s]+\.\s*/gi, '')
    .replace(/Level:\s*[\w_]+\.\s*/gi, '')
    .replace(/Posted:\s*[\w\s]+\.\s*/gi, '')
    .replace(/Full Title:\s*.+?\.\s*/gi, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove markdown artifacts
    .replace(/\*{2,}/g, '')
    .replace(/#{2,}/g, '')
    // Trim
    .trim();

  // Return null if description is too short or seems invalid
  if (cleaned.length < 20) {
    return null;
  }

  // Create a preview (max 300 chars, break at word boundary)
  if (cleaned.length > 300) {
    cleaned = cleaned.substring(0, 300);
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > 250) {
      cleaned = cleaned.substring(0, lastSpace);
    }
    cleaned += '...';
  }

  return cleaned;
}

// Enhanced embed builder with better error handling
function buildJobEmbed(job) {
  // Get company info with fallback
  const company = companies.faang_plus.find(c => c.name === job.employer_name) ||
                  companies.unicorn_startups.find(c => c.name === job.employer_name) ||
                  companies.fintech.find(c => c.name === job.employer_name) ||
                  companies.gaming.find(c => c.name === job.employer_name) ||
                  companies.top_tech.find(c => c.name === job.employer_name) ||
                  companies.enterprise_saas.find(c => c.name === job.employer_name);

  const companyEmoji = company?.emoji || '🏢';
  const jobRoleEmoji = getJobRoleEmoji(job);

  // Build title with both emojis
  const title = `${jobRoleEmoji} ${job.job_title}`;

  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setURL(job.job_apply_link || 'https://example.com')
    .setColor(0x00A8E8);

  // Add fields with safe values
  const fields = [];

  // Company field
  fields.push({
    name: `${companyEmoji} Company`,
    value: job.employer_name || 'Unknown Company',
    inline: true
  });

  // Location field
  const location = formatLocation(job.job_city, job.job_state);
  fields.push({
    name: '📍 Location',
    value: location,
    inline: true
  });

  // Posted date field
  fields.push({
    name: '⏰ Posted',
    value: formatJobDate(job.job_posted_at_datetime_utc),
    inline: true
  });

  embed.addFields(fields);

  // Add clean description if available
  const cleanedDescription = cleanJobDescription(job.job_description);
  if (cleanedDescription) {
    embed.addFields({
      name: '📋 Description',
      value: cleanedDescription,
      inline: false
    });
  }

  // Add category/tags
  const category = categorizeJob(job);
  const tags = generateJobTags(job);
  if (tags.length > 0) {
    embed.addFields({
      name: '🏷️ Category & Tags',
      value: `**${category}** | ${tags.map(tag => `\`${tag}\``).join(' ')}`,
      inline: false
    });
  }

  // Add footer with job ID for debugging
  embed.setFooter({
    text: `Job ID: ${generateJobId(job)}`
  });

  return embed;
}

// Format location with better handling
function formatLocation(city, state) {
  const cleanCity = (city || '').trim();
  const cleanState = (state || '').trim();

  if (!cleanCity && !cleanState) {
    return 'Location not specified';
  }

  if (cleanCity.toLowerCase() === 'remote' || cleanState.toLowerCase() === 'remote') {
    return '🏠 Remote';
  }

  if (!cleanCity) return cleanState;
  if (!cleanState) return cleanCity;

  // Don't duplicate if city and state are the same
  if (cleanCity.toLowerCase() === cleanState.toLowerCase()) {
    return cleanCity;
  }

  return `${cleanCity}, ${cleanState}`;
}

// Generate relevant tags for the job
function generateJobTags(job) {
  const tags = [];
  const title = (job.job_title || '').toLowerCase();
  const description = (job.job_description || '').toLowerCase();
  const text = `${title} ${description}`;

  // Experience level
  if (text.match(/\b(senior|sr\.|lead|principal|staff|architect)\b/)) {
    tags.push('Senior');
  } else if (text.match(/\b(junior|jr\.|entry|new grad|graduate|intern)\b/)) {
    tags.push('Entry-Level');
  } else if (text.match(/\b(mid|intermediate)\b/)) {
    tags.push('Mid-Level');
  }

  // Work arrangement
  if (text.match(/\b(remote|wfh|work from home)\b/)) {
    tags.push('Remote');
  }
  if (text.match(/\b(hybrid)\b/)) {
    tags.push('Hybrid');
  }
  if (text.match(/\b(onsite|on-site|in-office)\b/)) {
    tags.push('Onsite');
  }

  // Contract type
  if (text.match(/\b(contract|contractor|freelance)\b/)) {
    tags.push('Contract');
  }
  if (text.match(/\b(full-time|fulltime|fte)\b/)) {
    tags.push('Full-Time');
  }
  if (text.match(/\b(part-time|parttime)\b/)) {
    tags.push('Part-Time');
  }

  return tags;
}

// Build action row with apply button
function buildActionRow(job) {
  const row = new ActionRowBuilder();

  if (job.job_apply_link) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Apply Now')
        .setStyle(ButtonStyle.Link)
        .setURL(job.job_apply_link)
        .setEmoji('🚀')
    );
  }

  return row;
}

// Posted jobs tracking
class PostedJobsManager {
  constructor() {
    this.postedJobs = this.loadPostedJobs();
  }

  loadPostedJobs() {
    try {
      if (fs.existsSync(postedJobsPath)) {
        const data = JSON.parse(fs.readFileSync(postedJobsPath, 'utf8'));
        return new Set(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading posted jobs:', error);
    }
    return new Set();
  }

  savePostedJobs() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let postedJobsArray = [...this.postedJobs].sort();
      const maxEntries = 5000;

      if (postedJobsArray.length > maxEntries) {
        postedJobsArray = postedJobsArray.slice(-maxEntries);
        this.postedJobs = new Set(postedJobsArray);
      }

      const tempPath = postedJobsPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(postedJobsArray, null, 2));
      fs.renameSync(tempPath, postedJobsPath);

    } catch (error) {
      console.error('Error saving posted jobs:', error);
    }
  }

  hasBeenPosted(jobId) {
    return this.postedJobs.has(jobId);
  }

  markAsPosted(jobId) {
    this.postedJobs.add(jobId);
    this.savePostedJobs();
  }
}

const postedJobsManager = new PostedJobsManager();

// Post job to appropriate forum channel
async function postJobToForum(job, channel) {
  try {
    const embed = buildJobEmbed(job);
    const actionRow = buildActionRow(job);

    // Create forum post title
    const jobRoleEmoji = getJobRoleEmoji(job);
    const threadName = `${jobRoleEmoji} ${job.employer_name} - ${job.job_title}`.substring(0, 100);

    // Build message content
    const messageData = {
      embeds: [embed]
    };

    if (actionRow.components.length > 0) {
      messageData.components = [actionRow];
    }

    // Create forum post
    if (channel.type === ChannelType.GuildForum) {
      // For forum channels, create a new post
      const thread = await channel.threads.create({
        name: threadName,
        message: messageData,
        autoArchiveDuration: 1440 // 24 hours
      });

      console.log(`✅ Created forum post: ${threadName} in #${channel.name}`);
      return thread;
    } else {
      // Fallback for regular text channels
      const message = await channel.send(messageData);
      console.log(`✅ Posted message: ${job.job_title} at ${job.employer_name} in #${channel.name}`);
      return message;
    }
  } catch (error) {
    console.error(`❌ Error posting job ${job.job_title}:`, error);
    throw error;
  }
}

// Main bot logic
client.once('ready', async () => {
  console.log(`✅ Improved Discord bot logged in as ${client.user.tag}`);

  // Load jobs to post
  let jobs = [];
  try {
    const newJobsPath = path.join(dataDir, 'new_jobs.json');
    if (fs.existsSync(newJobsPath)) {
      jobs = JSON.parse(fs.readFileSync(newJobsPath, 'utf8'));
    }
  } catch (error) {
    console.log('ℹ️ No new jobs file found or error reading it');
    client.destroy();
    process.exit(0);
    return;
  }

  if (!jobs.length) {
    console.log('ℹ️ No new jobs to post');
    client.destroy();
    process.exit(0);
    return;
  }

  // Filter out already posted jobs
  const unpostedJobs = jobs.filter(job => {
    const jobId = generateJobId(job);
    const hasBeenPosted = postedJobsManager.hasBeenPosted(jobId);

    if (hasBeenPosted) {
      console.log(`⏭️ Skipping already posted: ${job.job_title} at ${job.employer_name}`);
      return false;
    }
    return true;
  });

  if (!unpostedJobs.length) {
    console.log('ℹ️ No new jobs to post - all jobs have been posted already');
    client.destroy();
    process.exit(0);
    return;
  }

  console.log(`📬 Posting ${unpostedJobs.length} new jobs...`);

  // Group jobs by channel
  const jobsByChannel = {};
  for (const job of unpostedJobs) {
    const channelId = getChannelForJob(job);
    if (!channelId) {
      console.warn(`⚠️ No channel configured for job: ${job.job_title}`);
      continue;
    }

    if (!jobsByChannel[channelId]) {
      jobsByChannel[channelId] = [];
    }
    jobsByChannel[channelId].push(job);
  }

  // Post jobs to their respective channels
  let totalPosted = 0;
  let totalFailed = 0;

  for (const [channelId, channelJobs] of Object.entries(jobsByChannel)) {
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
      console.error(`❌ Channel not found: ${channelId}`);
      totalFailed += channelJobs.length;
      continue;
    }

    console.log(`\n📌 Posting ${channelJobs.length} jobs to #${channel.name}`);

    for (const job of channelJobs) {
      try {
        const jobId = generateJobId(job);

        await postJobToForum(job, channel);

        // Mark as posted after successful post
        postedJobsManager.markAsPosted(jobId);
        totalPosted++;

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (error) {
        console.error(`❌ Failed to post ${job.job_title}: ${error.message}`);
        totalFailed++;
      }
    }
  }

  console.log(`\n🎉 Posting complete! Posted: ${totalPosted}, Failed: ${totalFailed}`);

  // Clean exit
  setTimeout(() => {
    client.destroy();
    process.exit(totalFailed > 0 ? 1 : 0);
  }, 2000);
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
  client.destroy();
  process.exit(1);
});

// Login to Discord
if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is not set');
  process.exit(1);
}

client.login(TOKEN).catch(error => {
  console.error('❌ Failed to login:', error);
  process.exit(1);
});