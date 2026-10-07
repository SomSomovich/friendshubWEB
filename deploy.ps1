<#
.SYNOPSIS
  Build FriendsHub web client and deploy to server.

.DESCRIPTION
  1. Runs npm run build.
  2. Copies dist/* to the server via scp into a staging directory.
  3. On the server, rsyncs staging into /var/www/friendshub-frontend
     and chowns to www-data.

  Server and paths can be overridden with parameters.

.PARAMETER Server
  SSH target, user@host. Default: som@server.som

.PARAMETER RemoteStaging
  Staging directory on the server. Default: /tmp/frontend-deploy

.PARAMETER RemoteWebRoot
  Final web root on the server. Default: /var/www/friendshub-frontend

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Server som@192.168.0.5
#>

param(
    [string]$Server = "som@server.som",
    [string]$RemoteStaging = "/tmp/frontend-deploy",
    [string]$RemoteWebRoot = "/var/www/friendshub-frontend"
)

$ErrorActionPreference = 'Stop'
$projectRoot = "H:\project\friendshubWEB"
$distPath = Join-Path $projectRoot "dist"

Push-Location $projectRoot
try {
    Write-Host "=== 1. Building ===" -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "npm run build failed"
    }

    if (-not (Test-Path $distPath)) {
        throw "dist/ was not created"
    }

    $distSize = (Get-ChildItem -Recurse $distPath | Measure-Object -Property Length -Sum).Sum
    Write-Host ("    dist size: {0:N2} MB" -f ($distSize / 1MB)) -ForegroundColor Green

    Write-Host "`n=== 2. Cleaning remote staging ===" -ForegroundColor Cyan
    ssh $Server "rm -rf $RemoteStaging && mkdir -p $RemoteStaging"
    if ($LASTEXITCODE -ne 0) {
        throw "ssh cleanup failed"
    }

    Write-Host "`n=== 3. Copying dist/* to server ===" -ForegroundColor Cyan
    scp -r "$distPath\*" "${Server}:${RemoteStaging}/"
    if ($LASTEXITCODE -ne 0) {
        throw "scp failed"
    }

    Write-Host "`n=== 4. Deploying to $RemoteWebRoot ===" -ForegroundColor Cyan
    $deployCmd = "sudo rsync -av --delete $RemoteStaging/ $RemoteWebRoot/ && sudo chown -R www-data:www-data $RemoteWebRoot"
    ssh -t $Server $deployCmd
    if ($LASTEXITCODE -ne 0) {
        throw "rsync/chown on server failed (sudo needs a password, run interactively)"
    }

    Write-Host "`n=== 5. Verifying ===" -ForegroundColor Cyan
    $check = curl.exe -sI --max-time 15 https://fh.somuch-system.ru/
    Write-Host $check

    if ($check -match "200 OK") {
        Write-Host "`nDEPLOY OK" -ForegroundColor Green
    } else {
        Write-Warning "Deploy finished but verification did not return 200 OK"
    }
}
finally {
    Pop-Location
}
