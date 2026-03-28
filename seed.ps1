$base = "http://localhost:3000/api/v1"

Write-Host "Seeding sensors..." -ForegroundColor Cyan

Invoke-RestMethod -Uri "$base/sensors" -Method POST -ContentType "application/json" -Body '{"name":"Temperature Sensor","sensorCode":"DTH_TEMP_01","type":"Temperature","unit":"C"}'
Write-Host "Created: DTH_TEMP_01"

Invoke-RestMethod -Uri "$base/sensors" -Method POST -ContentType "application/json" -Body '{"name":"Humidity Sensor","sensorCode":"DTH_HUM_01","type":"Humidity","unit":"%"}'
Write-Host "Created: DTH_HUM_01"

Invoke-RestMethod -Uri "$base/sensors" -Method POST -ContentType "application/json" -Body '{"name":"Light Sensor","sensorCode":"LDR_01","type":"Light","unit":"Lux"}'
Write-Host "Created: LDR_01"

Write-Host ""
Write-Host "Seeding devices..." -ForegroundColor Cyan

Invoke-RestMethod -Uri "$base/devices" -Method POST -ContentType "application/json" -Body '{"name":"Temperature LED","deviceCode":"LED_TEMP_01","type":"Light"}'
Write-Host "Created: LED_TEMP_01"

Invoke-RestMethod -Uri "$base/devices" -Method POST -ContentType "application/json" -Body '{"name":"Humidity LED","deviceCode":"LED_HUM_01","type":"Light"}'
Write-Host "Created: LED_HUM_01"

Invoke-RestMethod -Uri "$base/devices" -Method POST -ContentType "application/json" -Body '{"name":"Light LED","deviceCode":"LED_LDR_01","type":"Light"}'
Write-Host "Created: LED_LDR_01"

Write-Host ""
Write-Host "Done! Verifying..." -ForegroundColor Green
Invoke-RestMethod -Uri "$base/sensors" | ConvertTo-Json -Depth 3
Invoke-RestMethod -Uri "$base/devices" | ConvertTo-Json -Depth 3
