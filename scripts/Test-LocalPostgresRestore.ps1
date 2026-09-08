[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateScript({ Test-Path $_ -PathType Leaf })]
    [string]$BackupPath,
    [switch]$KeepRestoredDatabase
)

$ErrorActionPreference = "Stop"

function Invoke-Compose {
    param([string[]]$Arguments)

    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose command failed. Confirm the local api and db services are running."
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop is required for a local restore rehearsal."
}

$resolvedBackup = (Resolve-Path $BackupPath).Path
if ([IO.Path]::GetExtension($resolvedBackup) -ne ".dump") {
    throw "Use a .dump archive created by Backup-LocalPostgres.ps1."
}

$suffix = "{0:yyyyMMddHHmmss}-{1}" -f (Get-Date), ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$restoreDatabase = "bahulu_restore_$suffix".Replace("-", "_")
$containerDump = "/tmp/$restoreDatabase.dump"
$databaseCreated = $false
$dumpCopied = $false

try {
    Invoke-Compose @("cp", $resolvedBackup, "db:$containerDump")
    $dumpCopied = $true

    $createCommand = "set -eu; createdb --username=`"`$POSTGRES_USER`" --owner=`"`$POSTGRES_USER`" '$restoreDatabase'"
    Invoke-Compose @("exec", "-T", "db", "sh", "-lc", $createCommand)
    $databaseCreated = $true

    $restoreCommand = "set -eu; pg_restore --exit-on-error --no-owner --no-privileges --username=`"`$POSTGRES_USER`" --dbname='$restoreDatabase' '$containerDump'"
    Invoke-Compose @("exec", "-T", "db", "sh", "-lc", $restoreCommand)

    $verifyCommand = "set -eu; export DATABASE_URL=`"`${DATABASE_URL%/*}/$restoreDatabase`"; uv run --no-sync alembic upgrade head; uv run --no-sync python -m app.database_readiness"
    Invoke-Compose @("exec", "-T", "api", "sh", "-lc", $verifyCommand)

    Write-Host "Restore rehearsal passed using disposable database $restoreDatabase."
    Write-Host "The active Compose database was not changed."
}
finally {
    if ($dumpCopied) {
        & docker compose exec -T db rm -f $containerDump 2>$null
    }
    if ($databaseCreated -and -not $KeepRestoredDatabase) {
        $dropCommand = "set -eu; psql --username=`"`$POSTGRES_USER`" --dbname=postgres --command='DROP DATABASE IF EXISTS $restoreDatabase'"
        & docker compose exec -T db sh -lc $dropCommand
        if ($LASTEXITCODE -ne 0) {
            throw "The disposable restore database could not be removed. Remove $restoreDatabase manually before the next rehearsal."
        }
    }
}
