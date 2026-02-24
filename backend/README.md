# Backend — TFGandreu (Node.js + Express)

Rápido inicio para el backend que maneja la autenticación con Strava.

Requisitos
- Node.js >= 18
- npm

Instalación
```powershell
cd backend
npm install
cp .env.example .env
# Rellenar .env con tus credenciales de Strava
```

Base de datos (MySQL)
- Local (MySQL instalado): rellena `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en `.env`.
- Docker (recomendado): usa el `docker-compose.yml` del root y configura `DB_HOST=db`.

Docker (solo MySQL)
```powershell
cd ..
docker-compose up -d
```

Aplicar esquema de BD (si no se auto-crea)
```powershell
cd backend
# si usas Docker, el esquema se carga al crear el contenedor
# si usas MySQL local, ejecuta este script en tu cliente SQL
type .\db\schema.sql
```

Ejecución
```powershell
npm run dev   # requiere nodemon
# o
npm start
```

Rutas útiles
- `GET /` - comprobación del servidor
- `GET /auth/strava` - redirige al flujo OAuth de Strava
- `GET /auth/callback?code=...` - callback donde intercambiar el código por tokens

Token refresh
- `GET /auth/refresh` - refresca tokens de atletas cuyas credenciales expiran en los próximos 5 minutos (cron/manual)
- `GET /auth/refresh?athlete_id=12345` - refresca token para el `athlete_id` especificado

Notas
- `fetch` se usa para la petición al endpoint de Strava; Node 18+ lo incluye.
- Para producción debes almacenar tokens de forma segura y emitir un JWT para la app móvil.
 - El servidor ejecuta un ciclo automático que intenta refrescar tokens cada 15 minutos.

Login con un único usuario (token manual)
 - Si no quieres usar el flujo OAuth completo puedes pegar un `access_token` de Strava directamente en la app.
 - Endpoint: `POST /auth/token-login` con JSON `{ "access_token": "..." }`.
 - El servidor validará el token contra `GET https://www.strava.com/api/v3/athlete`, guardará el token en la tabla `athletes` y devolverá un JWT en `{ jwt }`.
 - Este flujo está pensado para desarrollo o un único usuario. No es recomendado para producción sin más controles.
