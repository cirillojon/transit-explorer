#!/bin/bash
cd /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer
/home/jon/.fly/bin/flyctl ssh sftp get /tmp/prod-snapshot.db prod-rehearsal/prod-snapshot.db -a transit-explorer 2>&1
ls -la prod-rehearsal/
file prod-rehearsal/prod-snapshot.db
