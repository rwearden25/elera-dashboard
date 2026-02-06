using namespace System.Net

param($Request, $TriggerMetadata)

# Get storage connection info
$storageAccount = $env:STORAGE_ACCOUNT_NAME
$containerName = $env:STORAGE_CONTAINER_NAME ?? "dashboard-data"
$blobName = "elera-clusters.json"

try {
    # Connect using Managed Identity
    $null = Connect-AzAccount -Identity
    
    # Get storage context
    $storageContext = New-AzStorageContext -StorageAccountName $storageAccount -UseConnectedAccount
    
    # Download blob content
    $tempFile = [System.IO.Path]::GetTempFileName()
    $null = Get-AzStorageBlobContent -Container $containerName -Blob $blobName -Context $storageContext -Destination $tempFile -Force
    
    $content = Get-Content -Path $tempFile -Raw
    Remove-Item $tempFile -Force
    
    # Return JSON with CORS headers
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::OK
        Headers = @{
            "Content-Type" = "application/json"
            "Access-Control-Allow-Origin" = "*"
            "Access-Control-Allow-Methods" = "GET, OPTIONS"
            "Access-Control-Allow-Headers" = "*"
        }
        Body = $content
    })
}
catch {
    Push-OutputBinding -Name Response -Value ([HttpResponseContext]@{
        StatusCode = [HttpStatusCode]::InternalServerError
        Headers = @{
            "Content-Type" = "application/json"
            "Access-Control-Allow-Origin" = "*"
        }
        Body = (@{ error = $_.Exception.Message } | ConvertTo-Json)
    })
}
