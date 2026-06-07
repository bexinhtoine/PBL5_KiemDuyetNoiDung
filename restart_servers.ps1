# restart_servers.ps1 - Start Python and Java servers, wait for Ctrl+C, and release ports on exit
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# Ensure logs directory exists
$logsDir = "$PSScriptRoot\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
    Write-Host "Created logs/ directory." -ForegroundColor DarkGray
}

Write-Host "Stopping existing servers..." -ForegroundColor Cyan

function Stop-ProcessOnPort($port) {
    $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) | Select-Object -ExpandProperty OwningProcess -Unique
    if ($pids) {
        foreach ($p in $pids) {
            Write-Host "Killing process $p on port $port..." -ForegroundColor Yellow
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

Stop-ProcessOnPort 8080
Stop-ProcessOnPort 5000

Write-Host "Starting Python AI Server..." -ForegroundColor Green
$pyProc = Start-Process -FilePath "python" -ArgumentList "-u moderate.py" -WorkingDirectory "$PSScriptRoot\src\main\model" -RedirectStandardOutput "$logsDir\python_stdout.log" -RedirectStandardError "$logsDir\python_stderr.log" -PassThru -NoNewWindow
Write-Host "Python AI Server started with PID: $($pyProc.Id)"

Write-Host "Starting Java Spring Boot Server..." -ForegroundColor Green
$javaProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c run_java.cmd" -WorkingDirectory "$PSScriptRoot" -RedirectStandardOutput "$logsDir\java_stdout.log" -RedirectStandardError "$logsDir\java_stderr.log" -PassThru -NoNewWindow
Write-Host "Java Server started with PID: $($javaProc.Id)"

Write-Host "`n===========================================================" -ForegroundColor Green
Write-Host "Both servers started successfully!" -ForegroundColor Green
Write-Host " - Python AI Server (PID: $($pyProc.Id)) -> http://localhost:5000" -ForegroundColor Green
Write-Host " - Java Spring Boot (PID: $($javaProc.Id)) -> http://localhost:8080" -ForegroundColor Green
Write-Host "Logs are saved to: logs/" -ForegroundColor Cyan
Write-Host "Press Ctrl+C or close this window to stop both servers and release ports." -ForegroundColor Yellow
Write-Host "===========================================================" -ForegroundColor Green

try {
    # Keep the script running to monitor processes and catch Ctrl+C
    while ($pyProc.HasExited -eq $false -and $javaProc.HasExited -eq $false) {
        Start-Sleep -Seconds 1
    }
}
catch {
    Write-Host "`nScript interrupted." -ForegroundColor Red
}
finally {
    Write-Host "`nStopping servers and releasing ports..." -ForegroundColor Yellow
    
    if ($pyProc -and -not $pyProc.HasExited) {
        Write-Host "Killing Python Server (PID $($pyProc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $pyProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($javaProc -and -not $javaProc.HasExited) {
        Write-Host "Killing Java Server (PID $($javaProc.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $javaProc.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Extra safety port release
    Stop-ProcessOnPort 8080
    Stop-ProcessOnPort 5000
    
    Write-Host "Ports 8080 and 5000 have been released." -ForegroundColor Green
}
