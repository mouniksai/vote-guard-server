# VoteGuard Server — Test Runner (PowerShell)
# Usage: .\testing\run-tests.ps1 [command]

param (
    [string]$Command = "help"
)

Write-Host ""
Write-Host "🗳️  VoteGuard Server — Test Suite" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

switch ($Command) {
    "all" {
        Write-Host "▶ Running all tests..." -ForegroundColor Blue
        npm test
    }
    "watch" {
        Write-Host "▶ Running tests in watch mode..." -ForegroundColor Blue
        npm run test:watch
    }
    "coverage" {
        Write-Host "▶ Running tests with coverage report..." -ForegroundColor Blue
        npm test -- --coverage
    }
    "unit" {
        Write-Host "▶ Running unit tests only..." -ForegroundColor Blue
        npm run test:unit
    }
    "controllers" {
        Write-Host "▶ Running controller tests..." -ForegroundColor Blue
        npx jest --testPathPattern="testing/unit/controllers" --verbose
    }
    "middleware" {
        Write-Host "▶ Running middleware tests..." -ForegroundColor Blue
        npx jest --testPathPattern="testing/unit/middleware" --verbose
    }
    "utils" {
        Write-Host "▶ Running utility tests..." -ForegroundColor Blue
        npx jest --testPathPattern="testing/unit/utils" --verbose
    }
    "integration" {
        Write-Host "▶ Running integration tests..." -ForegroundColor Blue
        npx jest --testPathPattern="testing/integration" --verbose
    }
    "auth" {
        Write-Host "▶ Running auth controller tests..." -ForegroundColor Blue
        npx jest -- authController --verbose
    }
    "vote" {
        Write-Host "▶ Running vote controller tests..." -ForegroundColor Blue
        npx jest -- voteController --verbose
    }
    "clean" {
        Write-Host "▶ Cleaning test artifacts..." -ForegroundColor Blue
        if (Test-Path "coverage") { Remove-Item -Recurse -Force "coverage" }
        if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }
        Write-Host "✅ Cleaned!" -ForegroundColor Green
    }
    default {
        Write-Host "Usage: .\testing\run-tests.ps1 [command]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  all          - Run all tests"
        Write-Host "  watch        - Run tests in watch mode"
        Write-Host "  coverage     - Run tests with coverage report"
        Write-Host "  unit         - Run unit tests only"
        Write-Host "  controllers  - Run controller tests"
        Write-Host "  middleware   - Run middleware tests"
        Write-Host "  utils        - Run utility tests"
        Write-Host "  integration  - Run integration tests"
        Write-Host "  auth         - Run auth controller tests"
        Write-Host "  vote         - Run vote controller tests"
        Write-Host "  clean        - Clean test artifacts"
        Write-Host ""
        Write-Host "Example: .\testing\run-tests.ps1 coverage" -ForegroundColor Gray
    }
}

Write-Host ""
