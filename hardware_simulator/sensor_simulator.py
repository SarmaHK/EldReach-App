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
            
            # Start background task to read messages from the server
            asyncio.create_task(receive_messages(websocket))
            
            # --- 1. SEND REGISTER_GATEWAY ---
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
            
            # Allow some time for the server to process registration
            await asyncio.sleep(2)
            
            # --- 2. SEND TELEMETRY_STREAM ---
            print("-> Starting telemetry stream simulation...")
            
            # Initial position
            x, y, z = 280, 1920, 2180
            
            while True:
                # Random walk logic to simulate a person moving
                x += random.randint(-150, 150)
                y += random.randint(-150, 150)
                z += random.randint(-50, 50)
                
                # Keep values within some reasonable bounds if desired, or just let them wander
                x = max(-5000, min(5000, x))
                y = max(-5000, min(5000, y))
                z = max(0, min(3000, z))

                telemetry_msg = {
                    "type": "TELEMETRY_STREAM",
                    "gatewayId": GATEWAY_ID,
                    "systemId": SYSTEM_ID,
                    "targets": [
                        {
                            "id": 1,
                            "alarm": 2,
                            "speed": random.randint(300, 600), # Adding a bit of random speed variation too
                            "x": x,
                            "y": y,
                            "z": z
                        }
                    ]
                }
                telemetry_msg = create_signed_payload(telemetry_msg)
                
                print(f"Sending telemetry: {telemetry_msg['timestamp']}")
                await websocket.send(json.dumps(telemetry_msg))
                
                # Wait before sending the next telemetry reading
                await asyncio.sleep(5)
                
    except Exception as e:
        print(f"WebSocket Error: {e}")
        print("\nMake sure your backend is running and SERVER_IP is correct.")

if __name__ == "__main__":
    try:
        asyncio.run(simulate_sensor())
    except KeyboardInterrupt:
        print("\nSimulation stopped.")
