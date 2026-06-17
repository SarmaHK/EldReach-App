import asyncio
import websockets
import json
import hmac
import hashlib
import random
from datetime import datetime, timezone

# ==========================================
# SERVER DETAILS (From the Backend)
# ==========================================
# Since you are running this python script on the same computer as the backend,
# 127.0.0.1 (localhost) is the most reliable IP to use.
# (If you put this on a real Raspberry Pi or ESP32, change it back to your Wi-Fi IP e.g., 10.250.254.121)
SERVER_IP = "127.0.0.1"

# ==========================================
# WEBSOCKET CONFIGURATION (For Gateway Control)
# ==========================================
WS_PORT = 5001
WS_PATH = "/?token=eldreach-gw-secret-2026"
HMAC_SECRET = "eldreach_hmac_secret_key_98765"

# Gateway identity
GATEWAY_ID = "GW001"
SYSTEM_ID = "SYS_01"


def generate_signature(payload_dict, secret):
    """
    Generates an HMAC-SHA256 signature for the given payload.
    """
    # 1. Remove the signature field from the JSON object
    payload_copy = payload_dict.copy()
    if "signature" in payload_copy:
        del payload_copy["signature"]
    
    # 2. Alphabetically sort ONLY the top-level keys to match JavaScript behavior
    sorted_dict = {k: payload_copy[k] for k in sorted(payload_copy.keys())}
    
    # 3. Stringify the JSON without any extra spaces or newlines
    sorted_json = json.dumps(sorted_dict, separators=(',', ':'))
    
    # 4. Generate an HMAC-SHA256 hash of that string using the secret key
    secret_bytes = secret.encode('utf-8')
    message_bytes = sorted_json.encode('utf-8')
    hash_obj = hmac.new(secret_bytes, message_bytes, hashlib.sha256)
    
    # 5. Convert the hash to a lowercase Hex string
    return hash_obj.hexdigest().lower()


def create_signed_payload(payload):
    """
    Adds timestamp and signature to a payload
    """
    # Add current timestamp in ISO 8601 format
    now = datetime.now(timezone.utc)
    timestamp = now.isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    payload["timestamp"] = timestamp
    
    # Generate and attach the signature
    payload["signature"] = generate_signature(payload, HMAC_SECRET)
    return payload


class FallSimulator:
    def __init__(self):
        self.state = 0 # 0: NORMAL, 1: FREEFALL, 2: IMPACT, 3: CONFIRMED, 4: RECOVERY
        self.x = 280.0
        self.y = 1920.0
        self.z = 2180.0
        self.speed = 0.0
        self.alarm_state = 0
        self.state_ticks = 0

    def tick(self):
        self.state_ticks += 1
        
        if self.state == 0: # PHASE_NORMAL
            self.alarm_state = 0
            self.x += random.uniform(-10, 10)
            self.y += random.uniform(-10, 10)
            self.z = 2180.0 + random.uniform(-20, 20)
            self.speed = random.uniform(50, 150)
            
            # Trigger fall every ~10-15 seconds (25 ticks = 1 sec)
            if random.random() < 0.0025:
                self.state = 1
                self.state_ticks = 0
                
        elif self.state == 1: # PHASE_FREEFALL
            self.alarm_state = 1
            self.z -= 100.0 # Rapid drop
            self.speed = random.uniform(600, 1200) # Massive kinetic spike
            
            if self.z <= 200:
                self.z = 200
                self.state = 2 # Impact
                self.state_ticks = 0
                
        elif self.state == 2: # PHASE_IMPACT
            self.alarm_state = 1
            self.speed = random.uniform(0, 100) # Dead stop, < 150mm/s
            self.z = 200
            
            if self.state_ticks >= 25: # POST_FALL_STILL_MS (1000ms)
                self.state = 3 # Confirmed Fall
                self.state_ticks = 0
                
        elif self.state == 3: # PHASE_CONFIRMED
            self.alarm_state = 2
            self.speed = random.uniform(0, 50)
            self.z = 200
            
            if self.state_ticks >= 125: # Stay down for 5 seconds
                self.state = 4 # Recovery
                self.state_ticks = 0
                
        elif self.state == 4: # RECOVERY
            self.alarm_state = 0
            self.z += 40.0 # Climbing up
            self.speed = random.uniform(200, 400)
            
            if self.z >= 2180:
                self.z = 2180
                self.state = 0
                self.state_ticks = 0
                
        self.x = max(-5000, min(5000, self.x))
        self.y = max(-5000, min(5000, self.y))
        
        return {
            "id": 1,
            "alarm": self.alarm_state,
            "speed": round(self.speed),
            "x": round(self.x),
            "y": round(self.y),
            "z": round(self.z)
        }

async def receive_messages(websocket):
    try:
        async for message in websocket:
            print(f"\n[Server Message]: {message}\n")
    except websockets.exceptions.ConnectionClosed:
        pass


async def simulate_sensor():
    uri = f"ws://{SERVER_IP}:{WS_PORT}{WS_PATH}"
    print(f"Connecting to Gateway WebSocket at {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected successfully!\n")
            
            asyncio.create_task(receive_messages(websocket))
            
            print("-> Sending REGISTER_GATEWAY message...")
            register_msg = {
                "type": "REGISTER_GATEWAY",
                "gatewayId": GATEWAY_ID,
                "systemId": SYSTEM_ID
            }
            register_msg = create_signed_payload(register_msg)
            
            print(f"Payload: {json.dumps(register_msg, indent=2)}")
            await websocket.send(json.dumps(register_msg))
            print("REGISTER_GATEWAY message sent.\n")
            
            await asyncio.sleep(2)
            
            print("-> Starting telemetry stream simulation (25 Hz FSM)...")
            
            sim = FallSimulator()
            last_print = 0
            
            while True:
                target = sim.tick()

                telemetry_msg = {
                    "type": "TELEMETRY_STREAM",
                    "gatewayId": GATEWAY_ID,
                    "systemId": SYSTEM_ID,
                    "targets": [target]
                }
                telemetry_msg = create_signed_payload(telemetry_msg)
                
                print(f"[{telemetry_msg['timestamp']}] Telemetry [State: {sim.state}] Z: {target['z']}mm | Spd: {target['speed']}mm/s | Alarm: {target['alarm']}")

                await websocket.send(json.dumps(telemetry_msg))
                
                # 40ms telemetry window matching real hardware (25 FPS)
                await asyncio.sleep(0.04)
                
    except Exception as e:
        print(f"WebSocket Error: {e}")
        print("\nMake sure your backend is running and SERVER_IP is correct.")

if __name__ == "__main__":
    try:
        asyncio.run(simulate_sensor())
    except KeyboardInterrupt:
        print("\nSimulation stopped.")
