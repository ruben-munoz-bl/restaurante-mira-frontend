/**
 * Negocio — espejo de Negocio.jsx ('#/negocio'): propuesta de local para
 * cuentas empresa (formulario ancho con selects tri estado).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AppShell } from '../components/shell/AppShell';
import { useAuthContext } from '../context/AuthContext';
import { proponerNegocio } from '../services/negocioApi.js';
import { ZONAS_CATALUNA, CIUDADES_CATALUNA } from '../models/restaurantModel.js';
import CampoTexto from '../components/ui/CampoTexto';
import SelectCampo from '../components/ui/SelectCampo';
import {
  AuthPagina,
  AuthTarjeta,
  AuthSub,
  AuthError,
  AuthBoton,
  AuthEnlace,
} from '../components/ui/Auth';
import { useT } from '../i18n/index.jsx';
import es from '../i18n/es.js';
import ca from '../i18n/ca.js';
import en from '../i18n/en.js';

const TRADS = { es, ca, en };
const triABooleano = (v) => (v === 'si' ? true : v === 'no' ? false : null);

const INICIAL = {
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
};

export default function Negocio() {
  const t = useT(TRADS);
  const router = useRouter();
  const auth = useAuthContext();

  const [form, setForm] = useState(INICIAL);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const usuario = auth.usuario;
  const perfil = auth.perfil;

  useEffect(() => {
    if (!auth.cargandoSesion && !usuario) router.replace('/login');
  }, [auth.cargandoSesion, usuario, router]);

  if (auth.cargandoSesion) return null;
  if (!usuario) return null;

  const TRI = [
    { valor: '', etiqueta: t('otros.noSe') },
    { valor: 'si', etiqueta: t('detail.si') },
    { valor: 'no', etiqueta: t('detail.no') },
  ];

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function manejarEnvio() {
    setError('');
    setEnviando(true);
    try {
      await proponerNegocio({
        datos: {
          ...form,
          categorias: form.categorias
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
            .slice(0, 3),
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

  if (perfil && perfil.tipo !== 'empresa') {
    return (
      <AppShell>
        <AuthPagina accessibilityRole="status">
          <AuthTarjeta titulo={t('otros.soloEmpresas')}>
            <AuthSub>{t('otros.estaPaginaEsParaEmpresas')}</AuthSub>
            <AuthEnlace onPress={() => router.replace('/')}>
              {t('favoritos.volverBuscador')}
            </AuthEnlace>
          </AuthTarjeta>
        </AuthPagina>
      </AppShell>
    );
  }

  if (enviado) {
    return (
      <AppShell>
        <AuthPagina accessibilityRole="status">
          <AuthTarjeta titulo={t('negocio.propuestaEnviada')}>
            <AuthSub>
              {t('negocio.revisaremos')} <Text style={styles.negrita}>{form.nombre}</Text>{' '}
              {t('negocio.publicaremos')}
            </AuthSub>
            <AuthEnlace onPress={() => router.replace('/')}>
              {t('favoritos.volverBuscador')}
            </AuthEnlace>
          </AuthTarjeta>
        </AuthPagina>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AuthPagina accessibilityLabel={t('negocio.titulo')}>
        <AuthTarjeta titulo={t('negocio.titulo')} style={styles.ancha}>
          <AuthSub>{t('negocio.sub')}</AuthSub>
          {error ? <AuthError>{error}</AuthError> : null}

          <CampoTexto
            label={t('negocio.nombreLocal')}
            value={form.nombre}
            onChangeText={(v) => set('nombre', v)}
          />
          <SelectCampo
            label={t('negocio.ciudad')}
            value={form.ciudad}
            placeholder={t('negocio.eligeZona')}
            opciones={CIUDADES_CATALUNA}
            onChange={(v) => set('ciudad', v)}
          />
          <SelectCampo
            label={t('negocio.zona')}
            value={form.zona}
            placeholder={t('negocio.eligeZona')}
            opciones={ZONAS_CATALUNA.map((z) => ({ valor: z, etiqueta: z.replace(', Spain', '') }))}
            onChange={(v) => set('zona', v)}
          />
          <CampoTexto
            label={t('negocio.direccion')}
            value={form.direccion}
            onChangeText={(v) => set('direccion', v)}
          />
          <CampoTexto
            label={t('negocio.telefono')}
            value={form.telefono}
            onChangeText={(v) => set('telefono', v)}
            keyboardType="phone-pad"
          />
          <CampoTexto
            label={t('negocio.cocinas')}
            value={form.categorias}
            onChangeText={(v) => set('categorias', v)}
            placeholder="Mediterránea, Tapas"
          />
          <SelectCampo
            label={t('negocio.precio')}
            value={form.precio}
            opciones={[
              { valor: '€', etiqueta: t('negocio.economico') },
              { valor: '€€', etiqueta: t('negocio.medio') },
              { valor: '€€€', etiqueta: t('negocio.alto') },
            ]}
            onChange={(v) => set('precio', v)}
          />
          <CampoTexto
            label={t('negocio.descripcion')}
            value={form.descripcion}
            onChangeText={(v) => set('descripcion', v)}
            maxLength={500}
            multiline
            style={styles.textarea}
          />
          <CampoTexto
            label={t('negocio.foto')}
            value={form.imagen_url}
            onChangeText={(v) => set('imagen_url', v)}
            placeholder="https://…"
            autoCapitalize="none"
            keyboardType="url"
          />
          <SelectCampo
            label={t('negocio.accesoAdaptado')}
            value={form.acceso}
            opciones={TRI}
            onChange={(v) => set('acceso', v)}
          />
          <SelectCampo
            label={t('negocio.menuInfantil')}
            value={form.infantil}
            opciones={TRI}
            onChange={(v) => set('infantil', v)}
          />
          <SelectCampo
            label={t('negocio.entornoTranquilo')}
            value={form.entorno}
            opciones={TRI}
            onChange={(v) => set('entorno', v)}
          />
          <SelectCampo
            label={t('negocio.tronas')}
            value={form.tronas}
            opciones={TRI}
            onChange={(v) => set('tronas', v)}
          />
          <SelectCampo
            label={t('negocio.terraza')}
            value={form.terraza}
            opciones={TRI}
            onChange={(v) => set('terraza', v)}
          />
          <CampoTexto
            label={t('negocio.alergenos')}
            value={form.alergenos}
            onChangeText={(v) => set('alergenos', v)}
            maxLength={500}
            multiline
            style={styles.textarea}
            placeholder="Ej: disponemos de pan sin gluten; cocina con frutos secos…"
          />

          <AuthBoton onPress={manejarEnvio} disabled={enviando}>
            {enviando ? t('negocio.enviando') : t('negocio.enviar')}
          </AuthBoton>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  ancha: {
    maxWidth: 760,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  negrita: {
    fontWeight: '700',
  },
});
