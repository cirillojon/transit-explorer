#!/bin/bash
cd /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer
/home/jon/.fly/bin/flyctl ssh console -a transit-explorer -C 'sqlite3 /app/tm-instance/data.db ".backup /tmp/prod-snapshot.db"' 2>&1
echo EXIT=$?
