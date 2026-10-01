/** View pura: formulario para que una cuenta empresa proponga su local. */
import { useState } from 'react';
import { ZONAS_CATALUNA, CIUDADES_CATALUNA } from '../models/restaurantModel.js';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const triABooleano = (v) => (v === 'si' ? true : v === 'no' ? false : null);

export default function Negocio({ usuario, perfil, onProponer }) {
  const t = useT(TRADS);
  const TRI = [
    { value: '', label: t('otros.noSe') },
    { value: 'si', label: t('detail.si') },
    { value: 'no', label: t('detail.no') },
  ];
  const [form, setForm] = useState({
    nombre: '',
    ciudad: '',
    zona: '',
    direccion: '',
    telefono: '',
    categorias: '',
    precio: '€€',
    descripcion: '',
    imagen_url: '',
    acceso: '',
    infantil: '',
    entorno: '',
    tronas: '',
    terraza: '',
    alergenos: '',
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  if (!usuario) {
    window.location.hash = '#/login';
    return null;
  }
  if (perfil && perfil.tipo !== 'empresa') {
    return (
      <section className="auth-pagina" aria-labelledby="negocio-no">
        <div className="auth-tarjeta" role="status">
          <h1 id="negocio-no">{t('otros.soloEmpresas')}</h1>
          <p className="auth-sub">
            {t('otros.estaPaginaEsParaEmpresas')}
          </p>
          <p>
            <a href="#buscar">{t('favoritos.volverBuscador')}</a>
          </p>
        </div>
      </section>
    );
  }

  async function manejarEnvio(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await onProponer({
        usuario,
        datos: {
          ...form,
          categorias: form.categorias.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 3),
          accesoDiscapacidad: triABooleano(form.acceso),
          menuInfantil: triABooleano(form.infantil),
          entornoTranquilo: triABooleano(form.entorno),
          tronas: triABooleano(form.tronas),
          terraza: triABooleano(form.terraza),
        },
      });
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <section className="auth-pagina" aria-labelledby="negocio-ok">
        <div className="auth-tarjeta" role="status">
          <h1 id="negocio-ok">{t('negocio.propuestaEnviada')}</h1>
          <p className="auth-sub">
            {t('negocio.revisaremos')} <strong>{form.nombre}</strong> {t('negocio.publicaremos')}
          </p>
          <p>
            <a href="#buscar">{t('favoritos.volverBuscador')}</a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-pagina" aria-labelledby="negocio-titulo">
      <form className="auth-tarjeta tarjeta-ancha" onSubmit={manejarEnvio} noValidate>
        <h1 id="negocio-titulo">{t('negocio.titulo')}</h1>
        <p className="auth-sub">{t('negocio.sub')}</p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="campo">
          <label htmlFor="ng-nombre">{t('negocio.nombreLocal')}</label>
          <input id="ng-nombre" type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ng-ciudad">{t('negocio.ciudad')}</label>
          <select id="ng-ciudad" value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} required>
            <option value="">{t('negocio.eligeZona') || 'Elige ciudad'}</option>
            {CIUDADES_CATALUNA.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-zona">{t('negocio.zona')}</label>
          <select id="ng-zona" value={form.zona} onChange={(e) => set('zona', e.target.value)}>
            <option value="">{t('negocio.eligeZona')}</option>
            {ZONAS_CATALUNA.map((z) => (
              <option key={z} value={z}>
                {z.replace(', Spain', '')}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-dir">{t('negocio.direccion')}</label>
          <input id="ng-dir" type="text" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ng-tel">{t('negocio.telefono')}</label>
          <input id="ng-tel" type="tel" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ng-cat">{t('negocio.cocinas')}</label>
          <input id="ng-cat" type="text" placeholder="Mediterránea, Tapas" value={form.categorias} onChange={(e) => set('categorias', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ng-precio">{t('negocio.precio')}</label>
          <select id="ng-precio" value={form.precio} onChange={(e) => set('precio', e.target.value)}>
            <option value="€">{t('negocio.economico')}</option>
            <option value="€€">{t('negocio.medio')}</option>
            <option value="€€€">{t('negocio.alto')}</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-desc">{t('negocio.descripcion')}</label>
          <textarea id="ng-desc" rows="3" maxLength="500" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ng-foto">{t('negocio.foto')}</label>
          <input id="ng-foto" type="url" placeholder="https://…" value={form.imagen_url} onChange={(e) => set('imagen_url', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="ng-acceso">{t('negocio.accesoAdaptado')}</label>
          <select id="ng-acceso" value={form.acceso} onChange={(e) => set('acceso', e.target.value)}>
            {TRI.map((t) => (
              <option key={t.label} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-infantil">{t('negocio.menuInfantil')}</label>
          <select id="ng-infantil" value={form.infantil} onChange={(e) => set('infantil', e.target.value)}>
            {TRI.map((t) => (
              <option key={t.label} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-entorno">{t('negocio.entornoTranquilo')}</label>
          <select id="ng-entorno" value={form.entorno} onChange={(e) => set('entorno', e.target.value)}>
            {TRI.map((t) => (
              <option key={t.label} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-tronas">{t('negocio.tronas')}</label>
          <select id="ng-tronas" value={form.tronas} onChange={(e) => set('tronas', e.target.value)}>
            {TRI.map((t) => (
              <option key={t.label} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-terraza">{t('negocio.terraza')}</label>
          <select id="ng-terraza" value={form.terraza} onChange={(e) => set('terraza', e.target.value)}>
            {TRI.map((t) => (
              <option key={t.label} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="ng-alerg">{t('negocio.alergenos')}</label>
          <textarea id="ng-alerg" rows="2" maxLength="500" placeholder="Ej: disponemos de pan sin gluten; cocina con frutos secos…" value={form.alergenos} onChange={(e) => set('alergenos', e.target.value)} />
        </div>
        <button type="submit" className="btn-cta btn-grande auth-boton" disabled={enviando}>
          {enviando ? t('negocio.enviando') : t('negocio.enviar')}
        </button>
      </form>
    </section>
  );
}
