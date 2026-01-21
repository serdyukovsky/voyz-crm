#!/bin/bash
set -e

DATA_DIR="/workspaces/voyz-crm/.pgdata"
LOG_FILE="/tmp/postgres.log"
MAIN_CONF="/etc/postgresql/15/main/postgresql.conf"

mkdir -p "$DATA_DIR"
chown -R postgres:postgres "$DATA_DIR"

if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data dir at $DATA_DIR..."
  su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D '$DATA_DIR'"

  # Minimal config to listen on localhost
  echo "listen_addresses = 'localhost'" >> "$DATA_DIR/postgresql.conf"
  echo "port = 5432" >> "$DATA_DIR/postgresql.conf"
  echo "host all all 127.0.0.1/32 scram-sha-256" >> "$DATA_DIR/pg_hba.conf"
  echo "host all all ::1/128 scram-sha-256" >> "$DATA_DIR/pg_hba.conf"
fi

# Ensure cluster points to persistent data directory
if grep -q "^data_directory" "$MAIN_CONF"; then
  sed -i "s#^data_directory.*#data_directory = '$DATA_DIR'#" "$MAIN_CONF"
else
  echo "data_directory = '$DATA_DIR'" >> "$MAIN_CONF"
fi

if ! pg_isready -h localhost > /dev/null 2>&1; then
  echo "Starting PostgreSQL..."
  su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D '$DATA_DIR' -l '$LOG_FILE' start"
fi

# Ensure role and database exist
su - postgres -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='node'\" | grep -q 1 || psql -c \"CREATE USER node WITH SUPERUSER PASSWORD 'postgres';\""
su - postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='crm_db'\" | grep -q 1 || psql -c \"CREATE DATABASE crm_db OWNER node;\""

exec "$@"
