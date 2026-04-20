#!/usr/bin/env python3
import os
import sys
import logging
from app import create_app, db
from app.models import Route, Stop, RouteStop
import requests
import zipfile
import io
import csv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_and_extract_gtfs(url):
    logger.info(f"Downloading GTFS from {url}")
    response = requests.get(url)
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        return {
            name: [row for row in csv.DictReader(io.TextIOWrapper(z.open(name)))]
            for name in z.namelist()
            if name.endswith('.txt')
        }

def load_transit_data():
    app = create_app()
    with app.app_context():
        try:
            # Clear existing data
            logger.info("Clearing existing data...")
            RouteStop.query.delete()
            Route.query.delete()
            Stop.query.delete()
            db.session.commit()

            # Load data for each transit agency
            for agency, feed_url in app.config['GTFS_FEEDS'].items():
                logger.info(f"Processing data for {agency}...")
                data = download_and_extract_gtfs(feed_url)
                
                # Load routes
                for route in data['routes.txt']:
                    db_route = Route(
                        id=f"{agency}_{route['route_id']}",
                        agency_id=agency,
                        short_name=route.get('route_short_name', ''),
                        long_name=route.get('route_long_name', ''),
                        route_type=int(route.get('route_type', 0)),
                        color=route.get('route_color', ''),
                        text_color=route.get('route_text_color', '')
                    )
                    db.session.add(db_route)
                
                # Load stops
                for stop in data['stops.txt']:
                    db_stop = Stop(
                        id=f"{agency}_{stop['stop_id']}",
                        name=stop['stop_name'],
                        lat=float(stop['stop_lat']),
                        lon=float(stop['stop_lon'])
                    )
                    db.session.add(db_stop)

                # Load route-stop relationships
                trips = {trip['trip_id']: trip['route_id'] for trip in data['trips.txt']}
                for stop_time in data['stop_times.txt']:
                    route_id = f"{agency}_{trips[stop_time['trip_id']]}"
                    stop_id = f"{agency}_{stop_time['stop_id']}"
                    db.session.add(RouteStop(route_id=route_id, stop_id=stop_id))

                db.session.commit()
                logger.info(f"Successfully loaded data for {agency}")

        except Exception as e:
            logger.error(f"Error loading transit data: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    load_transit_data()
