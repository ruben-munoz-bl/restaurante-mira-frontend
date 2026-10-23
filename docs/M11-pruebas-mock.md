# M10/M11 sin backend

Desde `feat/M11-mock-y-app`:

```sh
MOCK_RESERVAS_EJEMPLO=1 npm run mock-api
npm run dev:mock
```

El panel conserva el restaurante `demo-panel` sin carta para probar M09.
Para usar un restaurante del catálogo y reservar desde su ficha, arranca con
`MOCK_RESTAURANTE_ID=1 MOCK_RESERVAS_EJEMPLO=1 npm run mock-api`.
El panel y el check-in usarán ese restaurante. Los endpoints nuevos exigen un
Bearer; el mock solo comprueba su presencia y simula una empresa propietaria,
sin validar roles ni tokens Firebase. No hay acceso a ninguna base de datos.

Códigos manuales con los ejemplos activados:

| QR | Resultado |
| --- | --- |
| `r1.demo-pedido.mock` | Cliente, 2 croquetas, 19 EUR, +50 puntos |
| `r1.demo-sin-pedido.mock` | Cliente sin pedido, 0 puntos |
| `r1.demo-usada.mock` | 409 QR_USADO |
| `r1.demo-cancelada.mock` | 409 RESERVA_CANCELADA |
| `r1.demo-fuera-fecha.mock` | 409 FUERA_DE_FECHA |
| `r1.demo-otro-restaurante.mock` | 403 OTRO_RESTAURANTE |
| `r1.no-existe.mock` | 404 NOT_FOUND |
| `r1.demo-pedido.falsa` | 400 QR_INVALIDO |

Los éxitos consumen el QR; reinicia el mock para repetirlos. También puedes
crear una reserva desde la ficha, verla en Mis reservas y pegar su QR.
El listado del panel usa el día de Madrid por defecto, admite rangos de hasta
31 días y devuelve solo el nombre del cliente, sin UID ni correo.
La firma `.mock` solo sirve aquí; el backend comprueba la firma HMAC real.

En la app, configura `EXPO_PUBLIC_API_URL` con la IP local del ordenador y el
puerto 3001, con el móvil en la misma red. El escáner de cámara requiere un
dispositivo; el campo manual permite comprobar la respuesta sin cámara.
