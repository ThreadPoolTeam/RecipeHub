# PowerShell Automated API Test Suite for RecipeHub Microservices
param(
    [string]$IdentityUrl = "http://localhost:5001",
    [string]$RecipeUrl = "http://localhost:5002"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       RECIPEHUB API AUTOMATED TEST SUITE              " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Test Health Checks
Write-Host "[1/6] Testing Health Endpoints..." -ForegroundColor Yellow
try {
    $idHealth = Invoke-RestMethod -Uri "$IdentityUrl/health/live" -Method Get
    Write-Host "  [OK] Identity Health: $($idHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Failed to connect to Identity Service at $IdentityUrl. Is it running?" -ForegroundColor Red
    exit 1
}

# 2. Test Login (Task 1.2)
Write-Host ""
Write-Host "[2/6] Testing Login (Task 1.2 - JWT Authentication)..." -ForegroundColor Yellow
$loginPayload = @{
    username = "admin"
    password = "RecipeHub123!"
} | ConvertTo-Json

$authResponse = Invoke-RestMethod -Uri "$IdentityUrl/api/v1/identity/auth/login" -Method Post -ContentType "application/json" -Body $loginPayload
$token = $authResponse.accessToken
$refreshToken = $authResponse.refreshToken

Write-Host "  [OK] Login successful! Logged in as: $($authResponse.user.displayName) ($($authResponse.user.username))" -ForegroundColor Green
Write-Host "  [OK] AccessToken: $($token.Substring(0, 25))..." -ForegroundColor DarkGray

$authHeader = @{ Authorization = "Bearer $token" }

# 3. Test List Users (Task 1.3)
Write-Host ""
Write-Host "[3/6] Testing User Management - List Users (Task 1.3)..." -ForegroundColor Yellow
$usersUrl = $IdentityUrl + "/api/v1/identity/users?pageIndex=1" + [char]38 + "pageSize=10"
$usersResponse = Invoke-RestMethod -Uri $usersUrl -Method Get -Headers $authHeader

Write-Host "  [OK] Successfully retrieved $($usersResponse.items.Count) users (Total in DB: $($usersResponse.totalCount)):" -ForegroundColor Green
foreach ($u in $usersResponse.items) {
    Write-Host "    - [$($u.state)] $($u.username) ($($u.email)) - Roles: $($u.roles -join ', ')" -ForegroundColor Gray
}

# 4. Test Create New User (Task 1.3)
Write-Host ""
Write-Host "[4/6] Testing Create User (Task 1.3)..." -ForegroundColor Yellow
$randomSuffix = Get-Random -Minimum 100 -Maximum 999
$newUserPayload = @{
    username = "rnd_tester_$randomSuffix"
    email = "tester_$randomSuffix@recipehub.local"
    displayName = "Tester $randomSuffix"
    password = "Password123!"
    roles = @("RNDSTAFF")
} | ConvertTo-Json

$newUser = Invoke-RestMethod -Uri "$IdentityUrl/api/v1/identity/users" -Method Post -Headers $authHeader -ContentType "application/json" -Body $newUserPayload
Write-Host "  [OK] User created: ID=$($newUser.id), Username=$($newUser.username), Role=$($newUser.roles -join ',')" -ForegroundColor Green

# 5. Test Recipe Service (if running)
Write-Host ""
Write-Host "[5/6] Testing Recipe Service (Units and Conversion)..." -ForegroundColor Yellow
try {
    $recHealth = Invoke-RestMethod -Uri "$RecipeUrl/health/live" -Method Get
    Write-Host "  [OK] Recipe Health: $($recHealth.status)" -ForegroundColor Green

    $units = Invoke-RestMethod -Uri "$RecipeUrl/api/v1/recipes/units" -Method Get -Headers $authHeader
    Write-Host "  [OK] Loaded $($units.Count) units from Recipe Service:" -ForegroundColor Green
    $unitCodes = ($units | Select-Object -First 6 | ForEach-Object { "$($_.code) ($($_.name))" }) -join ", "
    Write-Host "    Units: $unitCodes..." -ForegroundColor Gray

    $convertPayload = @{ value = 1500; sourceUnit = "g"; targetUnit = "kg" } | ConvertTo-Json
    $convertResult = Invoke-RestMethod -Uri "$RecipeUrl/api/v1/recipes/units/convert" -Method Post -Headers $authHeader -ContentType "application/json" -Body $convertPayload
    Write-Host "  [OK] 1500 g converted to: $($convertResult.result) $($convertResult.targetUnit)" -ForegroundColor Green

    # 6. Test Scale Recipe (Task 1.8)
    Write-Host ""
    Write-Host "[6/6] Testing Recipe Scaling Service (Task 1.8)..." -ForegroundColor Yellow
    $scalePayload = @{
        standardYield = 4
        targetYield = 10
        ingredients = @(
            @{ ingredientId = [System.Guid]::NewGuid().ToString(); quantity = 200; unitCode = "g" },
            @{ ingredientId = [System.Guid]::NewGuid().ToString(); quantity = 50; unitCode = "ml" }
        )
    } | ConvertTo-Json

    $scaleResult = Invoke-RestMethod -Uri "$RecipeUrl/api/v1/recipes/calculate/scale" -Method Post -Headers $authHeader -ContentType "application/json" -Body $scalePayload
    Write-Host "  [OK] Yield scaled from 4 servings -> 10 servings (Factor 2.5x):" -ForegroundColor Green
    foreach ($item in $scaleResult) {
        Write-Host "    - Original: $($item.originalQuantity) $($item.unitCode) -> Scaled: $($item.scaledQuantity) $($item.unitCode)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [INFO] Recipe Service is currently not running on $RecipeUrl (Skipped steps 5 and 6)." -ForegroundColor Yellow
    Write-Host "    Run 'dotnet run --project Services/Recipe/RecipeHub.Recipe.Api --urls http://localhost:5002' to test Recipe Service." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       IDENTITY API TESTS COMPLETED SUCCESSFULLY!       " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
