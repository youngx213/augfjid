#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(0x40);

#define SERVOMIN  150
#define SERVOMAX  600

int penUpAngle = 90;
int penDownAngle = 0;
int speedDelay = 5;

const int ledPin = 13;
unsigned long lastBlink = 0;
bool ledState = false;
bool isMoving = false;

// ⚙️ Kênh servo trên PCA9685 (chân 8, 9, 10)
#define SERVO_X 8
#define SERVO_Y 9
#define SERVO_PEN 10

// Lưu góc hiện tại
int currentX = 90;
int currentY = 90;
int currentPen = 90;

// ---- Hàm chuyển đổi góc → giá trị PWM ----
int angleToPulse(int angle) {
  return map(angle, 0, 180, SERVOMIN, SERVOMAX);
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  pwm.begin();
  pwm.setPWMFreq(50);  // servo chạy ở 50Hz

  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  // Khởi tạo vị trí ban đầu
  moveServo(SERVO_X, currentX);
  moveServo(SERVO_Y, currentY);
  moveServo(SERVO_PEN, penUpAngle);
  currentPen = penUpAngle;

  Serial.println("✅ DrawBot with PCA9685 ready!");
  Serial.println("Commands:");
  Serial.println(" - MOVE x y");
  Serial.println(" - PENUP / PENDOWN");
  Serial.println(" - SPEED n");
  Serial.println(" - SET X n / SET Y n / SET PEN n");

  // Nháy LED báo code nạp xong
  for (int i = 0; i < 3; i++) {
    digitalWrite(ledPin, HIGH);
    delay(200);
    digitalWrite(ledPin, LOW);
    delay(200);
  }
}

void loop() {
  // LED nháy nhanh/chậm tùy trạng thái
  unsigned long interval = isMoving ? 100 : 500;
  if (millis() - lastBlink > interval) {
    ledState = !ledState;
    digitalWrite(ledPin, ledState);
    lastBlink = millis();
  }

  // Nhận lệnh từ Serial
  if (Serial.available() > 0) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return;

    Serial.print("📩 Received: ");
    Serial.println(line);

    if (line.startsWith("MOVE")) {
      int x, y;
      sscanf(line.c_str(), "MOVE %d %d", &x, &y);
      x = constrain(x, 0, 180);
      y = constrain(y, 0, 180);

      Serial.print("Moving to X=");
      Serial.print(x);
      Serial.print(" Y=");
      Serial.println(y);

      isMoving = true;
      moveTo(x, y);
      isMoving = false;
    }
    else if (line.equals("PENUP")) {
      Serial.println("✏️ Pen up");
      moveServo(SERVO_PEN, penUpAngle);
      currentPen = penUpAngle;
    }
    else if (line.equals("PENDOWN")) {
      Serial.println("✏️ Pen down");
      moveServo(SERVO_PEN, penDownAngle);
      currentPen = penDownAngle;
    }
    else if (line.startsWith("SPEED")) {
      int spd;
      sscanf(line.c_str(), "SPEED %d", &spd);
      speedDelay = max(1, spd);
      Serial.print("⚡ Speed set to ");
      Serial.println(speedDelay);
    }
    else if (line.startsWith("SET")) {
      char axis[10];
      int angle;
      sscanf(line.c_str(), "SET %s %d", axis, &angle);
      angle = constrain(angle, 0, 180);

      if (strcmp(axis, "X") == 0) {
        moveServo(SERVO_X, angle);
        currentX = angle;
        Serial.print("✅ Set X to "); Serial.println(angle);
      } 
      else if (strcmp(axis, "Y") == 0) {
        moveServo(SERVO_Y, angle);
        currentY = angle;
        Serial.print("✅ Set Y to "); Serial.println(angle);
      } 
      else if (strcmp(axis, "PEN") == 0) {
        moveServo(SERVO_PEN, angle);
        currentPen = angle;
        Serial.print("✅ Set PEN to "); Serial.println(angle);
      } 
      else {
        Serial.println("⚠️ Unknown axis! Use X, Y, or PEN.");
      }
    }
  }
}

// ---- Hàm điều khiển servo qua PCA9685 ----
void moveServo(int channel, int angle) {
  int pulse = angleToPulse(angle);
  pwm.setPWM(channel, 0, pulse);
}

// ---- Di chuyển từ vị trí hiện tại tới (x, y) mượt ----
void moveTo(int x, int y) {
  int steps = max(abs(x - currentX), abs(y - currentY));
  if (steps == 0) return;

  for (int i = 1; i <= steps; i++) {
    int nx = currentX + (x - currentX) * i / steps;
    int ny = currentY + (y - currentY) * i / steps;
    moveServo(SERVO_X, nx);
    moveServo(SERVO_Y, ny);
    delay(speedDelay);
  }

  currentX = x;
  currentY = y;

  Serial.println("✅ Move completed");
}
