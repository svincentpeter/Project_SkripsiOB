@echo off
cd /d "%~dp0"
set "PATH=C:\Users\cthrn\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe;%PATH%"
title Omah Ban POS - Dev Server (Frontend + Backend)

echo Menjalankan Frontend (http://localhost:3000) dan Backend (http://127.0.0.1:8000)...
echo Browser akan terbuka otomatis setelah http://localhost:3000 siap.
echo.

start "" /b powershell -NoProfile -Command "$i=0; while($i -lt 40){ try{ $c=New-Object System.Net.Sockets.TcpClient('127.0.0.1',3000); $c.Close(); Start-Process 'http://localhost:3000'; break }catch{ Start-Sleep -Milliseconds 500; $i++ } }"

call npm run dev:all
pause
