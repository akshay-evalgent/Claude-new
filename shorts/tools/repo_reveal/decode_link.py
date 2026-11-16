import sys, zlib, base64
h = sys.argv[1].split('#', 1)[1]; h += '=' * (-len(h) % 4)
print(zlib.decompress(base64.urlsafe_b64decode(h), -15).decode().split('\x00')[0])
