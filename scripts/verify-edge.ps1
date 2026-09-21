[CmdletBinding()]
param(
    [string]$BaseUrl = "https://ai-traffic-cleaner.pages.dev"
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd('/')

function Invoke-EdgeCase {
    param(
        [string]$Name,
        [string]$Path,
        [string[]]$Headers = @()
    )

    $headerFile = [System.IO.Path]::GetTempFileName()
    $bodyFile = [System.IO.Path]::GetTempFileName()
    try {
        $curlArgs = @("-sS", "-D", $headerFile, "-o", $bodyFile, "-w", "%{http_code}")
        foreach ($header in $Headers) {
            $curlArgs += @("-H", $header)
        }
        $curlArgs += "$BaseUrl$Path"

        $status = (& curl.exe @curlArgs).Trim()
        $responseHeaders = Get-Content $headerFile -Raw
        $body = Get-Content $bodyFile -Raw

        [pscustomobject]@{
            Name = $Name
            Status = [int]$status
            Headers = $responseHeaders
            Body = $body
        }
    }
    finally {
        Remove-Item $headerFile, $bodyFile -Force -ErrorAction SilentlyContinue
    }
}

function Assert-Equal {
    param([string]$Name, $Actual, $Expected)
    if ($Actual -ne $Expected) {
        throw "$Name failed: expected [$Expected], received [$Actual]"
    }
    Write-Host "PASS $Name"
}

function Assert-Match {
    param([string]$Name, [string]$Actual, [string]$Pattern)
    if ($Actual -notmatch $Pattern) {
        throw "$Name failed: pattern [$Pattern] was not found"
    }
    Write-Host "PASS $Name"
}

$catalog = Invoke-EdgeCase -Name "llms catalog" -Path "/llms.txt"
Assert-Equal "llms status" $catalog.Status 200
Assert-Match "llms content type" $catalog.Headers "(?im)^Content-Type:\s*text/plain"
Assert-Match "llms body" $catalog.Body "(?i)#\s+Store Catalog"

$aiBot = Invoke-EdgeCase -Name "GPTBot redirect" -Path "/" -Headers @(
    "User-Agent: Mozilla/5.0 (compatible; GPTBot/1.0)",
    "Accept: text/html",
    "Accept-Language: en-US,en;q=0.9"
)
Assert-Equal "GPTBot status" $aiBot.Status 302
Assert-Match "GPTBot location" $aiBot.Headers "(?im)^Location:\s*[^\r\n]*/llms\.txt"

$scraper = Invoke-EdgeCase -Name "scraper block" -Path "/" -Headers @(
    "User-Agent: python-requests/2.31",
    "Accept: */*"
)
Assert-Equal "scraper status" $scraper.Status 403

$browser = Invoke-EdgeCase -Name "browser passthrough" -Path "/" -Headers @(
    "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.9"
)
Assert-Equal "browser status" $browser.Status 200

Write-Host "Edge verification passed for $BaseUrl"
