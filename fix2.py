import re
path = r"D:\minor project clg\frontend\src\components\student\QrScanner.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
new_content = re.sub(r"\x27\x5c\x27\x27(\w+)\x27\x5c\x27\x27", r"\x27\1\x27", content)
print("Changed:", new_content != content)
with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Fixed with regex")
