"""
PLC Emulator Module - Industrial Belt Monitoring Demo
- Simulates Allen-Bradley / Siemens PLC behavior
- Generates realistic sensor data for 8 conveyor belts
- Communicates via Telnet protocol
- Supports Modbus-like register read/write
- Simulates PLC faults, alarms, and maintenance events
"""
import socket
import time
import json
import math
import random
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional


class PLCRegister:
    """Simulates a PLC register (holding register, input register, coil, discrete input)."""

    def __init__(self, address: int, value: float = 0.0, name: str = "", unit: str = ""):
        self.address = address
        self.value = value
        self.name = name
        self.unit = unit
        self.min_value = 0.0
        self.max_value = 10000.0
        self.alarm_high = None
        self.alarm_low = None
        self.fault = False

    def set_limits(self, min_val: float, max_val: float):
        self.min_value = min_val
        self.max_value = max_val
        return self

    def set_alarms(self, high: float = None, low: float = None):
        self.alarm_high = high
        self.alarm_low = low
        return self

    def update(self, new_value: float):
        self.value = max(self.min_value, min(self.max_value, new_value))
        if self.alarm_high and self.value > self.alarm_high:
            self.fault = True
        elif self.alarm_low and self.value < self.alarm_low:
            self.fault = True
        else:
            self.fault = False

    def to_dict(self) -> Dict:
        return {
            "address": self.address,
            "name": self.name,
            "value": round(self.value, 3),
            "unit": self.unit,
            "fault": self.fault,
            "alarm_high": self.alarm_high,
            "alarm_low": self.alarm_low,
        }


