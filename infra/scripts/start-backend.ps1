param(
    [switch]$SkipBuild
)

# RecipeHub Backend Multi-Service Launcher (PowerShell)
$ErrorActionPreference = 'Stop'

# Tìm root repository bằng file Solution
$dir = $PSScriptRoot
while ($dir -and !(Test-Path (Join-Path $dir "src/backend/RecipeHub.sln"))) {
    $parent = Split-Path -Parent $dir
    if ($parent -eq $dir) { break }
    $dir = $parent
}
$repoRoot = $dir

if (!(Test-Path (Join-Path $repoRoot "src/backend/RecipeHub.sln"))) {
    Write-Error "Không tìm thấy thư mục gốc repository chứa 'src/backend/RecipeHub.sln'."
    exit 1
}
$projects = @(
    "src/backend/Gateway/RecipeHub.Gateway",
    "src/backend/Services/Identity/RecipeHub.Identity.Api",
    "src/backend/Services/Recipe/RecipeHub.Recipe.Api",
    "src/backend/Services/Content/RecipeHub.Content.Api",
    "src/backend/Services/Audit/RecipeHub.Audit.Api",
    "src/backend/Services/Quiz/RecipeHub.Quiz.Api",
    "src/backend/Workers/RecipeHub.BackgroundWorker"
)
Write-Host "=== Khởi động 7 Backend Services RecipeHub ===" -ForegroundColor Cyan

if (!$SkipBuild) {
    Write-Host " -> Biên dịch Solution 1 lần duy nhất để tránh tranh chấp lock DLL..." -ForegroundColor Cyan
    dotnet build (Join-Path $repoRoot "src/backend/RecipeHub.sln") -c Debug -v q --nologo
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Biên dịch thất bại, dừng khởi động."
        exit 1
    }
}

$pidsFile = Join-Path $PSScriptRoot ".backend-pids.json"
$startedPids = [System.Collections.Generic.List[object]]::new()
foreach ($relPath in $projects) {
    $fullPath = Join-Path $repoRoot $relPath
    if (!(Test-Path $fullPath)) {
        Write-Error "Không tìm thấy project tại: $fullPath"
        exit 1
    }
    $serviceName = Split-Path $relPath -Leaf
    Write-Host " -> Đang khởi chạy $serviceName..." -ForegroundColor Yellow
    $proc = Start-Process -FilePath "dotnet" `
        -ArgumentList "run --project `"$fullPath`" --no-build" `
        -WorkingDirectory $repoRoot `
        -PassThru

    if ($proc) {
        $startedPids.Add([PSCustomObject]@{
            Name = $serviceName
            Pid  = $proc.Id
        })
    }
}

$startedPids | ConvertTo-Json | Set-Content -Path $pidsFile -Encoding UTF8

Write-Host "`nĐã kích hoạt 7 backend services (PIDs lưu tại $pidsFile)." -ForegroundColor Green
Write-Host "Gateway:            http://localhost:5262 (Docker: 5000)" -ForegroundColor Cyan
Write-Host "Recipe API Swagger: http://localhost:5002/swagger" -ForegroundColor Cyan
Write-Host "Để dừng toàn bộ:    powershell $(Join-Path $PSScriptRoot 'stop-backend.ps1')" -ForegroundColor Gray
