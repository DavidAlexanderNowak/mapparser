#!/usr/bin/env bash
#
# Loads an osm_places_slim.sql.gz dump into the osm-db pod.
#
#     ./load-dump.sh -p /path/to/osm_places_slim.sql.gz [-n namespace]
#
# The Kubernetes counterpart of osm-data-extractor/db-init/load.sh, which
# drives a plain Docker container and so cannot reach a pod. The SQL it runs
# is the same, and both are safe to re-run: the schema and the user are
# created only if they are missing, and the dump drops and recreates its own
# table.
set -euo pipefail

NAMESPACE=map-town-parser
SELECTOR=app=osm-db
SCHEME=places
APP_USER=mapparser
APP_PASSWORD=mapparser

while getopts ":p:n:" opt; do
    case $opt in
        p) dumpPath="$OPTARG";;
        n) NAMESPACE="$OPTARG";;
        \?) echo "Unknown option: -$OPTARG" >&2; exit 1;;
        :) echo "Option -$OPTARG needs a value" >&2; exit 1;;
    esac
done
shift $((OPTIND-1))

if [[ -z "${dumpPath:-}" ]]; then
    echo "Usage: $0 -p <dump.sql.gz> [-n <namespace>]" >&2
    exit 1
fi

if [[ ! -r "${dumpPath}" ]]; then
    echo "Cannot read dump: ${dumpPath}" >&2
    exit 1
fi

echo "=== waiting for the database pod"
kubectl -n "${NAMESPACE}" wait --for=condition=ready pod -l "${SELECTOR}" --timeout=300s

POD=$(kubectl -n "${NAMESPACE}" get pod -l "${SELECTOR}" \
      -o jsonpath='{.items[0].metadata.name}')

echo "    pod  : ${POD}"
echo "    dump : ${dumpPath} ($(du -h "${dumpPath}" | cut -f1))"

echo "=== creating the schema and the application user"
kubectl -n "${NAMESPACE}" exec -i "${POD}" -- \
    sh -c 'mariadb -u root --password="$MARIADB_ROOT_PASSWORD"' <<SQL
CREATE DATABASE IF NOT EXISTS \`${SCHEME}\`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASSWORD}';
GRANT SELECT ON \`${SCHEME}\`.* TO '${APP_USER}'@'%';
SQL

echo "=== copying the dump into the pod"
kubectl cp "${dumpPath}" "${NAMESPACE}/${POD}:/tmp/dump.sql.gz"

echo "=== importing, this takes a few minutes"
kubectl -n "${NAMESPACE}" exec -i "${POD}" -- sh -c \
    "zcat /tmp/dump.sql.gz | mariadb -u root --password=\"\$MARIADB_ROOT_PASSWORD\" ${SCHEME}"

kubectl -n "${NAMESPACE}" exec "${POD}" -- rm /tmp/dump.sql.gz

echo
echo "=== done"
kubectl -n "${NAMESPACE}" exec -i "${POD}" -- sh -c \
    "mariadb -u root --password=\"\$MARIADB_ROOT_PASSWORD\" -e \
     'SELECT place, COUNT(*) AS rows_loaded FROM \`${SCHEME}\`.osm_place GROUP BY place;'"
