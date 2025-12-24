#!/bin/bash
# Script to watch backend logs in real-time
# Usage: ./watch-logs.sh

echo "🔍 Watching backend logs..."
echo "Press Ctrl+C to stop"
echo ""

# Try to find the backend process and its output
# In CodeSpace, logs are usually in the terminal where the server was started
# This script will help you find recent log entries

# Check if we can find any log files
if [ -f "logs/app.log" ]; then
  echo "📄 Found log file: logs/app.log"
  tail -f logs/app.log
elif [ -f ".nest/*.log" ]; then
  echo "📄 Found NestJS log files"
  tail -f .nest/*.log
else
  echo "⚠️  No log files found. Logs are likely in the terminal where you started the server."
  echo ""
  echo "To view logs:"
  echo "1. Find the terminal tab where you ran 'npm run start:dev' or 'npm run dev'"
  echo "2. Look for lines starting with '🔥' for diagnostic logs"
  echo "3. Or run this command to see recent process output:"
  echo "   ps aux | grep 'nest start'"
  echo ""
  echo "To restart the server and see logs:"
  echo "   cd crm-backend && npm run start:dev"
fi


