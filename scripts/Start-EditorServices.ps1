param(
    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]
    $EditorServicesVersion,

    # Mutually exclusive!

    [string]
    $EditorServicesModulePath,

    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]
    $HostName,

    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]
    $HostProfileId,

    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]
    $HostVersion,

    [Parameter(Mandatory=$true)]
    [ValidateNotNullOrEmpty()]
    [string]
    $LanguageServicePipeName,

    [ValidateNotNullOrEmpty()]
    [string]
    $BundledModulesPath,

    [ValidateSet("Normal", "Verbose", "Error")]
    $LogLevel,

    [switch]
    $WaitForCompletion
)

# Add BundledModulesPath to $env:PSModulePath
if ($BundledModulesPath) {
    $env:PSModulePath = $BundledModulesPath + ";" + $env:PSModulePath
}

# if ($EditorServicesModulePath -ne $null) {
#     Import-Module "$EditorServicesModulePath\PowerShellEditorServices.psd1" -ErrorAction Stop
# }
# else {
    $parsedVersion = [System.Version]::new($EditorServicesVersion)
    Import-Module PowerShellEditorServices -RequiredVersion $parsedVersion -ErrorAction Stop
# }

Start-LanguageServer -HostName $HostName -HostProfileId $HostProfileId -HostVersion $HostVersion -LanguageServicePipeName $LanguageServicePipeName -WaitForCompletion:$WaitForCompletion.IsPresent
