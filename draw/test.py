import serial
import time

# ⚙️ Thông số cổng Arduino — chỉnh lại nếu cần
PORT = "COM3"
BAUD = 9600

# Mở kết nối serial
print(f"🔌 Đang kết nối tới Arduino tại {PORT}...")
arduino = serial.Serial(PORT, BAUD, timeout=1)
time.sleep(2)
print("✅ Kết nối thành công!\n")

# ---- HÀM GỬI LỆNH ----
def send(cmd, wait=0.05):
    arduino.write((cmd + "\n").encode())
    print(">>", cmd)
    time.sleep(wait)
    while arduino.in_waiting:
        line = arduino.readline().decode(errors="ignore").strip()
        if line:
            print("<<", line)

# ---- CHẾ ĐỘ TEST TỰ ĐỘNG ----
def auto_test():
    print("\n⚙️ Bắt đầu test servo...")
    send("SPEED 10")
    send("PENUP")

    # Di chuyển X và Y
    for angle in range(60, 121, 10):
        send(f"SET X {angle}")
        send(f"SET Y {180 - angle}")
        time.sleep(0.2)

    # Test servo bút
    print("\n✏️ Test servo PEN...")
    send("PENUP")
    time.sleep(1)
    send("PENDOWN")
    time.sleep(1)
    send("PENUP")

    print("\n✅ Test hoàn tất!\n")

# ---- MENU CHÍNH ----
def menu():
    while True:
        print("""
=============================
🎮 Servo Test Menu
1. Gửi lệnh thủ công
2. Test tự động
3. Thoát
=============================
""")
        choice = input("Chọn chế độ (1-3): ").strip()

        if choice == "1":
            cmd = input("Nhập lệnh gửi đến Arduino: ").strip()
            send(cmd)
        elif choice == "2":
            auto_test()
        elif choice == "3":
            print("👋 Thoát chương trình.")
            break
        else:
            print("⚠️ Lựa chọn không hợp lệ!")

# ---- CHẠY CHƯƠNG TRÌNH ----
if __name__ == "__main__":
    try:
        menu()
    except KeyboardInterrupt:
        print("\n🛑 Dừng chương trình.")
    finally:
        arduino.close()
