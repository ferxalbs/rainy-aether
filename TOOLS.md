Un agente de código al nivel de Cursor, Windsurf o Copilot necesita un set de herramientas bien definido para leer/entender el workspace, planear cambios, editar archivos, ejecutar comandos y auto‑verificarse, no solo “chat + autocomplete”. A continuación tienes una lista de bloques de herramientas concretas que podrías exponer como tools/functions para tu agente tipo SWE.[1][2][3][4][5][6]

### Visión general de capacidades

Las soluciones top como Cursor Agent, Windsurf Cascade y Copilot Agent Mode se apoyan en un bucle agente‑herramientas donde el LLM selecciona operaciones como buscar en el workspace, leer/escribir archivos, correr la terminal y analizar errores para completar tareas multi‑paso. Además, usan índices semánticos de código y reglas/memorias por proyecto para que el modelo tenga contexto profundo del repo y pueda mantener consistencia a largo plazo.[7][2][3][4][5][8][1]

***

### Herramientas de contexto y código base

Estas son las básicas para que el agente “vea” y entienda el proyecto completo.[3][9][1]

- `list_files(pattern?)`: listar archivos y directorios relevantes en el workspace, con filtros por extensión o ruta para escalar a monorepos grandes.[4][5]
- `read_file(path, range?)`: leer contenido completo o rangos específicos de un archivo para limitar tokens.[7][4]
- `read_directory_tree(path, depth?)`: obtener estructura de carpetas para construir un mapa mental del proyecto.[8][3]
- `search_code(query, kind = "text|regex|semantic")`: búsqueda textual, regex y semántica al estilo “Instant Grep” o “semantic code search” de Cursor y Windsurf.[1][7][3]  
- `get_symbol_definition(symbol)` / `find_references(symbol)`: saltar a definiciones y referencias usando tu motor LSP o índice interno.[9][8]
- `get_project_config()`: exponer cosas como package manager, scripts npm/pnpm, targets de build, rutas de src/tests, etc.[5][8]

***

### Herramientas de planificación y tareas

Los agentes modernos generan un plan revisable antes de tocar el código y luego lo ejecutan en pasos.[10][2][4]

- `create_plan(goal, context)`: el modelo propone una lista de pasos, archivos a tocar y riesgos, similar a “Plan Mode” de Cursor o el planning de Copilot Workspace.[2][6][10]
- `update_plan(plan_id, feedback)`: ajustar el plan según correcciones humanas o resultados de pasos previos.[10][4]
- `mark_step_done(plan_id, step_id, metadata)`: registrar progreso para poder reanudar o auditar ejecuciones.[6][4]

***

### Herramientas de edición de código

Aquí es donde se gana o se pierde la experiencia tipo Cursor/Copilot.[11][1][4]

- `apply_edit(path, diff)`: aplicar un diff unificado o un patch generado por el LLM, con validación previa.[4][7]
- `apply_multi_file_edit(edits[])`: lote de cambios atómicos en varios archivos, crucial para refactors grandes.[1][8][4]
- `create_file(path, content)` / `delete_file(path)`: creación y borrado de archivos, como hace el Cursor Agent al scaffoldear features.[12][7]
- `rename_symbol(old_name, new_name, scope)`: refactorizaciones estructurales usando info del LSP o índice de símbolos.[8][9]
- `format_file(path)` / `run_linter_on_file(path)`: correr formatter/linter después de editar para mantener el estilo del proyecto.[5][4]

***

### Herramientas de terminal y ejecución

Copilot Agent Mode y Windsurf Cascade son fuertes porque pueden correr comandos, tests y servidores, y leer la salida para iterar.[7][4][5]

- `run_command(command, cwd?, timeout?)`: ejecutar comandos tipo `npm test`, `pnpm dev`, `pytest`, capturando stdout, stderr y exit code.[4][5]
- `run_tests(target?)`: wrapper de alto nivel que llama a los comandos de test más apropiados para el proyecto.[5][4]
- `get_running_process_logs(name|port)`: leer logs de dev servers o procesos relevantes para debugging.[5][8]  
- `kill_process(name|pid)`: detener servicios que el propio agente levantó para evitar fugas.[5][8]  

***

### Herramientas de diagnóstico y revisión

Equivalentes a “AI Code Review”, “Next edit suggestions” y detección/fix de bugs.[2][1][7]

- `get_diagnostics(path?)`: exponer errores y warnings del compilador, TypeScript server, linters, etc.[9][4]
- `analyze_test_failures(report)`: estructurar resultados de tests para que el LLM razone sobre causas raíz.[4][5]
- `run_static_analysis(target?)`: integrar linters avanzados, analizadores de seguridad o SAST para sugerir fixes.[2][7]
- `request_code_review(target_paths[])`: modo en el que el agente lee cambios y produce reseñas y sugerencias al estilo “AI Code Review in Editor”.[1][2]

***

### Herramientas de navegación y UX avanzada

Muchas de estas cosas las verás como features de Windsurf “local index”, “Fast Context” y el agente de navegador integrado.[3][8][5]

- `open_preview(url|config)`: abrir una vista previa embebida de la app (web, mobile, etc.) para ciclos rápidos UI‑agent.[13][5]  
- `inspect_dom(selector)`: enviar estructura/props de elementos en la preview al agente para ajustes finos de UI.[8][5]
- `web_search(query)`: opcional, para permitir que el agente haga pequeñas búsquedas técnicas o docs.[3][7]
- `attach_image(description, bytes|path)`: soportar image‑to‑code o visión para transformar mocks en componentes, como hace Copilot Vision y Windsurf con uploads.[2][3]  

***

### Herramientas de git, issues y flujo de trabajo

Copilot Workspace y el nuevo “coding agent” están muy centrados en trabajar desde issues hasta PRs completas.[14][6][2]

- `git_status()` / `git_diff(target?)`: exponer cambios actuales al agente para que sepa qué tocó ya.[14][6]
- `git_create_branch(name)` / `git_checkout(branch)`: permitir que tareas grandes se aíslen en branches propios.[6][14]
- `git_commit(message, files?)`: dejar que el LLM genere mensajes y haga commits supervisados.[14][2]
- `link_issue(issue_id, plan_id)`: atar planes de agente a issues de tracker para trazabilidad.[6][2]

***

### Herramientas de configuración, reglas y memoria

Cursor, Windsurf y Copilot permiten instrucciones persistentes, reglas y “prompt files” por repo o equipo.[1][2][3]

- `get_project_rules()` / `set_project_rules(rules)`: guidelines de estilo, arquitecturas permitidas, convenciones de nombres, etc.[3][1]
- `get_memories(scope)` / `save_memory(scope, data)`: preferencias de usuario, decisiones arquitectónicas, “cosas que este proyecto siempre hace así”.[1][3]
- `load_prompt_file(path)` / `list_prompt_files()`: equivalente a los “prompt files” de Copilot que combinan instrucciones, referencias y snippets reutilizables.[2][14]

***

### Extras para diferenciarte

Para ir más allá de copiar a Cursor/Windsurf/Copilot, podrías incluir herramientas para análisis arquitectónico avanzado, generación/regeneración de diagramas a partir del código, o integración directa con sistemas de tickets internos. También es muy potente exponer herramientas específicas de tu stack (por ejemplo, `tauri_build`, `vite_analyze`, `ts_project_graph`) para que el agente trabaje con conocimiento profundo de tu ecosistema Rainy.[5][8][6]
