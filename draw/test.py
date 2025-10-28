# test_arduino.py - Test Arduino thật
import serial
import time

def test_arduino_connection():
    """Test kết nối Arduino"""
    print("🔌 Testing Arduino connection...")
    
    try:
        # Thử các cổng COM phổ biến
        ports = ["COM3", "COM4", "COM5", "COM6", "COM7", "COM8"]
        
        for port in ports:
            try:
                print(f"🔍 Trying {port}...")
                arduino = serial.Serial(port, 9600, timeout=2)
                time.sleep(2)  # Đợi Arduino khởi động
                
                # Đọc dòng khởi động
                if arduino.in_waiting > 0:
                    startup_msg = arduino.readline().decode().strip()
                    print(f"📩 Startup message: {startup_msg}")
                
                # Test gửi lệnh
                arduino.write(b"TEST\n")
                time.sleep(1)
                
                # Đọc response
                if arduino.in_waiting > 0:
                    response = arduino.readline().decode().strip()
                    print(f"📩 Response: {response}")
                
                arduino.close()
                print(f"✅ Arduino found on {port}")
                return port
                
            except serial.SerialException:
                print(f"❌ {port} not available")
                continue
            except Exception as e:
                print(f"❌ Error on {port}: {e}")
                continue
        
        print("❌ No Arduino found")
        return None
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return None

def test_arduino_commands(port):
    """Test các lệnh Arduino"""
    print(f"\n🧪 Testing commands on {port}...")
    
    try:
        arduino = serial.Serial(port, 9600, timeout=2)
        time.sleep(2)
        
        # Đọc startup messages
        print("📩 Startup messages:")
        for _ in range(5):
            if arduino.in_waiting > 0:
                msg = arduino.readline().decode().strip()
                if msg:
                    print(f"  {msg}")
            time.sleep(0.1)
        
        # Test commands
        commands = [
            "SPEED 20",
            "PENUP",
            "MOVE 90 90",
            "PENDOWN", 
            "MOVE 100 100",
            "PENUP",
            "MOVE 90 90"
        ]
        
        for cmd in commands:
            print(f"\n📤 Sending: {cmd}")
            arduino.write((cmd + "\n").encode())
            time.sleep(0.5)
            
            # Đọc response
            if arduino.in_waiting > 0:
                response = arduino.readline().decode().strip()
                print(f"📩 Response: {response}")
        
        arduino.close()
        print("\n✅ Command test completed!")
        
    except Exception as e:
        print(f"❌ Command test failed: {e}")

def interactive_test(port):
    """Test tương tác"""
    print(f"\n🎮 Interactive test on {port}")
    print("Commands: MOVE x y, PENUP, PENDOWN, SPEED n, TEST, QUIT")
    
    try:
        arduino = serial.Serial(port, 9600, timeout=2)
        time.sleep(2)
        
        while True:
            cmd = input("\nEnter command: ").strip().upper()
            
            if cmd == "QUIT":
                break
            elif cmd == "HELP":
                print("Commands:")
                print("  MOVE x y - Move to position")
                print("  PENUP - Lift pen")
                print("  PENDOWN - Lower pen")
                print("  SPEED n - Set speed")
                print("  TEST - Run test sequence")
                print("  QUIT - Exit")
            else:
                print(f"📤 Sending: {cmd}")
                arduino.write((cmd + "\n").encode())
                time.sleep(0.5)
                
                # Đọc response
                if arduino.in_waiting > 0:
                    response = arduino.readline().decode().strip()
                    print(f"📩 Response: {response}")
        
        arduino.close()
        print("👋 Interactive test ended")
        
    except Exception as e:
        print(f"❌ Interactive test failed: {e}")

def main():
    print("=" * 50)
    print("🤖 ARDUINO SERVO TEST")
    print("=" * 50)
    
    # Test 1: Tìm Arduino
    port = test_arduino_connection()
    if not port:
        print("❌ Cannot find Arduino. Please check:")
        print("  1. Arduino is connected via USB")
        print("  2. Correct COM port")
        print("  3. Arduino IDE Serial Monitor is closed")
        print("  4. PCA9685 is connected properly")
        return
    
    # Test 2: Test commands
    test_arduino_commands(port)
    
    # Test 3: Interactive
    interactive_test(port)

if __name__ == "__main__":
    main()