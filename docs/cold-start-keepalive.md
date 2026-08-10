# Keep-alive for the Render free tier (cold starts)

The backend runs on Render's free tier, which spins the service down after ~15 minutes of
inactivity. A sleeping instance takes 30-50+ seconds to boot on its next request — and the user's
first API call of the day is usually her 4:15 am check-in, when the service has been asleep all
night.

Two mitigations are implemented:

1. **Client-side (already shipped in the app):** the Today screen calls `GET /health` on launch and
   on app-foreground with a 60-second timeout, absorbing the cold start before the real data
   requests, and shows a neutral "Waking up the server…" note while a request is slow.
2. **Keep-alive ping (this guide):** an external free cron service hits `GET /health` more often
   than the 15-minute sleep threshold so the instance never idles down in the first place.

## Recommended: cron-job.org

[cron-job.org](https://cron-job.org) (free) lets you schedule an HTTP GET with a fixed interval.

1. Create a free account, then go to **Cronjobs → Create cronjob**.
2. **URL/URL address:** `https://study-streak-api.onrender.com/health`
3. **Execution schedule:** every 9 minutes
   - easiest preset: set **Minutes** and check every 9th minute, or pick "Custom" → `*/9 * * * *`
   - anything at or under 14 minutes keeps the service awake
4. **Save.** The job pings the health endpoint, which returns `{ "status": "ok" }` and costs
   nothing to the single user.

## Alternative: UptimeRobot

[UptimeRobot](https://uptimerobot.com) free plan supports a 5-minute interval monitor:

1. Add a new **HTTP(s)** monitor.
2. URL: `https://study-streak-api.onrender.com/health`
3. Interval: **5 minutes**, keyword: `ok`.
4. This doubles as a downtime alert — you'll get an email the moment the API stops responding.

## Note

The keep-alive only matters while the user is asleep/idle. During active use the service stays warm
on its own. If the paid always-on Render tier is ever chosen instead, this job can simply be
deleted — see `decisions.md` for the chosen approach.
