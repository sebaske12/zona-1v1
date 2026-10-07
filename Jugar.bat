@echo off
rem Abre Zona 1v1: prende el servidor del juego y abre el navegador.
rem No cierres esta ventana mientras juegan.
cd /d "%~dp0"
set "PATH=%PATH%;C:\Program Files\nodejs"
title Zona 1v1
echo.
echo   ZONA 1v1
echo   ---------
echo   Para jugar desde el iPhone (mismo WiFi), abre en Safari la direccion "Network" de abajo.
echo   Para apagar el juego, cierra esta ventana.
echo.
call npx vite --host --open
pause
