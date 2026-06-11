param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDir,

  [string]$DatabaseName = "gestao_fichas_restore",
  [string]$Host = "localhost",
  [int]$Port = 5432,
  [string]$Username = "postgres",
  [string]$AdminDatabase = "postgres",
  [switch]$DropExistingDatabase,
  [switch]$SkipRoles
)

$ErrorActionPreference = "Stop"

function Resolve-RequiredCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "Comando obrigatorio nao encontrado no PATH: $Name"
  }

  return $command.Source
}

function Invoke-Process {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  Write-Host "> $FilePath $($Arguments -join ' ')"
  & $FilePath @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "Comando falhou com codigo $LASTEXITCODE: $FilePath"
  }
}

$resolvedBackupDir = Resolve-Path -LiteralPath $BackupDir
$rolesFile = Join-Path $resolvedBackupDir "roles.sql"
$schemaFile = Join-Path $resolvedBackupDir "schema.sql"
$dataFile = Join-Path $resolvedBackupDir "data.sql"

foreach ($requiredFile in @($schemaFile, $dataFile)) {
  if (-not (Test-Path -LiteralPath $requiredFile)) {
    throw "Arquivo obrigatorio nao encontrado: $requiredFile"
  }
}

if (-not $SkipRoles -and -not (Test-Path -LiteralPath $rolesFile)) {
  throw "Arquivo roles.sql nao encontrado em $resolvedBackupDir"
}

$psql = Resolve-RequiredCommand -Name "psql"
$createdb = Resolve-RequiredCommand -Name "createdb"
$dropdb = Resolve-RequiredCommand -Name "dropdb"

if (-not $SkipRoles) {
  Write-Host "Aplicando roles.sql..."
  Invoke-Process -FilePath $psql -Arguments @(
    "-h", $Host,
    "-p", "$Port",
    "-U", $Username,
    "-d", $AdminDatabase,
    "-f", $rolesFile
  )
}

if ($DropExistingDatabase) {
  Write-Host "Removendo banco existente, se houver..."
  Invoke-Process -FilePath $dropdb -Arguments @(
    "--if-exists",
    "-h", $Host,
    "-p", "$Port",
    "-U", $Username,
    $DatabaseName
  )
}

Write-Host "Garantindo existencia do banco de destino..."
& $createdb "-h" $Host "-p" "$Port" "-U" $Username $DatabaseName 2>$null
if ($LASTEXITCODE -ne 0 -and -not $DropExistingDatabase) {
  Write-Host "Banco ja existe ou nao foi possivel criar automaticamente. Continuando..."
}

Write-Host "Aplicando schema.sql..."
Invoke-Process -FilePath $psql -Arguments @(
  "-h", $Host,
  "-p", "$Port",
  "-U", $Username,
  "-d", $DatabaseName,
  "-f", $schemaFile
)

Write-Host "Aplicando data.sql..."
Invoke-Process -FilePath $psql -Arguments @(
  "-h", $Host,
  "-p", "$Port",
  "-U", $Username,
  "-d", $DatabaseName,
  "-f", $dataFile
)

Write-Host "Restore concluido com sucesso no banco $DatabaseName."
