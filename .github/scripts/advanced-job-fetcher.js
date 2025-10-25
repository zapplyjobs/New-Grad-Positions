const fs = require("fs");
const { fetchAllRealJobs } = require("./real-career-scraper");
const path = require("path");
const companyPath = path.join(__dirname, "job-fetcher/companies.json");

// Load comprehensive company database
const companies = JSON.parse(fs.readFileSync(companyPath, "utf8"));

// Configuration
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com/search";

// Flatten all companies for easy access
const ALL_COMPANIES = Object.values(companies).flat();
const COMPANY_BY_NAME = {};
ALL_COMPANIES.forEach((company) => {
  COMPANY_BY_NAME[company.name.toLowerCase()] = company;
  company.api_names.forEach((name) => {
    COMPANY_BY_NAME[name.toLowerCase()] = company;
  });
});

// Job search queries - much more comprehensive
const SEARCH_QUERIES = [
  // Core engineering roles
  "software engineer",
  "software developer",
  "full stack developer",
  "frontend developer",
  "backend developer",
  "mobile developer",
  "ios developer",
  "android developer",

  // Specialized tech roles
  "machine learning engineer",
  "data scientist",
  "data engineer",
  "devops engineer",
  "cloud engineer",
  "security engineer",
  "site reliability engineer",
  "platform engineer",

  // Product & Design
  "product manager",
  "product designer",
  "ux designer",
  "ui designer",

  // New grad specific
  "new grad software engineer",
  "entry level developer",
  "junior developer",
  "graduate software engineer",

  // High-value roles
  "staff engineer",
  "senior software engineer",
  "principal engineer",
  "engineering manager",
];