class BeltPLC:
    """
    Simulates a PLC controlling one conveyor belt.
    Based on Allen-Bradley SLC-500 / MicroLogix register layout.
    """

    # Register map (Modbus-style addresses)
    REGISTERS = {
        # --- Sensor Inputs (40001-40010) ---
        40001: ("vibration_x", "mm/s", 0, 20),
        40002: ("vibration_y", "mm/s", 0, 20),
        40003: ("vibration_z", "mm/s", 0, 20),
        40004: ("temperature_bearing", "C", 15, 120),
        40005: ("temperature_belt", "C", 15, 80),
        40006: ("temperature_gearbox", "C", 15, 100),
        40007: ("motor_current", "A", 50, 500),
        40008: ("motor_voltage", "V", 380, 440),
        40009: ("acoustic_rms", "dB", 30, 120),
        40010: ("acoustic_peak", "dB", 40, 130),

        # --- Process Variables (40011-40020) ---
        40011: ("belt_speed", "m/s", 0, 6),
        40012: ("belt_tension", "kN", 10, 200),
        40013: ("belt_load", "t/h", 0, 5000),
        40014: ("tonnage_counter", "t", 0, 999999),
        40015: ("uptime_hours", "h", 0, 99999),
        40016: ("alignment_offset", "mm", -50, 50),
        40017: ("emf_signal", "mV", 0, 5),
        40018: ("splice_distance", "m", 0, 100),
        40019: ("edge_wear", "mm", 0, 30),
        40020: ("thickness", "mm", 5, 30),

        # --- Status Registers (40021-40030) ---
        40021: ("health_score", "%", 0, 100),
        40022: ("failure_risk", "%", 0, 100),
        40023: ("remaining_life", "days", 0, 365),
        40024: ("damage_type", "enum", 0, 6),
        40025: ("severity", "enum", 0, 3),
        40026: ("belt_status", "enum", 0, 3),  # 0=offline, 1=warning, 2=operational, 3=critical
        40027: ("motor_status", "enum", 0, 2),
        40028: ("alarm_code", "code", 0, 99),
        40029: ("fault_code", "code", 0, 99),
        40030: ("mode", "enum", 0, 2),  # 0=manual, 1=auto, 2=maintenance

        # --- Control Registers (40031-40040) ---
        40031: ("start_stop", "bool", 0, 1),
        40032: ("speed_setpoint", "m/s", 0, 6),
        40033: ("tension_setpoint", "kN", 10, 200),
        40034: ("emergency_stop", "bool", 0, 1),
        40035: ("reset_alarms", "bool", 0, 1),
    }

    def __init__(self, belt_id: str, plc_id: str = None):
        self.belt_id = belt_id
        self.plc_id = plc_id or f"PLC-{belt_id.replace('BLT-', '')}"
        self.registers: Dict[int, PLCRegister] = {}
        self._running = False
        self._fault_mode = False
        self._simulation_thread: Optional[threading.Thread] = None
        self._update_interval = 1.0  # seconds
        self._cycle_count = 0
        self._start_time = time.time()

        # Initialize registers
        for addr, (name, unit, min_val, max_val) in self.REGISTERS.items():
            reg = PLCRegister(addr, name=name, unit=unit)
            reg.set_limits(min_val, max_val)
            self.registers[addr] = reg

        # Set initial realistic values
        self._set_initial_values()

    def _set_initial_values(self):
        """Set initial realistic values for the belt."""
        self.registers[40011].update(3.5 + random.uniform(-0.5, 0.5))  # belt speed
        self.registers[40012].update(80 + random.uniform(-10, 10))  # tension
        self.registers[40013].update(2000 + random.uniform(-200, 200))  # load
        self.registers[40015].update(random.uniform(5000, 20000))  # uptime
        self.registers[40021].update(random.uniform(60, 98))  # health
        self.registers[40022].update(random.uniform(5, 40))  # failure risk
        self.registers[40023].update(random.uniform(30, 180))  # remaining life
        self.registers[40026].update(2)  # operational
        self.registers[40027].update(1)  # motor running
        self.registers[40030].update(1)  # auto mode

    def update_sensors(self):
        """Update sensor registers with realistic fluctuating values."""
        cycle = self._cycle_count

        # Vibration - sinusoidal with noise
        base_vib = 5.0
        vib_signal = base_vib + 3 * math.sin(cycle * 0.1) + random.gauss(0, 0.5)
        self.registers[40001].update(vib_signal)  # X
        self.registers[40002].update(vib_signal * 0.8 + random.gauss(0, 0.3))  # Y
        self.registers[40003].update(vib_signal * 0.6 + random.gauss(0, 0.2))  # Z

        # Temperature - slow drift with daily cycle
        hour_factor = math.sin(cycle * 0.01)  # Simulates daily temperature cycle
        self.registers[40004].update(55 + 10 * hour_factor + random.gauss(0, 2))  # bearing
        self.registers[40005].update(40 + 5 * hour_factor + random.gauss(0, 1))  # belt
        self.registers[40006].update(65 + 8 * hour_factor + random.gauss(0, 2))  # gearbox

        # Motor current - varies with load
        load_factor = self.registers[40013].value / 2000
        self.registers[40007].update(200 * load_factor + random.gauss(0, 5))  # current
        self.registers[40008].update(415 + random.gauss(0, 2))  # voltage

        # Acoustic
        self.registers[40009].update(65 + 5 * math.sin(cycle * 0.05) + random.gauss(0, 2))  # RMS
        self.registers[40010].update(85 + 10 * math.sin(cycle * 0.05) + random.gauss(0, 3))  # Peak

        # Process variables
        self.registers[40011].update(3.5 + 0.5 * math.sin(cycle * 0.02) + random.gauss(0, 0.1))  # speed
        self.registers[40012].update(85 + 10 * math.sin(cycle * 0.015) + random.gauss(0, 2))  # tension
        self.registers[40013].update(2000 + 500 * math.sin(cycle * 0.008) + random.gauss(0, 50))  # load

        # Tonnage counter increments
        current_tonnage = self.registers[40014].value
        self.registers[40014].update(current_tonnage + self.registers[40013].value / 3600)

        # Alignment drifts slowly
        self.registers[40016].update(5 * math.sin(cycle * 0.005) + random.gauss(0, 0.5))

        # EMF signal
        self.registers[40017].update(0.3 + 0.1 * math.sin(cycle * 0.03) + random.gauss(0, 0.02))

        # Edge wear increases slowly
        self.registers[40019].update(8 + cycle * 0.001 + random.gauss(0, 0.1))

        # Health degrades slowly
        health = self.registers[40021].value
        self.registers[40021].update(max(20, health - 0.001 + random.gauss(0, 0.1)))

        # Failure risk increases
        risk = self.registers[40022].value
        self.registers[40022].update(min(95, risk + 0.002 + random.gauss(0, 0.1)))

        # Remaining life decreases
        life = self.registers[40023].value
        self.registers[40023].update(max(1, life - 0.001))

        # Status based on health
        health_val = self.registers[40021].value
        if health_val > 80:
            self.registers[40026].update(2)  # operational
        elif health_val > 60:
            self.registers[40026].update(1)  # warning
        elif health_val > 40:
            self.registers[40026].update(3)  # critical
        else:
            self.registers[40026].update(0)  # offline

        # Alarm code
        if self.registers[40004].fault:
            self.registers[40028].update(1)  # bearing overtemp
        elif self.registers[40007].fault:
            self.registers[40028].update(2)  # motor overload
        elif self.registers[40016].fault:
            self.registers[40028].update(3)  # misalignment
        else:
            self.registers[40028].update(0)

        self._cycle_count += 1

    def inject_fault(self, fault_type: str = "bearing_overheat"):
        """Inject a simulated fault for demo purposes."""
        if fault_type == "bearing_overheat":
            self.registers[40004].update(110)  # Over temp
            self.registers[40028].update(1)
            self.registers[40029].update(101)
        elif fault_type == "motor_overload":
            self.registers[40007].update(480)  # Over current
            self.registers[40028].update(2)
            self.registers[40029].update(102)
        elif fault_type == "belt_tear":
            self.registers[40021].update(35)  # Low health
            self.registers[40022].update(85)  # High risk
            self.registers[40024].update(0)   # Tear damage
            self.registers[40025].update(3)   # Critical severity
            self.registers[40026].update(3)   # Critical status
            self.registers[40028].update(5)
            self.registers[40029].update(105)
        elif fault_type == "misalignment":
            self.registers[40016].update(45)  # High offset
            self.registers[40028].update(3)
            self.registers[40029].update(103)
        elif fault_type == "splice_failure":
            self.registers[40021].update(45)
            self.registers[40024].update(2)  # Splice failure
            self.registers[40025].update(2)
            self.registers[40028].update(4)
            self.registers[40029].update(104)
        elif fault_type == "emergency_stop":
            self.registers[40034].update(1)
            self.registers[40031].update(0)
            self.registers[40026].update(0)  # Offline
            self.registers[40027].update(0)  # Motor off
            self.registers[40028].update(99)
        self._fault_mode = True

    def clear_faults(self):
        """Clear all faults and return to normal operation."""
        self._fault_mode = False
        self.registers[40028].update(0)
        self.registers[40029].update(0)
        self.registers[40034].update(0)
        self.registers[40031].update(1)
        self.registers[40027].update(1)
        self._set_initial_values()

    def read_register(self, address: int) -> Optional[Dict]:
        """Read a single register."""
        reg = self.registers.get(address)
        return reg.to_dict() if reg else None

    def read_all_registers(self) -> List[Dict]:
        """Read all registers."""
        return [reg.to_dict() for reg in self.registers.values()]

    def read_sensor_data(self) -> Dict:
        """Read sensor data in ML-ready format."""
        return {
            "belt_id": self.belt_id,
            "plc_id": self.plc_id,
            "timestamp": datetime.utcnow().isoformat(),
            "sensors": {
                "vibration_x": self.registers[40001].value,
                "vibration_y": self.registers[40002].value,
                "vibration_z": self.registers[40003].value,
                "vibration": math.sqrt(
                    self.registers[40001].value**2 +
                    self.registers[40002].value**2 +
                    self.registers[40003].value**2
                ),
                "temperature_bearing": self.registers[40004].value,
                "temperature_belt": self.registers[40005].value,
                "temperature_gearbox": self.registers[40006].value,
                "temperature": self.registers[40004].value,
                "motor_current": self.registers[40007].value,
                "motor_voltage": self.registers[40008].value,
                "acoustic_rms": self.registers[40009].value,
                "acoustic_peak": self.registers[40010].value,
                "acoustic": self.registers[40009].value,
                "belt_speed": self.registers[40011].value,
                "belt_tension": self.registers[40012].value,
                "load": self.registers[40013].value,
                "alignment_offset": self.registers[40016].value,
                "emf_signal": self.registers[40017].value,
                "edge_wear": self.registers[40019].value,
            },
            "status": {
                "health_score": self.registers[40021].value,
                "failure_risk": self.registers[40022].value,
                "remaining_life": self.registers[40023].value,
                "belt_status": int(self.registers[40026].value),
                "motor_status": int(self.registers[40027].value),
                "alarm_code": int(self.registers[40028].value),
                "fault_code": int(self.registers[40029].value),
                "mode": int(self.registers[40030].value),
            },
        }


