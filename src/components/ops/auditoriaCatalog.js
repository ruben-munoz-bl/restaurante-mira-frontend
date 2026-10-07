/**
 * Tabla ÚNICA de tipos de evento de auditoría: etiqueta, categoría, icono y
 * color. La usan la tabla, los filtros y los gráficos, así un tipo nuevo se
 * ve igual en todas partes y para todos los admins. Los nombres deben
 * coincidir con mira-api/src/modules/auditoria/catalogo.js.
 */

export const CATEGORIAS = {
  auth: { nombre: 'Acceso', color: '#2d6fd8', icono: 'login' },
  navegacion: { nombre: 'Navegación', color: '#6f7a72', icono: 'explore' },
  busqueda: { nombre: 'Búsqueda', color: '#c9a227', icono: 'search' },
  catalogo: { nombre: 'Catálogo', color: '#0e6b47', icono: 'restaurant' },
  reservas: { nombre: 'Reservas', color: '#7b4fd8', icono: 'event_available' },
  negocio: { nombre: 'Negocio', color: '#00838f', icono: 'storefront' },
  puntos: { nombre: 'Puntos y MIRA', color: '#e07a1f', icono: 'loyalty' },
  admin: { nombre: 'Administración', color: '#ba1a1a', icono: 'admin_panel_settings' },
};

const T = (categoria, etiqueta, icono) => ({ categoria, etiqueta, icono: icono || CATEGORIAS[categoria].icono });

