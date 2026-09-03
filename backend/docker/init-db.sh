#!/usr/bin/env bash
set -Eeuo pipefail

jobpilot_migration_dir=/opt/jobpilot/migrations

while IFS= read -r jobpilot_migration; do
    echo "Applying JobPilot migration: $(basename "$jobpilot_migration")"
    psql \
        --username "$POSTGRES_USER" \
        --dbname "$POSTGRES_DB" \
        --set ON_ERROR_STOP=1 \
        --file "$jobpilot_migration"
done < <(find "$jobpilot_migration_dir" -maxdepth 1 -type f -name '*.sql' -print | sort -V)
