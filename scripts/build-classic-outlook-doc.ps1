# Builds a short Word (.docx) document explaining why automatic signature
# insertion does not work on the client's classic perpetual Outlook 2021.

$ErrorActionPreference = "Stop"

$outPath = "d:\done\bss-www-sig\docs\Classic-Outlook-Signature-Limitation.docx"
$outDir  = Split-Path $outPath -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()
$sel = $word.Selection

function Add-Heading { param($text, $level)
  $sel.Style = $doc.Styles.Item("Heading $level")
  $sel.TypeText($text)
  $sel.TypeParagraph()
}
function Add-Para { param($text)
  $sel.Style = $doc.Styles.Item("Normal")
  $sel.TypeText($text)
  $sel.TypeParagraph()
}
function Add-Bullet { param($text)
  $sel.Style = $doc.Styles.Item("Normal")
  $sel.TypeText([char]0x2022 + "  " + $text)
  $sel.TypeParagraph()
}
function Add-Link { param($label, $url)
  $sel.Style = $doc.Styles.Item("Normal")
  $doc.Hyperlinks.Add($sel.Range, $url, "", "", $label) | Out-Null
  $sel.Collapse(0)
  $sel.TypeParagraph()
}

# ---- Title ----
$sel.Style = $doc.Styles.Item("Title")
$sel.TypeText("Email Signature Auto-Insertion: Classic Outlook Limitation")
$sel.TypeParagraph()
Add-Para "Prepared for: Blackstone Shipping"
Add-Para "Prepared by: Simtech IT Solutions"
Add-Para "Date: 19 June 2026"
$sel.TypeParagraph()

# ---- 1. Issue ----
Add-Heading "1. The issue" 1
Add-Para "The BSS Signature add-in automatically inserts each user's signature when a new message is composed. It works in new Outlook on Windows and in Outlook on the web, but not in the classic desktop Outlook used by Blackstone Shipping. This is a Microsoft platform limitation, not a fault in the add-in."

# ---- 2. Cause ----
Add-Heading "2. The cause" 1
Add-Para "Automatic insertion depends on two Outlook APIs - the OnNewMessageCompose event-based activation (which launches the add-in automatically) and the Body.setSignatureAsync method (which writes the signature). Microsoft introduced both in Mailbox requirement set 1.10."
Add-Para "The client runs Microsoft Office Professional Plus 2021 - a volume-licensed, perpetual (one-time purchase) edition, marked `"This product will not be updated`", Version 2508 (Build 19127.20240). Per Microsoft's official documentation, this edition supports the Outlook add-in APIs only up to requirement set 1.9. It does not include the 1.10 APIs that auto-insertion requires, so the feature cannot run. (The high build number does not change this; updates raise the build but never add the 1.10 APIs to a perpetual 2021 license.)"

# ---- 3. Proof table ----
Add-Heading "3. Microsoft's official support table" 1
Add-Para "Microsoft lists the highest requirement set supported by each Outlook edition:"

$tbl = $doc.Tables.Add($sel.Range, 4, 2)
$tbl.Borders.Enable = $true
$tbl.Range.Style = $doc.Styles.Item("Normal")
$rows = @(
  @("Outlook edition", "Requirement set / auto-insert"),
  @("New Outlook on Windows & Outlook on the web (Microsoft 365)", "Up to 1.15 - works"),
  @("Classic Outlook on Windows (Microsoft 365 subscription)", "Up to 1.15 - works"),
  @("Volume-licensed perpetual Outlook 2021 (the client's edition)", "1.9 only - DOES NOT work")
)
for ($r = 0; $r -lt $rows.Count; $r++) {
  $tbl.Cell($r + 1, 1).Range.Text = $rows[$r][0]
  $tbl.Cell($r + 1, 2).Range.Text = $rows[$r][1]
}
$tbl.Rows.Item(1).Range.Font.Bold = $true
$sel.EndKey(6) | Out-Null
$sel.TypeParagraph()

# ---- 4. Options ----
Add-Heading "4. Options" 1
Add-Bullet "Use new Outlook on Windows or Outlook on the web for automatic insertion - already working today."
Add-Bullet "Move affected users to a Microsoft 365 subscription build of Outlook, which supports requirement set 1.10+."
Add-Bullet "On the current perpetual Outlook 2021, users can still add the signature manually with the add-in's `"Insert Signature`" button; fully automatic insertion is not possible on that edition."

# ---- 5. References ----
Add-Heading "5. Official Microsoft reference (proof)" 1
Add-Link "Requirement sets supported by Exchange servers and Outlook clients - shows perpetual Outlook 2021 supports only up to 1.9" "https://learn.microsoft.com/en-us/javascript/api/requirement-sets/outlook/outlook-api-requirement-sets#requirement-sets-supported-by-exchange-servers-and-outlook-clients"
Add-Link "Body.setSignatureAsync - introduced in requirement set 1.10" "https://learn.microsoft.com/en-us/javascript/api/outlook/office.body#outlook-office-body-setsignatureasync-member(1)"

# ---- Save ----
$doc.SaveAs([ref]$outPath, [ref]16)
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($sel)   | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($doc)   | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word)  | Out-Null
Write-Output "Created: $outPath"
