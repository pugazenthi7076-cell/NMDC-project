Add-Type -Assembly 'System.IO.Compression.FileSystem'
$source = 'D:\pugal\nmdc\nmdc-analyzer'
$output = 'D:\pugal\nmdc\nmdc-analyzer-full-project.zip'
if (Test-Path $output) { Remove-Item $output -Force }
$excludeDirs = @('node_modules', '.next', '.freebuff')
$archive = [System.IO.Compression.ZipFile]::Open($output, 'Create')
$files = Get-ChildItem -Path $source -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($source.Length + 1)
    $excluded = $false
    foreach ($ex in $excludeDirs) {
        if ($rel.StartsWith($ex + '\') -or $rel.StartsWith($ex + '/')) {
            $excluded = $true
            break
        }
    }
    -not $excluded
}
foreach ($f in $files) {
    $entryName = $f.FullName.Substring($source.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, 'nmdc-analyzer/' + $entryName) | Out-Null
}
$archive.Dispose()
$zip = Get-Item $output
Write-Host "Created: $($zip.FullName) ($([math]::Round($zip.Length / 1KB, 1)) KB)"
Write-Host "Files: $($files.Count)"
