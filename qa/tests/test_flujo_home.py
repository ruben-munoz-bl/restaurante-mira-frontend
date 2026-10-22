"""Flujos de usuario sobre la landing y el buscador.

Cada test es un recorrido real: navegador, clics y aserciones sobre lo que ve
el usuario. Si algo se rompe, queda screenshot + consola en qa/artifacts/.
"""
from __future__ import annotations

import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import helpers as h

TITULO_HOME = "Reserva tu mesa perfecta"


@pytest.fixture
def home(driver, servidores):
    h.abrir(driver, servidores, "/")
    WebDriverWait(driver, 20).until(lambda d: len(h.tarjetas(d)) > 0)
    return driver


def test_home_carga_catalogo(home):
    """La landing pinta el hero y una parrilla de restaurantes con datos."""
    assert TITULO_HOME in h.texto(home.find_element(By.TAG_NAME, "h1"))
    tarjetas = h.tarjetas(home)
    assert len(tarjetas) >= 10, f"solo {len(tarjetas)} tarjetas"

    titulos = [h.titulo_tarjeta(home, t) for t in tarjetas]
    assert all(titulos), f"tarjetas sin título: {titulos}"
    assert len(set(titulos)) > 1, "todas las tarjetas tienen el mismo título"

    errores = h.errores_app(home)
    assert not errores, f"errores de consola al cargar: {errores}"


def test_landing_promocionados_en_carrusel(home):
    """La sección de promocionados pinta tarjetas y la flecha avanza la pista."""
    seccion = home.find_element(
        By.XPATH, "//h2[@id='landing-promociones']/ancestor::section[1]"
    )
    pista = seccion.find_element(By.CSS_SELECTOR, ".landing-fila")
    assert len(seccion.find_elements(By.CSS_SELECTOR, ".landing-fila > li")) >= 4

    boton = seccion.find_element(By.CSS_SELECTOR, ".landing-carrusel-btn.siguiente")
    assert boton.is_displayed()
    antes = home.execute_script("return arguments[0].scrollLeft", pista)
    h.click_js(home, boton)
    WebDriverWait(home, 5).until(
        lambda d: d.execute_script("return arguments[0].scrollLeft", pista) > antes
    )


def test_buscador_filtra_al_pulsar_enter(home):
    """Enviar en la landing lleva a Descubrir con el filtro; Limpiar lo retira."""
    total_landing = len(h.tarjetas(home))
    assert total_landing >= 10

    campo = home.find_element(By.ID, "f-q")
    campo.clear()
    campo.send_keys("paco")
    campo.send_keys(Keys.ENTER)

    WebDriverWait(home, 10).until(
        lambda d: "#/descubrir" in d.current_url and "q=paco" in d.current_url
    )
    WebDriverWait(home, 10).until(lambda d: 0 < len(h.tarjetas(d)) < total_landing)
    filtradas = [h.titulo_tarjeta(home, t) for t in h.tarjetas(home)]
    assert filtradas, "el filtro dejó la lista vacía"
    assert all("paco" in t.lower() for t in filtradas), filtradas

    home.find_element(By.CSS_SELECTOR, ".searchbar .btn-secundario").click()
    WebDriverWait(home, 10).until(lambda d: len(h.tarjetas(d)) > len(filtradas))


def test_detalle_abre_la_ficha_del_restaurante(home):
    """Clic en una tarjeta -> ficha modal con el nombre y acciones."""
    tarjeta = h.tarjetas(home)[0]
    nombre = h.titulo_tarjeta(home, tarjeta)

    h.click_js(home, tarjeta)

    modal = WebDriverWait(home, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".modal.det"))
    )
    contenido = WebDriverWait(home, 10).until(lambda d: h.texto(modal) or False)
    assert nombre in contenido, f"'{nombre}' no aparece en la ficha"
    assert "Ver carta" in contenido
    # El fondo no debe quedar navegable con la ficha abierta.
    assert len(home.find_elements(By.CSS_SELECTOR, ".modal.det")) == 1


def test_detalle_se_cierra(home):
    """La ficha se cierra con su botón y devuelve el control a la parrilla."""
    h.click_js(home, h.tarjetas(home)[0])
    WebDriverWait(home, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".modal.det"))
    )

    h.click_js(home, home.find_element(By.CSS_SELECTOR, ".modal.det .modal-cerrar"))
    WebDriverWait(home, 5).until(
        EC.invisibility_of_element_located((By.CSS_SELECTOR, ".modal.det"))
    )

    assert len(h.tarjetas(home)) >= 10
    assert not h.errores_app(home), h.errores_app(home)
