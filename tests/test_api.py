import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_endpoints():
    print("\n=== Testing Transit explorer API ===\n")

    # Test GET /api/routes
    print("Testing GET /api/routes...")
    try:
        response = requests.get(f"{BASE_URL}/routes")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            routes = response.json().get('routes', [])
            print(f"Found {len(routes)} routes")
            if routes:
                print("Sample route:", json.dumps(routes[0], indent=2))
    except Exception as e:
        print(f"Error: {e}")

    # Test GET /api/stops
    print("\nTesting GET /api/stops...")
    try:
        response = requests.get(f"{BASE_URL}/stops")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            stops = response.json().get('stops', [])
            print(f"Found {len(stops)} stops")
            if stops:
                print("Sample stop:", json.dumps(stops[0], indent=2))
    except Exception as e:
        print(f"Error: {e}")

    # Test POST /api/users
    print("\nTesting POST /api/users...")
    try:
        user_data = {
            "username": "testuser",
            "email": "test@example.com"
        }
        response = requests.post(f"{BASE_URL}/users", json=user_data)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("Created user:", json.dumps(response.json(), indent=2))
            user_id = response.json().get('id')

            # Test user progress if user was created
            if user_id:
                print("\nTesting POST /api/users/{user_id}/progress...")
                progress_data = {
                    "route_id": "test_route_1",
                    "completed_segments": [1, 2, 3]
                }
                response = requests.post(
                    f"{BASE_URL}/users/{user_id}/progress",
                    json=progress_data
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    print("Progress updated:", json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

    # Test GET /api/leaderboard
    print("\nTesting GET /api/leaderboard...")
    try:
        response = requests.get(f"{BASE_URL}/leaderboard")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            leaderboard = response.json().get('leaderboard', [])
            print(f"Found {len(leaderboard)} users on leaderboard")
            if leaderboard:
                print("Top user:", json.dumps(leaderboard[0], indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_endpoints()
