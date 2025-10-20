const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function test() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner: 'zapplyjobs',
    repo: 'New-Grad-Jobs',
    per_page: 100,
    created: `>=${since}`
  });

  const byWorkflow = {};

  data.workflow_runs.forEach(r => {
    if (!byWorkflow[r.name]) byWorkflow[r.name] = [];
    const dur = (new Date(r.updated_at) - new Date(r.created_at)) / 1000;
    byWorkflow[r.name].push({ dur, url: r.html_url });
  });

  console.log('\n=== Daily GitHub Stats to Discord ===');
  if (byWorkflow['Daily GitHub Stats to Discord']) {
    byWorkflow['Daily GitHub Stats to Discord'].forEach((r, i) => {
      console.log(`  Run ${i+1}: ${Math.round(r.dur)}s - ${r.url}`);
    });
    const avg = byWorkflow['Daily GitHub Stats to Discord'].reduce((a,b)=>a+b.dur,0) / byWorkflow['Daily GitHub Stats to Discord'].length;
    console.log(`  Average: ${Math.round(avg)}s`);
  }

  console.log('\n=== Update Zapply Jobs (first 5) ===');
  if (byWorkflow['Update Zapply Jobs']) {
    byWorkflow['Update Zapply Jobs'].slice(0, 5).forEach((r, i) => {
      console.log(`  Run ${i+1}: ${Math.round(r.dur)}s`);
    });
    const avg = byWorkflow['Update Zapply Jobs'].reduce((a,b)=>a+b.dur,0) / byWorkflow['Update Zapply Jobs'].length;
    console.log(`  Average: ${Math.round(avg)}s`);
  }
}

test();
