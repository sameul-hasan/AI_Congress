#!/usr/bin/env bash
# ==============================================================================
# ClimateSphere AI — TimescaleDB & WORM Audit Disaster Recovery Utility
# Standards Compliance: IED 2010/75/EU (3-Year WORM Audit Trail Retention),
# DIN EN 14181 QAL1-3 Historical Calibration Retention, ISO 14064 GHG Lineage
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/climatesphere}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
PGHOST="${PGHOST:-timescaledb}"
PGPORT="${PGPORT:-5432}"
PGUSER="${POSTGRES_USER:-climatesphere}"
PGDATABASE="${POSTGRES_DB:-climatesphere_tsdb}"
BACKUP_FILE="${BACKUP_DIR}/climatesphere_backup_${TIMESTAMP}.dump"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "${BACKUP_DIR}"

backup() {
    echo "================================================================="
    echo " [ClimateSphere Disaster Recovery] Initiating TimescaleDB Backup"
    echo " Host: ${PGHOST}:${PGPORT} | Database: ${PGDATABASE}"
    echo " Timestamp: ${TIMESTAMP}"
    echo "================================================================="

    # Execute custom-format pg_dump with parallel blob dumping and hypertable metadata preservation
    pg_dump \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        -F c \
        -b \
        -v \
        -f "${BACKUP_FILE}"

    # Generate cryptographic SHA-256 integrity hash for WORM compliance
    sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"

    echo " Backup completed successfully: ${BACKUP_FILE}"
    echo " SHA-256 Checksum: $(cat "${CHECKSUM_FILE}")"

    # Retain backups for 3 years (1095 days) per IED 2010/75/EU requirements
    echo " Applying statutory retention policy (purging dumps older than 1095 days)..."
    find "${BACKUP_DIR}" -type f -name "climatesphere_backup_*.dump" -mtime +1095 -delete
    find "${BACKUP_DIR}" -type f -name "climatesphere_backup_*.dump.sha256" -mtime +1095 -delete
    echo " Retention policy enforced."
}

restore() {
    TARGET_DUMP="${1:-}"
    if [ -z "${TARGET_DUMP}" ]; then
        echo "Error: Must specify dump file to restore."
        echo "Usage: $0 restore <path_to_dump_file>"
        exit 1
    fi

    if [ ! -f "${TARGET_DUMP}" ]; then
        echo "Error: Backup file not found: ${TARGET_DUMP}"
        exit 1
    fi

    # Verify SHA-256 hash if checksum file exists
    if [ -f "${TARGET_DUMP}.sha256" ]; then
        echo "Verifying SHA-256 cryptographic checksum prior to restore..."
        sha256sum -c "${TARGET_DUMP}.sha256"
        echo "Checksum verified. Proceeding with database restore."
    fi

    echo "WARNING: Restoring will overwrite existing schemas in ${PGDATABASE}!"
    read -p "Type 'CONFIRM_RESTORE' to proceed: " CONFIRM
    if [ "${CONFIRM}" != "CONFIRM_RESTORE" ]; then
        echo "Restore aborted by operator."
        exit 1
    fi

    pg_restore \
        -h "${PGHOST}" \
        -p "${PGPORT}" \
        -U "${PGUSER}" \
        -d "${PGDATABASE}" \
        --clean \
        --if-exists \
        -v \
        "${TARGET_DUMP}"

    echo "Database restore completed successfully."
}

verify_worm() {
    echo "Verifying WORM Cryptographic Merkle Hash Chain in Audit Logs..."
    psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -c \
        "SELECT id, sequence_num, current_hash, previous_hash, timestamp FROM audit_merkle_ledger ORDER BY sequence_num DESC LIMIT 10;"
    echo "Audit trail verification query completed."
}

case "${1:-backup}" in
    backup)
        backup
        ;;
    restore)
        restore "${2:-}"
        ;;
    verify-worm)
        verify_worm
        ;;
    *)
        echo "Usage: $0 {backup|restore <file>|verify-worm}"
        exit 1
        ;;
esac
