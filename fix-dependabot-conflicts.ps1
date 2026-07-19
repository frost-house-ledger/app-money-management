# Resolve Dependabot PR conflicts by rebasing all branches to master

$branches = @(
    "dependabot/npm_and_yarn/concurrently-10.0.3",
    "dependabot/npm_and_yarn/electron-43.1.1",
    "dependabot/npm_and_yarn/react-19.2.7",
    "dependabot/npm_and_yarn/vite-8.1.5",
    "dependabot/npm_and_yarn/babel/core-8.0.1",
    "dependabot/npm_and_yarn/better-sqlite3-12.11.1",
    "dependabot/npm_and_yarn/capacitor/android-8.4.2",
    "dependabot/npm_and_yarn/capacitor/cli-8.4.2",
    "dependabot/npm_and_yarn/electron/rebuild-4.2.0",
    "dependabot/npm_and_yarn/wait-on-9.0.10",
    "dependabot/gradle/android/com.android.tools.build-gradle-9.3.0",
    "dependabot/gradle/android/com.google.gms-google-services-4.5.0",
    "dependabot/gradle/android/gradle-wrapper-9.6.1",
    "dependabot/github_actions/actions/cache-6",
    "dependabot/github_actions/actions/checkout-7",
    "dependabot/github_actions/actions/setup-node-7",
    "dependabot/github_actions/actions/upload-artifact-7"
)

Write-Host "Starting to resolve Dependabot conflicts..." -ForegroundColor Green

foreach ($branch in $branches) {
    Write-Host ""
    Write-Host "Processing: $branch" -ForegroundColor Yellow
    
    # Checkout branch
    git checkout $branch 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to checkout $branch" -ForegroundColor Red
        continue
    }
    
    # Try merge
    git merge origin/master --no-commit --no-ff 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        # No conflicts
        Write-Host "✓ No conflicts - committing merge" -ForegroundColor Green
        git commit -m "Merge master to resolve dependency updates"
        git push origin $branch
    } else {
        # Has conflicts - resolve by taking theirs (master version)
        Write-Host "✗ Conflicts detected - resolving by taking master version" -ForegroundColor Yellow
        
        # Take theirs (master) for package files
        git checkout --theirs package.json package-lock.json 2>&1 | Out-Null
        git add package.json package-lock.json
        
        # For gradle files
        if (Test-Path "android/build.gradle") {
            git checkout --theirs "android/build.gradle" "android/gradle/wrapper/gradle-wrapper.properties" "android/gradlew" "android/gradlew.bat" 2>&1 | Out-Null
            git add "android/build.gradle" "android/gradle/wrapper/gradle-wrapper.properties" "android/gradlew" "android/gradlew.bat" 2>&1 | Out-Null
        }
        
        # Add all remaining conflicts (take ours for branch-specific changes)
        git add -A 2>&1 | Out-Null
        
        # Complete merge
        git commit -m "Merge master to resolve dependency conflicts (taking master version)"
        git push origin $branch
    }
    
    # Reset to clean state
    git merge --abort 2>&1 | Out-Null
}

# Return to master
git checkout master
Write-Host ""
Write-Host "Conflict resolution complete!" -ForegroundColor Green
