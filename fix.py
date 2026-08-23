path = r"D:\minor project clg\frontend\src\components\student\QrScanner.jsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
# Fix the literal backslash-quote sequences
content = content.replace("\\x27\\x27react\\x27\\x27", "\x27react\x27")
content = content.replace("\\x27\\x27jsqr\\x27\\x27", "\x27jsqr\x27")
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed imports")
