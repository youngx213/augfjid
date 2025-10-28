# mock_arduino.py - Mô phỏng Arduino
import time
import threading
from queue import Queue

class MockArduino:
    def __init__(self, port="COM3", baudrate=9600):
        self.port = port
        self.baudrate = baudrate
        self.command_queue = Queue()
        self.is_connected = True
        print(f"🔌 Mock Arduino connected on {port} at {baudrate} baud")
    
    def write(self, data):
        command = data.decode().strip()
        print(f"📤 Arduino received: {command}")
        self.command_queue.put(command)
        
        # Mô phỏng thời gian xử lý
        if "MOVE" in command:
            time.sleep(0.1)  # Mô phỏng thời gian di chuyển
        elif "PEN" in command:
            time.sleep(0.05)  # Mô phỏng thời gian nâng/hạ bút
    
    def readline(self):
        if self.command_queue.empty():
            return b""
        return b"OK\n"  # Mô phỏng response từ Arduino
    
    @property
    def in_waiting(self):
        return not self.command_queue.empty()
    
    def close(self):
        self.is_connected = False
        print("🔌 Mock Arduino disconnected")

# Thay thế serial.Serial bằng MockArduino
import sys
sys.modules['serial'] = type('MockSerial', (), {
    'Serial': MockArduino
})()