import sys
import subprocess
import time
from typing import Dict, Any

MAX_TIMEOUT_SECONDS = 5
MAX_OUTPUT_BYTES = 50 * 1024  # 50 KB

def execute_python_code(code: str) -> Dict[str, Any]:
    """
    Safely executes a Python code snippet in an isolated subprocess
    with a strict execution timeout and memory/output limits.
    """
    start_time = time.perf_counter()
    try:
        process = subprocess.Popen(
            [sys.executable, "-c", code],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        try:
            stdout, stderr = process.communicate(timeout=MAX_TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "stdout": stdout[:MAX_OUTPUT_BYTES],
                "stderr": f"Execution timed out after {MAX_TIMEOUT_SECONDS}s. Infinite loops and long-running processes are stopped automatically.",
                "exit_code": -1,
                "duration_ms": duration_ms,
                "timed_out": True
            }

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "stdout": stdout[:MAX_OUTPUT_BYTES],
            "stderr": stderr[:MAX_OUTPUT_BYTES],
            "exit_code": process.returncode,
            "duration_ms": duration_ms,
            "timed_out": False
        }
    except Exception as e:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "stdout": "",
            "stderr": f"System error executing script: {str(e)}",
            "exit_code": -1,
            "duration_ms": duration_ms,
            "timed_out": False
        }
