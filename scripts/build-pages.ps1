$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDirectory
$distDirectory = Join-Path $projectRoot 'dist'
$pagesDirectory = Join-Path $distDirectory 'pages'

if (Test-Path $pagesDirectory) {
    Remove-Item -LiteralPath $pagesDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $pagesDirectory -Force | Out-Null

$filesToCopy = @(
    'index.html',
    'style.css',
    'app.js',
    'sw.js',
    'site.webmanifest',
    'favicon.svg',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png'
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $projectRoot $file
    $destinationPath = Join-Path $pagesDirectory $file
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
}

New-Item -ItemType File -Path (Join-Path $pagesDirectory '.nojekyll') -Force | Out-Null
Write-Output "Created GitHub Pages bundle: $pagesDirectory"
