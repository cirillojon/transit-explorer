import os
from onebusaway import OnebusawaySDK

OBA_API_KEY = os.getenv("OBA_API_KEY") or "TEST"

client = OnebusawaySDK(
    api_key=OBA_API_KEY,
    base_url="https://api.pugetsound.onebusaway.org",
)

coverage = client.agencies_with_coverage.list()

for entry in coverage.data.list:
    print(entry.agency_id, entry.lat, entry.lon)