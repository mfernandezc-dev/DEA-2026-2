param(
    [Parameter(Mandatory = $true)][int]$ProcessId,
    [Parameter(Mandatory = $true)][string]$OutputPath
)

# Capture only the foreground window of an explicitly selected process.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class DocumentationCapture {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int command);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT rect);
}
'@
$process = Get-Process -Id $ProcessId -ErrorAction Stop
$window = $process.MainWindowHandle
if ($window -eq 0) { throw 'The selected process has no visible window.' }
[DocumentationCapture]::ShowWindow($window, 3) | Out-Null
[DocumentationCapture]::SetForegroundWindow($window) | Out-Null
Start-Sleep -Milliseconds 1200
if ([DocumentationCapture]::GetForegroundWindow() -ne $window) {
    throw 'The selected window is not in the foreground; no screenshot was taken.'
}
$rect = New-Object DocumentationCapture+RECT
[DocumentationCapture]::GetWindowRect($window, [ref]$rect) | Out-Null
$screen = [System.Windows.Forms.Screen]::FromHandle($window).Bounds
$left = [Math]::Max($screen.Left, $rect.Left)
$top = [Math]::Max($screen.Top, $rect.Top)
$width = [Math]::Min($screen.Right, $rect.Right) - $left
$height = [Math]::Min($screen.Bottom, $rect.Bottom) - $top
if ($width -lt 400 -or $height -lt 300) { throw 'The window is too small for a legible capture.' }
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
    $graphics.CopyFromScreen($left, $top, 0, 0, $bitmap.Size)
    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
    $graphics.Dispose()
    $bitmap.Dispose()
}
Write-Output "Real window captured: $OutputPath"
