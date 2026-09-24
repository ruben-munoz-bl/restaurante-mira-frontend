/**
 * Privacidad — espejo de Privacidad.jsx ('#/privacidad'): política RGPD
 * estática en tarjeta ancha (max 760). Contenido literal (sin i18n, como web).
 */
import { View, Text, ScrollView, Linking, StyleSheet } from 'react-native';
import { AppShell } from '../components/shell/AppShell';
import { AuthPagina, AuthTarjeta } from '../components/ui/Auth';
import { useTheme } from '../theme/ThemeContext';
import { FUENTES } from '../theme/tokens';

const FILAS = [
  ['Registro y autenticación', 'Gestión de tu cuenta de usuario', 'Ejecución del contrato (art. 6.1.b)'],
  ['Preferencias alimentarias', 'Filtrado de restaurantes aptos para ti', 'Consentimiento (art. 6.1.a)'],
  ['Datos de accesibilidad/salud', 'Filtrado de locales adaptados a tus necesidades', 'Consentimiento explícito (art. 9.2.a)'],
  ['Favoritos', 'Guardar restaurantes de interés', 'Ejecución del contrato (art. 6.1.b)'],
  ['Reservas', 'Gestión de reservas de mesa', 'Ejecución del contrato (art. 6.1.b)'],
  ['Reseñas', 'Publicar opiniones sobre restaurantes', 'Consentimiento (art. 6.1.a)'],
  ['Mensajes de contacto', 'Atención al usuario', 'Interés legítimo (art. 6.1.f)'],
  ['Geolocalización', 'Cálculo de distancias', 'Consentimiento (art. 6.1.a)'],
  ['Propuestas de negocio', 'Incorporación de nuevos restaurantes', 'Ejecución del contrato (art. 6.1.b)'],
];

function H2({ children }) {
  const { colores } = useTheme();
  return <Text style={[estilos.h2, { color: colores.tinta }]}>{children}</Text>;
}
function H3({ children }) {
  const { colores } = useTheme();
  return <Text style={[estilos.h3, { color: colores.tinta }]}>{children}</Text>;
}
function P({ children, tenue, style }) {
  const { colores } = useTheme();
  return (
    <Text style={[estilos.p, { color: tenue ? colores.gris : colores.tinta }, style]}>{children}</Text>
  );
}
function Li({ children }) {
  const { colores } = useTheme();
  return (
    <View style={estilos.li}>
      <Text style={[estilos.bullet, { color: colores.tinta }]}>•</Text>
      <Text style={[estilos.p, estilos.liTxt, { color: colores.tinta }]}>{children}</Text>
    </View>
  );
}
function Enlace({ url, children }) {
  const { colores } = useTheme();
  return (
    <Text
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      style={[estilos.p, estilos.enlace, { color: colores.tinta }]}
    >
      {children}
    </Text>
  );
}

