#!/bin/bash

BASE_URL="http://localhost:3001/api"
RESULTS_FILE="reports/smoke_test.json"
ERROR_LOG="reports/backend_errors.log"

# Initialize results array
echo "[]" > "$RESULTS_FILE"

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local auth_header=$3
    local payload=$4
    local description=$5
    
    echo "Testing: $description"
    
    start_time=$(date +%s%N)
    
    if [ "$method" = "GET" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "$auth_header" \
                --max-time 5)
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                --max-time 5)
        fi
    elif [ "$method" = "POST" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "$auth_header" \
                -d "$payload" \
                --max-time 5)
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$payload" \
                --max-time 5)
        fi
    fi
    
    end_time=$(date +%s%N)
    elapsed_ms=$(( (end_time - start_time) / 1000000 ))
    
    # Extract status code (last line) and body (everything else)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Truncate body to first 200 chars for snippet
    body_snippet=$(echo "$body" | head -c 200)
    
    # Add result to JSON
    jq --arg endpoint "$endpoint" \
       --arg method "$method" \
       --arg status "$status_code" \
       --arg snippet "$body_snippet" \
       --argjson elapsed "$elapsed_ms" \
       --arg desc "$description" \
       '. += [{
         endpoint: $endpoint,
         method: $method,
         description: $desc,
         status_code: ($status | tonumber),
         response_snippet: $snippet,
         elapsed_ms: $elapsed
       }]' "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    
    echo "  Status: $status_code, Elapsed: ${elapsed_ms}ms"
    
    # Return status code for checking
    echo "$status_code"
}

# Test 1: Health Check (Public)
echo "=== Test 1: Health Check ==="
status=$(test_endpoint "GET" "/health" "" "" "Health check endpoint")
if [ "$status" != "200" ]; then
    echo "ERROR: Health check failed with status $status"
    exit 1
fi

# Test 2: Login (Public)
echo ""
echo "=== Test 2: Login ==="
login_payload='{"email":"admin@example.com","password":"admin123"}'
status=$(test_endpoint "POST" "/auth/login" "" "$login_payload" "Login endpoint")

# Extract access token if login succeeded
if [ "$status" = "200" ]; then
    access_token=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "$login_payload" | jq -r '.access_token // empty')
    
    if [ -z "$access_token" ] || [ "$access_token" = "null" ]; then
        echo "WARNING: Login succeeded but no access token in response"
        AUTH_HEADER=""
    else
        AUTH_HEADER="Authorization: Bearer $access_token"
        echo "  Access token obtained"
    fi
else
    echo "WARNING: Login failed, will skip authenticated endpoints"
    AUTH_HEADER=""
fi

# Test 3: Get Deals (Requires Auth)
echo ""
echo "=== Test 3: Get Deals ==="
if [ -n "$AUTH_HEADER" ]; then
    test_endpoint "GET" "/deals" "$AUTH_HEADER" "" "Get deals list"
else
    echo "  SKIPPED: No auth token available"
    jq '. += [{
        endpoint: "/deals",
        method: "GET",
        description: "Get deals list",
        status_code: 0,
        response_snippet: "SKIPPED - No auth token",
        elapsed_ms: 0
    }]' "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
fi

# Test 4: Get Pipelines (Requires Auth)
echo ""
echo "=== Test 4: Get Pipelines ==="
if [ -n "$AUTH_HEADER" ]; then
    test_endpoint "GET" "/pipelines" "$AUTH_HEADER" "" "Get pipelines list"
else
    echo "  SKIPPED: No auth token available"
    jq '. += [{
        endpoint: "/pipelines",
        method: "GET",
        description: "Get pipelines list",
        status_code: 0,
        response_snippet: "SKIPPED - No auth token",
        elapsed_ms: 0
    }]' "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
fi

# Test 5: Get Contacts (Requires Auth)
echo ""
echo "=== Test 5: Get Contacts ==="
if [ -n "$AUTH_HEADER" ]; then
    test_endpoint "GET" "/contacts" "$AUTH_HEADER" "" "Get contacts list"
else
    echo "  SKIPPED: No auth token available"
    jq '. += [{
        endpoint: "/contacts",
        method: "GET",
        description: "Get contacts list",
        status_code: 0,
        response_snippet: "SKIPPED - No auth token",
        elapsed_ms: 0
    }]' "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
fi

echo ""
echo "=== Smoke Test Complete ==="
echo "Results saved to: $RESULTS_FILE"

# Check for failures
failures=$(jq '[.[] | select(.status_code >= 400)] | length' "$RESULTS_FILE")
if [ "$failures" -gt 0 ]; then
    echo "WARNING: $failures endpoint(s) returned 4xx/5xx status codes"
    echo "Failed endpoints:"
    jq -r '.[] | select(.status_code >= 400) | "  - \(.endpoint) (\(.method)): \(.status_code)"' "$RESULTS_FILE"
fi




