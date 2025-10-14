import websocket, json, requests, numpy as np, cv2
from PIL import Image
from io import BytesIO
import serial, time

# Arduino
arduino = serial.Serial("COM3", 9600, timeout=1)
time.sleep(2)

def send(cmd):
    arduino.write((cmd + "\n").encode())
    print(">>", cmd)
    time.sleep(0.05)

def set_speed(ms):
    send(f"SPEED {ms}")

def fetch_image(url):
    r = requests.get(url)
    img = Image.open(BytesIO(r.content)).convert("L")
    return np.array(img)

def preprocess(img, size=100):
    img = cv2.resize(img, (size, size))
    _, thresh = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY_INV)
    return thresh

# Giới hạn vùng vẽ servo (tùy chỉnh theo cơ cấu thực tế)
X_MIN, X_MAX = 60, 120
Y_MIN, Y_MAX = 60, 120

def mapX(x): return int(X_MIN + (x / 100) * (X_MAX - X_MIN))
def mapY(y): return int(Y_MIN + (y / 100) * (Y_MAX - Y_MIN))

def trace_and_draw(thresh):
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        if cv2.contourArea(contour) < 10:
            continue

        send("PENUP")
        x0, y0 = contour[0][0]
        send(f"MOVE {mapX(x0)} {mapY(y0)}")
        send("PENDOWN")

        for pt in contour:
            x, y = pt[0]
            send(f"MOVE {mapX(x)} {mapY(y)}")

        send("PENUP")

def on_message(ws, message):
    data = json.loads(message)
    if data.get("type") == "new_job":
        print(f"📥 New job from @{data['user']}: {data['imageUrl']}")
        img = fetch_image(data['imageUrl'])
        thresh = preprocess(img, size=100)
        set_speed(5)
        trace_and_draw(thresh)
        ws.send(json.dumps({"type": "job_done", "user": data['user']}))
        print(f"✅ Job done for @{data['user']}")

def on_open(ws):
    print("🔌 Connected to backend WebSocket")

def on_close(ws, code, msg):
    print("❌ Disconnected")

ws = websocket.WebSocketApp(
    "ws://localhost:3001",
    on_open=on_open,
    on_message=on_message,
    on_close=on_close
)
ws.run_forever()
