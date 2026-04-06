$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDirectory
$packageJsonPath = Join-Path $projectRoot 'package.json'
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

$distDirectory = Join-Path $projectRoot 'dist'
$stagingDirectory = Join-Path $distDirectory 'package'
$zipFileName = "$($packageJson.name)-v$($packageJson.version).zip"
$zipFilePath = Join-Path $distDirectory $zipFileName

if (Test-Path $stagingDirectory) {
    Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
}

if (Test-Path $zipFilePath) {
    Remove-Item -LiteralPath $zipFilePath -Force
}

New-Item -ItemType Directory -Path $distDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $stagingDirectory -Force | Out-Null

$filesToCopy = @(
    'package.json',
    'index.html',
    'style.css',
    'app.js',
    'sw.js',
    'site.webmanifest',
    'favicon.svg',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'README.md',
    'PRODUCT-LISTING.md',
    'CHANGELOG.md',
    'scripts\build-product.ps1'
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $projectRoot $file
    $destinationPath = Join-Path $stagingDirectory $file
    $destinationDirectory = Split-Path -Parent $destinationPath

    if (-not (Test-Path $destinationDirectory)) {
        New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    }

    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
}

Compress-Archive -Path (Join-Path $stagingDirectory '*') -DestinationPath $zipFilePath
Write-Output "Created package: $zipFilePath"
