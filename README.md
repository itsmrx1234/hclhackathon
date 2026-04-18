# hclhackathon

This repository contains:
- `backend/`: Spring Boot retail ordering API
- `frontend/`: React (Vite) frontend that connects to the Spring Boot backend

## Run backend

```bash
cd /home/runner/work/hclhackathon/hclhackathon/backend
sh mvnw spring-boot:run
```

The backend runs on `http://localhost:8080`.

## Run frontend

```bash
cd /home/runner/work/hclhackathon/hclhackathon/frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and calls backend APIs on `http://localhost:8080`.

### Optional frontend API override

You can point frontend to another backend using:

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```
