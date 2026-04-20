import requests
import zipfile
import io
import csv
import json
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# GTFS feed URLs
GTFS_FEEDS = {
    'king_county_metro': 'https://metro.kingcounty.gov/GTFS/google_transit.zip',
    'sound_transit': 'https://www.soundtransit.org/GTFS/google_transit.zip'
}

def test_gtfs_feed(agency_name, url):
    logger.info(f"\nTesting {agency_name} GTFS feed...")
    
    try:
        # Test URL connection
        logger.info(f"Downloading from {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Try to extract the zip file
        logger.info("Extracting zip file...")
        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            files = z.namelist()
            logger.info(f"Found {len(files)} files in zip: {', '.join(files)}")
            
            # Check required GTFS files
            required_files = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt']
            missing_files = [f for f in required_files if f not in files]
            if missing_files:
                logger.error(f"Missing required files: {missing_files}")
                return False
            
            # Sample data from each file
            for filename in required_files:
                with z.open(filename) as f:
                    reader = csv.DictReader(io.TextIOWrapper(f))
                    rows = [next(reader) for _ in range(3)]  # Get first 3 rows
                    logger.info(f"\nSample data from {filename}:")
                    for row in rows:
                        logger.info(json.dumps(row, indent=2))

        logger.info(f"✅ {agency_name} GTFS feed test successful")
        return True

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download feed: {str(e)}")
    except zipfile.BadZipFile:
        logger.error("Invalid zip file")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    
    return False

def main():
    logger.info(f"Starting GTFS feed tests at {datetime.now()}")
    
    results = {}
    for agency, url in GTFS_FEEDS.items():
        results[agency] = test_gtfs_feed(agency, url)
    
    logger.info("\nTest Results Summary:")
    for agency, success in results.items():
        status = "✅ Passed" if success else "❌ Failed"
        logger.info(f"{agency}: {status}")

if __name__ == "__main__":
    main()