// Utility functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fetch internship data from popular sources
async function fetchInternshipData() {
  console.log("🎓 Fetching 2025/2026 internship opportunities...");

  const internships = [];

  // Popular internship tracking repositories and sources
  const internshipSources = [
    {
      name: "AngelList Internships",
      url: "https://angel.co/jobs#internships",
      type: "Job Board",
      description: "Startup internships and entry-level positions",
    },
    {
      name: "LinkedIn Student Jobs",
      url: "https://linkedin.com/jobs/student-jobs",
      type: "Platform",
      description: "Professional network for student opportunities",
    },
    {
      name: "Indeed Internships",
      url: "https://indeed.com/q-software-engineering-intern-jobs.html",
      type: "Job Board",
      description: "Comprehensive internship search engine",
    },
    {
      name: "Glassdoor Internships",
      url: "https://glassdoor.com/Job/software-engineer-intern-jobs-SRCH_KO0,23.htm",
      type: "Job Board",
      description: "Internships with company reviews and salary data",
    },
    {
      name: "University Career Centers",
      url: "https://nace.org",
      type: "Resource",
      description: "National Association of Colleges and Employers",
    },
  ];

  // Add company-specific internship programs
  const companyInternshipPrograms = [
    {
      company: "Google",
      program: "STEP Internship",
      url: "https://careers.google.com/students/",
      deadline: "Various",
    },
    {
      company: "Microsoft",
      program: "Software Engineering Internship",
      url: "https://careers.microsoft.com/students",
      deadline: "Various",
    },
    {
      company: "Meta",
      program: "Software Engineer Internship",
      url: "https://careers.meta.com/students",
      deadline: "Various",
    },
    {
      company: "Amazon",
      program: "SDE Internship",
      url: "https://amazon.jobs/internships",
      deadline: "Various",
    },
    {
      company: "Apple",
      program: "Software Engineering Internship",
      url: "https://jobs.apple.com/students",
      deadline: "Various",
    },
    {
      company: "Netflix",
      program: "Software Engineering Internship",
      url: "https://jobs.netflix.com/students",
      deadline: "Various",
    },
    {
      company: "Tesla",
      program: "Software Engineering Internship",
      url: "https://careers.tesla.com/internships",
      deadline: "Various",
    },
    {
      company: "Nvidia",
      program: "Software Engineering Internship",
      url: "https://careers.nvidia.com/internships",
      deadline: "Various",
    },
    {
      company: "Stripe",
      program: "Software Engineering Internship",
      url: "https://stripe.com/jobs/internships",
      deadline: "Various",
    },
    {
      company: "Coinbase",
      program: "Software Engineering Internship",
      url: "https://coinbase.com/careers/students",
      deadline: "Various",
    },
  ];

  return {
    sources: internshipSources,
    companyPrograms: companyInternshipPrograms,
    lastUpdated: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

function normalizeCompanyName(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.name : companyName;
}

function getCompanyEmoji(companyName) {
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.emoji : "🏢";
}

function getCompanyCareerUrl(companyName) {
  if (!companyName) return "#";
  const company = COMPANY_BY_NAME[companyName.toLowerCase()];
  return company ? company.career_url : "#";
}

function formatTimeAgo(dateString) {
  if (!dateString) return "Recently";

  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1d ago";
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    return `${Math.floor(diffInDays / 30)}mo ago`;
  }
}

function isJobOlderThanWeek(dateString) {
  if (!dateString) return false;

  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  return diffInDays >= 7;
}

function isUSOnlyJob(job) {
  const country = (job.job_country || "").toLowerCase().trim();
  const state = (job.job_state || "").toLowerCase().trim();
  const city = (job.job_city || "").toLowerCase().trim();

  // Exclude jobs explicitly in non-US countries
  const nonUSCountries = [
    "estonia",
    "canada",
    "uk",
    "united kingdom",
    "germany",
    "france",
    "netherlands",
    "sweden",
    "norway",
    "denmark",
    "finland",
    "australia",
    "india",
    "singapore",
    "japan",
    "south korea",
    "brazil",
    "mexico",
    "spain",
    "italy",
    "poland",
    "ireland",
    "israel",
    "switzerland",
    "austria",
    "belgium",
    "czech republic",
  ];

  // If country is explicitly non-US, exclude
  if (nonUSCountries.includes(country)) {
    return false;
  }

  // Exclude jobs with non-US cities/locations
  const nonUSCities = [
    "toronto",
    "vancouver",
    "montreal",
    "london",
    "berlin",
    "amsterdam",
    "stockholm",
    "copenhagen",
    "helsinki",
    "oslo",
    "sydney",
    "melbourne",
    "bangalore",
    "mumbai",
    "delhi",
    "hyderabad",
    "pune",
    "singapore",
    "tokyo",
    "seoul",
    "tel aviv",
    "zurich",
    "geneva",
    "dublin",
    "tallinn",
    "riga",
    "vilnius",
    "prague",
    "budapest",
  ];

  if (nonUSCities.includes(city)) {
    return false;
  }

  // Include if country is US/USA/United States or empty (assume US)
  if (
    country === "us" ||
    country === "usa" ||
    country === "united states" ||
    country === ""
  ) {
    return true;
  }

  // Include if it has US state codes
  const usStates = [
    "al",
    "ak",
    "az",
    "ar",
    "ca",
    "co",
    "ct",
    "de",
    "fl",
    "ga",
    "hi",
    "id",
    "il",
    "in",
    "ia",
    "ks",
    "ky",
    "la",
    "me",
    "md",
    "ma",
    "mi",
    "mn",
    "ms",
    "mo",
    "mt",
    "ne",
    "nv",
    "nh",
    "nj",
    "nm",
    "ny",
    "nc",
    "nd",
    "oh",
    "ok",
    "or",
    "pa",
    "ri",
    "sc",
    "sd",
    "tn",
    "tx",
    "ut",
    "vt",
    "va",
    "wa",
    "wv",
    "wi",
    "wy",
    "dc",
  ];

  if (usStates.includes(state)) {
    return true;
  }

  // Include remote jobs (assume US remote unless stated otherwise)
  if (city.includes("remote") || state.includes("remote")) {
    return true;
  }

  // Default to include (better to include than exclude)
  return true;
}

function getExperienceLevel(title, description = "") {
  const text = `${title} ${description}`.toLowerCase();

  // Senior level indicators
  if (
    text.includes("senior") ||
    text.includes("sr.") ||
    text.includes("lead") ||
    text.includes("principal") ||
    text.includes("staff") ||
    text.includes("architect")
  ) {
    return "Senior";
  }

  // Entry level indicators
  if (
    text.includes("entry") ||
    text.includes("junior") ||
    text.includes("jr.") ||
    text.includes("new grad") ||
    text.includes("graduate") ||
    text.includes("university grad") ||
    text.includes("college grad") ||
    text.includes(" grad ") ||
    text.includes("recent grad") ||
    text.includes("intern") ||
    text.includes("associate") ||
    text.includes("level 1") ||
    text.includes("l1") ||
    text.includes("campus") ||
    text.includes("student") ||
    text.includes("early career") ||
    text.includes("0-2 years")
  ) {
    return "Entry-Level";
  }

  return "Mid-Level";
}

function getJobCategory(title, description = "") {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes("ios") ||
    text.includes("android") ||
    text.includes("mobile") ||
    text.includes("react native")
  ) {
    return "Mobile Development";
  }
  if (
    text.includes("frontend") ||
    text.includes("front-end") ||
    text.includes("react") ||
    text.includes("vue") ||
    text.includes("ui")
  ) {
    return "Frontend Development";
  }
  if (
    text.includes("backend") ||
    text.includes("back-end") ||
    text.includes("api") ||
    text.includes("server")
  ) {
    return "Backend Development";
  }
  if (
    text.includes("machine learning") ||
    text.includes("ml ") ||
    text.includes("ai ") ||
    text.includes("artificial intelligence") ||
    text.includes("deep learning")
  ) {
    return "Machine Learning & AI";
  }
  if (
    text.includes("data scientist") ||
    text.includes("data analyst") ||
    text.includes("analytics") ||
    text.includes("data engineer")
  ) {
    return "Data Science & Analytics";
  }
  if (
    text.includes("devops") ||
    text.includes("infrastructure") ||
    text.includes("cloud") ||
    text.includes("platform")
  ) {
    return "DevOps & Infrastructure";
  }
  if (
    text.includes("security") ||
    text.includes("cybersecurity") ||
    text.includes("infosec")
  ) {
    return "Security Engineering";
  }
  if (
    text.includes("product manager") ||
    text.includes("product owner") ||
    text.includes("pm ")
  ) {
    return "Product Management";
  }
  if (text.includes("design") || text.includes("ux") || text.includes("ui")) {
    return "Design";
  }
  if (text.includes("full stack") || text.includes("fullstack")) {
    return "Full Stack Development";
  }
  if (
    text.includes("hardware") ||text.includes("embedded") ||
    text.includes("Technical") ||
    text.includes("silicon") ||
    text.includes("asic") ||
    text.includes("Architecture") ||
    text.includes("circuit") ||
    text.includes("pcb") ||
    text.includes("electrical engineer") ||
    text.includes("mechanical engineer") ||
    text.includes("thermal engineer") ||
    text.includes("vlsi")
  ) {
    return "Hardware Engineering";
  }

  return "Software Engineering";
}

