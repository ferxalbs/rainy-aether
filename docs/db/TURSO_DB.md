Con **turso 0.3.2** puedes usar el motor original reescrito en Rust como base de datos embebida para el IDE, abriendo un `.db` local y hablando con él vía una API async muy parecida a SQLite.[1][2][3]
Ten en cuenta que este motor está marcado como beta y no se recomienda todavía para datos críticos en producción, pero encaja muy bien para storage interno del IDE.[3][1]

### Dependencias en `Cargo.toml`

Para fijar exactamente la versión que quieres:[2][1]

```toml
[dependencies]
turso = "0.3.2"
tokio = { version = "1", features = ["full"] }
anyhow = "1"
```

`tokio` es necesario porque la API de Turso es async, y `anyhow` solo es por ergonomía en ejemplos.[1][3]

Si más adelante te interesa usar macros auxiliares (por ejemplo, para parámetros), existe también `turso_macros = "0.3.2"`, aunque para un uso directo en el IDE no es obligatorio.[4][1]

***

### Ejemplo mínimo local con `ide.db`

La forma recomendada de usar Turso en Rust es crear una base local con `Builder::new_local("archivo.db")`, construirla y luego abrir un `Connection`.[3][1]

```rust
use turso::Builder;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Crea o abre ide.db en el directorio actual
    let db = Builder::new_local("ide.db").build().await?;
    let conn = db.connect()?;

    // Crear tabla de settings del IDE
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
        (),
    ).await?;

    // Insertar un setting
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)",
        ("theme", "dark"),
    ).await?;

    // Leer settings
    let res = conn.execute(
        "SELECT key, value FROM settings",
        (),
    ).await?;

    for row in res.rows {
        let key = row.values[0].to_string();
        let value = row.values[1].to_string();
        println!("{key} = {value}");
    }

    Ok(())
}
```

Este patrón (builder → `build().await` → `connect()` → `execute`) es el mismo que Turso muestra en su README y en su referencia de consultas simples.[5][3]

***

### Patrón de uso para el IDE

Para el IDE, la idea sería tratar `ide.db` como tu “storage interno” para settings, proyectos, historiales y quizá índices ligeros.[6][3]

- **Ubicación del archivo**: puedes poner `ide.db` en una carpeta de datos del usuario (por ejemplo, `~/.rainy-aether/ide.db` o equivalente por plataforma) en lugar del working dir.[7][3]
- **Conexión compartida**: crea el `Database` al arrancar el proceso del IDE y comparte un `Connection` (o pool simple) mediante `Arc` hacia los subsistemas que necesiten leer/escribir.[5][3]
- **Esquema típico**: tablas como `projects`, `files`, `settings`, `ai_sessions`, etc., usando siempre `conn.execute(...)` con parámetros posicionales `?1, ?2` para evitar SQL injection y mantener el código claro.[8][5]

Ejemplo de creación de una tabla de proyectos y uso desde el core del IDE:[3][5]

```rust
pub async fn init_schema(conn: &turso::Connection) -> anyhow::Result<()> {
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id         TEXT PRIMARY KEY,
            name       TEXT NOT NULL,
            path       TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        "#,
        (),
    ).await?;
    Ok(())
}

pub async fn add_project(
    conn: &turso::Connection,
    id: &str,
    name: &str,
    path: &str,
    created_at: i64,
) -> anyhow::Result<()> {
    conn.execute(
        "INSERT INTO projects (id, name, path, created_at) VALUES (?1, ?2, ?3, ?4)",
        (id, name, path, created_at),
    ).await?;
    Ok(())
}
```

***

### Notas importantes para tu caso

Turso Database (el crate `turso`) es un motor **embebido** en proceso, no es el servicio Turso cloud ni usa libsql; todo ocurre en un archivo SQLite compatible que vive dentro del proceso del IDE.[1][3]

Eso significa que para features futuras de sync multi‑dispositivo necesitarías combinar este enfoque con otra capa (por ejemplo export/import con Turso cloud o usar libSQL para replicas embebidas), pero para almacenamiento local del IDE es muy adecuado.[9][6]

