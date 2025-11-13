### Contexto

VS Code expone configuraciones de usuario y espacio de trabajo a través de un esquema JSON declarado por extensiones en package.json, y las renderiza en su Settings UI con controles apropiados y búsqueda.[^2][^1]
El proyecto busca adoptar este enfoque para permitir que extensiones y el propio IDE definan configuraciones con tipado, validación e indexación que se traduzcan en UI consistente y editable.[^1][^2]
La interfaz se construirá con componentes shadcn para un diseño personalizable y de alto nivel de control de código.[^3][^4]

### Objetivo

Construir un sistema de renderizado de configuraciones “VS Code-like” que lea esquemas JSON de extensiones y del core, y los renderice en una Settings UI con controles nativos por tipo, incluyendo búsqueda, agrupación, y edición con persistencia.[^2][^1]
Garantizar compatibilidad con los tipos admitidos en los esquemas (string, number, boolean, enum, object/array), mapeando cada tipo a un componente shadcn apropiado con validaciones y accesibilidad.[^3][^1]
Exponer un backend en Rust que sirva, valide, persista y observe cambios de configuración de forma eficiente y segura.[^2]

### Alcance

Soportar lectura e indexación de esquemas contributes.configuration de extensiones y del propio IDE, con metadatos como description, default, enum, scope y deprecation.[^5][^1]
Renderizar controles adecuados: texto/numérico, checkbox, select para enum, editores simples para array/object, y toggles para booleanos.[^1][^2]
Implementar búsqueda rápida por id, título, descripción y tags, con filtrado por grupos y extensión.[^6][^2]

### Entradas y salidas

Entradas: archivos package.json de extensiones y esquemas derivados con propiedades y metadatos, así como configuración efectiva por ámbito (Usuario, Workspace).[^2][^1]
Salidas: una Settings UI navegable y filtrable, y una API/servicio que ofrezca lectura/escritura/validación y eventos de cambio.[^1][^2]

### Requisitos funcionales

- Renderizar por tipo: string → Input, number → Input con step/validation, boolean → Switch/Checkbox, enum → Select, array/object → editor simplificado o modal dedicado.[^3][^1]
- Mostrar metadatos: título, descripción, valor por defecto, estado deprecado, y alcance (User/Workspace) donde aplique.[^2][^1]
- Soportar “Reset to Default”, indicador de valor modificado, y vista JSON alterna de solo lectura para inspección rápida.[^7][^2]
- Búsqueda con highlight y filtros por grupo/categoría y origen (core vs extensión).[^6][^2]
- Persistir cambios y emitir eventos que otras partes del IDE puedan observar.[^1][^2]

### Requisitos técnicos

- UI en React con componentes shadcn, priorizando composición, accesibilidad y control total sobre el código.[^4][^3]
- Backend en Rust con un servicio de configuración que gestione carga de esquemas, validación por JSON Schema, ámbitos, almacenamiento y notificaciones.[^7]
- Indexación de esquemas al inicio y en hot-reload cuando se instalen/actualicen extensiones.[^2][^1]

### Compatibilidad con VS Code

Alinear el modelo de datos con contributes.configuration: cada propiedad con type, default, description, enum, enumDescriptions, deprecationMessage y scope.[^5][^1]
Respetar la noción de ámbito (User vs Workspace) y grupos/categorías en la navegación de la UI.[^6][^2]
Permitir que extensiones definan nuevas claves y que el IDE las integre sin cambios de código en la UI.[^1][^2]

### Diseño de UI

La columna izquierda lista grupos y extensiones, y la derecha renderiza settings con controles y acciones por ítem.[^6][^2]
Los componentes shadcn deben ser accesibles, personalizables y coherentes visualmente con el resto del IDE.[^4][^3]
Añadir hints de validación inline, placeholders y tooltips basados en metadatos del esquema.[^3][^1]

### Backend en Rust

Servicio con API para: listar grupos/settings, leer/escribir valores efectivos por ámbito, validar contra esquema, y emitir eventos.[^2][^1]
Soportar carga incremental y caché de esquemas y valores, con almacenamiento en archivos o base local según estrategia del IDE.[^7][^2]
Exponer endpoints o canal IPC para llamadas de la UI y suscripciones a cambios.[^1][^2]

### Búsqueda y UX

Implementar indexación de id, título, descripción, y tags por extensión, con búsqueda con tolerancia a mayúsculas y acentos.[^6][^2]
Destacar coincidencias y permitir deep-linking a un setting concreto.[^6][^2]
Incluir atajos para abrir la Settings UI y moverse entre resultados.[^8][^6]

### Accesibilidad e i18n

Todos los controles deben tener labels, roles y navegación por teclado adecuados.[^6][^2]
Preparar textos para localización y soportar formatos localizados en validación numérica y de listas.[^2][^6]

