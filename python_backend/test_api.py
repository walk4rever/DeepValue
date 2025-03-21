#!/usr/bin/env python3
"""
Test script for DeepValue Python Backend API
"""

import requests
import json
import time
import sys
import uuid

# Configuration
BASE_URL = "http://localhost:3000"
TEST_MESSAGE = "分析阿里巴巴(BABA)的投资价值"

def test_chat_api():
    """Test the POST /api/chat endpoint"""
    print("\n=== Testing POST /api/chat ===")
    
    # Generate a unique session ID for testing
    session_id = f"test_session_{uuid.uuid4()}"
    
    # Prepare request data
    data = {
        "message": TEST_MESSAGE,
        "sessionId": session_id,
        "enableReasoning": False
    }
    
    # Send request
    print(f"Sending request with message: '{TEST_MESSAGE}'")
    start_time = time.time()
    
    try:
        response = requests.post(f"{BASE_URL}/api/chat", json=data)
        response.raise_for_status()
        
        # Parse response
        result = response.json()
        
        # Print results
        print(f"Response received in {time.time() - start_time:.2f} seconds")
        print(f"Session ID: {result.get('sessionId')}")
        print(f"Response length: {len(result.get('response', ''))}")
        print("\nFirst 100 characters of response:")
        print(result.get('response', '')[:100] + "...")
        
        return result.get('sessionId')
    
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None

def test_history_api(session_id):
    """Test the GET /api/history endpoint"""
    if not session_id:
        print("\n=== Skipping history test (no session ID) ===")
        return
    
    print(f"\n=== Testing GET /api/history for session {session_id} ===")
    
    try:
        response = requests.get(f"{BASE_URL}/api/history?sessionId={session_id}")
        response.raise_for_status()
        
        # Parse response
        result = response.json()
        
        # Print results
        print(f"Success: {result.get('success')}")
        print(f"Number of messages: {len(result.get('messages', []))}")
        
        # Print message summary
        for i, msg in enumerate(result.get('messages', [])):
            print(f"Message {i+1}: {msg.get('role')} - {len(msg.get('content', ''))} chars")
    
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

def test_clear_history_api(session_id):
    """Test the POST /api/history/clear endpoint"""
    if not session_id:
        print("\n=== Skipping clear history test (no session ID) ===")
        return
    
    print(f"\n=== Testing POST /api/history/clear for session {session_id} ===")
    
    # Prepare request data
    data = {
        "sessionId": session_id
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/history/clear", json=data)
        response.raise_for_status()
        
        # Parse response
        result = response.json()
        
        # Print results
        print(f"Success: {result.get('success')}")
        print(f"Session ID: {result.get('sessionId')}")
        
        # Verify history is cleared
        print("\nVerifying history is cleared...")
        test_history_api(session_id)
    
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")

def main():
    """Main function to run all tests"""
    print("DeepValue Python Backend API Test")
    print("================================")
    
    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}")
        print(f"Server is running at {BASE_URL}")
    except requests.exceptions.ConnectionError:
        print(f"Error: Could not connect to server at {BASE_URL}")
        print("Make sure the server is running before running this test.")
        sys.exit(1)
    
    # Run tests
    session_id = test_chat_api()
    test_history_api(session_id)
    test_clear_history_api(session_id)
    
    print("\nAll tests completed!")

if __name__ == "__main__":
    main()
