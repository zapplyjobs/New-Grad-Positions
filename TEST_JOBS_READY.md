# Test Jobs Ready to Post

## 5 Test Jobs Added to `new_jobs.json`

### Jobs That Will Post:
1. **Software Engineer - Backend** @ Meta
   - Category: Tech → #tech-jobs forum
   - Location: San Francisco, CA

2. **Product Manager** @ Google
   - Category: Product → #product-jobs forum
   - Location: Mountain View, CA

3. **Sales Development Representative** @ Salesforce
   - Category: Sales → #sales-jobs forum
   - Location: New York, NY

4. **Data Scientist** @ Microsoft
   - Category: Tech → #tech-jobs forum
   - Location: Seattle, WA

5. **Marketing Manager** @ Adobe
   - Category: Marketing → #marketing-jobs forum
   - Location: San Jose, CA

## Expected Behavior

### If Multi-Channel Mode Active (secrets configured):
- Meta & Microsoft jobs → #tech-jobs
- Google job → #product-jobs
- Salesforce job → #sales-jobs
- Adobe job → #marketing-jobs

### If Single-Channel Mode (no secrets):
- All 5 jobs → #new-jobs text channel

## What to Watch For in Logs:

### Success Indicators:
```
✅ Enhanced Discord bot logged in as BotName#1234
📬 Posting 5 new jobs (0 already posted)...
✅ Posted: Software Engineer - Backend at Meta
✅ Posted: Product Manager at Google
✅ Posted: Sales Development Representative at Salesforce
✅ Posted: Data Scientist at Microsoft
✅ Posted: Marketing Manager at Adobe
✅ All posting operations complete, cleaning up...
```

### Possible Errors:
```
❌ Channel not found or accessible: [channel_id]
❌ Error posting job: [error details]
```

## Ready to Push!

```bash
git add -A
git commit -m "Add 5 test jobs and fix Discord bot with logging"
git push
```

Then after workflow runs:
```bash
git pull
cat .github/logs/latest.log
```

This will test:
1. The 2-second timer fix
2. Channel fetching
3. Multi-channel routing (if configured)
4. The logging system
5. Actual Discord posting!