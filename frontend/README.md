# 🧠 GuideSphere – Plataforma Educativa Dockerizada

Versión final y completa del proyecto **GuideSphere**, lista para desplegar en contenedores Docker.  
Incluye todos los servicios funcionando de forma integrada:

- **Frontend:** React + Vite  
- **Backend:** Node.js + Express  
- **Backend de Evaluación:** FastAPI + Python + Whisper  
- **Base de Datos:** PostgreSQL 16  
- **Respaldo incluido:** `guidesphere_full.sql`

---

## ⚠️ Requisito indispensable antes de iniciar

Para evitar errores en la transcripción de video/audio,  
**debes tener instalado Whisper y disponible en tu PATH del sistema.**

Whisper es utilizado por el servicio `backend_eval` (FastAPI) para la generación automática de texto desde videos.

### 🔧 Instalación de Whisper en Windows

1. Abre **PowerShell como Administrador**.
2. Verifica que tienes Python 3.10 o superior:
   ```bash
   python --version
Instala Whisper globalmente:

bash
Copiar código
pip install -U openai-whisper
Verifica que el comando se reconoce:

bash
Copiar código
whisper --help
Si no se reconoce, agrega el directorio de Python a tu variable de entorno PATH.

Reinicia PowerShell y vuelve a probar.

⚠️ Sin Whisper en el PATH, el contenedor backend_eval no podrá procesar evaluaciones de video.

🧩 Estructura general del proyecto
csharp
Copiar código
guidesphere/
├── backend/           → Node + Express (API principal)
├── backend_eval/      → FastAPI + Whisper (evaluaciones)
├── frontend/          → React (interfaz web)
├── docker-compose.dev.yml
├── guidesphere_full.sql  → respaldo completo de la base de datos
└── README.md
⚙️ Requisitos previos
Asegúrate de tener instalado:

Docker Desktop

Git

Python + Whisper

Puertos requeridos:

5173 → Frontend

8000 → Backend

8010 → Backend_eval

5433 → PostgreSQL

🚀 1. Clonar el repositorio
bash
Copiar código
git clone https://github.com/tu-usuario/guidesphere.git
cd guidesphere

🧰 2. Configurar variables de entorno
backend/.env
env
Copiar código
PORT=8000
DB_HOST=db
DB_PORT=5432
DB_NAME=guidesphere
DB_USER=postgres
DB_PASS=postgres
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=change-me
frontend/.env
env
Copiar código
VITE_API_URL=http://localhost:8000
VITE_EVAL_URL=http://localhost:8010

🐳 3. Levantar todos los contenedores
Ejecuta desde la raíz del proyecto:

bash
Copiar código
docker compose -f docker-compose.dev.yml up -d --build
Esto levantará automáticamente:

PostgreSQL (db)

Backend principal (Node.js)

Backend_eval (FastAPI)

Frontend (React)

Para verificar:

bash
Copiar código
docker compose -f docker-compose.dev.yml ps
Todos deben aparecer con estado Up.

🧱 4. Restaurar la base de datos
Si el contenedor de la base de datos ya está corriendo, ejecuta:

bash
Copiar código
docker exec -i guidesphere-db-1 psql -U postgres -d guidesphere < guidesphere_full.sql
Asegúrate de que el nombre del contenedor sea exactamente guidesphere-db-1.

Para verificar la restauración:

bash
Copiar código
docker exec -it guidesphere-db-1 psql -U postgres -d guidesphere -c "\dt"
Deberías ver todas las tablas cargadas.

👤 5. Crear el primer usuario SuperAdmin
Para acceder al frontend la primera vez, crea un superadmin manualmente en la base de datos:

bash
Copiar código
docker exec -it guidesphere-db-1 psql -U postgres -d guidesphere
Luego ejecuta dentro de la consola SQL:

sql
Copiar código
INSERT INTO user_account (id, email, username, password_hash, role, first_name, last_name, created_at)
VALUES (gen_random_uuid(), 'admin@guidesphere.com', 'admin', 'admin123', 'superadmin', 'Administrador', 'Global', NOW());

🔑 Usuario inicial:

Email: admin@guidesphere.com

Password: admin123

Rol: superadmin

🧩 6. Reiniciar servicios por separado

🔄 Backend
bash
Copiar código
docker compose -f docker-compose.dev.yml restart backend

🔄 Frontend
bash
Copiar código
docker compose -f docker-compose.dev.yml restart frontend

🔄 Backend_eval
bash
Copiar código
docker compose -f docker-compose.dev.yml restart backend_eval

🔄 Base de datos
bash
Copiar código
docker compose -f docker-compose.dev.yml restart db

💾 7. Activar respaldo automático de la base de datos
El contenedor ya incluye un script en /backup_docker que puede ejecutarse con cron para generar copias periódicas.

Para ejecutarlo manualmente:

bash
Copiar código
docker exec -it guidesphere-db-1 pg_dump -U postgres guidesphere > backup_guidesphere.sql
Para programarlo (opcional):

bash
Copiar código
echo "0 */3 * * * docker exec guidesphere-db-1 pg_dump -U postgres guidesphere > /backups/backup_guidesphere.sql" >> /etc/crontab

🌐 8. Acceso desde el navegador
Una vez todo esté en marcha:

Frontend → http://localhost:5173

Backend → http://localhost:8000/health

Backend_eval → http://localhost:8010/health

📘 9. Detener o limpiar el entorno
bash
Copiar código
docker compose -f docker-compose.dev.yml down
Si deseas borrar todo (contenedores, imágenes y volúmenes):

bash
Copiar código
docker compose -f docker-compose.dev.yml down -v --rmi all

✅ 10. Confirmación final
Si seguiste todos los pasos:

frontend, backend, backend_eval y db estarán Up

http://localhost:5173 mostrará la interfaz principal

Podrás iniciar sesión con el usuario admin@guidesphere.com

Las funciones de transcripción funcionarán gracias a Whisper

💡 Créditos
Proyecto GuideSphere
Desarrollado por Maria Juliana Yepez Restrepo
Tecnológico de Antioquia – Proyecto académico con despliegue completo en Docker.

yaml
Copiar código

---

✅ **Instrucción final:**  
1. Copia **todo el bloque anterior completo**.  
2. Pégalo en tu archivo `README.md` dentro de VS Code (reemplaza el contenido existente).  
3. Guarda con `Ctrl + S`.  
4. Luego ejecuta en la terminal integrada:

```bash
git add README.md
git commit -m "README final con pasos Docker y requisito de Whisper"
git push origin main