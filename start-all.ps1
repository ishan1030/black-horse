# Black Horse Shoe — everything runs as Windows services now and starts
# automatically with the laptop. This script just checks (and if needed
# starts) all of them. Run it any time something seems down.
#
# Services:
#   postgresql-x64-17   database
#   Cloudflared         tunnel  (bhandariventures.com + api.)
#   blackhorse-api      NestJS API           :4000
#   blackhorse-web      Next.js storefront   :3000
#   blackhorse-bot      Telegram bot
#
# Logs: .\logs\api.log web.log bot.log (+ .err.log)
#
# After code changes, rebuild then restart the matching service, e.g.:
#   npm run api:build ; nssm restart blackhorse-api
#   npm run web:build ; nssm restart blackhorse-web
#   npm run build --workspace apps/bot ; nssm restart blackhorse-bot

$services = @('postgresql-x64-17', 'Cloudflared', 'blackhorse-api', 'blackhorse-web', 'blackhorse-bot')

foreach ($name in $services) {
    $svc = Get-Service $name -ErrorAction SilentlyContinue
    if (-not $svc) {
        Write-Host "$name : NOT INSTALLED" -ForegroundColor Red
        continue
    }
    if ($svc.Status -ne 'Running') {
        Write-Host "$name : $($svc.Status) -> starting..." -ForegroundColor Yellow
        try { Start-Service $name } catch { Write-Host "  failed: $_" -ForegroundColor Red }
        $svc.Refresh()
    }
    Write-Host "$name : $($svc.Status)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Website  https://bhandariventures.com  (local http://localhost:3000)"
Write-Host "API      https://api.bhandariventures.com/api"
Write-Host "ERP      npm run desktop"
Write-Host "Bot      @blackhorseshoe_bot"
