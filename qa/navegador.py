"""Creación del WebDriver compartida por conftest y el CLI del monkey.

Variables de entorno:
  MIRA_BROWSER        edge (por defecto) | chrome
  MIRA_CHROME_BINARY  ruta a un Chrome/Chromium concreto (opcional)
  MIRA_CHROMEDRIVER   ruta a un chromedriver concreto (opcional; si no, Selenium Manager)
"""
from __future__ import annotations

import os

from selenium import webdriver

NAVEGADOR = os.environ.get("MIRA_BROWSER", "edge").strip().lower()


def crear_driver(headless: bool = True, ancho: int = 1400, alto: int = 1000):
    if NAVEGADOR == "chrome":
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
    elif NAVEGADOR == "edge":
        from selenium.webdriver.edge.options import Options
        from selenium.webdriver.edge.service import Service
    else:
        raise ValueError(f"MIRA_BROWSER no soportado: {NAVEGADOR!r} (usa edge o chrome)")

    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument(f"--window-size={ancho},{alto}")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--lang=es-ES")
    if os.environ.get("QA_REDUCED_MOTION"):
        opts.add_argument("--force-prefers-reduced-motion")
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    if NAVEGADOR == "chrome":
        if os.environ.get("MIRA_CHROME_BINARY"):
            opts.binary_location = os.environ["MIRA_CHROME_BINARY"]
        # En Linux, Chromium ignora --lang: navigator.language sale del entorno
        # (LANGUAGE/LANG) y la app arrancaría en inglés. Lo forzamos a español.
        opts.add_experimental_option("prefs", {"intl.accept_languages": "es-ES,es"})
        entorno = {**os.environ, "LANGUAGE": "es_ES:es", "LANG": "es_ES.UTF-8"}
        servicio = Service(
            executable_path=os.environ.get("MIRA_CHROMEDRIVER") or None, env=entorno
        )
        d = webdriver.Chrome(options=opts, service=servicio)
    else:
        d = webdriver.Edge(options=opts, service=Service())

    d.set_page_load_timeout(60)
    return d
