param(
    [string]$GatewayUrl = 'http://localhost:5000',
    [string]$FrontendUrl = 'http://localhost:3000',
    [switch]$KeepFixtures
)
$ErrorActionPreference = 'Stop'
$checks = [System.Collections.Generic.List[string]]::new()
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 10)
$createdUsers = [System.Collections.Generic.List[string]]::new()
$createdRecipes = [System.Collections.Generic.List[string]]::new()
$createdIngredients = [System.Collections.Generic.List[string]]::new()
$admin = $null
$rnd = $null

function Api([string]$Method, [string]$Path, $Body = $null, [string]$Token = '', [int]$Expected = 200, [string]$Base = $GatewayUrl) {
    $headers = @{}
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $args = @{ Method = $Method; Uri = "$Base/$Path"; Headers = $headers; SkipHttpErrorCheck = $true; TimeoutSec = 20 }
    if ($null -ne $Body) { $args.Body = ($Body | ConvertTo-Json -Depth 15 -Compress); $args.ContentType = 'application/json' }
    $response = Invoke-WebRequest @args
    if ([int]$response.StatusCode -ne $Expected) { throw "$Method $Path expected $Expected, received $($response.StatusCode): $($response.Content)" }
    $checks.Add("$Method $Path -> $Expected")
    if ($response.Content) { return ($response.Content | ConvertFrom-Json) }
}
function Check([bool]$Condition, [string]$Message) { if (!$Condition) { throw $Message }; $checks.Add($Message) }

