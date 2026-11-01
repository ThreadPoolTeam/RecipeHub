# RecipeHub Backend Multi-Service Stopper (PowerShell)
$ErrorActionPreference = 'SilentlyContinue'
$pidsFile = Join-Path $PSScriptRoot ".backend-pids.json"

if (!(Test-Path $pidsFile)) {
    Write-Host "Không tìm thấy file PIDs ($pidsFile). Không có tiến trình backend nào được lưu." -ForegroundColor Yellow
    exit 0
}

Write-Host "=== Đang dừng 7 Backend Services RecipeHub ===" -ForegroundColor Yellow

try {
    $entries = Get-Content -Path $pidsFile -Raw | ConvertFrom-Json
    foreach ($entry in $entries) {
        $parentPid = $entry.Pid
        Write-Host " -> Dừng $($entry.Name) (PID $parentPid)..." -ForegroundColor DarkYellow
        # Dừng các child process của dotnet run
        Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ParentProcessId -eq $parentPid } | ForEach-Object {
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
        Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue
    }
}
finally {
    Remove-Item -Path $pidsFile -Force -ErrorAction SilentlyContinue
}

Write-Host "Đã dừng các tiến trình backend RecipeHub." -ForegroundColor Green
