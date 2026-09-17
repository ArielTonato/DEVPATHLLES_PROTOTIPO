# PRD: DevPathlles

**Proyecto:** Code Quest #3 — DevTalles
**Fecha límite:** 28 de septiembre de 2026, 10:00 AM GMT-6 (CDMX)
**Equipo:** CodeCrafters

---

## 1. Resumen

DevPathlles es una plataforma que genera rutas de aprendizaje personalizadas a partir del catálogo real de cursos de DevTalles. El usuario responde un cuestionario inicial, recibe una ruta armada dinámicamente por IA, y avanza por ella completando cuestionarios cortos por cada curso y capítulo, con un sistema de progreso, rachas y logros inspirado en Duolingo.

El problema que resuelve: un estudiante nuevo en DevTalles no sabe por dónde empezar dado el volumen de cursos disponibles. DevPathlles convierte esa decisión en un camino guiado y medible.

## 2. Objetivo

Entregar una aplicación funcional, desplegada y documentada que cumpla los seis requerimientos del brief, priorizando que funcione de punta a punta sobre que tenga funciones extra a medio terminar.

## 3. Alcance funcional

### 3.1 Autenticación
Login y registro exclusivamente con Discord vía Supabase Auth. El registro de cada usuario queda asociado a su Discord ID y correo, tal como pide el brief.

### 3.2 Cuestionario inicial
Se presenta a todo usuario nuevo sin ruta activa. Preguntas de opción cerrada (sin texto libre, para poder cachear por combinación exacta de respuestas):