### Rendimiento

Cargar perezosamente grupos y vistas largas, con virtualización de listas para conjuntos grandes.[^6][^2]
Cachear esquemas y resultados de búsqueda, invalidando por cambios de extensiones o configuración.[^1][^2]

### Seguridad

Validar estrictamente entradas antes de persistir y limitar rutas/escrituras a ubicaciones de configuración.[^7][^2]
Separar permisos de lectura/escritura por ámbito y registrar cambios para auditoría local.[^2][^6]

### Telemetría y diagnósticos

Registrar errores de validación, latencias de carga y patrones de uso de controles de forma anónima y opcional.[^6][^2]
Exponer un modo “verbose” para depurar esquemas malformados de extensiones.[^1][^2]

### Testing

- Unit tests de mapeo tipo→componente y validación por esquema.[^3][^1]
- Integration tests UI↔servicio de configuración con escenarios de edición, reset y scopes.[^2][^1]
- Snapshot tests de renderizado por tipo y estados deprecados/errores.[^3][^1]

### Criterios de aceptación

- Cargar y renderizar al menos 50 claves de configuración de múltiples extensiones, con búsqueda en <100 ms para consultas comunes en hardware objetivo.[^6][^2]
- Mapeo correcto para string/number/boolean/enum/array/object con validación y mensajes de error claros.[^1][^2]
- Persistencia y eventos funcionando por ámbito, con “Reset to Default” y visual de diferencia respecto al valor por defecto.[^2][^1]
- Accesibilidad: navegación por teclado completa, roles ARIA adecuados y contraste mínimo AA.[^3][^6]

### No metas

No se construirá un editor JSON completo dentro de la Settings UI más allá de una vista de inspección o modal simple para objetos/arrays.[^7][^2]
No se implementarán permisos multiusuario ni sincronización en la nube en esta iteración.[^6][^2]

### Entregables

- Documento de contrato de esquema→UI con tabla de mapeos y estados.[^3][^1]
- Servicio de configuración en Rust con API documentada y pruebas automatizadas.[^2]
- Settings UI con búsqueda, filtros, y soporte de scopes, integrada al shell del IDE.[^2][^6]

### Plan sugerido

Fase 1: Parser e indexador de esquemas y contrato de mapeo tipo→componente.[^3][^1]
Fase 2: Servicio de configuración en Rust con validación, persistencia y eventos.[^2]
Fase 3: UI shadcn con búsqueda, filtros, accesibilidad y pruebas de integración.[^3][^6]

### Notas de personalización

Usa shadcn para mantener control total del código de componentes y facilitar extensiones futuras por IA y equipo interno.[^4][^3]
Alinea el trabajo con el hito de beta y la visión del IDE con agente avanzado y UX de alto nivel de personalización.
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^9]</span>

<div align="center">⁂</div>

[^1]: preferences.frontend_stack

[^2]: interests.performance

[^3]: <https://code.visualstudio.com/api/references/contribution-points>

[^4]: <https://code.visualstudio.com/docs/configure/settings>

[^5]: <https://ui.shadcn.com/docs>

[^6]: <https://ui.shadcn.com>

[^7]: <https://vscode-docs1.readthedocs.io/en/latest/extensionAPI/extension-points/>

[^8]: <https://code.visualstudio.com/docs/getstarted/userinterface>

[^9]: <https://code.visualstudio.com/docs/languages/json>

[^10]: <https://code.visualstudio.com/docs/configure/keybindings>

[^11]: projects.release_timeline

[^12]: projects.product_launch

[^13]: <https://tristanelosegui.com/como-optimizar-tus-prompts-para-obtener-mejores-resultados/>

[^14]: <https://www.youtube.com/watch?v=nwcp9nLoTNY>

[^15]: <https://www.flane.com.pa/blog/es/15-prompts-esenciales-para-desarrolladores-y-como-aplicarlos-en-el-dia-a-dia/>

[^16]: <https://www.youtube.com/shorts/zLv0IKp5gP0>

[^17]: <https://www.youtube.com/watch?v=YOIrEEjmFXE>

[^18]: <https://vscode-docs1.readthedocs.io/en/latest/getstarted/settings/>

[^19]: <https://www.reddit.com/r/LocalLLaMA/comments/1myhawv/ever_wondered_whats_hiding_in_the_system_prompt/>

[^20]: <https://codeparrot.ai/blogs/shadcn-ui-for-beginners-the-ultimate-guide-and-step-by-step-tutorial>

[^21]: <https://www.aibase.com/es/news/21892>

[^22]: <https://code.visualstudio.com/docs/getstarted/personalize-vscode>

[^23]: <https://www.youtube.com/watch?v=mL3-qKANX2A>

[^24]: <https://www.shadcn.io/ui>
