# 🦁 Academia y Colegio WHITMAN — Plataforma Académica

Plataforma institucional de **asistencia en tiempo real**, **control físico con pistola lectora de código de barras**, **portal seguro de padres y alumnos**, y **calificaciones / simulacros preuniversitarios**.

- **Identidad Visual**: Color **Vino Borgoña** (`#800020`), acentos en **Dorado León** (`#D97706`).
- **Mascota**: El **León de Whitman** 🦁 ("Garra, Disciplina y Excelencia Académica").
- **Base de Datos**: **Neon PostgreSQL Serverless** en la nube.
- **Seguridad**: Consultas 100% Parametrizadas, Rate Limiting, Helmet y Aislamiento por Roles.

---

## 🏛️ Arquitectura de Navegación y Flujo de Usuario

1. **Página Principal (`/`)**:
   * Portada limpia e institucional con el **León de Whitman** gigante, lema y emblema oficial: **"ACADEMIA Y COLEGIO WHITMAN"**.
   * Botón destacado **"Ingresar a la Plataforma"** (lleva a `/login`).
   * Botón **"Registrar Alumno"** (lleva a `/registro`).
   * Acceso directo a **Garita de Portería** (`/garita`).

2. **Página de Login (`/login`)**:
   * Pestañas para **Soy Alumno** (DNI o código `WHT-...`), **Soy Papá / Mamá** (DNI del apoderado) y **Profesor / Directivo**.
   * Validación contra **Neon PostgreSQL**.
   * Cuentas de prueba con 1-clic para demostración inmediata.

3. **Dashboard Seguro (`/dashboard`)**:
   * **Ruta protegida**: si no has iniciado sesión, te exige identificarte con tu DNI.
   * **Alumno**: ve su código de estudiante, asistencia marcada de hoy por garita y días asistidos.
   * **Padre de Familia**: ve a su hijo vinculado, hora de llegada de hoy y récord.
   * **Profesor / Admin**: control global de los 1,000 alumnos, últimas lecturas de la pistola de portería y cuadro de honor.

4. **Terminal de Garita Física (`/garita`)**:
   * Diseñada para pistola lectora de código de barras (USB / Bluetooth / Láser).
   * Beeps de audio nativo y pantalla gigante de bienvenida en el torniquete.

---

## 🔑 Credenciales Rápidas para Demostración

| Rol | Cómo ingresa | Identificador / DNI | Qué ve en su Dashboard Seguro |
| :--- | :--- | :--- | :--- |
| 🦁 **Alumno (Academia UNI)** | Su DNI o Código | `72345671` (o `WHT-2026-001`) | Su asistencia personal y hora de llegada por garita. |
| 🦁 **Alumna (Medicina San Marcos)** | Su DNI o Código | `72345672` (o `WHT-2026-002`) | Su asistencia personal y notas de simulacros. |
| 👨‍👩‍👦 **Padre de Familia (Papá de Sebastián)** | **DNI del Apoderado** | `40112233` | La asistencia de su hijo en tiempo real y hora exacta de llegada. |
| 👨‍👩‍👦 **Madre de Familia (Mamá de Valeria)** | **DNI del Apoderado** | `40223344` | La asistencia de su hija en tiempo real y hora exacta de llegada. |
| 👨‍🏫 **Docente (Matemáticas)** | DNI de Profesor | `20000001` | Garita completa, control de los 1,000 alumnos y notas. |
| 🛡️ **Directivo (Administrador)** | DNI de Admin | `10000001` | Panel administrativo completo. |

---

## 🚀 Cómo Iniciar el Proyecto

```bash
npm run dev
```

* **[http://localhost:3000/](http://localhost:3000/)**: Portada Institucional Whitman.
* **[http://localhost:3000/login](http://localhost:3000/login)**: Acceso con DNI.
* **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)**: Dashboard Seguro.
* **[http://localhost:3000/garita](http://localhost:3000/garita)**: Terminal de Portería para Pistola Lectora.
