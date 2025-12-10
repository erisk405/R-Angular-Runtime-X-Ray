@echo off
echo 🚀 Publishing Angular Runtime X-Ray to VS Code Marketplace...
echo.

:: Check if vsce is installed
where vsce >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ vsce not found. Installing @vscode/vsce globally...
    npm install -g @vscode/vsce
    if %errorlevel% neq 0 (
        echo ❌ Failed to install vsce
        pause
        exit /b 1
    )
)

:: Build the extension
echo 📦 Building extension...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

call npm run build:rust
if %errorlevel% neq 0 (
    echo ❌ Rust build failed
    pause
    exit /b 1
)

call npm run compile
if %errorlevel% neq 0 (
    echo ❌ TypeScript compilation failed
    pause
    exit /b 1
)

:: Package the extension
echo 📦 Packaging extension...
call vsce package
if %errorlevel% neq 0 (
    echo ❌ Packaging failed
    pause
    exit /b 1
)

echo.
echo ✅ Extension packaged successfully!
echo.

:: Ask if user wants to publish
set /p publish="Do you want to publish to marketplace now? (y/n): "
if /i "%publish%"=="y" (
    echo 🚀 Publishing to marketplace...
    call vsce publish
    if %errorlevel% neq 0 (
        echo ❌ Publishing failed
        echo 💡 Make sure you're logged in: vsce login your-publisher-name
        pause
        exit /b 1
    )
    echo.
    echo 🎉 Successfully published to VS Code Marketplace!
    echo 📱 Extension will be available shortly at:
    echo https://marketplace.visualstudio.com/items?itemName=angular-xray.angular-runtime-xray
) else (
    echo 📦 Extension packaged but not published.
    echo 💡 To publish later, run: vsce publish
)

echo.
echo 📋 Next steps:
echo 1. Test the extension: code --install-extension angular-runtime-xray-0.1.0.vsix
echo 2. Create GitHub release with the .vsix file
echo 3. Update documentation if needed
echo.
pause
