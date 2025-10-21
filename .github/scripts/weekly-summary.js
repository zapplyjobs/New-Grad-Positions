const { Octokit } = require('@octokit/rest');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const ORG_NAME = process.env.ORG_NAME || 'zapplyjobs';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const DATA_FILE = path.join(__dirname, '../data/weekly-stats.json');
const MAX_DISCORD_LENGTH = 1900;

async function fetchOrgRepos() {
  const { data } = await octokit.repos.listForOrg({
    org: ORG_NAME,
    type: 'public',
    per_page: 100,
    sort: 'updated'
  });
  return data;
}

async function loadPreviousWeekData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveWeeklyData(data) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

async function fetchWeeklyActivity(repo) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch issues/PRs from last week
    const { data: issues } = await octokit.issues.listForRepo({
      owner: ORG_NAME,
      repo: repo.name,
      since: oneWeekAgo,
      state: 'all',
      per_page: 100
    });

    const newIssues = issues.filter(i => !i.pull_request && new Date(i.created_at) > new Date(oneWeekAgo));
    const closedIssues = issues.filter(i => !i.pull_request && i.state === 'closed' &&
                                       i.closed_at && new Date(i.closed_at) > new Date(oneWeekAgo));

    // FIX: Use pulls.list instead of checking issues for merged_at
    let newPRs = 0;
    let mergedPRs = 0;
    try {
      const { data: pulls } = await octokit.pulls.list({
        owner: ORG_NAME,
        repo: repo.name,
        state: 'all',
        sort: 'updated',
        per_page: 100
      });

      newPRs = pulls.filter(p => new Date(p.created_at) > new Date(oneWeekAgo)).length;
      mergedPRs = pulls.filter(p => p.merged_at &&
                               new Date(p.merged_at) > new Date(oneWeekAgo)).length;
    } catch (error) {
      console.error(`Error fetching PRs for ${repo.name}:`, error.message);
    }

    // Fetch releases
    let newReleases = [];
    try {
      const { data: releases } = await octokit.repos.listReleases({
        owner: ORG_NAME,
        repo: repo.name,
        per_page: 10
      });
      newReleases = releases.filter(r => new Date(r.published_at) > new Date(oneWeekAgo));
    } catch (error) {
      console.log(`No releases for ${repo.name}`);
    }

    // Fetch commit activity
    let commits = 0;
    try {
      const { data: commitList } = await octokit.repos.listCommits({
        owner: ORG_NAME,
        repo: repo.name,
        since: oneWeekAgo,
        per_page: 100
      });
      commits = commitList.length;
    } catch (error) {
      console.error(`Error fetching commits for ${repo.name}:`, error.message);
    }

    return {
      newIssues: newIssues.length,
      closedIssues: closedIssues.length,
      newPRs,
      mergedPRs,
      releases: newReleases,
      commits
    };
  } catch (error) {
    console.error(`Error fetching activity for ${repo.name}:`, error.message);
    return {
      newIssues: 0,
      closedIssues: 0,
      newPRs: 0,
      mergedPRs: 0,
      releases: [],
      commits: 0
    };
  }
}

