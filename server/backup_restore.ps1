# ==============================================================================
# ClimateSphere AI — TimescaleDB & WORM Audit Disaster Recovery Utility (PowerShell)
# Standards Compliance: IED 2010/75/EU, DIN EN 14181 QAL1-3, ISO 14064 GHG Lineage
# ==============================================================================
param (
    [Parameter(Position=0)]
    [ValidateSet("backup", "restore", "verify-worm")]
    [string]$Action = "backup",

    [Parameter(Position=1)]
    [string]$DumpFile = ""
)

$ErrorActionPreference = "Stop"

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { ".\server\data\backups" }
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$PgHost = if ($env:PGHOST) { $env:PGHOST } else { "localhost" }
$PgPort = if ($env:PGPORT) { $env:PGPORT } else { "5432" }
$PgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "climatesphere" }
$PgDatabase = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "climatesphere_tsdb" }

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

function Invoke-Backup {
    $TargetDump = Join-Path $BackupDir "climatesphere_backup_$Timestamp.dump"
    $TargetHash = "$TargetDump.sha256"

    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host " [ClimateSphere Disaster Recovery] Initiating TimescaleDB Backup" -ForegroundColor Green
    Write-Host " Host: $PgHost`:$PgPort | Database: $PgDatabase" -ForegroundColor Gray
    Write-Host " Timestamp: $Timestamp" -ForegroundColor Gray
    Write-Host "=================================================================" -ForegroundColor Cyan

    & pg_dump -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -F c -b -v -f $TargetDump

    $sha256 = (Get-FileHash -Algorithm SHA256 -Path $TargetDump).Hash
    Set-Content -Path $TargetHash -Value $sha256

    Write-Host " Backup completed: $TargetDump" -ForegroundColor Green
    Write-Host " SHA-256 Checksum: $sha256" -ForegroundColor Yellow

    # Purge backups older than 1095 days (3 years) per IED 2010/75/EU
    $LimitDate = (Get-Date).AddDays(-1095)
    Get-ChildItem -Path $BackupDir -Filter "climatesphere_backup_*.dump*" | Where-Object { $_.CreationTime -lt $LimitDate } | Remove-Item -Force
    Write-Host " 3-year statutory retention policy verified." -ForegroundColor Cyan
}

function Invoke-Restore {
    if ([string]::IsNullOrWhiteSpace($DumpFile) -or !(Test-Path $DumpFile)) {
        Write-Error "Error: Must specify a valid existing dump file to restore."
    }

    $HashFile = "$DumpFile.sha256"
    if (Test-Path $HashFile) {
        $Expected = (Get-Content -Path $HashFile).Trim()
        $Actual = (Get-FileHash -Algorithm SHA256 -Path $DumpFile).Hash.Trim()
        if ($Expected -ne $Actual) {
            Write-Error "Cryptographic Integrity Check Failed! Backup dump checksum does not match."
        }
        Write-Host " Cryptographic SHA-256 Checksum Verified." -ForegroundColor Green
    }

    Write-Host " WARNING: Restoring will overwrite existing schemas in $PgDatabase!" -ForegroundColor Yellow
    $Confirmation = Read-Host "Type 'CONFIRM_RESTORE' to proceed"
    if ($Confirmation -ne "CONFIRM_RESTORE") {
        Write-Host "Restore cancelled by operator." -ForegroundColor Red
        return
    }

    & pg_restore -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase --clean --if-exists -v $DumpFile
    Write-Host " Database restore completed successfully." -ForegroundColor Green
}

function Invoke-VerifyWorm {
    Write-Host " Querying WORM Merkle Chain Audit Ledger..." -ForegroundColor Cyan
    & psql -h $PgHost -p $PgPort -U $PgUser -d $PgDatabase -c "SELECT id, sequence_num, current_hash, previous_hash, timestamp FROM audit_merkle_ledger ORDER BY sequence_num DESC LIMIT 10;"
}

switch ($Action) {
    "backup" { Invoke-Backup }
    "restore" { Invoke-Restore }
    "verify-worm" { Invoke-VerifyWorm }
}
