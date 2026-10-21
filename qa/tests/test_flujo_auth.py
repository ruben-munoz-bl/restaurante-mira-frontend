"""Flujos de autenticación sin credenciales reales.

Cubre lo que sí es determinista sin Firebase: validación de formularios,
opciones de acceso y el guard de reserva para invitados. No se envían
credenciales válidas a propósito (no hay usuario de pruebas).
"""
from __future__ import annotations

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

import helpers as h

EMAIL_INVALIDO = "no-es-un-correo"


@pytest.fixture
def login(driver, servidores):
    h.abrir(driver, servidores, "/#/login")
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "login-email")))
    return driver


def _error(driver) -> str:
    return driver.find_element(By.CSS_SELECTOR, ".auth-error").text


def test_login_valida_correo(login):
    login.find_element(By.ID, "login-email").send_keys(EMAIL_INVALIDO)
    login.find_element(By.ID, "login-pass").send_keys("contrasena-larga")
    h.click_js(login, login.find_element(By.CSS_SELECTOR, ".auth-boton"))

    error = WebDriverWait(login, 5).until(lambda d: _error(d) or False)
    assert "correo" in error.lower(), error
    assert "#/login" in login.current_url


def test_login_valida_contrasena_corta(login):
    login.find_element(By.ID, "login-email").send_keys("pruebas@ejemplo.com")
    login.find_element(By.ID, "login-pass").send_keys("123")
    h.click_js(login, login.find_element(By.CSS_SELECTOR, ".auth-boton"))

    error = WebDriverWait(login, 5).until(lambda d: _error(d) or False)
    assert "contrase" in error.lower(), error
    # La regla es 6 (la misma que aplica Login.jsx); el mensaje no debe desviarse.
    assert "6" in error, error
    assert "#/login" in login.current_url


def test_login_ofrece_google_recuperar_y_registro(login):
    cuerpo = login.find_element(By.CSS_SELECTOR, "main").text.lower()
    assert "google" in cuerpo
    assert "contrase" in cuerpo

    enlaces = {a.get_attribute("href") for a in login.find_elements(By.CSS_SELECTOR, "main a")}
    assert any(e and e.endswith("#/registro") for e in enlaces), enlaces
    assert any(e and "#/recuperar" in e for e in enlaces), enlaces


def test_recuperar_usa_validacion_nativa(driver, servidores):
    """El formulario de recuperación no tiene noValidate: valida el navegador."""
    h.abrir(driver, servidores, "/#/recuperar")
    campo = WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "rec-email")))
    campo.send_keys(EMAIL_INVALIDO)
    h.click_js(driver, driver.find_element(By.CSS_SELECTOR, "main button[type='submit']"))

    valido, mensaje = driver.execute_script(
        "const c = document.getElementById('rec-email');"
        "return [c.checkValidity(), c.validationMessage];"
    )
    assert valido is False
    assert mensaje, "el navegador debería marcar el campo como inválido"
    assert "#/recuperar" in driver.current_url
    assert not driver.find_elements(By.CSS_SELECTOR, ".auth-error"), "no debe llegar al backend"


def test_reserva_sin_sesion_manda_al_login(driver, servidores):
    h.abrir(driver, servidores, "/")
    WebDriverWait(driver, 20).until(lambda d: len(h.tarjetas(d)) > 0)

    h.click_js(driver, h.tarjetas(driver)[0])
    modal = WebDriverWait(driver, 10).until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, ".modal.det"))
    )
    assert "reservar" in h.texto(modal).lower()

    # Aviso de que hace falta sesión, con enlace al login.
    nota = modal.find_element(By.CSS_SELECTOR, ".det-nota-login")
    texto_nota = h.texto(nota).lower()
    assert "sesión" in texto_nota or "sesion" in texto_nota

    h.click_js(driver, modal.find_element(By.CSS_SELECTOR, ".det-reservar"))
    WebDriverWait(driver, 5).until(lambda d: "#/login" in d.current_url)
    assert len(driver.find_elements(By.ID, "login-email")) == 1
