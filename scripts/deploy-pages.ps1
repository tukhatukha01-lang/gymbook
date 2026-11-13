# Публикует содержимое public/ в ветку gh-pages (GitHub Pages).
# Запуск: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-pages.ps1
param()
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$git = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $git) {
    $git = Join-Path $env:LOCALAPPDATA 'GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe'
}
if (-not (Test-Path $git)) { throw 'git not found. Install Git or GitHub Desktop.' }

& $git rev-parse --is-inside-work-tree | Out-Null
& $git subtree push --prefix public origin gh-pages
if ($LASTEXITCODE -ne 0) { throw "git subtree push failed with code $LASTEXITCODE" }
Write-Host 'Published: https://tukhatukha01-lang.github.io/gymbook/' -ForegroundColor Green
