"""Fixtures de la suite E2E de MIRA.

Arranca los servidores si no están levantados y prepara un Edge headless por test.
Variables de entorno: ver servers.py.
"""
from __future__ import annotations

import sys
import os
import time
import pathlib

import pytest
from selenium import webdriver
from selenium.webdriver.edge.options import Options

RAIZ_QA = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(RAIZ_QA))

import servers  # noqa: E402


def pytest_addoption(parser):
    """Taurus no propaga `env` al executor pytest: las opciones van por CLI."""
    grupo = parser.getgroup("mira")
    grupo.addoption(
        "--unitarias", action="store_true", default=False,
        help="incluye npm test de frontend y backend en la regresión",
    )
    grupo.addoption("--monkey-acciones", type=int, default=None, help="acciones del monkey")
    grupo.addoption("--monkey-seed", type=int, default=None, help="semilla del monkey")


@pytest.fixture(scope="session")
def servidores() -> str:
    with servers.servidores() as url:
        yield url


@pytest.fixture
def driver(request):
    """Edge headless con captura de consola y screenshot automático al fallar."""
    opts = Options()
    if servers.HEADLESS:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1400,1000")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--lang=es-ES")
    if os.getenv("QA_REDUCED_MOTION"):
        opts.add_argument("--force-prefers-reduced-motion")
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    d = webdriver.Edge(options=opts)
    d.set_page_load_timeout(60)

    fallo: BaseException | None = None
    try:
        yield d
    except BaseException as err:  # noqa: BLE001 - queremos capturar cualquier fallo
        fallo = err
        raise
    finally:
        if fallo is not None:
            servers.ARTIFACTOS.mkdir(parents=True, exist_ok=True)
            sello = time.strftime("%Y%m%d-%H%M%S")
            nombre = request.node.name.replace("/", "_").replace("::", "_")
            try:
                d.save_screenshot(str(servers.ARTIFACTOS / f"{nombre}-{sello}.png"))
                with open(servers.ARTIFACTOS / f"{nombre}-{sello}.log", "w", encoding="utf-8") as fh:
                    fh.write(f"URL: {d.current_url}\nFALLO: {fallo!r}\n\n")
                    for entrada in d.get_log("browser"):
                        fh.write(f"{entrada['level']}: {entrada['message']}\n")
            except Exception:  # el navegador pudo haberse cerrado ya
                pass
        d.quit()
