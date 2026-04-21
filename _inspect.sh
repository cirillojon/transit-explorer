#!/bin/bash
cd /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer
echo '--- file ---'
file prod-rehearsal/prod-snapshot.db
echo '--- tables ---'
sqlite3 prod-rehearsal/prod-snapshot.db '.tables'
echo '--- alembic_version ---'
sqlite3 prod-rehearsal/prod-snapshot.db 'SELECT version_num FROM alembic_version;'
echo '--- routes count ---'
sqlite3 prod-rehearsal/prod-snapshot.db 'SELECT COUNT(*) FROM routes;'
echo '--- user_segments count ---'
sqlite3 prod-rehearsal/prod-snapshot.db 'SELECT COUNT(*) FROM user_segments;'
echo '--- users count ---'
sqlite3 prod-rehearsal/prod-snapshot.db 'SELECT COUNT(*) FROM users;'
echo '--- data_loads exists? ---'
sqlite3 prod-rehearsal/prod-snapshot.db "SELECT name FROM sqlite_master WHERE type='table' AND name='data_loads';"
echo '--- user_segments schema ---'
sqlite3 prod-rehearsal/prod-snapshot.db '.schema user_segments'
