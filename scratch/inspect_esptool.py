import esptool
import inspect

loader = esptool.loader.ESPLoader
print("ESPLoader methods:", [m for m in dir(loader) if "reset" in m or "boot" in m])
