[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"

function Invoke-Compose {
    param([string[]]$Arguments)

    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose command failed. Confirm Docker Desktop and the local db service are running."
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop is required for a local backup rehearsal."
}

Invoke-Compose @("ps", "--status", "running", "--services") | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$containerDump = "/tmp/bahulu-local-$timestamp.dump"
$localDump = Join-Path $OutputDirectory "bahulu-local-$timestamp.dump"
$dumpCommand = "set -eu; pg_dump --format=custom --compress=9 --no-owner --no-privileges --username=`"`$POSTGRES_USER`" --dbname=`"`$POSTGRES_DB`" > '$containerDump'"

try {
    Invoke-Compose @("exec", "-T", "db", "sh", "-lc", $dumpCommand)
    # Docker writes normal copy-progress output to stderr. Start-Process avoids
    # PowerShell treating that successful output as a terminating error.
    $copyProcess = Start-Process -FilePath "docker" -ArgumentList @("compose", "cp", "db:$containerDump", $localDump) -NoNewWindow -Wait -PassThru
    if ($copyProcess.ExitCode -ne 0) {
        throw "Docker Compose could not copy the backup archive from the database container."
    }

    if (-not (Test-Path $localDump) -or (Get-Item $localDump).Length -eq 0) {
        throw "Backup creation did not produce a usable archive."
    }

    Write-Host "Local backup created: $localDump"
    Write-Host "This archive can contain customer data. Keep it private and never commit or share it."
}
finally {
    & docker compose exec -T db rm -f $containerDump 2>$null
}
