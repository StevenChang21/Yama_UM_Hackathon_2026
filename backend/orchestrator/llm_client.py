"""
LLM Client Module (Dependency Inversion + Liskov Substitution)

LLMClient: Abstract base class — the Orchestrator depends on this abstraction.
ILMUClient: Concrete implementation that calls the ILMU API via OpenAI SDK.

Why use the OpenAI SDK for ILMU?
    ILMU (by YTL AI Labs) exposes an OpenAI-compatible API at https://api.ilmu.dev/v1.
    We just point the OpenAI Python SDK at that base_url instead of OpenAI's servers.

Why response.choices is a list:
    The OpenAI API spec supports a parameter `n` to request multiple alternative
    completions in one call (e.g. n=3 gives 3 different responses). So `choices`
    is always a list. We only want 1 response, so we grab choices[0].

What is choices[0].message?
    It's a ChatCompletionMessage — a Pydantic model object, NOT a plain string.
    Key attributes:
        .content      → str (the text response, e.g. the final JSON answer)
        .tool_calls   → list[ToolCall] | None (tools the AI wants to invoke)
        .role         → str ("assistant")
        .model_dump() → dict (Pydantic method to convert the object to a dictionary)
"""

from abc import ABC, abstractmethod
from openai import OpenAI


class LLMClient(ABC):
    """
    Abstract interface for any LLM provider.

    The Orchestrator depends on this abstraction (Dependency Inversion).
    Any subclass that implements chat_completion() can be swapped in (Liskov).
    """

    @abstractmethod
    def chat_completion(self, messages: list[dict], tools: list[dict]):
        """
        Send messages + tool definitions to the LLM.

        Args:
            messages: Conversation history (system, user, assistant, tool messages)
            tools:    List of tool schemas in OpenAI function-calling format

        Returns:
            A ChatCompletionMessage object with:
              .content      → str (the text response)
              .tool_calls   → list | None (tools the AI wants to invoke)
              .model_dump() → dict (Pydantic serialization to dictionary)
        """
        pass


class ILMUClient(LLMClient):
    """
    Concrete LLM client for the ILMU API (YTL AI Labs, OpenAI-compatible).

    Uses the openai Python SDK pointed at ILMU's base_url.
    """

    def __init__(self, api_key: str, base_url: str = "https://api.ilmu.dev/v1", model: str = "ilmu-1.0"):
        self._client = OpenAI(api_key=api_key, base_url=base_url)
        self._model = model

    def chat_completion(self, messages, tools):
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            tools=tools,
            temperature=0.1,
        )
        # choices is a list (API supports n>1 completions), we take the first.
        # .message is a ChatCompletionMessage (Pydantic object), not a string.
        return response.choices[0].message
