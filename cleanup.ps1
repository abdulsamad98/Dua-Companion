# Cleanup script for Next.js dev server
Write-Host "Cleaning up Node processes and lock files..." -ForegroundColor Yellow

# Kill all Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Remove lock file and dev directory
if (Test-Path ".next\dev\lock") {
    Remove-Item ".next\dev\lock" -Force -ErrorAction SilentlyContinue
    Write-Host "Removed lock file" -ForegroundColor Green
}

if (Test-Path ".next\dev") {
    Remove-Item ".next\dev" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Removed .next\dev directory" -ForegroundColor Green
}

Write-Host "Cleanup complete! You can now run 'npm run dev'" -ForegroundColor Green