export const TIPOS = {
  login_exitoso: T('auth', 'Login correcto', 'login'),
  login_fallido: T('auth', 'Login fallido', 'gpp_bad'),
  login_google: T('auth', 'Login con Google', 'account_circle'),
  registro_iniciado: T('auth', 'Registro iniciado', 'person_add'),
  registro_completado: T('auth', 'Registro completado', 'how_to_reg'),
  cierre_sesion: T('auth', 'Cierre de sesión', 'logout'),
  recuperacion_password: T('auth', 'Recuperación de contraseña', 'lock_reset'),
  email_verificado: T('auth', 'Email verificado', 'mark_email_read'),
  sesion_iniciada: T('auth', 'Sesión iniciada', 'play_circle'),
  sesion_cerrada: T('auth', 'Sesión cerrada', 'stop_circle'),

  pagina_vista: T('navegacion', 'Página vista', 'visibility'),
  scroll_profundidad: T('navegacion', 'Profundidad de scroll', 'swipe_down'),
  enlace_salida: T('navegacion', 'Enlace de salida', 'open_in_new'),
  cta_pulsado: T('navegacion', 'CTA pulsado', 'touch_app'),
  ruta_cambiada: T('navegacion', 'Cambio de ruta', 'alt_route'),

  busqueda: T('busqueda', 'Búsqueda', 'search'),
  filtro_aplicado: T('busqueda', 'Filtro aplicado', 'filter_alt'),
  orden_cambiado: T('busqueda', 'Orden cambiado', 'sort'),
  paginacion: T('busqueda', 'Paginación', 'more_horiz'),
  mapa_marcador_pulsado: T('busqueda', 'Marcador del mapa', 'location_on'),

  restaurante_visto: T('catalogo', 'Restaurante visto', 'storefront'),
  restaurante_pulsado: T('catalogo', 'Restaurante pulsado', 'ads_click'),
  carta_abierta: T('catalogo', 'Carta abierta', 'menu_book'),
  resena_vista: T('catalogo', 'Reseñas vistas', 'reviews'),
  resena_enviada: T('catalogo', 'Reseña enviada', 'rate_review'),
  'favorito_añadido': T('catalogo', 'Favorito añadido', 'favorite'),
  favorito_eliminado: T('catalogo', 'Favorito eliminado', 'heart_minus'),
  compartir: T('catalogo', 'Compartir', 'share'),
  interaccion: T('catalogo', 'Interacción (promo)', 'campaign'),

  reserva_iniciada: T('reservas', 'Reserva iniciada', 'edit_calendar'),
  reserva_creada: T('reservas', 'Reserva creada', 'event_available'),
  reserva_confirmada: T('reservas', 'Reserva confirmada', 'task_alt'),
  reserva_cancelada: T('reservas', 'Reserva cancelada', 'event_busy'),
  reserva_completada: T('reservas', 'Reserva completada', 'done_all'),
  reserva_no_show: T('reservas', 'No-show', 'person_off'),
  reserva_editada: T('reservas', 'Reserva editada', 'edit_note'),

  negocio_creado: T('negocio', 'Negocio propuesto', 'add_business'),
  negocio_actualizado: T('negocio', 'Negocio actualizado', 'store'),
  negocio_aprobado: T('negocio', 'Negocio aprobado', 'verified'),
  negocio_rechazado: T('negocio', 'Negocio rechazado', 'block'),

  puntos_ganados: T('puntos', 'Puntos ganados', 'add_circle'),
  puntos_canjeados: T('puntos', 'Puntos canjeados', 'redeem'),
  rueda_girada: T('puntos', 'Rueda girada', 'casino'),
  'invitación_enviada': T('puntos', 'Invitación enviada', 'forward_to_inbox'),
  'invitación_aceptada': T('puntos', 'Invitación aceptada', 'group_add'),
  mira_abierta: T('puntos', 'MIRA abierta', 'smart_toy'),
  mira_mensaje: T('puntos', 'Mensaje a MIRA', 'chat'),
  mira_feedback: T('puntos', 'Feedback a MIRA', 'thumb_up'),
  promo_vista: T('puntos', 'Promo vista', 'campaign'),
  promo_pulsada: T('puntos', 'Promo pulsada', 'ads_click'),

  admin_login: T('admin', 'Entrada de admin', 'shield_person'),
  admin_acceso_denegado: T('admin', 'Acceso denegado', 'gpp_maybe'),
  usuario_creado: T('admin', 'Usuario creado', 'person_add'),
  usuario_editado: T('admin', 'Usuario editado', 'manage_accounts'),
  usuario_eliminado: T('admin', 'Usuario eliminado', 'person_remove'),
  usuario_tipo_cambiado: T('admin', 'Tipo de usuario cambiado', 'badge'),
  puntos_abonados: T('admin', 'Puntos abonados', 'savings'),
  puntos_ajustados: T('admin', 'Puntos ajustados', 'tune'),
  racha_modificada: T('admin', 'Racha modificada', 'local_fire_department'),
  login_revertido: T('admin', 'Login de hoy revertido', 'undo'),
  restaurante_editado: T('admin', 'Restaurante editado', 'edit'),
  restaurante_eliminado: T('admin', 'Restaurante eliminado', 'delete'),
  mensaje_enviado_dueno: T('admin', 'Mensaje al dueño', 'mail'),
  reserva_estado_cambiada: T('admin', 'Estado de reserva cambiado', 'swap_horiz'),
  confirmacion_asistencia: T('admin', 'Asistencia confirmada', 'how_to_reg'),
  marcado_no_show: T('admin', 'Marcado como no-show', 'person_off'),
  ticket_asignado: T('admin', 'Ticket asignado', 'receipt_long'),
  incidencia_creada: T('admin', 'Incidencia creada', 'report'),
  incidencia_resuelta: T('admin', 'Incidencia resuelta', 'check_circle'),
  franja_desbloqueada: T('admin', 'Franja desbloqueada', 'lock_open'),
  opcion_finanzas_activada: T('admin', 'Opción de finanzas', 'payments'),
  ajustes_cambiados: T('admin', 'Ajustes cambiados', 'settings'),
  export_auditoria: T('admin', 'Exportación de auditoría', 'download'),
};

export const ORIGENES = { app: 'Web/app', panel: 'Panel', api: 'API', script: 'Script', sistema: 'Sistema' };
export const FUENTES = { real: 'Real', sim: 'Simulado' };

export const infoTipo = (tipo) => TIPOS[tipo] || { categoria: null, etiqueta: tipo, icono: 'help' };
export const colorTipo = (tipo) => CATEGORIAS[infoTipo(tipo).categoria]?.color || '#8a938a';
export const etiquetaTipo = (tipo) => infoTipo(tipo).etiqueta;
export const tiposDeCategoria = (cat) => Object.keys(TIPOS).filter((t) => TIPOS[t].categoria === cat);