// Enhanced API search with better error handling
async function searchJobs(query, location = "") {
  try {
    const url = new URL(JSEARCH_BASE_URL);
    url.searchParams.append("query", query);
    if (location) url.searchParams.append("location", location);
    url.searchParams.append("page", "1");
    url.searchParams.append("num_pages", "1");
    url.searchParams.append("date_posted", "month");
    url.searchParams.append("employment_types", "FULLTIME");
    url.searchParams.append(
      "job_requirements",
      "under_3_years_experience,more_than_3_years_experience,no_experience"
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": JSEARCH_API_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      console.error(`API request failed for "${query}": ${response.status}`);
      return [];
    }

    const data = await response.json();
    const jobs = data.data || [];
    console.log(`Query "${query}" returned ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }
}

// Advanced job fetching with location targeting
async function fetchAllJobs() {
  console.log("🔍 Starting comprehensive job search...");

  const allJobs = [];
  const locations = [
    "San Francisco",
    "New York",
    "Seattle",
    "Austin",
    "Remote",
  ];

  // Search core queries across multiple locations
  const coreQueries = [
    "software engineer",
    "frontend developer",
    "backend developer",
    "data scientist",
    "machine learning engineer",
  ];

  for (const query of coreQueries) {
    // Search without location first
    const jobs = await searchJobs(query);
    allJobs.push(...jobs);
    await delay(1200); // Respect rate limits

    // Then search specific locations for higher-quality results
    for (const location of locations.slice(0, 2)) {
      // Limit to 2 locations to conserve API calls
      const locationJobs = await searchJobs(query, location);
      allJobs.push(...locationJobs);
      await delay(1200);
    }
  }

  // Search new grad specific terms
  const newGradQueries = [
    "new grad software engineer",
    "entry level developer",
    "graduate engineer",
  ];
  for (const query of newGradQueries) {
    const jobs = await searchJobs(query);
    allJobs.push(...jobs);
    await delay(1200);
  }

  console.log(`📊 Total jobs fetched: ${allJobs.length}`);
  return allJobs;
}

// Enhanced filtering with better company matching
function filterTargetCompanyJobs(jobs) {
  console.log("🎯 Filtering for target companies...");

  const targetJobs = jobs.filter((job) => {
    const companyName = (job.employer_name || "").toLowerCase();

    // Check against our comprehensive company list
    const isTargetCompany = COMPANY_BY_NAME[companyName] !== undefined;

    if (isTargetCompany) {
      // Normalize company name for consistency
      job.employer_name = normalizeCompanyName(job.employer_name);
      return true;
    }

    // Additional fuzzy matching for variations
    for (const company of ALL_COMPANIES) {
      for (const apiName of company.api_names) {
        if (companyName.includes(apiName.toLowerCase()) && apiName.length > 3) {
          job.employer_name = company.name;
          return true;
        }
      }
    }

    return false;
  });

  console.log(`✨ Filtered to ${targetJobs.length} target company jobs`);
  console.log("🏢 Companies found:", [
    ...new Set(targetJobs.map((j) => j.employer_name)),
  ]);

  // Remove duplicates more intelligently
  const uniqueJobs = targetJobs.filter((job, index, self) => {
    return (
      index ===
      self.findIndex(
        (j) =>
          j.job_title === job.job_title &&
          j.employer_name === job.employer_name &&
          j.job_city === job.job_city
      )
    );
  });

  console.log(`🧹 After deduplication: ${uniqueJobs.length} unique jobs`);

  // Sort by company tier and recency
  uniqueJobs.sort((a, b) => {
    // Prioritize FAANG+ companies
    const aIsFAANG = companies.faang_plus.some(
      (c) => c.name === a.employer_name
    );
    const bIsFAANG = companies.faang_plus.some(
      (c) => c.name === b.employer_name
    );

    if (aIsFAANG && !bIsFAANG) return -1;
    if (!aIsFAANG && bIsFAANG) return 1;

    // Then by recency
    const aDate = new Date(a.job_posted_at_datetime_utc || 0);
    const bDate = new Date(b.job_posted_at_datetime_utc || 0);
    return bDate - aDate;
  });

  return uniqueJobs.slice(0, 50); // Top 50 jobs
}

// Generate enhanced job table with better formatting
function generateJobTable(jobs) {
  if (jobs.length === 0) {
    return `| Company | Role | Location | Posted | Level | Category | Apply |
|---------|------|----------|--------|-------|----------|-------|
| *No current openings* | *Check back tomorrow* | *-* | *-* | *-* | *-* | *-* |`;
  }

  // Group jobs by company
  const jobsByCompany = {};
  jobs.forEach((job) => {
    if (!jobsByCompany[job.employer_name]) {
      jobsByCompany[job.employer_name] = [];
    }
    jobsByCompany[job.employer_name].push(job);
  });

  // Sort companies: FAANG+ first, then by job count
  const faangCompanies = companies.faang_plus.map((c) => c.name);
  const sortedCompanies = Object.keys(jobsByCompany).sort((a, b) => {
    const aIsFaang = faangCompanies.includes(a);
    const bIsFaang = faangCompanies.includes(b);

    if (aIsFaang && !bIsFaang) return -1;
    if (!aIsFaang && bIsFaang) return 1;

    return jobsByCompany[b].length - jobsByCompany[a].length;
  });

  let output = "";

  // Show top 5 companies expanded, rest in collapsible sections
  const topCompanies = sortedCompanies.slice(0, 5);
  const remainingCompanies = sortedCompanies.slice(5);

  // Top companies - check if they have more than 50 jobs
  topCompanies.forEach((companyName) => {
    const companyJobs = jobsByCompany[companyName];
    const emoji = getCompanyEmoji(companyName);
    const isFaang = faangCompanies.includes(companyName);
    const tier = isFaang ? "⭐ FAANG+" : "🏢 Top Tech";

    // If company has more than 50 jobs, make it collapsible
    if (companyJobs.length > 50) {
      output += `<details>\n`;
      output += `<summary><h3>${emoji} <strong>${companyName}</strong> (${companyJobs.length} positions) ${tier}</h3></summary>\n\n`;
    } else {
      output += `### ${emoji} **${companyName}** (${companyJobs.length} positions) ${tier}\n\n`;
    }

    output += `| Role | Location | Posted | Level | Category | Apply |\n`;
    output += `|------|----------|--------|-------|----------|-------|\n`;

    companyJobs.forEach((job) => {
      const role = job.job_title;
      const location = formatLocation(job.job_city, job.job_state);
      const posted = formatTimeAgo(job.job_posted_at_datetime_utc);
      const level = getExperienceLevel(job.job_title, job.job_description);
      const category = getJobCategory(job.job_title, job.job_description);
      const applyLink =
        job.job_apply_link || getCompanyCareerUrl(job.employer_name);

      // Add status indicators
      let statusIndicator = "";
      const description = (job.job_description || "").toLowerCase();
      if (
        description.includes("no sponsorship") ||
        description.includes("us citizen")
      ) {
        statusIndicator = " 🇺🇸";
      }
      if (description.includes("remote")) {
        statusIndicator += " 🏠";
      }

      output += `| ${role}${statusIndicator} | ${location} | ${posted} | ${level} | ${category} | [Apply](${applyLink}) |\n`;
    });

    if (companyJobs.length > 50) {
      output += `\n</details>\n\n`;
    } else {
      output += "\n";
    }
  });

  // Remaining companies - collapsible sections
  if (remainingCompanies.length > 0) {
    output += `---\n\n### 📁 **More Companies** (${
      remainingCompanies.length
    } companies, ${remainingCompanies.reduce(
      (sum, c) => sum + jobsByCompany[c].length,
      0
    )} positions)\n\n`;

    remainingCompanies.forEach((companyName) => {
      const companyJobs = jobsByCompany[companyName];
      const emoji = getCompanyEmoji(companyName);
      const isFaang = faangCompanies.includes(companyName);
      const tier = isFaang ? "⭐ FAANG+" : "";

      output += `<details>\n`;
      output += `<summary><strong>${emoji} ${companyName}</strong> (${companyJobs.length} positions) ${tier}</summary>\n\n`;
      output += `| Role | Location | Posted | Level | Category | Apply |\n`;
      output += `|------|----------|--------|-------|----------|-------|\n`;

      companyJobs.forEach((job) => {
        const role = job.job_title;
        const location = formatLocation(job.job_city, job.job_state);
        const posted = formatTimeAgo(job.job_posted_at_datetime_utc);
        const level = getExperienceLevel(job.job_title, job.job_description);
        const category = getJobCategory(job.job_title, job.job_description);
        const applyLink =
          job.job_apply_link || getCompanyCareerUrl(job.employer_name);

        // Add status indicators
        let statusIndicator = "";
        const description = (job.job_description || "").toLowerCase();
        if (
          description.includes("no sponsorship") ||
          description.includes("us citizen")
        ) {
          statusIndicator = " 🇺🇸";
        }
        if (description.includes("remote")) {
          statusIndicator += " 🏠";
        }

        output += `| ${role}${statusIndicator} | ${location} | ${posted} | ${level} | ${category} | [Apply](${applyLink}) |\n`;
      });

      output += `\n</details>\n\n`;
    });
  }

  return output;
}

