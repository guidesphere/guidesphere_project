# 🧠 GuideSphere Project

Plataforma **GuideSphere** — sistema de gestión del conocimiento con frontend en React, backend en Node.js/Express y base de datos PostgreSQL.  
El entorno está completamente **dockerizado**, permitiendo desplegar el proyecto completo con un solo comando.

---

## 🚀 Tecnologías

- **Frontend:** React + Vite + Nginx  
- **Backend:** Node.js + Express + JWT + Multer + PostgreSQL  
- **Base de Datos:** PostgreSQL 16  
- **Contenedores:** Docker + Docker Compose  

---

## ⚙️ Requisitos Previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)
- (opcional) Node.js 18+ si se desea ejecutar el frontend manualmente.

---

## 🧩 Estructura

guidesphere_project/
├── backend/ → API Express + conexión PostgreSQL
│ ├── db.js
│ ├── index.js
│ └── .env.example
├── frontend/ → Aplicación React + Nginx
│ ├── Dockerfile
│ └── .env.example
├── docker-compose.yml
└── schema.sql


---

## 🐳 Despliegue con Docker

1. Clona el repositorio:
   ```bash
   git clone https://github.com/guidesphere/guidesphere_project.git
   cd guidesphere_project

📦 Variables de Entorno
Backend (backend/.env)
DB_HOST=db
DB_PORT=5432
DB_NAME=guidesphere
DB_USER=postgres
DB_PASS=postgres
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=change-me

Frontend (frontend/.env)

VITE_API_URL=http://localhost:8000

👨‍💻 Autor

GuideSphere Development Team
Desarrollado por Maria Juliana Yepes Restrepo

© 2025 - Proyecto educativo y de desarrollo interno.


---

📍 **Siguiente paso:**  
1. Crea el archivo `README.md` en la raíz del proyecto.  
2. Pega el contenido anterior.  
3. Ejecuta:  
   ```bat
   git add README.md
   git commit -m "Agrega README profesional"
   git push

