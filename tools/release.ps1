<#
.SYNOPSIS
  One command per release: bump the version, run the tests, build the web
  bundle, publish the signed APK and write every checksum.

.DESCRIPTION
  Everything that used to be manual is done here:

    1. bumps the version in package.json, app/js/config.js and the service
       worker cache name, and in QadaPrayer.csproj (ApplicationDisplayVersion
       and ApplicationVersion),
    2. verifies that the three JavaScript versions agree,
    3. runs the test suite,
    4. builds dist/qada-<version>-web.zip,
    5. publishes the signed APK and copies it to dist/qada-<version>.apk,
    6. writes .sha256 files and dist/SHA256SUMS.txt.

  The first run remembers the project folder in release.local.json (ignored by
  git), so later releases are literally:

      .\tools\release.ps1 -Version 0.2.1

.EXAMPLE
  # first time: tell it where the MAUI project lives
  .\tools\release.ps1 -Version 0.2.1 -ProjectDir C:\Users\Mercenary\Documents\QadaPrayer\QadaPrayer

.EXAMPLE
  # afterwards
  .\tools\release.ps1 -Version 0.2.2

.EXAMPLE
  # web bundle only, no Android toolchain
  .\tools\release.ps1 -Version 0.2.2 -SkipApk
#>
[CmdletBinding()]
param(
  [string]$Version = '',
  [string]$ProjectDir = '',
  [string]$Keystore = 'qada.keystore',
  [string]$KeyAlias = 'qada',
  [string]$StorePass = $env:QADA_STORE_PASS,
  [string]$KeyPass = '',
  [string]$Framework = 'net10.0-android',
  [switch]$SkipTests,
  [switch]$SkipApk
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $root 'release.local.json'
Push-Location $root

function Step($text) { Write-Host ''; Write-Host "== $text" -ForegroundColor Cyan }
function Fail($text) { Write-Host "   x $text" -ForegroundColor Red; Pop-Location; exit 1 }
function Ok($text) { Write-Host "   + $text" -ForegroundColor Green }
function Note($text) { Write-Host "   . $text" -ForegroundColor DarkGray }

try {
  # ------------------------------------------------------------- saved config
  if (Test-Path $configPath) {
    $saved = Get-Content $configPath -Raw | ConvertFrom-Json
    if (-not $ProjectDir -and $saved.projectDir) { $ProjectDir = $saved.projectDir }
    if ($saved.keystore) { $Keystore = $saved.keystore }
    if ($saved.keyAlias) { $KeyAlias = $saved.keyAlias }
    if ($saved.framework) { $Framework = $saved.framework }
  }

  # ------------------------------------------------------------------ version
  Step 'Version'
  $pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
  $current = $pkg.version

  if ($Version) {
    if ($Version -notmatch '^\d+\.\d+\.\d+$') { Fail "Not a version: $Version (expected x.y.z)" }
    if ($Version -ne $current) {
      node tools/bump.mjs $Version | Out-Null
      if ($LASTEXITCODE -ne 0) { Fail 'tools/bump.mjs failed' }
      Ok "bumped $current -> $Version"
    } else {
      Note "already at $Version, nothing to bump"
    }
  }

  $version = (Get-Content 'package.json' -Raw | ConvertFrom-Json).version
  $config = Get-Content 'app/js/config.js' -Raw
  if ($config -notmatch "VERSION\s*=\s*'$([regex]::Escape($version))'") {
    Fail "app/js/config.js does not say VERSION = '$version'"
  }
  $sw = Get-Content 'app/sw.js' -Raw
  if ($sw -notmatch "const VERSION = '(qada-v\d+)'") { Fail 'cache version not found in app/sw.js' }
  $cache = $Matches[1]
  Ok "version $version / cache $cache"

  $numbers = $version.Split('.')
  $versionCode = [int]$numbers[0] * 10000 + [int]$numbers[1] * 100 + [int]$numbers[2]

  # ------------------------------------------------------------------- csproj
  $csprojPath = ''
  if ($ProjectDir) {
    $csprojPath = Join-Path $ProjectDir 'QadaPrayer.csproj'
    if (Test-Path $csprojPath) {
      Step 'Android project'
      $xml = Get-Content $csprojPath -Raw
      $xml = [regex]::Replace($xml, '<ApplicationDisplayVersion>[^<]*</ApplicationDisplayVersion>', "<ApplicationDisplayVersion>$version</ApplicationDisplayVersion>", 1)
      $xml = [regex]::Replace($xml, '<ApplicationVersion>[^<]*</ApplicationVersion>', "<ApplicationVersion>$versionCode</ApplicationVersion>", 1)
      Set-Content -Path $csprojPath -Value $xml -Encoding UTF8
      Ok "QadaPrayer.csproj -> $version (versionCode $versionCode)"
    } elseif (-not $SkipApk) {
      Fail "no QadaPrayer.csproj in $ProjectDir"
    }
  }

  # -------------------------------------------------------------------- tests
  if (-not $SkipTests) {
    Step 'Tests'
    node --test --test-isolation=none 'tests/*.test.js' | Out-Null
    if ($LASTEXITCODE -ne 0) {
      node --test --test-isolation=none 'tests/*.test.js'
      Fail 'The test suite failed. Nothing was packaged.'
    }
    Ok 'all tests pass'
  }

  # --------------------------------------------------------------- landing site
  Step 'Landing pages'
  node tools/build-site.mjs | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'tools/build-site.mjs failed' }
  Ok 'index.html, index-ar.html, index-fr.html'

  # ---------------------------------------------------------------------- web
  Step 'Web bundle'
  node tools/package.mjs | Out-Null
  if ($LASTEXITCODE -ne 0) { Fail 'tools/package.mjs failed' }
  $webZip = "dist/qada-$version-web.zip"
  if (-not (Test-Path $webZip)) { Fail "missing $webZip" }
  Ok "dist\qada-$version-web.zip ($([math]::Round((Get-Item $webZip).Length / 1KB)) kB)"

  # ---------------------------------------------------------------------- apk
  $apkOut = ''
  if (-not $SkipApk) {
    Step 'Android APK'
    if (-not $ProjectDir) {
      Fail 'No project folder. Pass -ProjectDir once; it is remembered in release.local.json.'
    }
    if (-not $StorePass) {
      # Ask once, without echoing and without storing anything on disk.
      $secure = Read-Host "Keystore password for $Keystore" -AsSecureString
      $StorePass = [System.Net.NetworkCredential]::new('', $secure).Password
      if (-not $StorePass) { Fail 'No password entered.' }
    }
    if (-not $KeyPass) { $KeyPass = $StorePass }

    $keystorePath = $Keystore
    if (-not [System.IO.Path]::IsPathRooted($keystorePath)) {
      $keystorePath = Join-Path $ProjectDir $Keystore
    }
    if (-not (Test-Path $keystorePath)) { Fail "keystore not found: $keystorePath" }

    $env:QADA_STORE_PASS = $StorePass
    $env:QADA_KEY_PASS = $KeyPass

    Push-Location $ProjectDir
    $ErrorActionPreference = 'Continue'
    try {
      dotnet publish -f $Framework -c Release `
        -p:AndroidPackageFormats=apk `
        -p:AndroidKeyStore=true `
        -p:AndroidSigningKeyStore="$keystorePath" `
        -p:AndroidSigningKeyAlias=$KeyAlias `
        -p:AndroidSigningKeyPass=env:QADA_KEY_PASS `
        -p:AndroidSigningStorePass=env:QADA_STORE_PASS
      $publishCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = 'Stop'
      Pop-Location
    }
    if ($publishCode -ne 0) { Fail "dotnet publish failed (exit $publishCode)" }

    $publishDir = Join-Path $ProjectDir "bin\Release\$Framework\publish"
    $signed = Get-ChildItem $publishDir -Filter '*-Signed.apk' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $signed) { Fail "no *-Signed.apk in $publishDir" }

    $apkOut = Join-Path $root "dist\qada-$version.apk"
    Copy-Item $signed.FullName $apkOut -Force
    Ok "dist\qada-$version.apk ($([math]::Round((Get-Item $apkOut).Length / 1KB)) kB)"
  }

  # ---------------------------------------------------------------- checksums
  Step 'Checksums'
  $lines = @()
  foreach ($file in @($webZip) + @($apkOut)) {
    if (-not $file) { continue }
    $hash = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLower()
    $name = Split-Path $file -Leaf
    "$hash  $name" | Set-Content -Path "$file.sha256" -Encoding ASCII
    $lines += "$hash  $name"
    Ok $name
  }
  if ($lines.Count -gt 0) {
    $lines -join "`n" | Set-Content -Path 'dist/SHA256SUMS.txt' -Encoding ASCII
    Ok 'dist\SHA256SUMS.txt'
  }

  # ------------------------------------------------------------- remember path
  if ($ProjectDir) {
    $savedConfig = [ordered]@{
      projectDir = $ProjectDir
      keystore   = $Keystore
      keyAlias   = $KeyAlias
      framework  = $Framework
    }
    $savedConfig | ConvertTo-Json | Set-Content -Path $configPath -Encoding UTF8
  }

  # ----------------------------------------------------------------- summary
  Step 'Release files'
  Get-ChildItem dist -File | Sort-Object Name | ForEach-Object {
    Write-Host ("   {0,-30} {1,8:N0} kB" -f $_.Name, ($_.Length / 1KB))
  }

  Write-Host ''
  Write-Host "  Next: GitHub -> Releases -> Draft a new release"
  Write-Host "        tag   v$version"
  Write-Host "        title QadaPrayer $version - <short phrase>"
  Write-Host '        drag the files from dist\ into the release, then publish.'
} finally {
  Pop-Location
}