async function generateWeeklySummary(repos, previousData) {
  const today = new Date();
  const weekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
  const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const isFirstRun = Object.keys(previousData).length === 0;

  let message = isFirstRun
    ? `📊 **Zapply Org - Weekly Baseline**\n`
    : `📊 **Zapply Org - Weekly Summary**\n`;

  message += `Week of ${dateRange}\n\n`;

  if (isFirstRun) {
    message += `*Setting baseline for future weekly comparisons*\n\n`;
  }

  // Repository stats table
  message += `**━━━ REPOSITORY STATS ━━━**\n`;
  message += '```\n';
  message += 'Repo                                     ⭐Stars    🔀Forks    🐛Issues\n';
  message += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  let totalStars = 0, totalStarChange = 0;
  let totalForks = 0, totalForkChange = 0;
  let totalIssues = 0;

  const topGainers = [];
  const activityData = {};

  // Sort by stars
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);

  for (const repo of repos) {
    try {
      const repoKey = repo.full_name;
      const prevData = previousData[repoKey] || {};
      const prevStars = prevData.stars;
      const prevForks = prevData.forks;

      const starChange = prevStars ? (repo.stargazers_count - prevStars) : 0;
      const forkChange = prevForks ? (repo.forks_count - prevForks) : 0;

      totalStars += repo.stargazers_count;
      totalStarChange += starChange;
      totalForks += repo.forks_count;
      totalForkChange += forkChange;
      totalIssues += repo.open_issues_count;

      if (starChange > 0) {
        topGainers.push({ name: repo.name, change: starChange });
      }

      // Ensure proper spacing
      const name = repo.name.padEnd(41);
      const stars = formatChange(repo.stargazers_count, starChange, isFirstRun).padEnd(10);
      const forks = formatChange(repo.forks_count, forkChange, isFirstRun).padEnd(10);
      const issues = `${repo.open_issues_count}`;

      message += `${name}${stars}${forks}${issues}\n`;

      // Fetch weekly activity for this repo (skip on first run)
      if (!isFirstRun) {
        activityData[repo.name] = await fetchWeeklyActivity(repo);
      }
    } catch (error) {
      console.error(`Failed to process ${repo.name}:`, error.message);
      continue; // Skip failed repo
    }
  }

  message += `\n📊 Org Totals: ${totalStars.toLocaleString()} stars`;
  if (!isFirstRun) {
    if (totalStarChange > 0) {
      message += ` (+${totalStarChange})`;
    } else if (totalStarChange < 0) {
      message += ` (${totalStarChange})`;
    } else {
      message += ` (no change)`;
    }
  }
  message += ` | ${totalForks.toLocaleString()} forks`;
  if (!isFirstRun) {
    if (totalForkChange > 0) {
      message += ` (+${totalForkChange})`;
    } else if (totalForkChange < 0) {
      message += ` (${totalForkChange})`;
    } else {
      message += ` (=)`;
    }
  }
  message += ` | ${totalIssues} issues\n`;
  message += '```\n';

  // Add workflow health section (skip on first run)
  if (!isFirstRun) {
    const { byWorkflow: workflows, failedRuns, slowRuns } = await fetchWorkflowStats(ORG_NAME, 'New-Grad-Jobs', 168);
    if (Object.keys(workflows).length > 0) {
      message += `\n**━━━ WORKFLOW HEALTH (Last 7 Days) ━━━**\n\`\`\`\n`;

      for (const [name, stats] of Object.entries(workflows)) {
        const failRate = ((stats.failures / stats.runs) * 100).toFixed(1);
        const warn = parseFloat(failRate) > 25 ? ' ⚠️' : '';

        const nameCol = name.padEnd(35);
        const runsCol = `${stats.runs} runs`.padEnd(8);
        const successCol = `${stats.successes}✅`.padEnd(5);
        const failCol = `${stats.failures}❌`.padEnd(5);
        const cancelCol = stats.cancelled > 0 ? `${stats.cancelled}🛑`.padEnd(4) : '';
        const durCol = formatDuration(stats.medianDuration).padEnd(6);
        const failRateCol = `${failRate}% fail${warn}`;

        message += `${nameCol}| ${runsCol}| ${successCol}${failCol}${cancelCol}| ${durCol}| ${failRateCol}\n`;
      }

      message += '```\n';

      // Add slow run alerts (>1 hour)
      if (slowRuns.length > 0) {
        message += `\n🐢 **Slow Runs Alert** (>1 hour, last 5):\n\`\`\`\n`;
        slowRuns.slice(0, 5).forEach(run => {
          const date = new Date(run.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const durStr = formatDuration(run.duration);
          message += `${run.name} took ${durStr} (${date})\n<${run.url}>\n\n`;
        });
        message += '```\n';
      }

      // Add failed run links if any failures
      if (failedRuns.length > 0) {
        message += `\n⚠️ **Recent Failures** (last 5):\n\`\`\`\n`;
        failedRuns.slice(0, 5).forEach(run => {
          const date = new Date(run.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          message += `${run.name} (${date})\n<${run.url}>\n\n`;
        });
        message += '```\n';
      }
    }
  }

  // Highlights section (skip on first run)
  if (!isFirstRun && Object.keys(activityData).length > 0) {
    const totalNewIssues = Object.values(activityData).reduce((sum, a) => sum + a.newIssues, 0);
    const totalClosedIssues = Object.values(activityData).reduce((sum, a) => sum + a.closedIssues, 0);
    const totalNewPRs = Object.values(activityData).reduce((sum, a) => sum + a.newPRs, 0);
    const totalMergedPRs = Object.values(activityData).reduce((sum, a) => sum + a.mergedPRs, 0);
    const totalCommits = Object.values(activityData).reduce((sum, a) => sum + a.commits, 0);
    const allReleases = Object.values(activityData).flatMap(a => a.releases);

    message += `\n**━━━ HIGHLIGHTS ━━━**\n\`\`\`\n`;
    message += `🆕 ${totalNewIssues} New Issues | 🎯 ${totalNewPRs} New PRs | 🎉 ${totalMergedPRs} Merged PRs | ✅ ${totalClosedIssues} Closed Issues\n`;

    if (allReleases.length > 0) {
      message += `🏷️ ${allReleases.length} Release${allReleases.length > 1 ? 's' : ''}`;
      allReleases.slice(0, 3).forEach(r => {
        const repoName = Object.keys(activityData).find(name =>
          activityData[name].releases.includes(r)
        );
        message += `\n   ${repoName}: ${r.tag_name}`;
      });
      message += '\n';
    }

    if (totalCommits > 0) {
      message += `📝 ${totalCommits} commits this week\n`;
    }

    // Top gainers
    if (topGainers.length > 0) {
      message += `\n🏆 Top Star Gainers\n`;
      topGainers.sort((a, b) => b.change - a.change)
        .slice(0, 3)
        .forEach((repo, idx) => {
          const medal = ['🥇', '🥈', '🥉'][idx];
          message += `${medal} ${repo.name}: +${repo.change}⭐\n`;
        });
    }
    message += '```\n';
  }

  // Add security alerts section (skip on first run)
  if (!isFirstRun) {
    const securityAlerts = await fetchSecurityAlerts(ORG_NAME, 'New-Grad-Jobs');
    if (securityAlerts && securityAlerts.total > 0) {
      message += `\n**━━━ SECURITY ALERTS ━━━**\n\`\`\`\n`;
      const { critical, high, medium, low } = securityAlerts.bySeverity;

      const parts = [];
      if (critical > 0) parts.push(`${critical} Critical`);
      if (high > 0) parts.push(`${high} High`);
      if (medium > 0) parts.push(`${medium} Medium`);
      if (low > 0) parts.push(`${low} Low`);

      message += `🔐 ${parts.join(' | ')}\n`;
      message += `View all: <https://github.com/${ORG_NAME}/New-Grad-Jobs/security/dependabot>\n`;
      message += '```\n';
    }
  }

  // Check message length
  if (message.length > MAX_DISCORD_LENGTH) {
    console.warn(`Message too long (${message.length} chars), truncating...`);
    message = message.substring(0, MAX_DISCORD_LENGTH - 50) + '\n...\n*(Message truncated)*';
  }

  return message;
}

function formatChange(current, change, isFirstRun) {
  if (isFirstRun) {
    return `${current.toLocaleString()}`;
  }
  if (change === 0) return `${current.toLocaleString()} (=)`;
  if (change > 0) return `${current.toLocaleString()} (+${change})`;
  return `${current.toLocaleString()} (${change})`;
}

function formatDuration(seconds) {
  if (seconds < 0) return 'N/A';
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)}m`;
  return `~${Math.round(seconds / 3600)}h`;
}

async function fetchWorkflowStats(owner, repo, hoursAgo = 168) {
  const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  try {
    const { data: runs } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 100,
      created: `>=${since}`
    });

    const byWorkflow = {};
    const failedRuns = [];
    const slowRuns = []; // Track runs >1 hour

    for (const run of runs.workflow_runs) {
      const name = run.name;
      if (!byWorkflow[name]) {
        byWorkflow[name] = { runs: 0, failures: 0, successes: 0, cancelled: 0, durations: [] };
      }

      byWorkflow[name].runs++;
      if (run.conclusion === 'success') byWorkflow[name].successes++;
      if (run.conclusion === 'failure') {
        byWorkflow[name].failures++;
        failedRuns.push({ name: run.name, url: run.html_url, created: run.created_at });
      }
      if (run.conclusion === 'cancelled') byWorkflow[name].cancelled++;

      const duration = (new Date(run.updated_at) - new Date(run.created_at)) / 1000;

      // Track slow runs (>1 hour)
      if (duration > 3600) {
        slowRuns.push({
          name: run.name,
          duration,
          url: run.html_url,
          created: run.created_at,
          repo
        });
      }

      // Exclude extreme outliers (>2 hours) from median calculation
      if (duration < 7200) {
        byWorkflow[name].durations.push(duration);
      }
    }

    // Calculate median duration for each workflow
    for (const workflow of Object.values(byWorkflow)) {
      if (workflow.durations.length > 0) {
        workflow.durations.sort((a, b) => a - b);
        const mid = Math.floor(workflow.durations.length / 2);
        workflow.medianDuration = workflow.durations.length % 2 === 0
          ? (workflow.durations[mid - 1] + workflow.durations[mid]) / 2
          : workflow.durations[mid];
      } else {
        // Safety: if all runs excluded, use a placeholder
        workflow.medianDuration = -1; // Will display as "N/A"
      }
    }

    return { byWorkflow, failedRuns, slowRuns };
  } catch (error) {
    console.error(`Error fetching workflow stats for ${repo}:`, error.message);
    return { byWorkflow: {}, failedRuns: [], slowRuns: [] };
  }
}

async function fetchSecurityAlerts(owner, repo) {
  try {
    const { data: alerts } = await octokit.dependabot.listAlertsForRepo({
      owner,
      repo,
      state: 'open',
      per_page: 100
    });

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach(alert => {
      const severity = alert.security_advisory.severity;
      if (bySeverity[severity] !== undefined) {
        bySeverity[severity]++;
      }
    });

    return { total: alerts.length, bySeverity };
  } catch (error) {
    console.error('Error fetching security alerts:', error.message);
    return null; // Return null if API fails (might be permissions issue)
  }
}

async function postToDiscord(message) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'GitHub Stats Bot'
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to post to Discord:', error.message);
    throw error;
  }
}

async function main() {
  console.log('Fetching org repos...');
  const repos = await fetchOrgRepos();

  console.log('Loading previous week data...');
  const previousData = await loadPreviousWeekData();

  console.log('Generating weekly summary...');
  const message = await generateWeeklySummary(repos, previousData);

  console.log('Posting to Discord...');
  await postToDiscord(message);

  // Save current data for next week's comparison
  const currentData = {};
  for (const repo of repos) {
    currentData[repo.full_name] = {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      issues: repo.open_issues_count,
      updated: new Date().toISOString()
    };
  }

  console.log('Saving current week data...');
  await saveWeeklyData(currentData);

  console.log('✅ Weekly summary posted successfully!');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
