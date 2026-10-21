"""Regresión de navegación: todas las rutas públicas renderizan su página.

Detecta lo que rompe silenciosamente un despliegue: rutas en blanco, páginas
que caen al 404, errores de consola al montar.
"""
from __future__ import annotations

import pytest
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

import helpers as h

# (hash, texto que debe aparecer en <main>)
RUTAS = [
    ("#/descubrir", "Los mejor valorados"),
    ("#/mapa", "Mapa por zonas"),
    ("#/contacto", "Contacto"),
    ("#/login", "Iniciar sesión"),
    ("#/registro", "Crear cuenta"),
    ("#/app", "bolsillo"),
    ("#/privacidad", "Privacidad"),
    ("#/favoritos", "Mis favoritos"),
    ("#/puntos", "Puntos"),
    # Ruta protegida: sin sesión debe mandar al login, no quedar en blanco.
    ("#/reservas", "Iniciar sesión"),
]


@pytest.mark.parametrize("ruta,esperado", RUTAS)
def test_ruta_renderiza(driver, servidores, ruta, esperado):
    h.abrir(driver, servidores, "/")
    h.ir_hash(driver, ruta)

    main = driver.find_element(By.CSS_SELECTOR, "main")
    # La página carga sus datos después del cambio de hash y en CI Edge arranca
    # con movimiento reducido (otra versión del vuelo): se espera al texto en vez
    # de leer una sola vez. `texto()` usa innerText: `.text` omite nodos animados.
    try:
        WebDriverWait(driver, 10).until(lambda d: esperado.lower() in h.texto(main).lower())
    except TimeoutException:
        visible = h.texto(main)
        pytest.fail(
            f"{ruta}: no aparece '{esperado}' en {visible[:120]!r}"
            if visible.strip()
            else f"{ruta} quedó en blanco"
        )

    errores = h.errores_app(driver)
    assert not errores, f"{ruta} con errores de consola: {errores}"
