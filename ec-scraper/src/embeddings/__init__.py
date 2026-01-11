"""Embeddings module with task-type optimization."""

from .gemini import GeminiEmbeddings, get_embeddings, TaskType

__all__ = ["GeminiEmbeddings", "get_embeddings", "TaskType"]

