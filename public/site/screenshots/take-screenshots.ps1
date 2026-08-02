$ErrorActionPreference = "Stop"
$Width = 1440
$Height = 900

$base = "http://127.0.0.1:8000"
$pagesDir = "$base/site/pages"
$adminDir = "$base/site/admin"
$root     = "$base/index.html"

$pages = @(
  @{ name = "01-home";               url = $root },
  @{ name = "02-activities";         url = "$pagesDir/activities.html" },
  @{ name = "03-activity-rowing";    url = "$pagesDir/activity.html?slug=rowing" },
  @{ name = "04-activity-kayaking";  url = "$pagesDir/activity.html?slug=kayaking" },
  @{ name = "05-activity-sup";       url = "$pagesDir/activity.html?slug=sup" },
  @{ name = "06-activity-wake";      url = "$pagesDir/activity.html?slug=wake" },
  @{ name = "07-activity-fit";       url = "$pagesDir/activity.html?slug=fitness" },
  @{ name = "08-pricing";            url = "$pagesDir/pricing.html" },
  @{ name = "09-booking";            url = "$pagesDir/booking.html" },
  @{ name = "10-events";             url = "$pagesDir/events.html" },
  @{ name = "11-event-run-row";      url = "$pagesDir/event.html?slug=run-row-challenge" },
  @{ name = "12-event-sunset";       url = "$pagesDir/event.html?slug=sunset-paddle" },
  @{ name = "13-event-regatta";      url = "$pagesDir/event.html?slug=nationals-regatta-2026" },
  @{ name = "14-event-iftar";        url = "$pagesDir/event.html?slug=ramadan-iftar" },
  @{ name = "15-about";              url = "$pagesDir/about.html" },
  @{ name = "16-contact";            url = "$pagesDir/contact.html" },
  @{ name = "17-404";                url = "$pagesDir/404.html" },
  @{ name = "18-sign-in";            url = "$pagesDir/sign-in.html" },
  @{ name = "19-account";            url = "$pagesDir/account.html" },
  @{ name = "20-account-profile";    url = "$pagesDir/account-profile.html" },
  @{ name = "21-coach";              url = "$pagesDir/coach.html?token=demo-youssef" },
  @{ name = "22-admin-login";        url = "$adminDir/login.html" },
  @{ name = "23-admin";              url = "$adminDir/index.html" },
  @{ name = "24-admin-bookings";     url = "$adminDir/bookings.html" },
  @{ name = "25-admin-activities";   url = "$adminDir/activities.html" },
  @{ name = "26-admin-contacts";     url = "$adminDir/contacts.html" }
)

$outDir = "F:\aqualudo\site\screenshots\$Width"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

agent-browser set viewport $Width $Height 2>&1 | Out-Null

agent-browser eval "localStorage.setItem('aqualudo_admin_session', JSON.stringify({since: new Date().toISOString()})); 1" 2>&1 | Out-Null

foreach ($p in $pages) {
  $out = Join-Path $outDir ($p.name + ".png")
  Write-Host ("  " + $Width + ": " + $p.name + " -> " + $p.url) -NoNewline
  agent-browser open $p.url 2>&1 | Out-Null
  agent-browser wait 1500 2>&1 | Out-Null
  agent-browser eval "document.body.classList.remove('loading'); document.body.style.overflow='auto'; document.querySelectorAll('.reveal').forEach(el => el.classList.add('in')); 1" 2>&1 | Out-Null
  agent-browser wait 500 2>&1 | Out-Null
  agent-browser screenshot --full $out 2>&1 | Out-Null
  Write-Host " ok"
}
