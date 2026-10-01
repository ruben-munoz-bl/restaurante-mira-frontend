/**
 * View pura: política de privacidad conforme al RGPD (UE).
 * Ruta: #/privacidad — sin dependencias externas.
 */
export default function Privacidad() {
  return (
    <section className="auth-pagina pagina-ancha">
      <div className="auth-tarjeta tarjeta-ancha">
        <h1>Política de Privacidad</h1>
        <p className="vacio-texto">
          Última actualización: septiembre de 2026
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          <strong>MIRA</strong> (en adelante, &ldquo;la aplicación&rdquo;).
          <br />
          Contacto: <a href="mailto:hola@mira.ejemplo">hola@mira.ejemplo</a>
          <br />
          Dirección: Calle del Mercado 12, Madrid
        </p>

        <h2>2. Datos que recopilamos</h2>
        <p>
          Recopilamos únicamente los datos necesarios para prestar el servicio:
        </p>

        <h3>2.1. Datos de registro (cuenta)</h3>
        <ul>
          <li>Nombre y apellidos</li>
          <li>Dirección de correo electrónico</li>
          <li>Contraseña (almacenada de forma hasheada, nunca accesible)</li>
          <li>Tipo de cuenta (cliente o empresa)</li>
        </ul>

        <h3>2.2. Preferencias y accesibilidad</h3>
        <ul>
          <li>Preferencias alimentarias: vegano, vegetariano, sin gluten</li>
          <li>Alérgias alimentarias</li>
          <li>Necesidades de accesibilidad: acceso para silla de ruedas, entorno adaptado para personas con autismo (TEA)</li>
        </ul>
        <p className="vacio-texto">
          Los datos de accesibilidad y salud son considerados datos sensibles
          bajo el artículo 9 del RGPD. Se tratan con tu consentimiento explícito
          y con las mismas garantías de seguridad que el resto de tus datos.
        </p>

        <h3>2.3. Actividad en la aplicación</h3>
        <ul>
          <li>Restaurantes guardados como favoritos</li>
          <li>Reservas de mesa (fecha, hora, número de comensales, comentarios)</li>
          <li>Reseñas y valoraciones de restaurantes</li>
          <li>Mensajes de contacto (nombre, email, motivo, mensaje)</li>
          <li>Propuestas de restaurantes (solo para cuentas de empresa)</li>
        </ul>

        <h3>2.4. Datos técnicos</h3>
        <ul>
          <li>
            <strong>Geolocalización</strong>: se solicita tu ubicación una sola
            vez al cargar la aplicación para calcular distancias a restaurantes.
            Se almacena únicamente en memoria del navegador y <strong>nunca</strong> se
            envía a nuestros servidores ni se almacena de forma persistente.
          </li>
          <li>
            <strong>Preferencia de tema</strong> (claro/oscuro): se almacena
            localmente en tu navegador para recordar tu preferencia visual.
          </li>
        </ul>

        <h3>2.5. Datos que no recopilamos</h3>
        <ul>
          <li>No utilizamos cookies de seguimiento ni analítica web</li>
          <li>No compartimos tus datos con terceros con fines publicitarios</li>
          <li>No realizamos profiling ni elaboración de perfiles automatizados</li>
          <li>No recopilamos datos de menores de 16 años sin consentimiento parental</li>
        </ul>

        <h2>3. Finalidad y base legal del tratamiento</h2>
        <table className="comparador-tabla" style={{ minWidth: 'auto' }}>
          <thead>
            <tr>
              <th>Dato</th>
              <th>Finalidad</th>
              <th>Base legal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Registro y autenticación</td>
              <td>Gestión de tu cuenta de usuario</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Preferencias alimentarias</td>
              <td>Filtrado de restaurantes aptos para ti</td>
              <td>Consentimiento (art. 6.1.a)</td>
            </tr>
            <tr>
              <td>Datos de accesibilidad/salud</td>
              <td>Filtrado de locales adaptados a tus necesidades</td>
              <td>Consentimiento explícito (art. 9.2.a)</td>
            </tr>
            <tr>
              <td>Favoritos</td>
              <td>Guardar restaurantes de interés</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Reservas</td>
              <td>Gestión de reservas de mesa</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
            <tr>
              <td>Reseñas</td>
              <td>Publicar opiniones sobre restaurantes</td>
              <td>Consentimiento (art. 6.1.a)</td>
            </tr>
            <tr>
              <td>Mensajes de contacto</td>
              <td>Atención al usuario</td>
              <td>Interés legítimo (art. 6.1.f)</td>
            </tr>
            <tr>
              <td>Geolocalización</td>
              <td>Cálculo de distancias</td>
              <td>Consentimiento (art. 6.1.a)</td>
            </tr>
            <tr>
              <td>Propuestas de negocio</td>
              <td>Incorporación de nuevos restaurantes</td>
              <td>Ejecución del contrato (art. 6.1.b)</td>
            </tr>
          </tbody>
        </table>

        <h2>4. Conservación de los datos</h2>
        <ul>
          <li>
            <strong>Cuenta de usuario</strong>: mientras mantengas tu cuenta activa.
            Puedes eliminarla en cualquier momento desde &ldquo;Mi cuenta&rdquo;.
          </li>
          <li>
            <strong>Reservas</strong>: se conservan durante 12 meses desde la
            fecha de la reserva.
          </li>
          <li>
            <strong>Reseñas</strong>: se conservan mientras sean relevantes para
            la comunidad. Puedes solicitar su eliminación.
          </li>
          <li>
            <strong>Mensajes de contacto</strong>: se resuelven en un plazo
            máximo de 30 días y se conservan 6 meses para seguimiento.
          </li>
          <li>
            <strong>Propuestas de negocio</strong>: se conservan mientras estén
            pendientes de revisión o hasta 12 meses tras su resolución.
          </li>
          <li>
            <strong>Geolocalización</strong>: no se almacena. Se descarta al
            cerrar la aplicación.
          </li>
        </ul>

        <h2>5. Cesiones y transferencias internacionales</h2>
        <p>
          Tus datos se almacenan en <strong>Firebase</strong> (Google Cloud),
          con servidores en la Unión Europea. Google actúa como encargado del
          tratamiento bajo las garantías del RGPD, incluyendo las Cláusulas
          Contractuales Estándar (CCE) de la Comisión Europea.
        </p>
        <p>
          No realizamos transferencias internacionales de datos fuera del Espacio
          Económico Europeo (EEE) salvo las estrictamente necesarias para el
          funcionamiento del servicio, siempre con las debidas garantías.
        </p>

        <h2>6. Tus derechos (artículos 15-22 del RGPD)</h2>
        <p>Tienes derecho a:</p>
        <ul>
          <li><strong>Acceso</strong>: conocer qué datos tuyos tratamos</li>
          <li><strong>Rectificación</strong>: corregir datos inexactos</li>
          <li><strong>Supresión</strong> (&ldquo;derecho al olvido&rdquo;): solicitar la eliminación de tus datos</li>
          <li><strong>Limitación del tratamiento</strong>: solicitar que dejemos de tratar tus datos</li>
          <li><strong>Portabilidad</strong>: recibir tus datos en formato estructurado</li>
          <li><strong>Oposición</strong>: oponerte al tratamiento de tus datos</li>
          <li><strong>Revocar el consentimiento</strong>: en cualquier momento, sin afectar a tratamientos anteriores</li>
        </ul>
        <p>
          Para ejercer tus derechos, envía un email a{' '}
          <a href="mailto:hola@mira.ejemplo">hola@mira.ejemplo</a> con una
          copia de tu documento de identidad. Responderemos en un plazo máximo
          de 30 días.
        </p>

        <h2>7. Seguridad de los datos</h2>
        <p>
          Aplicamos las medidas técnicas y organizativas adecuadas para proteger
          tus datos:
        </p>
        <ul>
          <li>Autenticación cifrada mediante Firebase Authentication</li>
          <li>Reglas de seguridad en Firestore que limitan el acceso por usuario</li>
          <li>Cada usuario solo puede acceder a sus propios datos</li>
          <li>Las reseñas y mensajes se protegen con reglas de escritura específicas</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          MIRA <strong>no utiliza cookies de seguimiento ni analítica</strong>.
          La única información que se almacena localmente en tu navegador es:
        </p>
        <ul>
          <li>
            <strong>Preferencia de tema</strong> (claro/oscuro): para recordar tu
            elección visual
          </li>
          <li>
            <strong>Favoritos y preferencias</strong> (solo si no has iniciado
            sesión): para mantener tu experiencia sin cuenta
          </li>
          <li>
            <strong>Caché de parkings</strong>: datos de aparcamientos cercanos
            almacenados 48 horas para mejorar el rendimiento
          </li>
        </ul>
        <p>
          Ninguno de estos datos se envía a terceros ni se utiliza con fines
          publicitarios.
        </p>

        <h2>9. Cambios en esta política</h2>
        <p>
          Nos reservamos el derecho de actualizar esta política de privacidad
          cuando sea necesario. Los cambios se publicarán en esta misma página
          con la fecha de la última actualización.
        </p>

        <h2>10. Reclamaciones</h2>
        <p>
          Si consideras que el tratamiento de tus datos no se ajusta a la
          normativa vigente, tienes derecho a presentar una reclamación ante la
          Agencia Española de Protección de Datos (AEPD):
        </p>
        <p>
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
            www.aepd.es
          </a>
          <br />
          C/ Jorge Juan, 6 — 28001 Madrid
        </p>

        <p className="vacio-texto" style={{ marginTop: '2rem' }}>
          Si tienes cualquier duda sobre esta política de privacidad, escríbenos
          a <a href="mailto:hola@mira.ejemplo">hola@mira.ejemplo</a>.
        </p>
      </div>
    </section>
  );
}
