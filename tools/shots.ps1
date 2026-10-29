# Render the app screens used by the landing page.
#
#   powershell -ExecutionPolicy Bypass -File tools/shots.ps1
#
# Uses Chromium's built-in headless screenshot mode (no DevTools port needed).
# The app exposes a few query parameters purely for this purpose:
#   ?demo=1&lang=ar&theme=light&route=stats&sheet=prayer:asr&calmonth=3&onb=6

param(
  [string]$Base = "http://127.0.0.1:5173",
  [int]$Width = 390,
  [int]$Height = 844
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here
$outDir = Join-Path $root "screenshots"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$candidates = @(
  "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
  "C:\Program Files\Google\Chrome\Application\chrome.exe",
  "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw "No Chromium browser found." }

$profileDir = Join-Path $here "_shot_profile"
if (Test-Path $profileDir) { Remove-Item $profileDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

$shots = @(
  @{ Name = "01-today";                Query = "demo=1" },
  @{ Name = "02-confirm";              Query = "demo=1&sheet=prayer:asr" },
  @{ Name = "03-calendar-month";       Query = "demo=1&route=calendar&calmonth=3&year=2010" },
  @{ Name = "04-calendar-year";        Query = "demo=1&route=calendar&year=2010" },
  @{ Name = "05-progress";             Query = "demo=1&route=stats" },
  @{ Name = "06-settings";             Query = "demo=1&route=settings" },
  @{ Name = "07-today-arabic";         Query = "demo=1&lang=ar" },
  @{ Name = "08-today-french-light";   Query = "demo=1&lang=fr&theme=light" },
  @{ Name = "09-onboarding-welcome";   Query = "onb=0" },
  @{ Name = "10-onboarding-pace";      Query = "onb=6" },
  @{ Name = "11-bulk-edit";            Query = "demo=1&route=calendar&sheet=bulk" },
  @{ Name = "12-day-detail";           Query = "demo=1&sheet=day:2012-04-18" }
)

$failures = 0
foreach ($shot in $shots) {
  $url = "$Base/app/?$($shot.Query)"
  $file = Join-Path $outDir "$($shot.Name).png"
  if (Test-Path $file) { Remove-Item $file -Force }

  & $browser `
    --headless=new `
    --disable-gpu `
    --hide-scrollbars `
    --no-first-run `
    --no-default-browser-check `
    "--user-data-dir=$profileDir" `
    --force-device-scale-factor=2 `
    "--window-size=$Width,$Height" `
    --virtual-time-budget=5000 `
    "--screenshot=$file" `
    $url 2>$null | Out-Null

  if (Test-Path $file) {
    $size = (Get-Item $file).Length
    Write-Host ("  OK  {0,-24} {1,7:N0} bytes" -f $shot.Name, $size)
  } else {
    Write-Warning "  FAILED $($shot.Name)"
    $failures += 1
  }
}

# Boot check: the rendered DOM must contain the app shell.
$domFile = Join-Path $here "_dom.html"
& $browser --headless=new --disable-gpu --no-first-run "--user-data-dir=$profileDir" `
  --virtual-time-budget=4000 "--dump-dom" "$Base/app/?demo=1" 2>$null | Set-Content -Path $domFile -Encoding utf8

$dom = Get-Content $domFile -Raw
if ($dom -match 'class="app-shell"') {
  Write-Host "Boot check: app shell rendered."
} else {
  Write-Warning "Boot check: app shell missing - JavaScript failed to boot."
  $failures += 1
}

if (Test-Path $profileDir) { Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue }
Remove-Item $domFile -Force -ErrorAction SilentlyContinue

if ($failures -gt 0) { Write-Warning "$failures problem(s)."; exit 1 }
Write-Host "All screenshots rendered."
