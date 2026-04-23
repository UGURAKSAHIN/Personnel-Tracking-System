$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$')]
    [string]$BucketName,

    [string]$Region = '',

    [switch]$SkipBuild
)

function Invoke-Aws {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    & aws @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI command failed: aws $($Arguments -join ' ')"
    }
}

function Resolve-Region {
    param([string]$RequestedRegion)

    if ($RequestedRegion) {
        return $RequestedRegion
    }

    if ($env:AWS_REGION) {
        return $env:AWS_REGION
    }

    if ($env:AWS_DEFAULT_REGION) {
        return $env:AWS_DEFAULT_REGION
    }

    $configuredRegion = (& aws configure get region 2>$null).Trim()

    if ($configuredRegion) {
        return $configuredRegion
    }

    return 'eu-central-1'
}

function Get-S3WebsiteEndpoint {
    param(
        [string]$Bucket,
        [string]$AwsRegion
    )

    $dashEndpointRegions = @(
        'us-east-1',
        'us-west-1',
        'us-west-2',
        'ap-southeast-1',
        'ap-southeast-2',
        'ap-northeast-1',
        'eu-west-1',
        'sa-east-1'
    )

    if ($dashEndpointRegions -contains $AwsRegion) {
        return "http://$Bucket.s3-website-$AwsRegion.amazonaws.com"
    }

    return "http://$Bucket.s3-website.$AwsRegion.amazonaws.com"
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDirectory
$pagesDirectory = Join-Path $projectRoot 'dist\pages'
$buildScript = Join-Path $scriptDirectory 'build-pages.ps1'
$Region = Resolve-Region $Region

Write-Output "Using AWS region: $Region"
Write-Output 'Checking AWS credentials...'
Invoke-Aws sts get-caller-identity --region $Region --output json

if (-not $SkipBuild) {
    Write-Output 'Building static bundle...'
    & powershell -NoProfile -ExecutionPolicy Bypass -File $buildScript

    if ($LASTEXITCODE -ne 0) {
        throw 'Static bundle build failed.'
    }
}

if (-not (Test-Path $pagesDirectory)) {
    throw "Missing static bundle directory: $pagesDirectory"
}

Write-Output "Checking bucket: $BucketName"
& aws s3api head-bucket --bucket $BucketName --region $Region *> $null

if ($LASTEXITCODE -ne 0) {
    Write-Output "Creating bucket: $BucketName"

    if ($Region -eq 'us-east-1') {
        Invoke-Aws s3api create-bucket --bucket $BucketName --region $Region
    } else {
        Invoke-Aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration "LocationConstraint=$Region"
    }
} else {
    Write-Output 'Bucket already exists and is accessible.'
}

Write-Output 'Configuring public static website hosting...'
Invoke-Aws s3api put-public-access-block `
    --bucket $BucketName `
    --region $Region `
    --public-access-block-configuration 'BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false'

$websiteConfigPath = Join-Path ([System.IO.Path]::GetTempPath()) "pts-website-$BucketName.json"
$bucketPolicyPath = Join-Path ([System.IO.Path]::GetTempPath()) "pts-policy-$BucketName.json"

@'
{
  "IndexDocument": {
    "Suffix": "index.html"
  },
  "ErrorDocument": {
    "Key": "index.html"
  }
}
'@ | Set-Content -LiteralPath $websiteConfigPath -Encoding utf8

@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@ | Set-Content -LiteralPath $bucketPolicyPath -Encoding utf8

Invoke-Aws s3api put-bucket-website --bucket $BucketName --region $Region --website-configuration "file://$websiteConfigPath"
Invoke-Aws s3api put-bucket-policy --bucket $BucketName --region $Region --policy "file://$bucketPolicyPath"

Write-Output 'Uploading static bundle...'
Invoke-Aws s3 sync $pagesDirectory "s3://$BucketName/" --delete --region $Region --cache-control 'public,max-age=3600'

Invoke-Aws s3 cp (Join-Path $pagesDirectory 'index.html') "s3://$BucketName/index.html" --region $Region --content-type 'text/html; charset=utf-8' --cache-control 'no-cache'
Invoke-Aws s3 cp (Join-Path $pagesDirectory 'sw.js') "s3://$BucketName/sw.js" --region $Region --content-type 'text/javascript; charset=utf-8' --cache-control 'no-cache'
Invoke-Aws s3 cp (Join-Path $pagesDirectory 'site.webmanifest') "s3://$BucketName/site.webmanifest" --region $Region --content-type 'application/manifest+json; charset=utf-8' --cache-control 'no-cache'

$websiteUrl = Get-S3WebsiteEndpoint -Bucket $BucketName -AwsRegion $Region

Write-Output ''
Write-Output 'AWS S3 deployment complete.'
Write-Output "Website URL: $websiteUrl"
