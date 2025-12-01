#!/usr/bin/env python3
import json
import subprocess
import time
import sys
from datetime import datetime

BASE_URL = "http://localhost:3001/api"
RESULTS_FILE = "reports/smoke_test.json"
ERROR_LOG = "reports/backend_errors.log"

results = []

def test_endpoint(method, endpoint, auth_header=None, payload=None, description=""):
    """Test an endpoint and return status code, response, and elapsed time"""
    print(f"Testing: {description}")
    
    url = f"{BASE_URL}{endpoint}"
    headers = ["-H", "Content-Type: application/json"]
    
    if auth_header:
        headers.extend(["-H", auth_header])
    
    cmd = ["curl", "-s", "-w", "\n%{http_code}", "-X", method]
    cmd.extend(headers)
    
    if payload:
        cmd.extend(["-d", payload])
    
    cmd.extend(["--max-time", "5", url])
    
    start_time = time.time()
    try:
        response = subprocess.run(cmd, capture_output=True, text=True, timeout=6)
        elapsed_ms = int((time.time() - start_time) * 1000)
        
        if response.returncode != 0:
            status_code = 0
            body_full = f"Error: {response.stderr}"
            body_snippet = body_full[:200]
        else:
            output = response.stdout.strip()
            lines = output.split('\n')
            # Last line is status code
            if lines:
                try:
                    status_code = int(lines[-1])
                    body_full = '\n'.join(lines[:-1]) if len(lines) > 1 else ""
                except ValueError:
                    # If last line is not a number, assume 200 and all is body
                    status_code = 200
                    body_full = output
                body_snippet = body_full[:200]
            else:
                status_code = 0
                body_full = ""
                body_snippet = ""
    except subprocess.TimeoutExpired:
        elapsed_ms = 5000
        status_code = 0
        body_full = "Request timeout"
        body_snippet = body_full
    except Exception as e:
        elapsed_ms = 0
        status_code = 0
        body_full = f"Error: {str(e)}"
        body_snippet = body_full[:200]
    
    result = {
        "endpoint": endpoint,
        "method": method,
        "description": description,
        "status_code": status_code,
        "response_snippet": body_snippet,
        "elapsed_ms": elapsed_ms
    }
    
    results.append(result)
    print(f"  Status: {status_code}, Elapsed: {elapsed_ms}ms")
    
    return status_code, body_full

def main():
    print("=== Starting Smoke Test ===\n")
    
    # Test 1: Health Check (Public)
    print("=== Test 1: Health Check ===")
    status, _ = test_endpoint("GET", "/health", None, None, "Health check endpoint")
    if status != 200:
        print(f"ERROR: Health check failed with status {status}")
        sys.exit(1)
    
    # Test 2: Login (Public)
    print("\n=== Test 2: Login ===")
    login_payload = '{"email":"admin@example.com","password":"admin123"}'
    status, body = test_endpoint("POST", "/auth/login", None, login_payload, "Login endpoint")
    
    # Extract access token if login succeeded
    auth_header = None
    if status == 200:
        try:
            # Clean body - remove any trailing status code
            body_clean = body.strip()
            if body_clean and body_clean[-3:].isdigit() and '\n' in body_clean:
                # Remove status code line if present
                lines = body_clean.split('\n')
                body_clean = '\n'.join(lines[:-1]) if len(lines) > 1 else body_clean
            
            response_data = json.loads(body_clean) if body_clean else {}
            access_token = response_data.get('access_token')
            if access_token:
                auth_header = f"Authorization: Bearer {access_token}"
                print("  Access token obtained")
            else:
                print(f"WARNING: Login succeeded but no access token in response. Body: {body_clean[:100]}")
        except json.JSONDecodeError as e:
            print(f"WARNING: Could not parse login response: {e}. Body: {body[:100]}")
    else:
        print("WARNING: Login failed, will skip authenticated endpoints")
    
    # Test 3: Get Deals (Requires Auth)
    print("\n=== Test 3: Get Deals ===")
    if auth_header:
        test_endpoint("GET", "/deals", auth_header, None, "Get deals list")
    else:
        print("  SKIPPED: No auth token available")
        results.append({
            "endpoint": "/deals",
            "method": "GET",
            "description": "Get deals list",
            "status_code": 0,
            "response_snippet": "SKIPPED - No auth token",
            "elapsed_ms": 0
        })
    
    # Test 4: Get Pipelines (Requires Auth)
    print("\n=== Test 4: Get Pipelines ===")
    if auth_header:
        test_endpoint("GET", "/pipelines", auth_header, None, "Get pipelines list")
    else:
        print("  SKIPPED: No auth token available")
        results.append({
            "endpoint": "/pipelines",
            "method": "GET",
            "description": "Get pipelines list",
            "status_code": 0,
            "response_snippet": "SKIPPED - No auth token",
            "elapsed_ms": 0
        })
    
    # Test 5: Get Contacts (Requires Auth)
    print("\n=== Test 5: Get Contacts ===")
    if auth_header:
        test_endpoint("GET", "/contacts", auth_header, None, "Get contacts list")
    else:
        print("  SKIPPED: No auth token available")
        results.append({
            "endpoint": "/contacts",
            "method": "GET",
            "description": "Get contacts list",
            "status_code": 0,
            "response_snippet": "SKIPPED - No auth token",
            "elapsed_ms": 0
        })
    
    # Save results
    with open(RESULTS_FILE, 'w') as f:
        json.dump(results, f, indent=2)
    
    print("\n=== Smoke Test Complete ===")
    print(f"Results saved to: {RESULTS_FILE}")
    
    # Check for failures
    failures = [r for r in results if r['status_code'] >= 400]
    if failures:
        print(f"\nWARNING: {len(failures)} endpoint(s) returned 4xx/5xx status codes")
        print("Failed endpoints:")
        for failure in failures:
            print(f"  - {failure['endpoint']} ({failure['method']}): {failure['status_code']}")
        
        # Try to get backend error logs
        try:
            print("\nAttempting to capture backend error logs...")
            # Try to get logs from backend process
            log_cmd = ["journalctl", "--user-unit=backend", "-n", "200", "--no-pager"]
            try:
                log_output = subprocess.run(log_cmd, capture_output=True, text=True, timeout=2)
                if log_output.returncode == 0 and log_output.stdout:
                    with open(ERROR_LOG, 'w') as f:
                        f.write(log_output.stdout)
                    print(f"Backend logs saved to: {ERROR_LOG}")
            except:
                # Try alternative: check if there's a log file in backend directory
                import os
                log_files = [
                    "crm-backend/logs/error.log",
                    "crm-backend/npm-debug.log",
                    "crm-backend/dist/logs/error.log"
                ]
                for log_file in log_files:
                    if os.path.exists(log_file):
                        with open(log_file, 'r') as f:
                            lines = f.readlines()
                            last_lines = lines[-200:] if len(lines) > 200 else lines
                            with open(ERROR_LOG, 'w') as out:
                                out.writelines(last_lines)
                            print(f"Backend logs (last 200 lines) saved to: {ERROR_LOG}")
                            break
        except Exception as e:
            print(f"Could not capture error logs: {e}")
    
    return len(failures)

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

