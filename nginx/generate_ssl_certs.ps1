# ClimateSphere AI — TLS/SSL Certificate Generation Script (PowerShell)
# Generates self-signed certificates with SAN for localhost / dev / staging

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SslDir = Join-Path $ScriptDir "ssl"

if (-not (Test-Path $SslDir)) {
    New-Item -ItemType Directory -Path $SslDir -Force | Out-Null
}

$KeyFile = Join-Path $SslDir "key.pem"
$CertFile = Join-Path $SslDir "cert.pem"

Write-Host "Checking OpenSSL availability..." -ForegroundColor Cyan

$openssl = Get-Command openssl -ErrorAction SilentlyContinue

if ($openssl) {
    Write-Host "Generating certificates using OpenSSL..." -ForegroundColor Green
    & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
      -keyout $KeyFile `
      -out $CertFile `
      -subj "/C=DE/ST=NRW/L=Duisburg/O=ClimateSphere AI/OU=Industrial CEMS Gateway/CN=localhost" `
      -addext "subjectAltName=DNS:localhost,DNS:climatesphere.internal,IP:127.0.0.1,IP:0.0.0.0"
} else {
    Write-Host "OpenSSL not found. Generating self-signed certificate using PowerShell New-SelfSignedCertificate..." -ForegroundColor Yellow
    $cert = New-SelfSignedCertificate -DnsName "localhost", "climatesphere.internal" -CertStoreLocation "cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(1)
    
    # Export certificate
    $certPem = @"
-----BEGIN CERTIFICATE-----
$([System.Convert]::ToBase64String($cert.RawData, 'InsertLineBreaks'))
-----END CERTIFICATE-----
"@
    Set-Content -Path $CertFile -Value $certPem -Encoding Ascii
    Write-Host "Self-signed certificate written to $CertFile" -ForegroundColor Green

    # Export private key (PKCS#8 PEM format required by Nginx)
    $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    if ($rsa) {
        $keyBytes = $rsa.ExportPkcs8PrivateKey()
        $keyPem = @"
-----BEGIN PRIVATE KEY-----
$([System.Convert]::ToBase64String($keyBytes, 'InsertLineBreaks'))
-----END PRIVATE KEY-----
"@
        Set-Content -Path $KeyFile -Value $keyPem -Encoding Ascii
        Write-Host "Private key written to $KeyFile" -ForegroundColor Green
    }
    Write-Host "Note: For production, install OpenSSL or provision certificates via Let's Encrypt / Certbot." -ForegroundColor DarkGray
}

Write-Host "SSL Certificates Ready:" -ForegroundColor Green
Write-Host "  - Private Key: $KeyFile"
Write-Host "  - Certificate: $CertFile"
