#!/usr/bin/env bash
set -euo pipefail

CONTAINER=osm-db
SCHEME=places
APP_USER=mapparser
APP_PASSWORD=mapparser

while getopts ":p:" opt; do
    case $opt in
        p) dumpPath="$OPTARG";;
    esac
done
shift $((OPTIND-1))

docker cp "${dumpPath}" ${CONTAINER}:/tmp/dump.sql.gz

docker exec -i ${CONTAINER} sh -c 'mariadb -u root --password="$MARIADB_ROOT_PASSWORD"' <<SQL
CREATE DATABASE IF NOT EXISTS \`${SCHEME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASSWORD}';
GRANT SELECT ON \`${SCHEME}\`.* TO '${APP_USER}'@'%';
SQL

docker exec -e SCHEME="${SCHEME}" ${CONTAINER} sh -c \
    'zcat /tmp/dump.sql.gz | mariadb -u root --password="$MARIADB_ROOT_PASSWORD" "$SCHEME"'

docker exec ${CONTAINER} sh -c 'rm /tmp/dump.sql.gz'