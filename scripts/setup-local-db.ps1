# Creates a local forestwatch database on native PostgreSQL (no Docker).
# Requires PostgreSQL 16+ with the PostGIS extension (Stack Builder / OSGeo).
# Usage: $env:PGPASSWORD = '<superuser password>'; .\scripts\setup-local-db.ps1
# Do not commit PGPASSWORD.

$ErrorActionPreference = 'Stop'
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
if (Test-Path "$pgBin\psql.exe") {
  $psql = "$pgBin\psql.exe"
} else {
  $found = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $found) {
    throw 'psql not found. Install PostgreSQL 16+ or add its bin directory to PATH.'
  }
  $psql = $found.Source
}

$pgUser = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
$pgHost = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
$pgPort = if ($env:PGPORT) { $env:PGPORT } else { '5432' }

if (-not $env:PGPASSWORD) {
  throw 'Set PGPASSWORD to your PostgreSQL superuser password (the one chosen at install). Do not commit it.'
}

function Invoke-Psql([string]$database, [string]$sql) {
  $output = & $psql -U $pgUser -h $pgHost -p $pgPort -d $database -tAc $sql 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw $output
  }
  return "$output".Trim()
}

Write-Host "Connecting to ${pgHost}:${pgPort} as $pgUser..."
[void](Invoke-Psql 'postgres' 'SELECT 1')

$role = Invoke-Psql 'postgres' "SELECT 1 FROM pg_roles WHERE rolname = 'forestwatch'"
if ($role -ne '1') {
  Write-Host 'Creating role forestwatch...'
  [void](Invoke-Psql 'postgres' "CREATE ROLE forestwatch LOGIN PASSWORD 'forestwatch'")
}

$db = Invoke-Psql 'postgres' "SELECT 1 FROM pg_database WHERE datname = 'forestwatch'"
if ($db -ne '1') {
  Write-Host 'Creating database forestwatch...'
  [void](Invoke-Psql 'postgres' 'CREATE DATABASE forestwatch OWNER forestwatch')
}

try {
  Write-Host 'Enabling PostGIS...'
  [void](Invoke-Psql 'forestwatch' 'CREATE EXTENSION IF NOT EXISTS postgis')
  [void](Invoke-Psql 'forestwatch' 'CREATE EXTENSION IF NOT EXISTS postgis_topology')
  [void](Invoke-Psql 'forestwatch' 'CREATE EXTENSION IF NOT EXISTS pgcrypto')
  [void](Invoke-Psql 'forestwatch' 'GRANT ALL ON SCHEMA public TO forestwatch')
} catch {
  throw @"
PostGIS is not installed on this PostgreSQL instance.
Install PostGIS for PostgreSQL via Stack Builder (Application Stack Builder from the Start menu),
or skip local Postgres and paste a Neon/Supabase PostGIS DATABASE_URL into .env (required for Vercel anyway).
$($_.Exception.Message)
"@
}

Write-Host 'Local database is ready.'
Write-Host 'DATABASE_URL=postgresql://forestwatch:forestwatch@localhost:5432/forestwatch'
Write-Host 'Next: pnpm db:migrate && pnpm db:seed'