export default function Privacidad() {
  const { colores } = useTheme();
  return (
    <AppShell>
      <AuthPagina style={estilos.paginaAncha}>
        <AuthTarjeta titulo="Política de Privacidad" style={estilos.tarjetaAncha}>
          <P tenue>Última actualización: septiembre de 2026</P>

          <H2>1. Responsable del tratamiento</H2>
          <P>
            <Text style={estilos.negrita}>MIRA</Text> (en adelante, “la aplicación”).
            {'\n'}Contacto: <Enlace url="mailto:hola@mira.ejemplo">hola@mira.ejemplo</Enlace>
            {'\n'}Dirección: Calle del Mercado 12, Madrid
          </P>

          <H2>2. Datos que recopilamos</H2>
          <P>Recopilamos únicamente los datos necesarios para prestar el servicio:</P>

          <H3>2.1. Datos de registro (cuenta)</H3>
          <View style={estilos.ul}>
            <Li>Nombre y apellidos</Li>
            <Li>Dirección de correo electrónico</Li>
            <Li>Contraseña (almacenada de forma hasheada, nunca accesible)</Li>
            <Li>Tipo de cuenta (cliente o empresa)</Li>
          </View>

          <H3>2.2. Preferencias y accesibilidad</H3>
          <View style={estilos.ul}>
            <Li>Preferencias alimentarias: vegano, vegetariano, sin gluten</Li>
            <Li>Alérgias alimentarias</Li>
            <Li>
              Necesidades de accesibilidad: acceso para silla de ruedas, entorno adaptado para
              personas con autismo (TEA)
            </Li>
          </View>
          <P tenue>
            Los datos de accesibilidad y salud son considerados datos sensibles bajo el artículo 9
            del RGPD. Se tratan con tu consentimiento explícito y con las mismas garantías de
            seguridad que el resto de tus datos.
          </P>

          <H3>2.3. Actividad en la aplicación</H3>
          <View style={estilos.ul}>
            <Li>Restaurantes guardados como favoritos</Li>
            <Li>Reservas de mesa (fecha, hora, número de comensales, comentarios)</Li>
            <Li>Reseñas y valoraciones de restaurantes</Li>
            <Li>Mensajes de contacto (nombre, email, motivo, mensaje)</Li>
            <Li>Propuestas de restaurantes (solo para cuentas de empresa)</Li>
          </View>

          <H3>2.4. Datos técnicos</H3>
          <View style={estilos.ul}>
            <Li>
              <Text style={estilos.negrita}>Geolocalización</Text>: se solicita tu ubicación una
              sola vez al cargar la aplicación para calcular distancias a restaurantes. Se almacena
              únicamente en memoria del navegador y <Text style={estilos.negrita}>nunca</Text> se
              envía a nuestros servidores ni se almacena de forma persistente.
            </Li>
            <Li>
              <Text style={estilos.negrita}>Preferencia de tema</Text> (claro/oscuro): se almacena
              localmente en tu navegador para recordar tu preferencia visual.
            </Li>
          </View>

          <H3>2.5. Datos que no recopilamos</H3>
          <View style={estilos.ul}>
            <Li>No utilizamos cookies de seguimiento ni analítica web</Li>
            <Li>No compartimos tus datos con terceros con fines publicitarios</Li>
            <Li>No realizamos profiling ni elaboración de perfiles automatizados</Li>
            <Li>No recopilamos datos de menores de 16 años sin consentimiento parental</Li>
          </View>

          <H2>3. Finalidad y base legal del tratamiento</H2>
          <ScrollView horizontal showsHorizontalScrollIndicator style={estilos.tablaScroll}>
            <View style={estilos.tabla}>
              <View style={estilos.filaCabecera}>
                {['Dato', 'Finalidad', 'Base legal'].map((c, i) => (
                  <Text
                    key={c}
                    style={[
                      estilos.celda,
                      estilos.celdaCab,
                      i === 0 ? estilos.col1 : estilos.col2,
                      { color: colores.tinta, backgroundColor: colores.fondoSuave, borderColor: colores.glassBorder },
                    ]}
                  >
                    {c}
                  </Text>
                ))}
              </View>
              {FILAS.map(([dato, finalidad, base]) => (
                <View key={dato} style={estilos.fila}>
                  {[dato, finalidad, base].map((c, i) => (
                    <Text
                      key={c}
                      style={[
                        estilos.celda,
                        i === 0 ? estilos.col1 : estilos.col2,
                        { color: colores.tinta, borderColor: colores.glassBorder },
                      ]}
                    >
                      {c}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          <H2>4. Conservación de los datos</H2>
          <View style={estilos.ul}>
            <Li>
              <Text style={estilos.negrita}>Cuenta de usuario</Text>: mientras mantengas tu cuenta
              activa. Puedes eliminarla en cualquier momento desde “Mi cuenta”.
            </Li>
            <Li>
              <Text style={estilos.negrita}>Reservas</Text>: se conservan durante 12 meses desde la
              fecha de la reserva.
            </Li>
            <Li>
              <Text style={estilos.negrita}>Reseñas</Text>: se conservan mientras sean relevantes
              para la comunidad. Puedes solicitar su eliminación.
            </Li>
            <Li>
              <Text style={estilos.negrita}>Mensajes de contacto</Text>: se resuelven en un plazo
              máximo de 30 días y se conservan 6 meses para seguimiento.
            </Li>
            <Li>
              <Text style={estilos.negrita}>Propuestas de negocio</Text>: se conservan mientras
              estén pendientes de revisión o hasta 12 meses tras su resolución.
            </Li>
            <Li>
              <Text style={estilos.negrita}>Geolocalización</Text>: no se almacena. Se descarta al
              cerrar la aplicación.
            </Li>
          </View>

          <H2>5. Cesiones y transferencias internacionales</H2>
          <P>
            Tus datos se almacenan en <Text style={estilos.negrita}>Firebase</Text> (Google Cloud),
            con servidores en la Unión Europea. Google actúa como encargado del tratamiento bajo
            las garantías del RGPD, incluyendo las Cláusulas Contractuales Estándar (CCE) de la
            Comisión Europea.
          </P>
          <P>
            No realizamos transferencias internacionales de datos fuera del Espacio Económico
            Europeo (EEE) salvo las estrictamente necesarias para el funcionamiento del servicio,
            siempre con las debidas garantías.
          </P>

          <H2>6. Tus derechos (artículos 15-22 del RGPD)</H2>
          <P>Tienes derecho a:</P>
          <View style={estilos.ul}>
            <Li>
              <Text style={estilos.negrita}>Acceso</Text>: conocer qué datos tuyos tratamos
            </Li>
            <Li>
              <Text style={estilos.negrita}>Rectificación</Text>: corregir datos inexactos
            </Li>
            <Li>
              <Text style={estilos.negrita}>Supresión</Text> (“derecho al olvido”): solicitar la
              eliminación de tus datos
            </Li>
            <Li>
              <Text style={estilos.negrita}>Limitación del tratamiento</Text>: solicitar que
              dejemos de tratar tus datos
            </Li>
            <Li>
              <Text style={estilos.negrita}>Portabilidad</Text>: recibir tus datos en formato
              estructurado
            </Li>
            <Li>
              <Text style={estilos.negrita}>Oposición</Text>: oponerte al tratamiento de tus datos
            </Li>
            <Li>
              <Text style={estilos.negrita}>Revocar el consentimiento</Text>: en cualquier momento,
              sin afectar a tratamientos anteriores
            </Li>
          </View>
          <P>
            Para ejercer tus derechos, envía un email a{' '}
            <Enlace url="mailto:hola@mira.ejemplo">hola@mira.ejemplo</Enlace> con una copia de tu
            documento de identidad. Responderemos en un plazo máximo de 30 días.
          </P>

          <H2>7. Seguridad de los datos</H2>
          <P>
            Aplicamos las medidas técnicas y organizativas adecuadas para proteger tus datos:
          </P>
          <View style={estilos.ul}>
            <Li>Autenticación cifrada mediante Firebase Authentication</Li>
            <Li>Reglas de seguridad en Firestore que limitan el acceso por usuario</Li>
            <Li>Cada usuario solo puede acceder a sus propios datos</Li>
            <Li>Las reseñas y mensajes se protegen con reglas de escritura específicas</Li>
          </View>

          <H2>8. Cookies</H2>
          <P>
            MIRA <Text style={estilos.negrita}>no utiliza cookies de seguimiento ni analítica</Text>.
            La única información que se almacena localmente en tu navegador es:
          </P>
          <View style={estilos.ul}>
            <Li>
              <Text style={estilos.negrita}>Preferencia de tema</Text> (claro/oscuro): para
              recordar tu elección visual
            </Li>
            <Li>
              <Text style={estilos.negrita}>Favoritos y preferencias</Text> (solo si no has
              iniciado sesión): para mantener tu experiencia sin cuenta
            </Li>
            <Li>
              <Text style={estilos.negrita}>Caché de parkings</Text>: datos de aparcamientos
              cercanos almacenados 48 horas para mejorar el rendimiento
            </Li>
          </View>
          <P>
            Ninguno de estos datos se envía a terceros ni se utiliza con fines publicitarios.
          </P>

          <H2>9. Cambios en esta política</H2>
          <P>
            Nos reservamos el derecho de actualizar esta política de privacidad cuando sea
            necesario. Los cambios se publicarán en esta misma página con la fecha de la última
            actualización.
          </P>

          <H2>10. Reclamaciones</H2>
          <P>
            Si consideras que el tratamiento de tus datos no se ajusta a la normativa vigente,
            tienes derecho a presentar una reclamación ante la Agencia Española de Protección de
            Datos (AEPD):
          </P>
          <Enlace url="https://www.aepd.es">www.aepd.es</Enlace>
          <P>C/ Jorge Juan, 6 — 28001 Madrid</P>

          <P tenue style={{ marginTop: 24 }}>
            Si tienes cualquier duda sobre esta política de privacidad, escríbenos a{' '}
            <Enlace url="mailto:hola@mira.ejemplo">hola@mira.ejemplo</Enlace>.
          </P>
        </AuthTarjeta>
      </AuthPagina>
    </AppShell>
  );
}

const estilos = StyleSheet.create({
  paginaAncha: {
    alignItems: 'stretch',
  },
  tarjetaAncha: {
    maxWidth: 760,
    alignSelf: 'center',
  },
  h2: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 27.6,
    marginTop: 20,
    marginBottom: 10,
  },
  h3: {
    fontFamily: FUENTES.display,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 21,
    marginTop: 14,
    marginBottom: 8,
  },
  p: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: FUENTES.texto,
    marginBottom: 8,
  },
  ul: {
    gap: 4,
    marginBottom: 8,
  },
  li: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 21,
  },
  liTxt: {
    flex: 1,
    marginBottom: 0,
  },
  negrita: {
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
  enlace: {
    textDecorationLine: 'underline',
  },
  tablaScroll: {
    marginBottom: 8,
    flexGrow: 0,
  },
  tabla: {
    minWidth: 560,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filaCabecera: {
    flexDirection: 'row',
  },
  fila: {
    flexDirection: 'row',
  },
  col1: {
    flex: 1.15,
  },
  col2: {
    flex: 1.35,
  },
  celda: {
    borderWidth: 1,
    borderRadius: 0,
    paddingVertical: 9.6,
    paddingHorizontal: 11.2,
    fontSize: 14.4,
    lineHeight: 19,
    fontFamily: FUENTES.texto,
    flex: 1.15,
  },
  celdaCab: {
    fontWeight: '700',
    fontFamily: FUENTES.textoBold,
  },
});
