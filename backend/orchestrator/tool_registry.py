"""
Tool Registry Module

Tool: A dataclass representing one callable function the AI can invoke.
ToolRegistry: A dictionary-like container that stores Tools by name.
"""

from dataclasses import dataclass
from typing import Any, Callable, Optional


@dataclass
class Tool:
    """
    A single callable tool the AI agent can invoke.

    Attributes:
        name:        The function name the AI will reference (e.g. "get_sales_data")
        description: Natural language description so the AI knows WHEN to call it
        handler:     The actual Python function to execute
    """
    name: str
    description: str
    handler: Callable[[], Any]

    def to_openai_schema(self) -> dict:
        """Convert to the OpenAI function-calling JSON format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
            }
        }

    def execute(self) -> Any:
        """Run the tool's handler and return the result."""
        return self.handler()


class ToolRegistry:
    """
    Registry of tools available to the AI agent.

    Usage:
        registry = ToolRegistry()
        registry.register(Tool("get_sales_data", "...", some_function))
        registry.get("get_sales_data").execute()  # calls some_function()

    Why a registry?
        - The Orchestrator doesn't need to know what tools exist
        - Adding a new tool = one register() call, no code changes elsewhere
    """

    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        """Add a tool to the registry."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[Tool]:
        """Look up a tool by name. Returns None if not found."""
        return self._tools.get(name)

    def get_openai_schemas(self) -> list[dict]:
        """Return all tools in the OpenAI function-calling JSON format."""
        return [tool.to_openai_schema() for tool in self._tools.values()]
