"""Regresión unitaria: las suites propias del proyecto siguen en verde.

Se ejecuta con --unitarias (lo activa qa/bzt/03-regresion.yml). Así el mismo
run de Taurus cubre unidades + flujos E2E y da un único veredicto.
"""
from __future__ import annotations

import os
import pathlib
import subprocess

import pytest

import servers  # noqa: E402

RAIZ_QA = pathlib.Path(__file__).resolve().parent.parent
RAIZ_FRONT = RAIZ_QA.parent


def _backend_vecino() -> pathlib.Path:
    """El backend vive junto al frontend, también desde un worktree."""
    for base in [RAIZ_FRONT, *RAIZ_FRONT.parents]:
        ruta = base / "restuarante-mira-backend"
        if (ruta / "package.json").exists():
            return ruta
    return RAIZ_FRONT.parent / "restuarante-mira-backend"


BACKEND = pathlib.Path(os.environ.get("MIRA_BACKEND", _backend_vecino()))

MOTIVO = "usa --unitarias (o MIRA_UNITARIAS=1) para correr las suites unitarias"


@pytest.fixture(scope="session")
def unitarias(pytestconfig) -> bool:
    return bool(pytestconfig.getoption("--unitarias")) or os.environ.get(
        "MIRA_UNITARIAS", "0"
    ) not in ("0", "false", "False")


def _npm_test(cwd: pathlib.Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [servers.NPM, "test"],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=900,
        shell=False,
    )


def test_suite_frontend(unitarias):
    if not unitarias:
        pytest.skip(MOTIVO)
    if not (RAIZ_FRONT / "package.json").exists():
        pytest.skip(f"no existe {RAIZ_FRONT}")
    r = _npm_test(RAIZ_FRONT)
    assert r.returncode == 0, f"npm test (frontend) falló:\n{r.stdout[-3000:]}\n{r.stderr[-2000:]}"


def test_suite_backend(unitarias):
    if not unitarias:
        pytest.skip(MOTIVO)
    if not (BACKEND / "package.json").exists():
        pytest.skip(f"no existe {BACKEND}")
    r = _npm_test(BACKEND)
    assert r.returncode == 0, f"npm test (backend) falló:\n{r.stdout[-3000:]}\n{r.stderr[-2000:]}"
