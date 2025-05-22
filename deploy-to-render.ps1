# PowerShell script to deploy to Render

# You'll need to set your Render deploy hook URL here or pass it as an argument
param(
    [Parameter(Mandatory=$true)]
    [string]$RenderDeployHookUrl
)

Write-Host "Deploying to Render..."
Invoke-RestMethod -Uri $RenderDeployHookUrl -Method Post

Write-Host "Deployment triggered. Check your Render dashboard for status."
Write-Host "Your app will be available at: https://mediconnect-backend.onrender.com" 