param(
  [string]$TargetPath,
  [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'
$observationSeconds = 10
$scriptStartedAt = Get-Date
$toolRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
if ([string]::IsNullOrWhiteSpace($desktop)) {
  $desktop = Join-Path $env:USERPROFILE 'Desktop'
}
$reportName = '心理老师工作台-启动诊断-{0}.txt' -f (Get-Date -Format 'yyyyMMdd-HHmmss')
$reportPath = Join-Path $desktop $reportName
$eventWindowStart = $scriptStartedAt.AddMinutes(-1)

function Redact-Text {
  param([AllowNull()][string]$Text)
  if ($null -eq $Text) { return '' }
  $result = $Text
  if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
    $result = $result.Replace($env:USERPROFILE, '<用户目录>')
  }
  $result = [regex]::Replace($result, 'C:\\Users\\[^\\\r\n]+', 'C:\\Users\\<用户>')
  return $result
}

function Add-ReportLine {
  param([System.Text.StringBuilder]$Builder, [string]$Line = '')
  [void]$Builder.AppendLine((Redact-Text $Line))
}

function Find-TargetExecutable {
  param([string]$RequestedPath)

  if (-not [string]::IsNullOrWhiteSpace($RequestedPath)) {
    if (Test-Path -LiteralPath $RequestedPath -PathType Leaf) {
      return (Resolve-Path -LiteralPath $RequestedPath).Path
    }
    throw "指定的程序不存在：$RequestedPath"
  }

  $candidates = @(
    (Join-Path $toolRoot '心理老师工作台.exe'),
    (Join-Path $toolRoot 'psychology-teacher-workbench.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\心理老师工作台\心理老师工作台.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\psychology-teacher-workbench\心理老师工作台.exe'),
    (Join-Path $env:ProgramFiles '心理老师工作台\心理老师工作台.exe'),
    (Join-Path $env:ProgramFiles 'psychology-teacher-workbench\心理老师工作台.exe')
  )
  if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
    $candidates += Join-Path ${env:ProgramFiles(x86)} '心理老师工作台\心理老师工作台.exe'
    $candidates += Join-Path ${env:ProgramFiles(x86)} 'psychology-teacher-workbench\心理老师工作台.exe'
  }

  $found = $candidates |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and (Test-Path -LiteralPath $_ -PathType Leaf) } |
    Select-Object -First 1
  if ($found) { return (Resolve-Path -LiteralPath $found).Path }

  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    '没有自动找到心理老师工作台，请在接下来的窗口中选择已经安装的主程序 EXE。不要选择 Setup 安装包。',
    '启动诊断工具',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Title = '选择心理老师工作台主程序'
  $dialog.Filter = '心理老师工作台程序 (*.exe)|*.exe|所有程序 (*.exe)|*.exe'
  $dialog.Multiselect = $false
  if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
    return $null
  }
  return $dialog.FileName
}