function generateInternshipSection(internshipData) {
  if (!internshipData) return "";

  return `
---

## 🎓 **2025/2026 Summer Internships** 

> **Fresh internship opportunities for students and upcoming grads**

### 📚 **Top Internship Resources**

| Platform | Type | Description | Link |
|----------|------|-------------|------|
${internshipData.sources
  .map(
    (source) =>
      `| **${source.name}** | ${source.type} | ${source.description} | [Visit](${source.url}) |`
  )
  .join("\n")}

### 🏢 **FAANG+ Internship Programs**

| Company | Program | Application Link | Status |
|---------|---------|------------------|--------|
${internshipData.companyPrograms
  .map((program) => {
    const companyObj = ALL_COMPANIES.find((c) => c.name === program.company);
    const emoji = companyObj ? companyObj.emoji : "🏢";
    return `| ${emoji} **${program.company}** | ${program.program} | [Apply](${program.url}) | ${program.deadline} |`;
  })
  .join("\n")}

`;
}
//de na baad ba micro soft aw google razi

function generateArchivedSection(archivedJobs) {
  if (archivedJobs.length === 0) return "";

  const archivedStats = generateCompanyStats(archivedJobs);
  const archivedFaangJobs = archivedJobs.filter((job) =>
    companies.faang_plus.some((c) => c.name === job.employer_name)
  ).length;

  return `
---

<details>
<summary><h2>🗂️ <strong>ARCHIVED JOBS</strong> - ${
    archivedJobs.length
  } Older Positions (1+ weeks old) - Click to Expand 👆</h2></summary>

### 📊 **Archived Stats**
- **📁 Total Archived**: ${archivedJobs.length} positions
- **🏢 Companies**: ${
    Object.keys(archivedStats.totalByCompany).length
  } companies
- **⭐ FAANG+ Archived**: ${archivedFaangJobs} positions
- **📅 Age**: 1+ weeks old

${generateJobTable(archivedJobs)}

### 🏢 **Archived Companies by Category**

#### 🌟 **FAANG+** (Archived)
${companies.faang_plus
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

#### 🦄 **Unicorn Startups** (Archived)
${companies.unicorn_startups
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

#### 💰 **Fintech Leaders** (Archived)
${companies.fintech
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

#### 🎮 **Gaming & Entertainment** (Archived)
${[...companies.gaming, ...companies.media_entertainment]
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

#### ☁️ **Enterprise & Cloud** (Archived)
${[...companies.top_tech, ...companies.enterprise_saas]
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

### 📈 **Archived Breakdown by Experience Level**

| Level | Count | Percentage | Top Companies |
|-------|-------|------------|---------------|
| 🟢 **Entry-Level** | ${archivedStats.byLevel["Entry-Level"]} | ${Math.round(
    (archivedStats.byLevel["Entry-Level"] / archivedJobs.length) * 100
  )}% | Perfect for new grads |
| 🟡 **Mid-Level** | ${archivedStats.byLevel["Mid-Level"]} | ${Math.round(
    (archivedStats.byLevel["Mid-Level"] / archivedJobs.length) * 100
  )}% | 2-5 years experience |
| 🔴 **Senior** | ${archivedStats.byLevel["Senior"]} | ${Math.round(
    (archivedStats.byLevel["Senior"] / archivedJobs.length) * 100
  )}% | 5+ years experience |

### 🔍 **Archived Filter by Role Category**

${Object.entries(archivedStats.byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([category, count]) => {
    const icon =
      {
        "Mobile Development": "📱",
        "Frontend Development": "🎨",
        "Backend Development": "⚙️",
        "Full Stack Development": "🌐",
        "Machine Learning & AI": "🤖",
        "Data Science & Analytics": "📊",
        "DevOps & Infrastructure": "☁️",
        "Security Engineering": "🛡️",
        "Product Management": "📋",
        Design: "🎨",
        "Software Engineering": "💻",
      }[category] || "💻";

    const categoryJobs = archivedJobs.filter(
      (job) => getJobCategory(job.job_title, job.job_description) === category
    );
    const topCompanies = [
      ...new Set(categoryJobs.slice(0, 3).map((j) => j.employer_name)),
    ];

    return `#### ${icon} **${category}** (${count} archived positions)
${topCompanies
  .map((company) => {
    const companyObj = ALL_COMPANIES.find((c) => c.name === company);
    const emoji = companyObj ? companyObj.emoji : "🏢";
    return `${emoji} ${company}`;
  })
  .join(" • ")}`;
  })
  .join("\n\n")}

### 🌍 **Top Archived Locations**

${Object.entries(archivedStats.byLocation)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([location, count]) => `- **${location}**: ${count} archived positions`)
  .join("\n")}

</details>

`;
}