try {
    $admin = Api POST 'api/v1/identity/auth/login' @{ username = 'admin@recipehub.demo'; password = 'Demo@1234' }
    Check ($admin.user.role -eq 'admin') 'Admin JWT login'
    Api GET 'api/v1/identity/users' $null '' 401 | Out-Null
    Api POST 'api/v1/identity/auth/login' @{ username = 'admin@recipehub.demo'; password = 'wrong' } '' 401 | Out-Null
    Api PUT "api/v1/identity/users/$($admin.user.id)/status" @{ isActive = $false } $admin.accessToken 409 | Out-Null
    Api GET 'api/v1/identity/users?page=0' $null $admin.accessToken 400 | Out-Null

    $rdUser = Api POST 'api/v1/identity/users' @{ email = "qa-rnd-$suffix@recipehub.local"; fullName = "QA R&D $suffix"; role = 'rnd'; password = 'QaTest@1234' } $admin.accessToken 201
    $createdUsers.Add($rdUser.id)
    $viewerUser = Api POST 'api/v1/identity/users' @{ email = "qa-viewer-$suffix@recipehub.local"; fullName = "QA Viewer $suffix"; role = 'viewer'; password = 'QaTest@1234' } $admin.accessToken 201
    $createdUsers.Add($viewerUser.id)
    $rnd = Api POST 'api/v1/identity/auth/login' @{ username = $rdUser.email; password = 'QaTest@1234' }
    Api GET 'api/v1/identity/users' $null $rnd.accessToken 403 | Out-Null
    $filtered = Api GET "api/v1/identity/users?search=$suffix&role=viewer&state=active&page=1&pageSize=1" $null $admin.accessToken
    Check ($filtered.totalCount -eq 1 -and $filtered.items[0].id -eq $viewerUser.id) 'Server search/role/state/pagination'

    $units = Api GET 'api/v1/recipes/catalogs/units' $null $rnd.accessToken
    $categories = Api GET 'api/v1/recipes/ingredient-categories' $null $rnd.accessToken
    $grams = $units | Where-Object code -eq 'g' | Select-Object -First 1
    $ml = $units | Where-Object code -eq 'ml' | Select-Object -First 1
    $serving = $units | Where-Object code -eq 'serving' | Select-Object -First 1
    $ingredientBody = @{ code = "QA-$suffix"; name = "QA Tea $suffix"; categoryId = $categories[0].id; defaultUnitId = $grams.id; description = 'Task integration fixture' }
    $ingredient = Api POST 'api/v1/recipes/ingredients' $ingredientBody $rnd.accessToken 201
    $createdIngredients.Add($ingredient.id)
    $ingredientBody.name = "QA Tea Updated $suffix"
    $updated = Api PUT "api/v1/recipes/ingredients/$($ingredient.id)" $ingredientBody $rnd.accessToken
    Check ($updated.name -eq $ingredientBody.name) 'Ingredient update persisted'
    $listed = Api GET "api/v1/recipes/ingredients?query=$suffix" $null $rnd.accessToken
    Check (@($listed).Count -eq 1) 'Ingredient list uses backend catalog'

    $recipeBody = @{ code = "QA-REC-$suffix"; name = "QA Recipe $suffix"; yieldQuantity = 1; yieldUnitId = $serving.id
        ingredients = @(@{ ingredientId = $ingredient.id; unitId = $grams.id; quantity = 10; stageName = 'Brew'; note = 'QA' })
        steps = @(@{ title = 'Pha chế'; description = 'Cân nguyên liệu và pha chế theo định lượng.'; durationSeconds = 30; media = @() }) }
    $recipe = Api POST 'api/v1/recipes' $recipeBody $rnd.accessToken 201
    $createdRecipes.Add($recipe.id)
    $published = Api POST "api/v1/recipes/$($recipe.id)/versions/$($recipe.versionId)/publish" $null $rnd.accessToken
    Check ($published.versionStatus -eq 'published') 'Recipe SOP published'
    $otherBody = $recipeBody.Clone(); $otherBody.code = "QA-DRAFT-$suffix"; $otherBody.name = "QA Draft $suffix"
    $draft = Api POST 'api/v1/recipes' $otherBody $rnd.accessToken 201
    $createdRecipes.Add($draft.id)
    Api PUT "api/v1/identity/users/$($viewerUser.id)" @{ fullName = $viewerUser.fullName; role = 'viewer' } $admin.accessToken | Out-Null
    $viewer = Api POST 'api/v1/identity/auth/login' @{ username = $viewerUser.email; password = 'QaTest@1234' }
    $visible = Api GET "api/v1/recipes/$($recipe.id)" $null $viewer.accessToken
    Check ($visible.versionStatus -eq 'published') 'Viewer can read published SOP without assigned recipe IDs'
    Api GET "api/v1/recipes/$($draft.id)" $null $viewer.accessToken 403 | Out-Null
    Api GET "api/v1/recipes/$([Guid]::NewGuid())" $null $viewer.accessToken 403 | Out-Null
    Api POST 'api/v1/recipes/ingredients' $ingredientBody $viewer.accessToken 403 | Out-Null

    # A newer draft must not hide or leak into the published version for Viewer.
    $recipeBody.name = "QA New Draft $suffix"
    Api PUT "api/v1/recipes/$($recipe.id)" $recipeBody $rnd.accessToken | Out-Null
    $stillPublished = Api GET "api/v1/recipes/$($recipe.id)" $null $viewer.accessToken
    Check ($stillPublished.versionId -eq $published.versionId) 'Viewer still receives published version while R&D edits newer draft'
    $viewerList = Api GET 'api/v1/recipes?page=1&pageSize=100' $null $viewer.accessToken
    Check ($viewerList.totalCount -eq 1 -and $viewerList.items[0].versionId -eq $published.versionId) 'Viewer search applies scope/status before pagination'

    $lines = @(@{ ingredientId = $ingredient.id; quantity = 10; unit = 'g'; order = 1; notes = 'QA' }, @{ ingredientId = $ingredient.id; quantity = 200; unit = 'ml'; order = 2; stageNote = 'Dilute' })
    $scale = Api POST 'api/v1/recipes/calculate/scale' @{ ingredients = $lines; standardYield = 1; targetYield = 5 } $viewer.accessToken
    Check ($scale.ingredients[0].quantity -eq 50 -and $scale.ingredients[1].quantity -eq 1000) 'Scale 5x returns exact quantities and line order'
    $totals = Api POST 'api/v1/recipes/calculate/totals' @{ ingredients = $scale.ingredients } $viewer.accessToken
    Check ($totals.totals.Count -eq 2) 'Totals separate mass and volume'
    $converted = Api POST 'api/v1/recipes/units/convert' @{ value = 1000; sourceUnit = 'ml'; targetUnit = 'l' } $viewer.accessToken
    Check ($converted.convertedValue -eq 1) '1000 ml = 1 l'
    $smallConversion = Api POST 'api/v1/recipes/units/convert' @{ value = 0.1; sourceUnit = 'mg'; targetUnit = 'kg' } $viewer.accessToken
    Check ($smallConversion.convertedValue -eq 0.0000001) '0.1 mg = 0.0000001 kg, not rounded to zero'
    $smallScale = Api POST 'api/v1/recipes/calculate/scale' @{ ingredients = @(@{ ingredientId = $ingredient.id; quantity = 100000000000; unit = 'g'; order = 1 }); standardYield = 100000000000; targetYield = 0.000001 } $viewer.accessToken
    Check ($smallScale.ingredients[0].quantity -eq 0.000001 -and $smallScale.multiplier -gt 0) 'Very small scaling factor stays positive without decimal overflow'
    Api POST 'api/v1/recipes/units/convert' @{ value = 1; sourceUnit = 'g'; targetUnit = 'ml' } $viewer.accessToken 400 | Out-Null
    Api POST 'api/v1/recipes/calculate/scale' @{ ingredients = $lines; standardYield = 1; targetYield = 0 } $viewer.accessToken 400 | Out-Null

    $proxy = Api POST 'api/backend/api/v1/identity/auth/login' @{ username = $rdUser.email; password = 'QaTest@1234' } '' 200 $FrontendUrl
    Api GET 'api/backend/api/v1/recipes/catalogs/units' $null $proxy.accessToken 200 $FrontendUrl | Out-Null
    Api POST 'api/backend/api/v1/identity/auth/logout' $null $proxy.accessToken 204 $FrontendUrl | Out-Null
    Api GET 'api/v1/recipes/catalogs/units' $null $proxy.accessToken 401 | Out-Null

    Api PUT "api/v1/identity/users/$($viewerUser.id)/status" @{ isActive = $false } $admin.accessToken | Out-Null
    Api GET 'api/v1/recipes/catalogs/units' $null $viewer.accessToken 401 | Out-Null
    Api POST 'api/v1/identity/auth/login' @{ username = $viewerUser.email; password = 'QaTest@1234' } '' 403 | Out-Null
    Api PUT "api/v1/identity/users/$($viewerUser.id)/status" @{ isActive = $true } $admin.accessToken | Out-Null
    $viewer = Api POST 'api/v1/identity/auth/login' @{ username = $viewerUser.email; password = 'QaTest@1234' }
    Api PUT 'api/v1/identity/auth/password' @{ currentPassword = 'QaTest@1234'; newPassword = 'QaChanged@1234' } $viewer.accessToken 204 | Out-Null
    Api GET 'api/v1/identity/auth/me' $null $viewer.accessToken 401 | Out-Null
    $viewer = Api POST 'api/v1/identity/auth/login' @{ username = $viewerUser.email; password = 'QaChanged@1234' }
    Api PUT "api/v1/identity/users/$($viewerUser.id)/password" @{ newPassword = 'QaTest@1234' } $admin.accessToken 204 | Out-Null
    Api GET 'api/v1/identity/auth/me' $null $viewer.accessToken 401 | Out-Null

    [pscustomobject]@{ passed = $checks.Count; checks = $checks; rndEmail = $rdUser.email; viewerEmail = $viewerUser.email; recipeId = $recipe.id; ingredientId = $ingredient.id; fixturesKept = [bool]$KeepFixtures } | ConvertTo-Json -Depth 5
}
finally {
    if ($admin) {
        if (!$KeepFixtures) {
            foreach ($id in $createdRecipes) { Api DELETE "api/v1/recipes/$id" $null $admin.accessToken 204 | Out-Null }
            foreach ($id in $createdIngredients) { Api DELETE "api/v1/recipes/ingredients/$id" $null $admin.accessToken 204 | Out-Null }
            foreach ($id in $createdUsers) { Api PUT "api/v1/identity/users/$id/status" @{ isActive = $false } $admin.accessToken | Out-Null }
        }
        Api POST 'api/v1/identity/auth/logout' $null $admin.accessToken 204 | Out-Null
    }
}
