"""
Status Reporter Module (Interface Segregation Principle)

StatusReporter: Small abstract interface with just 3 methods (status/result/error).
WebSocketReporter: Concrete implementation that sends updates over WebSocket.

Interface Segregation: The Orchestrator only sees the 3 methods it needs.
It doesn't know or care that it's a WebSocket underneath.
"""

from abc import ABC, abstractmethod


class StatusReporter(ABC):
    """Small, focused interface for reporting orchestration progress."""

    @abstractmethod
    async def status(self, message: str) -> None:
        """Report a progress update (e.g. 'Calling get_inventory_data...')."""
        pass

    @abstractmethod
    async def result(self, data: dict) -> None:
        """Report the final result (the JSON recommendation)."""
        pass

    @abstractmethod
    async def error(self, message: str, raw_output: str = None) -> None:
        """Report an error."""
        pass


class WebSocketReporter(StatusReporter):
    """Concrete reporter that sends updates over a WebSocket connection."""

    def __init__(self, ws):
        self._ws = ws

    async def status(self, message: str) -> None:
        await self._ws.send_json({"type": "status", "message": message})

    async def result(self, data: dict) -> None:
        await self._ws.send_json({"type": "result", "data": data})

    async def error(self, message: str, raw_output: str = None) -> None:
        payload = {"type": "error", "message": message}
        if raw_output:
            payload["raw_output"] = raw_output
        await self._ws.send_json(payload)


class CollectingReporter(StatusReporter):
    """
    Reporter for parallel scenario comparison.
    Streams tagged status messages live but stores the final result
    instead of sending it, so the caller can send both results together.
    """

    def __init__(self, ws, label: str):
        self._ws = ws
        self._label = label
        self.final_result = None
        self.final_error = None

    async def status(self, message: str) -> None:
        await self._ws.send_json({"type": "status", "message": f"[{self._label}] {message}"})

    async def result(self, data: dict) -> None:
        self.final_result = data

    async def error(self, message: str, raw_output: str = None) -> None:
        self.final_error = message
        await self._ws.send_json({"type": "status", "message": f"[{self._label}] ERROR: {message}"})