1. **Qué quiere aprender.** Opciones = los programas reales de DevTalles (React, Vue, Angular, Node/Nest, Python, Java, C#, PHP, Go, Dart/Móvil, IA y Automatizaciones), más la opción "no sé, quiero empezar por las bases" que mapea al programa Fundamentos.
2. **Nivel actual.** Cero conocimiento / bases sin experiencia real / ya trabaja en esto y quiere profundizar. No decide qué programa usar, decide qué tan agresivamente se omiten los cursos marcados como `recomendado` dentro del programa elegido.
3. **Para qué lo quiere.** Empleo / freelance / proyecto personal. Relevante sobre todo en programas con ramas internas distintas (ej. IA tiene una rama de automatización y otra de desarrollo de agentes).
4. **Desambiguación de alternativas (condicional).** Solo se muestra si el programa elegido tiene un stage con varios cursos alternativos marcados como `requerido` en simultáneo (ej. en IA, el stage de asistentes ofrece Claude Code, OpenCode o Codex como alternativas entre sí, no las tres a la vez). Si el usuario no responde, se resuelve con un criterio por defecto.

**Generación de la ruta:** no es libre. La IA toma el programa correspondiente a la respuesta 1, incluye todos los cursos `requerido`, incluye los `recomendado` salvo que el nivel indique dominio previo, agrega los `opcional` como nodos bonus no bloqueantes, y resuelve las alternativas de un mismo stage con la respuesta 4. Esto reduce el rol de la IA a personalizar una ruta ya curada por DevTalles, no a diseñarla desde cero.

**Caché de rutas:** dado que el espacio de combinaciones (programa × nivel × objetivo) es acotado, es esperable que se repitan con frecuencia entre usuarios. Si la combinación ya fue resuelta antes, se reutiliza la ruta generada en lugar de volver a llamar a la IA.

### 3.3 Estructura de nodos
- **Fuente de la estructura:** el JSON de programas de DevTalles (rutas curadas por programa, con `stages` y cursos marcados como `requerido` / `recomendado` / `opcional`). El JSON de cursos aporta el detalle de cada curso (topics, prerequisites) para alimentar la generación de cuestionarios.
- **Nodo grande = curso** dentro del programa seleccionado. Contiene un cuestionario de 10 preguntas.
- **Nodo pequeño = capítulo** de ese curso (cuando el detalle del curso lo permite). Contiene un cuestionario de máximo 3 preguntas.
- Los cuestionarios se generan por IA a partir de los `topics` y `prerequisites` de cada curso en el JSON de cursos.
- **Caché de cuestionarios:** una vez generado el cuestionario de un nodo, queda guardado y se reutiliza para todos los usuarios que pasen por ese nodo. No se regenera por usuario.

**Nota técnica — cruce de datos:** los slugs no son consistentes en mayúsculas/minúsculas entre el JSON de programas y el de cursos (ej. `"Java"`, `"Vue-intermedio"`, `"PHP-moderno"`, `"Ingeniería-de-prompts"`). El cruce entre ambos JSON debe normalizar a minúsculas antes de comparar, o habrá cursos sin su detalle (topics/prerequisites) al generar cuestionarios.

**Nota técnica — nombres de campos:** el campo `level` en el JSON de programas (`requerido`/`recomendado`/`opcional`) es un concepto distinto del nivel de conocimiento del usuario recogido en el cuestionario inicial. Nombrarlos con variables distintas desde el inicio (ej. `course_priority` vs `user_level`) para evitar confusiones entre el equipo.

### 3.4 Progreso
Un nodo se marca como completado cuando el usuario aprueba su cuestionario con un puntaje mínimo (umbral sugerido: 50-60%). Reintentos ilimitados, sin penalización, mostrando el mejor puntaje o el último intento en el perfil.

### 3.5 Múltiples rutas
El usuario puede volver a llenar el cuestionario inicial en cualquier momento desde un botón dedicado. Esto genera una ruta nueva (con preguntas de cuestionario nuevas) sin borrar las rutas anteriores. El usuario puede ver todas sus rutas guardadas y cambiar entre ellas.

### 3.6 Rachas
Cuenta días consecutivos en los que el usuario aprobó al menos un cuestionario de nodo. Se rompe si pasa un día sin completar ninguno.

### 3.7 Logros
Sistema simple de insignias por hitos (primer nodo completado, primera ruta terminada, racha de X días, etc.). Alcance a definir por el equipo según tiempo disponible; no es un requisito del brief, es un diferenciador de UI/creatividad.

### 3.8 Visualización de la ruta
Camino visual estilo Duolingo (nodos conectados, estados bloqueado/desbloqueado/completado). Si el tiempo de frontend aprieta, la alternativa de menor riesgo es un layout en zigzag vertical simple, sin conexiones curvas, que conserva el efecto visual con mucho menos esfuerzo de implementación.

## 4. Fuera de alcance (para esta iteración)

- Similitud difusa entre respuestas de usuarios (embeddings, matching semántico). Se usa coincidencia exacta de respuestas para el caché.
- Límite de intentos en los cuestionarios.
- Contenido de los cursos en sí (DevPathlles no reemplaza los cursos, los organiza).
- Notificaciones push o recordatorios de racha.

## 5. Modelo de datos (alto nivel)

- **usuarios**: id, discord_id, correo, nombre.
- **programas** (catálogo, no por usuario): slug, nombre, stages con sus cursos y `course_priority` (requerido/recomendado/opcional). Se carga una vez desde el JSON de programas.
- **cursos** (catálogo): slug (normalizado a minúsculas), title, topics, prerequisites. Se carga una vez desde el JSON de cursos.
- **rutas**: id, usuario_id, programa_slug, fecha_creacion, respuestas_cuestionario_inicial (programa + user_level + objetivo + desambiguaciones), estado.
- **nodos_ruta**: id, ruta_id, tipo (curso/capítulo), referencia al curso/capítulo del catálogo, orden, estado (bloqueado/disponible/completado).
- **cuestionarios_nodo**: id, curso_o_capitulo_slug (del catálogo, no de la ruta), preguntas generadas, cacheado = true una vez creado.
- **intentos_cuestionario**: id, usuario_id, nodo_ruta_id, puntaje, fecha, aprobado (bool).
- **rachas**: usuario_id, racha_actual, fecha_ultima_actividad.
- **logros**: catálogo de logros + tabla usuario_logros.
- **cache_rutas**: hash de (programa + user_level + objetivo + desambiguaciones) → ruta generada, para reutilización entre usuarios.

## 6. Stack técnico

- **Frontend/Backend:** Next.js.
- **Base de datos y Auth:** Supabase (Postgres + Discord OAuth).
- **IA:** API de un modelo (Anthropic/similar) para generación de rutas y cuestionarios a partir del JSON del catálogo de DevTalles.
- **Despliegue:** por definir (Vercel es la opción natural para Next.js).

## 7. Sistema de diseño

Identidad de marca "DevPathlles" ya definida (ver archivo de sistema de diseño adjunto):
- Tipografía: Inter.
- Paleta modo oscuro: fondo #180F2B, tarjetas #211735, acento principal #7B00FF.
- Paleta modo claro: fondo #F7F4FC, acento principal #6D28D9.
- Esquinas redondeadas de 16px, sombras suaves, gradientes morado-cian como elemento distintivo.
- Mascota: astronauta ilustrado, tono amigable y futurista.
- Slogan: "Pequeños desarrolladores, grandes destinos."

## 8. Criterios de evaluación a los que responde cada decisión

| Criterio del brief | Cómo lo cubre DevPathlles |
|---|---|
| Idea | Rutas generadas por IA desde datos reales de DevTalles, gamificación tipo Duolingo, caché inteligente de rutas y cuestionarios |
| Cumplimiento de requerimientos | Cuestionario inicial, rutas dinámicas y múltiples, progreso marcable, login con Discord |
| Aplicación funcional | Prioridad de desarrollo: flujo completo end-to-end antes que features extra |
| UI | Sistema de diseño propio ya definido, experiencia tipo Duolingo |
| Código limpio | Arquitectura por definir en la fase de reparto de tareas |
| Uso de ramas | Flujo de ramas por feature a definir con el equipo |

## 9. Entregables obligatorios (no negociables)

- Repositorio público en GitHub con licencia MIT.
- README.md con instrucciones claras de ejecución.
- Uso real de ramas durante el desarrollo.
- Video de demo (1 a 1:30 min).
- Enlace al proyecto desplegado.

## 10. Riesgos

- **Complejidad visual del camino de nodos** puede consumir tiempo desproporcionado en frontend. Mitigación: empezar con el layout simple en zigzag y solo invertir en curvas/animaciones si sobra tiempo.
- **Generación de cuestionarios con IA** depende de la calidad del JSON scrapeado; si el catálogo completo tiene menos detalle del esperado por curso, los cuestionarios pueden salir genéricos. Mitigación: validar con 2-3 cursos reales antes de generar todo el catálogo.
- **Despliegue de Next.js + Supabase** si nadie del equipo lo ha hecho antes, dejarlo para el final es el error más común. Mitigación: desplegar un esqueleto vacío desde el primer día.

## 11. Próximos pasos

1. Diagrama de base de datos definitivo.
2. Reparto de tareas por área (auth, generación IA, frontend de ruta, quizzes, rachas/logros).
3. Setup de repositorio con licencia MIT y estructura de ramas desde el día uno.
4. Despliegue temprano de un esqueleto funcional.
