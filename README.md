# HomuLearn

React/Vite frontend and Java 21/Spring Boot API with PostgreSQL.
The current slice supports account registration, session login/logout, CSRF
protection and protected frontend routes. Other learning screens remain prototypes.

## Local development

Requirements: Node.js/npm, JDK 21 and PostgreSQL. The Gradle wrapper is included.

Create an empty development database and provide its connection settings through
environment variables. Do not commit passwords or environment files.

```powershell
$env:DB_URL = 'jdbc:postgresql://localhost:5432/homulearn_dev'
$env:DB_USER = '<your database user>'
$env:DB_PASSWORD = '<your database password>'
cd backend/homulearn
.\gradlew.bat bootRun
```

Flyway applies the initial schema; Hibernate validates it. The API listens on port
8080. Sessions are stored in backend memory, so restarting it signs users out.
Account data remains in PostgreSQL.

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open port 5174. Vite proxies `/api` to the backend. Registration creates an account;
sign in afterwards. The browser stores an HttpOnly session cookie, not an auth
token in localStorage. Public HTTPS deployment requires secure cookies and a
review of the frontend/backend origin configuration.

## Checks

Use a dedicated PostgreSQL database ending in `_test` and set `DB_URL`, `DB_USER`
and `DB_PASSWORD` for that database before running integration or browser tests.
Do not use a development or production database for these commands.

```powershell
cd backend/homulearn
.\gradlew.bat test
```

```powershell
cd frontend
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own API on port 18080 and frontend on port 5176, then stops
them. Keep these ports available. Browser tests create generated test accounts in
the test database. Unit HTTP mocks are separate from these real API/DB checks.
