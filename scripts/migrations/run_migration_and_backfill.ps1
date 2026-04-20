param(
  [string]$MigrationFile = "drizzle\0002_consolidated_schema.sql",
  [switch]$DryRun
)

if (-not $env:DATABASE_URL) {
  Write-Error "Please set the environment variable DATABASE_URL before running this script."
  exit 1
}

Write-Host "Migration file: $MigrationFile"
if ($DryRun) { Write-Host "Dry run mode - commands will not be executed." }

function Run-External($exe, $args) {
  Write-Host "==> $exe $args"
  if ($DryRun) { return }
  $proc = Start-Process -FilePath $exe -ArgumentList $args -NoNewWindow -Wait -PassThru
  if ($proc.ExitCode -ne 0) { throw "$exe exited with code $($proc.ExitCode)" }
}

try {
  Write-Host "Applying SQL migration: $MigrationFile"
  Run-External psql "`"$env:DATABASE_URL`" -f `"$MigrationFile`""

  Write-Host "Running backfill script: backfill_consolidated.js"
  Run-External node "scripts/migrations/backfill_consolidated.js"

  Write-Host "Running reconciliation script: reconcile_consolidated.js"
  Run-External node "scripts/migrations/reconcile_consolidated.js"

  Write-Host "Done. Review logs above and reconciliation output before proceeding to deploy changes."
} catch {
  Write-Error "Error during migration/run: $_"
  Write-Error "If needed, restore the DB from backup and investigate the error."
  exit 1
}