function formatLocation(city, state) {
  if (!city && !state) return "Remote";
  if (!city) return state;
  if (!state) return city;
  if (city.toLowerCase() === "remote") return "Remote 🏠";
  return `${city}, ${state}`;
}

// Generate company statistics with categories
function generateCompanyStats(jobs) {
  const stats = {
    byCategory: {},
    byLevel: { "Entry-Level": 0, "Mid-Level": 0, Senior: 0 },
    byLocation: {},
    totalByCompany: {},
  };

  jobs.forEach((job) => {
    // Category stats
    const category = getJobCategory(job.job_title, job.job_description);
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

    // Level stats
    const level = getExperienceLevel(job.job_title, job.job_description);
    stats.byLevel[level]++;

    // Location stats
    const location = formatLocation(job.job_city, job.job_state);
    stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;

    // Company stats
    stats.totalByCompany[job.employer_name] =
      (stats.totalByCompany[job.employer_name] || 0) + 1;
  });

  return stats;
}

// Generate comprehensive README
async function generateReadme(
  currentJobs,
  archivedJobs = [],
  internshipData = null
) {
  const stats = generateCompanyStats(currentJobs);
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  console.log("🔄 Generating README with current jobs...");

  const totalCompanies = Object.keys(stats.totalByCompany).length;
  const faangJobs = currentJobs.filter((job) =>
    companies.faang_plus.some((c) => c.name === job.employer_name)
  ).length;

  return `# 💼 2026 New Grad Jobs by Zapply

**🚀 Job opportunities from ${totalCompanies}+ top companies • Updated daily • US Positions**

> Fresh software engineering jobs scraped directly from company career pages. Open positions from FAANG, unicorns, and elite startups, updated every 24 hours. **Filtered for US-based positions.**

## 🌟 **Join Our Community**
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/yKWw28q7Yq)

**💬 [Job Finder & Career Hub by Zapply](https://discord.gg/yKWw28q7Yq)** - Connect with fellow job seekers, get career advice, share experiences, and stay updated on the latest opportunities. Join thousands of developers navigating their career journey together!

${internshipData ? generateInternshipSection(internshipData) : ""}




 
=================================================================================================================================================
## 🎯 **Current Opportunities** (Fresh - Less than 1 week old)

${generateJobTable(currentJobs)}


${archivedJobs.length > 0 ? generateArchivedSection(archivedJobs) : ""}

---

## 📊 **Live Stats**
- **🔥 Active Positions**: ${currentJobs.length} 
- **🏢 Companies**: ${totalCompanies} elite tech companies
- **⭐ FAANG+ Jobs**: ${faangJobs} premium opportunities  
- **📅 Last Updated**: ${currentDate}
- **🤖 Next Update**: Tomorrow at 9 AM UTC
- **📁 Archived Jobs**: ${archivedJobs.length} (older than 1 week)

---

## 🏢 **Companies by Category**

### 🌟 **FAANG+** (${companies.faang_plus.length} companies)
${companies.faang_plus
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

### 🦄 **Unicorn Startups** (${companies.unicorn_startups.length} companies) 
${companies.unicorn_startups
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

### 💰 **Fintech Leaders** (${companies.fintech.length} companies)
${companies.fintech
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

### 🎮 **Gaming & Entertainment** (${
    [...companies.gaming, ...companies.media_entertainment].length
  } companies)
${[...companies.gaming, ...companies.media_entertainment]
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

### ☁️ **Enterprise & Cloud** (${
    [...companies.top_tech, ...companies.enterprise_saas].length
  } companies)
${[...companies.top_tech, ...companies.enterprise_saas]
  .map((c) => `${c.emoji} [${c.name}](${c.career_url})`)
  .join(" • ")}

---

## 📈 **Breakdown by Experience Level**

| Level | Count | Percentage | Top Companies |
|-------|-------|------------|---------------|
| 🟢 **Entry-Level** | ${stats.byLevel["Entry-Level"]} | ${Math.round(
    (stats.byLevel["Entry-Level"] / currentJobs.length) * 100
  )}% | Perfect for new grads |
| 🟡 **Mid-Level** | ${stats.byLevel["Mid-Level"]} | ${Math.round(
    (stats.byLevel["Mid-Level"] / currentJobs.length) * 100
  )}% | 2-5 years experience |
| 🔴 **Senior** | ${stats.byLevel["Senior"]} | ${Math.round(
    (stats.byLevel["Senior"] / currentJobs.length) * 100
  )}% | 5+ years experience |

---

## 🔍 **Filter by Role Category**

${Object.entries(stats.byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([category, count]) => {
    const icon =
      {
        "Mobile Development": "📱",
        "Frontend Development": "🎨",
        "Backend Development": "⚙️",
        "Full Stack Development": "🌐",
        "Machine Learning & AI": "🤖",
        "Data Science & Analytics": "📊",
        "DevOps & Infrastructure": "☁️",
        "Security Engineering": "🛡️",
        "Product Management": "📋",
        Design: "🎨",
        "Software Engineering": "💻",
      }[category] || "💻";

    const categoryJobs = currentJobs.filter(
      (job) => getJobCategory(job.job_title, job.job_description) === category
    );
    const topCompanies = [
      ...new Set(categoryJobs.slice(0, 3).map((j) => j.employer_name)),
    ];

    return `### ${icon} **${category}** (${count} positions)
${topCompanies
  .map((company) => {
    const companyObj = ALL_COMPANIES.find((c) => c.name === company);
    const emoji = companyObj ? companyObj.emoji : "🏢";
    return `${emoji} ${company}`;
  })
  .join(" • ")}`;
  })
  .join("\n\n")}

---

## 🌍 **Top Locations**

${Object.entries(stats.byLocation)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([location, count]) => `- **${location}**: ${count} positions`)
  .join("\n")}

---

## 🚀 **Application Tips**

### 📝 **Before Applying**
- Research the company's recent news and products
- Tailor your resume to the specific role requirements
- Check if you meet the visa/citizenship requirements (🇺🇸 indicator)
- Look up the hiring manager or team on LinkedIn

### 💡 **Stand Out Tips**
- Include relevant projects that match the tech stack
- Show impact with metrics (improved performance by X%, built feature used by Y users)
- Demonstrate knowledge of the company's products/mission
- Prepare for technical interviews with company-specific questions

---

## 📬 **Stay Updated**

- **⭐ Star this repo** to bookmark for daily checking
- **👀 Watch** to get notified of new opportunities
- **🔔 Enable notifications** for instant updates
- **📱 Bookmark on mobile** for quick job hunting

---

## 🤝 **Contributing**

Spotted an issue or want to suggest improvements?
- 🐛 **Report bugs** in the Issues tab
- 💡 **Suggest companies** to add to our tracking list
- 🔗 **Submit corrections** for broken links
- ⭐ **Star the repo** to support the project

---

<div align="center">

**🎯 ${
    currentJobs.length
  } current opportunities from ${totalCompanies} elite companies**

**Found this helpful? Give it a ⭐ to support Zapply!**

*Not affiliated with any companies listed. All applications redirect to official career pages.*

---

**Last Updated**: ${currentDate} • **Next Update**: Daily at 9 AM UTC

</div>`;
}

