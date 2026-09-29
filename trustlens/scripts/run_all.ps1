# Windows: .\scripts\run_all.ps1 [-Profile quick]
param([string]$Profile = "default")
Set-Location (Join-Path $PSScriptRoot "..")
$py = if (Test-Path .venv\Scripts\python.exe) { ".venv\Scripts\python.exe" } else { "python" }
& $py -m trustlens --profile $Profile run-all @args