$report = New-Object System.Text.StringBuilder
Add-ReportLine $report '心理老师工作台｜启动闪退一键诊断报告'
Add-ReportLine $report ('生成时间：{0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-ReportLine $report '本报告只收集启动状态和 Windows 应用错误事件，不读取学生资料、附件、备份、密码或恢复码。'
Add-ReportLine $report

$target = $null
$targetItem = $null
$launchResult = '未启动'
$processState = '未观察'
$launchError = ''
$eventError = ''

try {
  $target = Find-TargetExecutable -RequestedPath $TargetPath
  if ($target) {
    $targetItem = Get-Item -LiteralPath $target
    $version = $targetItem.VersionInfo.ProductVersion
    Add-ReportLine $report '【程序信息】'
    Add-ReportLine $report ('程序路径：{0}' -f $target)
    Add-ReportLine $report ('文件大小：{0:N0} bytes' -f $targetItem.Length)
    Add-ReportLine $report ('产品版本：{0}' -f ($(if ($version) { $version } else { '未读取到' })))
    Add-ReportLine $report

    if (-not $NoLaunch) {
      try {
        $eventWindowStart = Get-Date
        $process = Start-Process -FilePath $target -PassThru
        $launchResult = '已启动，观察 {0} 秒' -f $observationSeconds
        Start-Sleep -Seconds $observationSeconds
        $process.Refresh()
        if ($process.HasExited) {
          $processState = '观察期内已退出（可能发生闪退）'
        } else {
          $processState = '观察期内仍在运行'
        }
      } catch {
        $launchResult = '启动失败'
        $launchError = $_.Exception.Message
        $processState = '无法观察'
      }
    } else {
      $launchResult = '测试模式：跳过启动'
      $processState = '测试模式'
    }
  } else {
    $launchResult = '未选择程序'
    $processState = '无法观察'
  }
} catch {
  $launchResult = '诊断过程发生错误'
  $launchError = $_.Exception.Message
}

Add-ReportLine $report '【启动结果】'
Add-ReportLine $report ('结果：{0}' -f $launchResult)
Add-ReportLine $report ('进程状态：{0}' -f $processState)
if ($launchError) { Add-ReportLine $report ('错误信息：{0}' -f $launchError) }
Add-ReportLine $report

Add-ReportLine $report '【系统信息】'
try {
  $os = Get-CimInstance Win32_OperatingSystem
  Add-ReportLine $report ('系统：{0}' -f $os.Caption)
  Add-ReportLine $report ('版本：{0}（内部版本 {1}）' -f $os.Version, $os.BuildNumber)
  Add-ReportLine $report ('系统位数：{0}' -f $os.OSArchitecture)
} catch {
  Add-ReportLine $report ('系统信息读取失败：{0}' -f $_.Exception.Message)
}
Add-ReportLine $report

Add-ReportLine $report '【Windows 应用错误记录】'
try {
  $targetName = if ($target) { [IO.Path]::GetFileName($target) } else { '心理老师工作台' }
  $rawEvents = @(& wevtutil.exe qe Application '/q:*[System[TimeCreated[timediff(@SystemTime) <= 7200000]]]' /f:xml /c:200 2>&1)
  $events = foreach ($rawEvent in $rawEvents) {
    if (-not ([string]$rawEvent).Trim().StartsWith('<Event ')) { continue }
    try {
      $xml = [xml]$rawEvent
      $provider = [string]$xml.Event.System.Provider.Name
      $eventId = [string]$xml.Event.System.EventID
      $timeCreated = [string]$xml.Event.System.TimeCreated.SystemTime
      $dataLines = @($xml.Event.EventData.Data | ForEach-Object {
        if ($_.Name) { '{0}={1}' -f $_.Name, $_.'#text' } else { [string]$_.'#text' }
      })
      $eventText = (($dataLines -join ' ') + ' ' + [string]$rawEvent).Trim()
      if ($eventText -match [regex]::Escape($targetName) -or
          $eventText -match '心理老师工作台|psychology-teacher-workbench|electron' -or
          $provider -match 'Application Error|Windows Error Reporting') {
        [pscustomobject]@{ Provider = $provider; Id = $eventId; Time = $timeCreated; Data = ($dataLines -join '；') }
      }
    } catch {
      continue
    }
  }

  if (-not @($events)) {
    Add-ReportLine $report '观察时间内没有找到匹配的 Windows 应用错误记录。'
  } else {
    foreach ($event in @($events | Select-Object -First 20)) {
      Add-ReportLine $report ('时间：{0}｜来源：{1}｜事件 ID：{2}' -f $event.Time, $event.Provider, $event.Id)
      Add-ReportLine $report (Redact-Text $event.Data)
      Add-ReportLine $report '---'
    }
  }
} catch {
  $eventError = $_.Exception.Message
  Add-ReportLine $report ('Windows 错误记录读取失败：{0}' -f $eventError)
}

Add-ReportLine $report
Add-ReportLine $report '【发送说明】'
Add-ReportLine $report '请把本 TXT 文件发给技术支持，不要发送学生数据、备份文件、主密码或恢复码。'

try {
  [IO.File]::WriteAllText($reportPath, $report.ToString(), [Text.UTF8Encoding]::new($false))
  Write-Host ''
  Write-Host "诊断完成，报告已保存到：$reportPath" -ForegroundColor Green
  Start-Process explorer.exe -ArgumentList "/select,`"$reportPath`""
} catch {
  Write-Host "报告保存失败：$($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
