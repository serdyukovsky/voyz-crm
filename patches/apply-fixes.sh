#!/bin/bash
# Script to apply all integration fixes for Codespaces

set -e

echo "🔧 Applying integration fixes for GitHub Codespaces..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to replace in file
replace_in_file() {
    local file=$1
    local search=$2
    local replace=$3
    
    if [ -f "$file" ]; then
        # Use a temporary file for sed to work on macOS and Linux
        sed -i.bak "s|$search|$replace|g" "$file" && rm -f "$file.bak"
        echo -e "${GREEN}✓${NC} Updated: $file"
    else
        echo -e "${YELLOW}⚠${NC}  File not found: $file"
    fi
}

# Fix API base URLs in all API files
echo "📝 Fixing API base URLs..."

API_FILES=(
    "CRM/lib/api/deals.ts"
    "CRM/lib/api/pipelines.ts"
    "CRM/lib/api/tasks.ts"
    "CRM/lib/api/stats.ts"
    "CRM/lib/api/users.ts"
    "CRM/lib/api/activities.ts"
    "CRM/lib/api/emails.ts"
    "CRM/lib/api/contacts.ts"
    "CRM/lib/api/companies.ts"
    "CRM/hooks/use-deal.ts"
)

for file in "${API_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Replace the fallback pattern
        replace_in_file "$file" \
            "const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'" \
            "const API_BASE_URL = import.meta.env.VITE_API_URL\nif (!API_BASE_URL) {\n  throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')\n}"
    fi
done

# Fix auth.ts error message
echo ""
echo "📝 Fixing auth.ts error message..."
replace_in_file "CRM/lib/api/auth.ts" \
    "throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:3001')" \
    "const apiUrl = import.meta.env.VITE_API_URL || 'backend server'\n      throw new Error(\`Cannot connect to server at \${apiUrl}. Please check your VITE_API_URL configuration and ensure the backend is running.\`)"

# Fix WebSocket URLs
echo ""
echo "📝 Fixing WebSocket URLs..."

# For deals-kanban-board.tsx, use-realtime-contact.ts, use-realtime-company.ts
WS_FILES=(
    "CRM/components/crm/deals-kanban-board.tsx"
    "CRM/hooks/use-realtime-contact.ts"
    "CRM/hooks/use-realtime-company.ts"
)

for file in "${WS_FILES[@]}"; do
    if [ -f "$file" ]; then
        # This is more complex, we'll need to do it manually or with a more sophisticated approach
        echo -e "${YELLOW}⚠${NC}  Manual fix needed for: $file"
        echo "   Replace WebSocket connection pattern (see patches/02-fix-websocket-urls.patch)"
    fi
done

echo ""
echo -e "${GREEN}✅ Integration fixes applied!${NC}"
echo ""
echo "⚠️  Note: WebSocket fixes need manual application due to complexity."
echo "   See patches/02-fix-websocket-urls.patch for details."
echo ""
echo "📋 Next steps:"
echo "   1. Review the changes"
echo "   2. Restart frontend dev server: cd CRM && npm run dev"
echo "   3. Test the application in Codespace preview"

