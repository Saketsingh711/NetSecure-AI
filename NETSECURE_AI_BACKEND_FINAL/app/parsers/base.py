from abc import ABC, abstractmethod
from app.models import NormalizedConfig


class ParserResult:
    def __init__(self, normalized: NormalizedConfig, parser_name: str, unknown_lines: list[str]):
        self.normalized = normalized
        self.parser_name = parser_name
        self.unknown_lines = unknown_lines


class BaseParser(ABC):
    vendor: str

    @abstractmethod
    def parse(self, config: str) -> ParserResult:
        raise NotImplementedError
