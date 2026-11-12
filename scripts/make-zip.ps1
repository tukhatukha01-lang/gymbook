# Builds dist/gymbook-<version>.zip for manual hosting.
param()
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$version = $pkg.version
$public = Join-Path $root 'public'
$dist = Join-Path $root 'dist'
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ('gymbook-zip-' + [guid]::NewGuid().ToString('N'))

if (-not (Test-Path $public)) { throw "public folder not found: $public" }
New-Item -ItemType Directory -Force -Path $dist, $stage | Out-Null

try {
    Copy-Item (Join-Path $public '*') -Destination $stage -Recurse -Force
    $install = Join-Path $root 'docs\INSTALL_RU.txt'
    if (Test-Path $install) { Copy-Item $install (Join-Path $stage 'INSTALL_RU.txt') -Force }

    $zip = Join-Path $dist ("gymbook-$version.zip")
    if (Test-Path $zip) { Remove-Item $zip -Force }
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal

    $size = [math]::Round((Get-Item $zip).Length / 1KB, 1)
    Write-Host "Done: $zip ($size KB)" -ForegroundColor Green
} finally {
    Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}
