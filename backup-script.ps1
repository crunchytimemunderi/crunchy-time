# Crunchy Times Daily Backup Script
# This script downloads yesterday's Excel backup automatically

# Configuration
$API_URL = "http://localhost:3000/api/cron/daily-backup"
$BACKUP_DIR = "$env:USERPROFILE\Documents\CrunchyTimes_Backups"
$LOG_FILE = "$BACKUP_DIR\backup_log.txt"

# CRON_SECRET from your .env.local file
$CRON_SECRET = "CrunchyTime2026SecureBackupKey!9xyz"

# Create backup directory if it doesn't exist
if (-Not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "Created backup directory: $BACKUP_DIR"
}

# Log function
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

try {
    Write-Log "Starting daily backup..."
    
    # Make API request with CRON_SECRET
    $headers = @{
        "x-cron-secret" = $CRON_SECRET
    }
    
    Write-Log "Requesting backup from API..."
    $response = Invoke-WebRequest -Uri $API_URL -Headers $headers -Method GET
    
    # Check if request was successful
    if ($response.StatusCode -eq 200) {
        # Extract filename from Content-Disposition header
        $contentDisposition = $response.Headers["Content-Disposition"]
        if ($contentDisposition -match 'filename="([^"]+)"') {
            $fileName = $matches[1]
        } else {
            $fileName = "CrunchyTime_Backup_$(Get-Date -Format 'yyyy-MM-dd').xlsx"
        }
        
        # Save the file
        $filePath = Join-Path $BACKUP_DIR $fileName
        [System.IO.File]::WriteAllBytes($filePath, $response.Content)
        
        Write-Log "✅ Backup successful: $fileName"
        
        # Extract and log statistics
        $stats = $response.Headers["X-Backup-Stats"]
        if ($stats) {
            $statsObj = $stats | ConvertFrom-Json
            Write-Log "   Date: $($statsObj.date)"
            Write-Log "   Sales: $($statsObj.salesCount) entries, Total: ₹$($statsObj.totalSales)"
            Write-Log "   Expenses: $($statsObj.expensesCount) entries, Total: ₹$($statsObj.totalExpenses)"
            Write-Log "   Profit: ₹$($statsObj.profit)"
        }
        
        # Clean up old backups (keep last 90 days)
        $oldDate = (Get-Date).AddDays(-90)
        Get-ChildItem -Path $BACKUP_DIR -Filter "*.xlsx" | 
            Where-Object { $_.LastWriteTime -lt $oldDate } | 
            ForEach-Object {
                Remove-Item $_.FullName
                Write-Log "Deleted old backup: $($_.Name)"
            }
        
        Write-Log "Backup completed successfully"
        exit 0
    } else {
        Write-Log "❌ Error: Server returned status $($response.StatusCode)"
        exit 1
    }
    
} catch {
    Write-Log "❌ Error: $($_.Exception.Message)"
    Write-Log "   Details: $($_.Exception.ToString())"
    exit 1
}
