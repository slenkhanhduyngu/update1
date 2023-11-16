import requests
import threading
# Usage: python3 checker.py threads
def check_proxy(proxy):
    try:
        response = requests.get('https://www.google.com/', proxies={'http': proxy, 'https': proxy}, timeout=13)
        if response.status_code == 200:
            print(f"WORK -->  {proxy} ")
            with open('proxy.txt', 'a') as f:
                f.write(proxy + '\n')
        else:
            print(f"Proxy BAD {proxy} ")
    except:
        print(f"Proxy BAD {proxy} ")

# Read proxies from a file
with open('proxies.txt', 'r') as f:
    proxy_list = f.read().splitlines()

# Create threads to check proxies
threads = []
for proxy in proxy_list:
    thread = threading.Thread(target=check_proxy, args=[proxy])
    thread.start()
    threads.append(thread)

# Wait for all threads to finish
for thread in threads:
    thread.join()
