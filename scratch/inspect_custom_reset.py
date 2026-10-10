import inspect
from esptool.reset import CustomReset, ClassicReset

print(inspect.getsource(ClassicReset))
print(inspect.getsource(CustomReset))
