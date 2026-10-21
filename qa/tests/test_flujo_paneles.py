"""Paneles de admin y restaurante.

`#/demo-paneles` monta los dos paneles con datos simulados y sin sesión: es la
única forma de recorrerlos hoy (no hay usuario de Firebase de pruebas). Los
guards reales sí se prueban sin credenciales: `#/admin` y `#/dashboard` mandan
al login.
"""
import helpers as h
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

TIMEOUT = 15


def _esperar(driver, cond, timeout: float = TIMEOUT):
    return WebDriverWait(driver, timeout).until(cond)


def _contenido(driver) -> str:
    return h.texto(driver.find_element(By.CSS_SELECTOR, ".ops-content")).lower()


def _abrir_demo(driver, servidores) -> None:
    h.abrir(driver, servidores, "/#/demo-paneles")
    _esperar(driver, EC.visibility_of_element_located((By.CSS_SELECTOR, ".ops-pill.warn")))


def _tab(driver, nombre: str) -> None:
    boton = _esperar(
        driver,
        EC.element_to_be_clickable(
            (By.XPATH, f"//button[@role='tab' and normalize-space(.)='{nombre}']")
        ),
    )
    h.click_js(driver, boton)


def test_demo_admin_pinta_kpis(driver, servidores):
    _abrir_demo(driver, servidores)

    kpis = _esperar(driver, lambda d: d.find_elements(By.CSS_SELECTOR, ".ops-kpi") or False)
    assert len(kpis) >= 4, f"solo {len(kpis)} KPIs en el panel de admin"
    assert "€" in h.texto(kpis[0]), "el KPI de ingresos no muestra importe"
    assert not h.errores_app(driver), h.errores_app(driver)


def test_demo_finanzas_pinta_metricas(driver, servidores):
    _abrir_demo(driver, servidores)
    _tab(driver, "Finanzas")

    _esperar(driver, EC.presence_of_element_located((By.CSS_SELECTOR, ".ops-metrics-3")))
    texto = _contenido(driver)
    assert "comisi" in texto, "la tabla de finanzas no habla de comisiones"
    assert not driver.find_elements(By.CSS_SELECTOR, "[role='alert']"), "finanzas muestra un error"


def test_demo_restaurante_pinta_los_tres_graficos(driver, servidores):
    _abrir_demo(driver, servidores)
    _tab(driver, "Panel del restaurante")

    _esperar(driver, lambda d: "can sol" in _contenido(d))
    _esperar(driver, lambda d: len(d.find_elements(By.CSS_SELECTOR, ".recharts-surface")) >= 3)
    texto = _contenido(driver)
    for esperado in ("tickets por mes", "distribución de reservas", "evolución de ingresos"):
        assert esperado in texto, f"falta «{esperado}» en el panel del restaurante"
    assert not h.errores_app(driver), h.errores_app(driver)


def test_demo_factura_se_abre_y_se_cierra(driver, servidores):
    _abrir_demo(driver, servidores)
    _tab(driver, "Panel del restaurante")

    boton = _esperar(
        driver,
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(normalize-space(.), 'Factura')]")
        ),
    )
    h.click_js(driver, boton)

    hoja = _esperar(driver, EC.visibility_of_element_located((By.CSS_SELECTOR, ".fx-hoja")))
    assert "factura de comisiones" in h.texto(hoja).lower()

    h.click_js(driver, hoja.find_element(By.CSS_SELECTOR, "[aria-label='Cerrar']"))
    _esperar(driver, EC.invisibility_of_element_located((By.CSS_SELECTOR, ".fx-hoja")))


def test_admin_sin_sesion_manda_al_login(driver, servidores):
    h.abrir(driver, servidores, "/#/admin")

    _esperar(driver, lambda d: "#/login" in d.current_url, timeout=10)
    _esperar(driver, EC.presence_of_element_located((By.ID, "login-email")))


def test_dashboard_sin_sesion_manda_al_login(driver, servidores):
    h.abrir(driver, servidores, "/#/dashboard")

    _esperar(driver, lambda d: "#/login" in d.current_url, timeout=10)
    _esperar(driver, EC.presence_of_element_located((By.ID, "login-email")))
