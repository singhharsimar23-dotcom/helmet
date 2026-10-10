import subprocess
import json

ps_code = """
Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match "USB|COM|Serial|Silicon|CH340" } | Select-Object Name, DeviceID, Status, Present | ConvertTo-Json
"""

res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_code], capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print("ERR:", res.stderr)
