"""
Modbus TCP Client - PLC Communication Module
Connects to real PLCs via Modbus TCP protocol.
Supports Allen-Bradley, Siemens, Schneider, Mitsubishi PLCs.

PDF Architecture:
PLC (IP: 192.168.1.10, Port: 502) → Edge Computer → Read PLC registers → Convert to engineering values → Send JSON to backend
"""
import socket
import struct
import time
import json
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

try:
    from pymodbus.client import ModbusTcpClient
    from pymodbus.constants import Endian
    from pymodbus.payload import BinaryPayloadDecoder
    PYMODBUS_AVAILABLE = True
except ImportError:
    PYMODBUS_AVAILABLE = False


class ModbusTCPClient:
    """
    Modbus TCP client for reading PLC registers.
    Compatible with Allen-Bradley, Siemens, Schneider, Mitsubishi.
    """

    # Standard Modbus function codes
    FC_READ_COILS = 0x01
    FC_READ_DISCRETE_INPUTS = 0x02
    FC_READ_HOLDING_REGISTERS = 0x03
    FC_READ_INPUT_REGISTERS = 0x04
    FC_WRITE_SINGLE_REGISTER = 0x06
    FC_WRITE_MULTIPLE_REGISTERS = 0x10

    def __init__(self, host: str = "192.168.1.10", port: int = 502, unit_id: int = 1):
        self.host = host
        self.port = port
        self.unit_id = unit_id
        self.client = None
        self.connected = False
        self._lock = threading.Lock()

        # PLC register map (PDF Section 3)
        self.register_map = {
            # Input Registers (read-only sensor data)
            "belt_status":       {"address": 0,   "type": "uint16",  "scale": 1,    "unit": ""},
            "belt_speed":        {"address": 1,   "type": "float32", "scale": 1,    "unit": "m/s"},
            "motor_rpm":         {"address": 3,   "type": "float32", "scale": 1,    "unit": "RPM"},
            "motor_current":     {"address": 5,   "type": "float32", "scale": 0.1,  "unit": "A"},
            "temperature":       {"address": 7,   "type": "float32", "scale": 0.1,  "unit": "C"},
            "vibration":         {"address": 9,   "type": "float32", "scale": 0.01, "unit": "mm/s"},
            "belt_tension":      {"address": 11,  "type": "float32", "scale": 0.1,  "unit": "kN"},
            "alignment":         {"address": 13,  "type": "uint16",  "scale": 1,    "unit": ""},
            "emergency_stop":    {"address": 14,  "type": "bool",    "scale": 1,    "unit": ""},
            "belt_slip":         {"address": 15,  "type": "bool",    "scale": 1,    "unit": ""},
            "operating_hours":   {"address": 16,  "type": "uint32",  "scale": 1,    "unit": "hours"},
            "alarm_status":      {"address": 18,  "type": "uint16",  "scale": 1,    "unit": ""},
            "alarm_code":        {"address": 19,  "type": "uint16",  "scale": 1,    "unit": ""},
            "bearing_temp":      {"address": 20,  "type": "float32", "scale": 0.1,  "unit": "C"},
            "gearbox_temp":      {"address": 22,  "type": "float32", "scale": 0.1,  "unit": "C"},
            "motor_voltage":     {"address": 24,  "type": "float32", "scale": 0.1,  "unit": "V"},
        }

    def connect(self) -> bool:
        """Connect to PLC via Modbus TCP."""
        if PYMODBUS_AVAILABLE:
            try:
                self.client = ModbusTcpClient(
                    host=self.host,
                    port=self.port,
                    timeout=5,
                    retries=3,
                )
                if self.client.connect():
                    self.connected = True
                    print(f"[Modbus] Connected to PLC at {self.host}:{self.port}")
                    return True
            except Exception as e:
                print(f"[Modbus] Connection failed: {e}")

        # Fallback: raw TCP socket connection test
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(3)
            result = sock.connect_ex((self.host, self.port))
            sock.close()
            if result == 0:
                print(f"[Modbus] TCP connection to {self.host}:{self.port} successful (raw socket)")
                self.connected = True
                return True
        except Exception as e:
            print(f"[Modbus] Raw socket test failed: {e}")

        return False

    def disconnect(self):
        """Disconnect from PLC."""
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
        self.connected = False

    def read_register(self, address: int, count: int = 1) -> Optional[List[int]]:
        """Read holding registers from PLC."""
        if not self.connected or not self.client:
            return None
        try:
            with self._lock:
                result = self.client.read_holding_registers(
                    address=address,
                    count=count,
                    slave=self.unit_id
                )
                if result.isError():
                    print(f"[Modbus] Read error at address {address}: {result}")
                    return None
                return result.registers
        except Exception as e:
            print(f"[Modbus] Read exception: {e}")
            return None

    def read_input_register(self, address: int, count: int = 1) -> Optional[List[int]]:
        """Read input registers (sensor data) from PLC."""
        if not self.connected or not self.client:
            return None
        try:
            with self._lock:
                result = self.client.read_input_registers(
                    address=address,
                    count=count,
                    slave=self.unit_id
                )
                if result.isError():
                    return None
                return result.registers
        except Exception as e:
            print(f"[Modbus] Read input error: {e}")
            return None

    def write_register(self, address: int, value: int) -> bool:
        """Write a single register to PLC."""
        if not self.connected or not self.client:
            return False
        try:
            with self._lock:
                result = self.client.write_register(
                    address=address,
                    value=value,
                    slave=self.unit_id
                )
                return not result.isError()
        except Exception as e:
            print(f"[Modbus] Write error: {e}")
            return False

    def decode_float32(self, registers: List[int]) -> float:
        """Decode two 16-bit registers into a 32-bit float."""
        if len(registers) < 2:
            return 0.0
        try:
            decoder = BinaryPayloadDecoder.fromRegisters(
                registers,
                byteorder=Endian.BIG,
                wordorder=Endian.BIG
            )
            return decoder.decode_32bit_float()
        except Exception:
            # Manual decode
            high = registers[0]
            low = registers[1]
            raw = (high << 16) | low
            return struct.unpack('f', struct.pack('I', raw))[0]

    def decode_uint32(self, registers: List[int]) -> int:
        """Decode two 16-bit registers into a 32-bit unsigned integer."""
        if len(registers) < 2:
            return 0
        return (registers[0] << 16) | registers[1]

    def read_all_sensors(self) -> Dict[str, Any]:
        """Read all sensor values from PLC (PDF Section 5 format)."""
        data = {
            "beltId": f"BELT-{self.unit_id:02d}",
            "timestamp": datetime.utcnow().isoformat(),
            "source": "modbus_tcp",
            "plc_ip": self.host,
        }

        for name, reg_info in self.register_map.items():
            addr = reg_info["address"]
            reg_type = reg_info["type"]
            scale = reg_info["scale"]
            unit = reg_info["unit"]

            if reg_type == "float32":
                regs = self.read_input_register(addr, 2) if addr < 100 else self.read_register(addr, 2)
                if regs:
                    raw_value = self.decode_float32(regs)
                    data[name] = round(raw_value * scale, 2)
                else:
                    data[name] = None

            elif reg_type == "uint32":
                regs = self.read_register(addr, 2)
                if regs:
                    raw_value = self.decode_uint32(regs)
                    data[name] = int(raw_value * scale)
                else:
                    data[name] = None

            elif reg_type == "bool":
                regs = self.read_input_register(addr, 1) if addr < 100 else self.read_register(addr, 1)
                if regs:
                    data[name] = bool(regs[0])
                else:
                    data[name] = None

            else:  # uint16
                regs = self.read_input_register(addr, 1) if addr < 100 else self.read_register(addr, 1)
                if regs:
                    data[name] = int(regs[0] * scale)
                else:
                    data[name] = None

        # Convert alignment enum to string
        alignment_map = {0: "NORMAL", 1: "MISALIGNED", 2: "WARNING"}
        data["alignment"] = alignment_map.get(data.get("alignment"), "UNKNOWN")

        # Convert belt status enum to string
        status_map = {0: "STOPPED", 1: "STARTING", 2: "RUNNING", 3: "STOPPING"}
        data["beltStatus"] = status_map.get(data.get("belt_status"), "UNKNOWN")

        return data

    def get_stats(self) -> Dict:
        return {
            "connected": self.connected,
            "host": self.host,
            "port": self.port,
            "unit_id": self.unit_id,
            "protocol": "Modbus TCP",
            "registers_mapped": len(self.register_map),
        }


