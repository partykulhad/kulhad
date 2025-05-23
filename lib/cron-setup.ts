// This file is for documentation purposes only - you'll need to set up the cron job on Vercel

/*
To set up a daily cron job at 9 AM IST on Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings > Cron Jobs
3. Click "Add Cron Job"
4. Set up the job with the following details:
   - Name: Daily Machine Requests
   - Schedule: 30 3 * * *  (This is 3:30 AM UTC, which is 9:00 AM IST)
   - HTTP Method: POST
   - URL Path: /api/scheduled-requests
   - Secret Header: 
     - Name: Authorization
     - Value: Bearer YOUR_CRON_SECRET (replace with your actual secret)

5. Add an environment variable in your Vercel project:
   - Name: CRON_SECRET
   - Value: (generate a random string for security)

This will trigger your API endpoint automatically at 9 AM IST every day.
*/