La propia documentación aclara que la reescritura en Rust sigue en beta, por lo que conviene tratarla como “experimental pero perfecta para tooling” más que como base de datos de misión crítica.[10][3]

Si quieres, el siguiente paso puede ser diseñar un módulo `storage` genérico (trait) y una implementación concreta sobre `turso::Connection` para que en el futuro puedas enchufar otra implementación (por ejemplo libSQL+embedded replica) sin tocar el resto del IDE.[11][5]

[1](https://docs.rs/crate/turso/0.3.2)
[2](https://crates.io/crates/turso)
[3](https://github.com/tursodatabase/turso)
[4](https://crates.io/crates/turso_macros)
[5](https://docs.turso.tech/sdk/rust/reference)
[6](https://turso.tech/blog/introducing-embedded-replicas-deploy-turso-anywhere-2085aa0dc242)
[7](https://turso.tech/blog/turso-cli-is-now-open-source-66fd8130f5c9)
[8](https://www.shuttle.dev/blog/2023/07/28/turso-shuttle-integration-cats-api)
[9](https://turso-notrab-mar-241-update-rust-quickstart-and-reference-docs.mintlify.app/features/embedded-replicas)
[10](https://www.npmjs.com/package/@tursodatabase/database)
[11](https://codethoughts.io/posts/2024-10-01-improved-turso-ergonomics-in-rust/)
[12](https://crates.io/crates/turso_core/0.3.2)
[13](https://github.com/tursodatabase/turso/releases)
[14](https://docs.turso.tech)
[15](https://docs.rs/turso)
[16](https://turso.tech/blog/leveraging-tursos-embedded-replicas-in-real-world-applications-3250e2e2)
[17](https://avi.im/blag/2025/rickrolling-turso/)
[18](https://turso.tech/blog/databases-for-all-your-ai-apps)
[19](https://docs.turso.tech/features/embedded-replicas/introduction)
[20](https://docs.turso.tech/sdk/php/reference)
[21](https://docs.turso.tech/sdk/rust/quickstart)
[22](https://turso.tech/blog/do-it-yourself-database-cdn-with-embedded-replicas)
[23](https://docs.turso.tech/sdk/python/reference)
[24](https://www.reddit.com/r/sqlite/comments/1n7degs/turso_a_complete_rewrite_of_sqlite_in_rust/)
[25](https://docs.turso.tech/sdk/http/quickstart)
[26](https://turso.tech/blog/local-first-cloud-connected-sqlite-with-turso-embedded-replicas)
[27](https://turso.tech/blog/turso-offline-sync-public-beta)
[28](https://turso.tech/blog/beyond-the-single-writer-limitation-with-tursos-concurrent-writes)
[29](https://docs.turso.tech/sdk/python/quickstart)
[30](https://docs.turso.tech/tursodb/quickstart)
[31](https://turso.tech/blog/migrating-and-importing-sqlite-to-turso-just-got-easier)
[32](https://docs.turso.tech/sdk/c/quickstart)
[33](https://kitemetric.com/blogs/unlocking-the-power-of-offline-sync-with-turso)
[34](https://turso.tech/blog/create-a-distributed-api-for-your-e-commerce-store-using-cloudflare-and-turso-fa449c932240)
[35](https://www.reddit.com/r/learnprogramming/comments/1c43ev0/help_with_rust_integration_tests_sharing_a_common/)

Tener el **historial del agente** en Turso local es un encaje natural: es SQLite‑compatible, embebido en el proceso del IDE y la API async en Rust es suficientemente simple para consultas frecuentes de “últimos N mensajes”.[^1][^2][^3]
La idea es modelar sesiones y mensajes en tablas normales, con índices por sesión/tiempo para reconstruir rápido el contexto cuando el agente vuelve a actuar.[^4][^3]

### Modelo de datos propuesto

Para el agente de código del IDE, un esquema mínimo razonable sería este:[^3][^4]

```sql
CREATE TABLE IF NOT EXISTS agent_sessions (
    id          TEXT PRIMARY KEY,        -- uuid/ulid
    project_id  TEXT,                    -- opcional: id de proyecto del IDE
    kind        TEXT NOT NULL,           -- "chat", "refactor", "debug", etc.
    created_at  INTEGER NOT NULL         -- epoch seconds
);

CREATE TABLE IF NOT EXISTS agent_messages (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES agent_sessions(id),
    role        TEXT NOT NULL,           -- "user", "assistant", "system", "tool"
    index_in_session INTEGER NOT NULL,   -- orden dentro de la sesión
    content     TEXT NOT NULL,           -- texto del mensaje
    code_excerpt TEXT,                   -- snippet de código relevante (opcional)
    metadata    TEXT,                    -- JSON como string (tool calls, file, language…)
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_session_order
    ON agent_messages(session_id, index_in_session);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_project_created
    ON agent_sessions(project_id, created_at);
```

Este diseño permite consultar muy rápido “dame los últimos N mensajes de la sesión X” y “dame las últimas sesiones del proyecto Y”, que son los dos patterns principales del agente.[^4][^3]
`metadata` en JSON te deja evolucionar sin migraciones constantes (por ejemplo, guardar diffs, ids de ficheros, tool invocations) y seguir usando `content` como texto plano para el prompt.[^2][^1]

Si quieres guardar la historia de código a nivel de diffs, puedes añadir otra tabla `agent_edits` para reconstruir cambios por fichero sin inflar la tabla de mensajes:[^1][^4]

```sql
CREATE TABLE IF NOT EXISTS agent_edits (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL REFERENCES agent_sessions(id),
    file_path   TEXT NOT NULL,
    kind        TEXT NOT NULL,          -- "insert", "replace", "delete", "rename"
    diff        TEXT NOT NULL,          -- por ejemplo un patch estilo unified diff
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_edits_file_time
    ON agent_edits(file_path, created_at);
```

### Consultas típicas del agente

Con ese esquema, los patrones clave en runtime son sencillos:[^3][^4]

- **Arranque de una sesión nueva**: insertar en `agent_sessions` con `project_id`, `kind` y `created_at = now()`, y devolver el `session_id` al runtime del agente.[^4][^3]
- **Guardar mensajes**: cada vez que el usuario o el agente habla, insertar una fila en `agent_messages`, incrementando `index_in_session` (puedes obtenerlo como `COALESCE(MAX(index_in_session)+1,0)` dentro de una transacción).[^5][^3]
- **Reconstruir contexto**: cuando vuelves a invocar el agente, haces `SELECT ... FROM agent_messages WHERE session_id = ? ORDER BY index_in_session DESC LIMIT N` y luego los reordenas en memoria para el prompt.[^3][^4]

Para auditoría o “replay”, puedes recuperar todas las ediciones sobre un fichero con `SELECT * FROM agent_edits WHERE file_path = ? ORDER BY created_at`, y aplicar diffs si hace falta.[^1][^4]
Si el volumen crece, puedes implementar políticas de retención (por ejemplo borrar sesiones con `created_at` viejo o compactar mensajes en un resumen guardado en `metadata`).[^6][^2]

### Implementación en Rust con `turso = "0.3.2"`

La propia documentación de Turso enseña cómo conectarse a una base local y ejecutar `CREATE TABLE`, `INSERT` y `SELECT` con una API async muy directa.[^2][^3]

#### Inicialización de la base y esquema

```rust
use turso::Builder;

pub async fn open_db(path: &str) -> anyhow::Result<turso::Connection> {
    // Base embebida en disco, local al IDE
    let db = Builder::new_local(path).build().await?; // e.g. "~/.rainy/agent.db"
    let conn = db.connect()?;
    Ok(conn)
}

pub async fn init_schema(conn: &turso::Connection) -> anyhow::Result<()> {
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS agent_sessions (
            id          TEXT PRIMARY KEY,
            project_id  TEXT,
            kind        TEXT NOT NULL,
            created_at  INTEGER NOT NULL
        );
        "#,
        (),
    ).await?;

    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS agent_messages (
            id              TEXT PRIMARY KEY,
            session_id      TEXT NOT NULL,
            role            TEXT NOT NULL,
            index_in_session INTEGER NOT NULL,
            content         TEXT NOT NULL,
            code_excerpt    TEXT,
            metadata        TEXT,
            created_at      INTEGER NOT NULL
        );
        "#,
        (),
    ).await?;

    conn.execute(
        r#"
        CREATE INDEX IF NOT EXISTS idx_agent_messages_session_order
            ON agent_messages(session_id, index_in_session);
        "#,
        (),
    ).await?;

    Ok(())
}
```

`Builder::new_local("sqlite.db").build().await?` y `conn.execute("CREATE TABLE ...", ())` siguen exactamente el patrón que Turso documenta para uso local en Rust.[^1][^3]

#### Crear sesión y añadir mensajes

```rust
use turso::Connection;
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_epoch() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

pub async fn start_session(
    conn: &Connection,
    project_id: Option<&str>,
    kind: &str,
) -> anyhow::Result<String> {
    let id = Uuid::new_v4().to_string();
    let created_at = now_epoch();

    conn.execute(
        "INSERT INTO agent_sessions (id, project_id, kind, created_at)
         VALUES (?1, ?2, ?3, ?4)",
        (id.as_str(), project_id, kind, created_at),
    ).await?;

    Ok(id)
}

pub async fn append_message(
    conn: &Connection,
    session_id: &str,
    role: &str,
    content: &str,
    code_excerpt: Option<&str>,
    metadata_json: Option<&str>,
) -> anyhow::Result<()> {
    // Calcula el siguiente index_in_session de forma segura en una transacción
    let mut tx = conn.transaction().await?; // libsql/turso usan transacciones async similares
    let row = tx
        .query("SELECT COALESCE(MAX(index_in_session)+1, 0) FROM agent_messages WHERE session_id = ?1",
               (session_id,))
        .await?;
    let next_index: i64 = row.rows[^0].values[^0].as_i64().unwrap_or(0);

    let id = Uuid::new_v4().to_string();
    let created_at = now_epoch();

    tx.execute(
        "INSERT INTO agent_messages
         (id, session_id, role, index_in_session, content, code_excerpt, metadata, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            id.as_str(),
            session_id,
            role,
            next_index,
            content,
            code_excerpt,
            metadata_json,
            created_at,
        ),
    ).await?;

    tx.commit().await?;
    Ok(())
}
```

El ejemplo anterior combina los patrones de `execute`/`query` y transacciones que ya aparecen en la guía de Rust de Turso/libSQL, pero aplicado a tu dominio de sesiones y mensajes.[^5][^3]
La transacción asegura que, incluso con múltiples hilos del IDE hablándole al agente, el `index_in_session` se mantenga consistente y ordenado.[^5][^2]

#### Cargar el historial reciente de una sesión

```rust
pub struct AgentMessage {
    pub role: String,
    pub content: String,
    pub code_excerpt: Option<String>,
    pub metadata_json: Option<String>,
}

pub async fn load_recent_history(
    conn: &Connection,
    session_id: &str,
    limit: i64,
) -> anyhow::Result<Vec<AgentMessage>> {
    let res = conn
        .query(
            "SELECT role, content, code_excerpt, metadata
             FROM agent_messages
             WHERE session_id = ?1
             ORDER BY index_in_session DESC
             LIMIT ?2",
            (session_id, limit),
        )
        .await?;

    // Reordenar en memoria si quieres de más antiguo a más nuevo
    let mut out = Vec::new();
    for row in res.rows.into_iter().rev() {
        out.push(AgentMessage {
            role: row.values[^0].to_string(),
            content: row.values[^1].to_string(),
            code_excerpt: row.values[^2].as_str().map(|s| s.to_string()),
            metadata_json: row.values[^3].as_str().map(|s| s.to_string()),
        });
    }

    Ok(out)
}
```

La llamada `conn.query("SELECT ...", ())` con parámetros posicionales y límite coincide con el estilo que Turso muestra para consultas de lectura sobre tablas sencillas.[^4][^3]
Desde el punto de vista del runtime del agente, esto te devuelve un slice de mensajes ya listo para convertir en prompts, con la opción de usar `code_excerpt` y `metadata` para enriquecer el contexto.[^2][^1]

### Estrategia de retención y rendimiento

Aunque Turso está pensado para ser rápido y soportar muchas filas, conviene que definas una política de retención para que el historial del agente no crezca sin límites en la máquina del usuario.[^7][^2]
Opciones habituales son borrar sesiones muy antiguas, compactar sesiones en un mensaje de resumen (guardado en `metadata`) o limitar el número de sesiones por proyecto, todo ello con simples `DELETE`/`UPDATE` sobre las tablas anteriores.[^6][^4]

En resumen, con `turso = "0.3.2"` puedes modelar las sesiones del agente como tablas SQLite normales, inicializar el esquema al boot del IDE y exponer una capa `ConversationStore` interna que hable con Turso vía `execute`/`query`, manteniendo todo local‑first y listo para escalar si más adelante quieres añadir alguna forma de sync.[^2][^3]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26][^27][^28][^29][^30][^8][^9]</span>

<div align="center">⁂</div>

[^1]: <https://github.com/tursodatabase/turso>

[^2]: <https://crates.io/crates/turso>

[^3]: <https://docs.turso.tech/connect/rust>

[^4]: <https://www.shuttle.dev/blog/2023/07/28/turso-shuttle-integration-cats-api>

[^5]: <https://docs.turso.tech/sdk/rust/reference>

[^6]: <https://docs.turso.tech/help/usage-and-billing>

[^7]: <https://turso.tech>

[^8]: <https://docs.rs/crate/turso/0.3.2>

[^9]: <https://docs.turso.tech/sdk/rust/quickstart>

[^10]: <https://crates.io/crates/turso/0.3.2/dependencies>

[^11]: <https://stackoverflow.com/questions/7359721/are-pragma-statements-undone-by-rolling-back-transactions>

[^12]: <https://turso.tech/blog/a-deep-look-into-our-new-massive-multitenant-architecture>

[^13]: <https://docs.rs/turso_core>

[^14]: <https://turso.tech/blog/introducing-change-data-capture-in-turso-sqlite-rewrite>

[^15]: <https://www.reddit.com/r/sqlite/comments/1n7degs/turso_a_complete_rewrite_of_sqlite_in_rust/>

[^16]: <https://docs.astro.build/ar/guides/backend/turso/>

[^17]: <https://github.com/tursodatabase/turso/releases>

[^18]: <https://lib.rs/database>

[^19]: <https://turso.tech/blog/introducing-read-only-database-attach-in-turso>

[^20]: <https://turso.tech/blog/building-a-better-sqlite3-compatible-javascript-package-with-rust-a388cee9>

[^21]: <https://docs.rs/turso>

[^22]: <https://lib.rs/crates/structsy>

[^23]: <https://lib.rs/database-implementations>

[^24]: <https://github.com/derekfrye/sql-middleware>

[^25]: <https://git.joshthomas.dev/mirrors/limbo/commit/cf126824de115801c6583b906aa7e89e1fda489d.diff>

[^26]: <https://blog.csdn.net/gitblog_00376/article/details/148394411>

[^27]: <https://git.joshthomas.dev/mirrors/limbo/src/commit/e25064959bdc2161272beb90234bebee52ac29e3/core/lib.rs>

[^28]: <https://git.joshthomas.dev/mirrors/limbo/commit/732d998618aa418f17fbf034133d36f7628859b2>

[^29]: <https://codethoughts.io/posts/2024-10-01-improved-turso-ergonomics-in-rust/>

[^30]: <https://www.reddit.com/r/learnprogramming/comments/1c43ev0/help_with_rust_integration_tests_sharing_a_common/>