class ModbusPLCMapper:
    """
    Maps Modbus register values to the exact JSON format from the PDF (Section 5).
    Ensures backend receives data in the expected format.
    """

    @staticmethod
    def to_pdf_format(raw_data: Dict) -> Dict:
        """Convert raw PLC data to PDF Section 5 format."""
        return {
            "beltId": raw_data.get("beltId", "BELT-01"),
            "speed": raw_data.get("belt_speed", 0.0),
            "motorRPM": raw_data.get("motor_rpm", 0),
            "motorCurrent": raw_data.get("motor_current", 0.0),
            "temperature": raw_data.get("temperature", 0.0),
            "vibration": raw_data.get("vibration", 0.0),
            "beltStatus": raw_data.get("beltStatus", "STOPPED"),
            "alignment": raw_data.get("alignment", "NORMAL"),
            "alarm": bool(raw_data.get("alarm_status", 0)),
            "bearingTemp": raw_data.get("bearing_temp", 0.0),
            "gearboxTemp": raw_data.get("gearbox_temp", 0.0),
            "motorVoltage": raw_data.get("motor_voltage", 0.0),
            "beltTension": raw_data.get("belt_tension", 0.0),
            "emergencyStop": raw_data.get("emergency_stop", False),
            "beltSlip": raw_data.get("belt_slip", False),
            "operatingHours": raw_data.get("operating_hours", 0),
            "alarmCode": raw_data.get("alarm_code", 0),
            "timestamp": raw_data.get("timestamp", datetime.utcnow().isoformat()),
            "source": "modbus_tcp",
        }


# Global instances
modbus_client = ModbusTCPClient()
modbus_mapper = ModbusPLCMapper()
