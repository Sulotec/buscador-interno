@echo off
rem Instala (o actualiza) la API del Buscador como servicio de Windows. Doble clic: pide permisos de
rem administrador si hacen falta y deja la ventana abierta al final para leer el resultado.
rem Con permisos de administrador tambien acepta opciones, por ejemplo:  instalar.bat -Desinstalar

fltmc >nul 2>&1
if %errorlevel% neq 0 (
    echo Se necesitan permisos de administrador. Windows va a mostrar un aviso: acepta.
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File ".\instalar-servicio.ps1" %*
echo.
pause