class PLCEmulatorServer:
    """
    Telnet server that emulates PLC behavior.
    Multiple clients can connect and read/write registers.
    """

    COMMANDS = {
        "HELP": "Show available commands",
        "STATUS": "Show PLC status summary",
        "READ ALL": "Read all registers",
        "READ <addr>": "Read specific register",
        "WRITE <addr> <value>": "Write to register",
        "SENSORS": "Read sensor data (ML format)",
        "FAULT <type>": "Inject fault (bearing_overheat, motor_overload, belt_tear, misalignment, splice_failure, emergency_stop)",
        "CLEAR": "Clear all faults",
        "INFO": "Show PLC info",
        "CYCLES": "Show cycle count",
    }

    FAULT_TYPES = [
        "bearing_overheat", "motor_overload", "belt_tear",
        "misalignment", "splice_failure", "emergency_stop",
    ]

    def __init__(self, host: str = "0.0.0.0", port: int = 5023):
        self.host = host
        self.port = port
        self.server_socket: Optional[socket.socket] = None
        self.running = False
        self.plcs: Dict[str, BeltPLC] = {}
        self._clients: List[socket.socket] = []
        self._server_thread: Optional[threading.Thread] = None
        self._update_thread: Optional[threading.Thread] = None
        self._total_connections = 0
        self._total_commands = 0
        self._lock = threading.Lock()

    def add_plc(self, belt_id: str) -> BeltPLC:
        """Add a PLC for a belt."""
        plc = BeltPLC(belt_id)
        self.plcs[belt_id] = plc
        print(f"[PLC] Added PLC for {belt_id} ({plc.plc_id})")
        return plc

    def start(self):
        """Start the PLC emulator server."""
        # Initialize 8 PLCs for 8 belts
        belt_ids = ["BLT-001", "BLT-002", "BLT-003", "BLT-004",
                     "BLT-005", "BLT-006", "BLT-007", "BLT-008"]
        for bid in belt_ids:
            if bid not in self.plcs:
                self.add_plc(bid)

        # Start Telnet server
        self.server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.server_socket.bind((self.host, self.port))
        self.server_socket.listen(10)
        self.running = True

        self._server_thread = threading.Thread(target=self._accept_loop, daemon=True)
        self._server_thread.start()

        self._update_thread = threading.Thread(target=self._update_loop, daemon=True)
        self._update_thread.start()

        print(f"[PLC] Emulator server started on {self.host}:{self.port}")
        print(f"[PLC] {len(self.plcs)} PLCs active: {', '.join(self.plcs.keys())}")

    def _accept_loop(self):
        """Accept incoming Telnet connections."""
        while self.running:
            try:
                self.server_socket.settimeout(1.0)
                client, addr = self.server_socket.accept()
                self._total_connections += 1
                print(f"[PLC] Client connected from {addr}")
                thread = threading.Thread(
                    target=self._handle_client, args=(client, addr), daemon=True
                )
                thread.start()
            except socket.timeout:
                continue
            except Exception as e:
                if self.running:
                    print(f"[PLC] Accept error: {e}")

    def _handle_client(self, client: socket.socket, addr):
        """Handle a Telnet client connection."""
        try:
            # Send welcome banner
            banner = (
                f"\r\n"
                f"  ============================================\r\n"
                f"  NMDC Industrial PLC Emulator v2.0\r\n"
                f"  Belt Monitoring System - Smart India Hackathon\r\n"
                f"  ============================================\r\n"
                f"\r\n"
                f"  {len(self.plcs)} PLCs active | Port {self.port}\r\n"
                f"  Type HELP for commands\r\n"
                f"\r\n"
            )
            client.sendall(banner.encode("utf-8"))

            # Show PLC selection
            client.sendall(b"Available PLCs:\r\n")
            for i, (bid, plc) in enumerate(self.plcs.items(), 1):
                status = "RUNNING" if plc.registers[40026].value >= 2 else "FAULT"
                client.sendall(f"  [{i}] {bid} ({plc.plc_id}) - {status}\r\n".encode("utf-8"))
            client.sendall(b"\r\nSelect PLC (number or belt ID): ")

            # Wait for PLC selection
            data = self._recv_line(client)
            if not data:
                client.close()
                return

            # Select PLC
            selected_plc = None
            try:
                idx = int(data) - 1
                if 0 <= idx < len(self.plcs):
                    selected_plc = list(self.plcs.values())[idx]
            except ValueError:
                for bid, plc in self.plcs.items():
                    if bid.upper() in data.upper() or plc.plc_id.upper() in data.upper():
                        selected_plc = plc
                        break

            if not selected_plc:
                # Default to first PLC
                selected_plc = list(self.plcs.values())[0]

            client.sendall(f"\r\nConnected to {selected_plc.belt_id} ({selected_plc.plc_id})\r\n".encode("utf-8"))
            client.sendall(f"Type HELP for commands\r\n\r\n".encode("utf-8"))

            # Command loop
            while self.running:
                client.sendall(f"{selected_plc.plc_id}> ".encode("utf-8"))
                command = self._recv_line(client)
                if not command:
                    break

                self._total_commands += 1
                response = self._process_command(command.strip(), selected_plc)
                if response:
                    client.sendall((response + "\r\n").encode("utf-8"))

        except (ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            print(f"[PLC] Client handler error: {e}")
        finally:
            client.close()
            print(f"[PLC] Client {addr} disconnected")

    def _recv_line(self, client: socket.socket) -> str:
        """Receive a line from the client."""
        try:
            client.settimeout(30.0)
            data = b""
            while True:
                byte = client.recv(1)
                if not byte:
                    return ""
                if byte in (b"\n", b"\r"):
                    if data:
                        break
                    continue
                data += byte
                # Handle backspace
                if byte == b"\x08":
                    data = data[:-2] if len(data) > 1 else data[:-1]
            return data.decode("utf-8", errors="ignore").strip()
        except socket.timeout:
            return ""
        except Exception:
            return ""

    def _process_command(self, command: str, plc: BeltPLC) -> str:
        """Process a PLC command."""
        cmd = command.upper().strip()

        if cmd == "HELP":
            lines = ["", "Available Commands:"]
            for cmd_name, desc in self.COMMANDS.items():
                lines.append(f"  {cmd_name:<25} - {desc}")
            lines.append(f"\n  Fault types: {', '.join(self.FAULT_TYPES)}")
            lines.append("")
            return "\r\n".join(lines)

        elif cmd == "STATUS":
            sensors = plc.read_sensor_data()
            status_map = {0: "OFFLINE", 1: "WARNING", 2: "OPERATIONAL", 3: "CRITICAL"}
            mode_map = {0: "MANUAL", 1: "AUTO", 2: "MAINTENANCE"}
            lines = [
                f"\n  PLC Status: {plc.plc_id} ({plc.belt_id})",
                f"  {'='*45}",
                f"  Belt Status:    {status_map.get(int(sensors['status']['belt_status']), 'UNKNOWN')}",
                f"  Motor:          {'RUNNING' if sensors['status']['motor_status'] >= 1 else 'STOPPED'}",
                f"  Mode:           {mode_map.get(int(sensors['status']['mode']), 'UNKNOWN')}",
                f"  Health Score:   {sensors['status']['health_score']:.1f}%",
                f"  Failure Risk:   {sensors['status']['failure_risk']:.1f}%",
                f"  Remaining Life: {sensors['status']['remaining_life']:.0f} days",
                f"  Alarm Code:     {int(sensors['status']['alarm_code'])}",
                f"  Fault Code:     {int(sensors['status']['fault_code'])}",
                f"  Cycles:         {plc._cycle_count}",
                f"  {'='*45}",
            ]
            return "\r\n".join(lines)

        elif cmd == "SENSORS" or cmd == "SENSOR":
            data = plc.read_sensor_data()
            return json.dumps(data, indent=2)

        elif cmd == "READ ALL" or cmd == "READALL":
            registers = plc.read_all_registers()
            lines = ["\n  Register Map:"]
            lines.append(f"  {'Addr':<8} {'Name':<25} {'Value':<12} {'Unit':<8} {'Fault'}")
            lines.append(f"  {'-'*70}")
            for reg in registers:
                fault = "***" if reg["fault"] else ""
                lines.append(
                    f"  {reg['address']:<8} {reg['name']:<25} {reg['value']:<12.3f} {reg['unit']:<8} {fault}"
                )
            lines.append("")
            return "\r\n".join(lines)

        elif cmd.startswith("READ "):
            try:
                addr = int(cmd.split()[1])
                reg = plc.read_register(addr)
                if reg:
                    return json.dumps(reg, indent=2)
                return f"  Register {addr} not found"
            except (ValueError, IndexError):
                return "  Usage: READ <address>"

        elif cmd.startswith("WRITE "):
            parts = cmd.split()
            if len(parts) >= 3:
                try:
                    addr = int(parts[1])
                    value = float(parts[2])
                    if addr in plc.registers:
                        plc.registers[addr].update(value)
                        return f"  Register {addr} written: {value}"
                    return f"  Register {addr} not found"
                except ValueError:
                    return "  Usage: WRITE <address> <value>"
            return "  Usage: WRITE <address> <value>"

        elif cmd.startswith("FAULT "):
            fault_type = command.split(" ", 1)[1].strip().lower()
            if fault_type in self.FAULT_TYPES:
                plc.inject_fault(fault_type)
                return f"  FAULT INJECTED: {fault_type} on {plc.belt_id}"
            return f"  Unknown fault type. Available: {', '.join(self.FAULT_TYPES)}"

        elif cmd == "CLEAR":
            plc.clear_faults()
            return f"  All faults cleared on {plc.belt_id}"

        elif cmd == "INFO":
            return (
                f"\n  PLC: {plc.plc_id}\n"
                f"  Belt: {plc.belt_id}\n"
                f"  Registers: {len(plc.registers)}\n"
                f"  Cycle Count: {plc._cycle_count}\n"
                f"  Uptime: {plc.registers[40015].value:.1f} hours\n"
            )

        elif cmd == "CYCLES":
            return f"  Cycle count: {plc._cycle_count}"

        elif cmd == "QUIT" or cmd == "EXIT":
            return ""

        else:
            return f"  Unknown command: {command}. Type HELP for commands."

    def _update_loop(self):
        """Periodically update all PLC registers."""
        while self.running:
            with self._lock:
                for plc in self.plcs.values():
                    plc.update_sensors()
            time.sleep(1.0)

    def get_all_sensor_data(self) -> Dict[str, Dict]:
        """Get sensor data from all PLCs."""
        return {bid: plc.read_sensor_data() for bid, plc in self.plcs.items()}

    def get_plc_status(self) -> Dict[str, Dict]:
        """Get status of all PLCs."""
        result = {}
        for bid, plc in self.plcs.items():
            data = plc.read_sensor_data()
            result[bid] = {
                "plc_id": plc.plc_id,
                "status": data["status"],
                "cycle_count": plc._cycle_count,
                "fault_mode": plc._fault_mode,
            }
        return result

    def get_stats(self) -> Dict:
        """Get emulator statistics."""
        return {
            "running": self.running,
            "host": self.host,
            "port": self.port,
            "plc_count": len(self.plcs),
            "plcs": list(self.plcs.keys()),
            "total_connections": self._total_connections,
            "total_commands": self._total_commands,
            "status": self.get_plc_status(),
        }

    def stop(self):
        """Stop the emulator server."""
        self.running = False
        if self.server_socket:
            self.server_socket.close()


# Global instance
plc_emulator = PLCEmulatorServer()
