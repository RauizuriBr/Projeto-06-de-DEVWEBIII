@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
    echo Node.js nao foi encontrado. Instale em https://nodejs.org/
    pause
    exit /b 1
)
echo Iniciando a Agenda de Contatos...
echo Abra no navegador: http://localhost:5000/
echo.
node app.js
if errorlevel 1 (
    echo.
    echo Se aparecer erro de SQLite, abra o terminal nesta pasta e execute: npm install
)
pause