function writeNewJobsJson(currentJobs) {
  const D = ".github/data";
  if (!fs.existsSync(D)) fs.mkdirSync(D, { recursive: true });

  let prev = [];
  try {
    prev = JSON.parse(fs.readFileSync(`${D}/previous.json`, "utf8"));
  } catch {
    // first run: no previous.json
  }

  const seen = new Set(prev.map((j) => j.job_apply_link));
  const delta = currentJobs.filter((j) => !seen.has(j.job_apply_link));

  fs.writeFileSync(`${D}/new_jobs.json`, JSON.stringify(delta, null, 2));
  fs.writeFileSync(`${D}/previous.json`, JSON.stringify(currentJobs, null, 2));
}

async function updateReadme() {
  try {
    console.log("🚀 Starting Zapply job board update...");
    const allJobs = await fetchAllRealJobs();
    if (allJobs.length === 0) {
      console.log("⚠️ No jobs found, keeping existing README");
      return;
    }

    // Filter US-only jobs
    const usJobs = allJobs.filter((job) => isUSOnlyJob(job));
    // Separate current and archived jobs
    const currentJobs = usJobs.filter(
      (job) => !isJobOlderThanWeek(job.job_posted_at_datetime_utc)
    );
    const archivedJobs = usJobs.filter((job) =>
      isJobOlderThanWeek(job.job_posted_at_datetime_utc)
    );

    // 1️⃣ Dump only the new jobs JSON
    writeNewJobsJson(currentJobs);

    // Fetch internship data and generate README
    const internshipData = await fetchInternshipData();



    
 
    const readmeContent = await generateReadme(
      currentJobs,
      archivedJobs,
      internshipData
    );

    // Write README.md
    fs.writeFileSync("README.md", readmeContent);
    console.log(
      `✅ Zapply job board updated with ${currentJobs.length} current opportunities!`
    );

    // Log summary
    const stats = generateCompanyStats(currentJobs);
    console.log("\n📊 Summary:");
    console.log(`- Total Jobs (All): ${allJobs.length}`);
    console.log(`- US-Only Jobs: ${usJobs.length}`);
    console.log(`- Current Jobs: ${currentJobs.length}`);
    console.log(`- Archived Jobs: ${archivedJobs.length}`);
    console.log(`- Companies: ${Object.keys(stats.totalByCompany).length}`);
    console.log(`- Categories: ${Object.keys(stats.byCategory).length}`);
    console.log(`- Locations: ${Object.keys(stats.byLocation).length}`);
  } catch (err) {
    console.error("❌ Error updating README:", err);
    process.exit(1);
  }
}

// Run the update
updateReadme();
