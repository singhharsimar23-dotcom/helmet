import inspect
from esptool.loader import ESPLoader
from esptool.reset import *

print("Reset strategies in esptool.reset:")
import esptool.reset as r
for name in dir(r):
    if "Reset" in name:
        print(name)
