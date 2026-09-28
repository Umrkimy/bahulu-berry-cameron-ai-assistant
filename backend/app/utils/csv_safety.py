from collections.abc import Iterable

# Spreadsheet apps run cells that start with these characters as formulas.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe_cell(value: object) -> object:
    if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
        return f"'{value}"
    return value


def csv_safe_rows(rows: Iterable[Iterable[object]]) -> list[list[object]]:
    return [[csv_safe_cell(value) for value in row] for row in rows]
