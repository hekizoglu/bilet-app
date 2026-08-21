param(
    [string]$Mode = 'continuous',
    [int]$Interval = 300000
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AieLoopScript = Join-Path $ProjectRoot 'aie-system\run-loop.js'

Write-Host '[OK] AIE LOOP SCHEDULER' -ForegroundColor Green
Write-Host "Mode: $Mode | Interval: $Interval ms" -ForegroundColor Yellow

node $AieLoopScript --mode=$Mode --interval=$Interval
