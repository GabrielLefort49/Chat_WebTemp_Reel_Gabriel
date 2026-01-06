
Installation rapide

```bash
git clone https://gitlab.com/esgi4255746/web-temps-reel.git
cd web-temps-reel
npm install
```

Lancer avec Docker Compose

```bash
docker compose up --build
```

Lancer localement sans Docker

```bash
cd app
npm install
npm run build
npm start
```

Accéder à l'application

Ouvrez http://localhost:3000/

Par défaut (si vous ne fournissez pas `.env`), les identifiants fournis pour tests sont :

- Admin : `admin@example.com` / `admin123`
- User  : `user@example.com` / `user123`

