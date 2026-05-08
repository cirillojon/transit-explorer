import os
from onebusaway import OnebusawaySDK

OBA_API_KEY = os.getenv("OBA_API_KEY") or "TEST"

client = OnebusawaySDK(
    api_key=OBA_API_KEY,
    base_url="https://api.pugetsound.onebusaway.org",
)

coverage = client.agencies_with_coverage.list()

for entry in coverage.data.list:
    agency = client.agency.retrieve(entry.agency_id)
    print(
        entry.agency_id,
        agency.data.entry.name,
        entry.lat,
        entry.lon,
    )