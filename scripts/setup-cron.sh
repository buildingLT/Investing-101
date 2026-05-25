#!/bin/bash
# Adds a daily 8am cron job to sync Groww emails into the portfolio app.

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
NPM="$(which npm)"
CRON_JOB="0 8 * * * cd \"$PROJECT_DIR\" && $NPM run gmail-sync >> \"$PROJECT_DIR/logs/gmail-sync.log\" 2>&1"

# Check if job already exists
if crontab -l 2>/dev/null | grep -qF "gmail-sync"; then
  echo "Cron job already exists:"
  crontab -l | grep gmail-sync
  exit 0
fi

# Append the new job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Cron job added successfully:"
echo "$CRON_JOB"
echo ""
echo "It will run daily at 8:00 AM and log to: $PROJECT_DIR/logs/gmail-sync.log"
echo "To remove it later: crontab -e  (and delete the gmail-sync line)"
