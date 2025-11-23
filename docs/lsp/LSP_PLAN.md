# LSP PLAN

## LSP PLAN BASED IN NEW STACK MODERN AND COMPLETE

La integración más sólida en Tauri 2 con pnpm es montar un editor Monaco en el frontend, conectarlo a `monaco-languageclient` y usar un servidor `typescript-language-server --stdio` que se lanza desde el backend de Tauri, comunicándose mediante IPC personalizado (sin necesidad de WebSocket externo).  A continuación va una guía paso a paso desde cero, asumiendo frontend tipo React/Vite pero fácilmente adaptable.[^1][^2][^3][^4][^5]

### 1. Arquitectura a implementar

- Frontend (WebView Tauri): `monaco-editor` + `monaco-languageclient` en TypeScript.[^6][^4]
- Capa de transporte: implementación propia de `MessageReader`/`MessageWriter` sobre IPC de Tauri, usando un comando `connect` que abre una sesión con el servidor LSP.[^7][^1]
- Backend Tauri (Rust): lanza `typescript-language-server --stdio` como proceso hijo y enruta stdin/stdout hacia el frontend mediante el transporte anterior.[^8][^2][^9]

Esto sigue el patrón recomendado por los autores de `monaco-languageclient`: cliente en el “browser” y servidor LSP en un proceso separado, conectados por un puente (aquí Tauri IPC en lugar de WebSocket/Node).[^3][^8]

***

### 2. Prerrequisitos

- Node.js y pnpm instalados globalmente.[^5]
- Toolchain de Rust y Tauri 2 configurados (incluye `cargo` y `tauri-cli`).[^10][^5]
- Conocimientos básicos de React/Vite o framework similar para el frontend.[^5]

Asegúrate también de tener TypeScript y `typescript-language-server` disponibles, ya sea global o localmente.[^2][^9]

***

### 3. Crear el proyecto base con Tauri 2 y pnpm

1. Crea el esqueleto del proyecto Tauri 2 (ejemplo estilo `npm create tauri-app@latest`, adaptado a pnpm):[^5]

```bash
pnpm dlx create-tauri-app@latest my-ide
cd my-ide
pnpm install
```

Este comando genera el frontend (React/Vite, Svelte, etc.) y el backend en Rust listos para desarrollo.[^5]
2. Verifica que el proyecto arranca.[^5]

```bash
pnpm tauri dev
```

Si la ventana de Tauri abre correctamente con el template, la base está lista para añadir Monaco y LSP.[^5]

***

### 4. Instalar dependencias LSP y editor (pnpm)

En la raíz del proyecto (donde está el `package.json` del frontend):

1. Dependencias de editor + cliente LSP.[^11][^12][^4][^6]

```bash
pnpm add monaco-editor monaco-languageclient vscode-ws-jsonrpc vscode-jsonrpc
```

`monaco-languageclient` es la toolbox que conecta Monaco con servidores LSP, y `vscode-ws-jsonrpc` / `vscode-jsonrpc` proporcionan la implementación JSON-RPC sobre diferentes transportes.[^12][^4][^11][^3]
2. Dependencias de TypeScript y servidor de lenguaje (mejor como devDependencies).[^9][^2]

```bash
pnpm add -D typescript typescript-language-server
```

Según la documentación oficial, `typescript-language-server` se suele instalar junto a `typescript` y se ejecuta con `--stdio` para usar LSP estándar.[^2][^9]

***

### 5. Configurar `typescript-language-server` en el backend Tauri

El objetivo es que el backend en Rust pueda lanzar el servidor TS/JS como proceso hijo.[^8][^9][^2]

1. Localiza el binario local de `typescript-language-server` instalado por pnpm.[^2]
    - Normalmente estará bajo `.pnpm` y expuesto vía `node_modules/.bin/typescript-language-server`.[^9][^2]
2. En el backend de Tauri (carpeta `src-tauri`), añade un comando `connect` que:[^1][^8]
    - Lance el proceso `typescript-language-server --stdio`.[^9][^2]
    - Guarde los handles de stdin/stdout asociados a un `session_id`.[^8][^1]
    - Devuelva ese `session_id` al frontend.[^1]

Pseudocódigo Rust simplificado (conceptual, adaptarlo a Tauri 2):[^1][^5]

```rust
#[tauri::command]
async fn connect(state: tauri::State<'_, LspSessions>) -> Result<u32, String> {
    use std::process::{Command, Stdio};
    let mut child = Command::new("node_modules/.bin/typescript-language-server")
        .arg("--stdio")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let id = state.add_session(child);
    Ok(id)
}
```

La estructura `LspSessions` sería un estado global que mapea `session_id` a procesos y pipes, que luego usarás para leer/escribir mensajes.[^8][^1]
3. Expón también comandos tipo `lsp_write(session_id, message)` y un bucle de lectura que reenvíe la salida del servidor al frontend mediante eventos Tauri.[^7][^1]
    - Este patrón coincide con el ejemplo de `monaco-languageclient` donde se construye un `MessageTransports` sobre cualquier mecanismo de IPC disponible (Tauri en este caso).[^4][^7][^1]

***

### 6. Implementar transporte LSP sobre Tauri en el frontend

En el frontend, hay que crear una función `createTauriMessageConnection` y clases `TauriMessageReader/Writer` para integrarse con `monaco-languageclient`.[^4][^7][^1]

1. Función de conexión (basada en el snippet de la discusión oficial para Tauri).[^1]

```ts
import type { MessageReader, MessageWriter } from 'vscode-jsonrpc';
import { invoke } from '@tauri-apps/api/tauri';

export async function createTauriMessageConnection(encoding: string) {
  if (encoding !== 'utf8') throw new Error('Unsupported encoding ' + encoding); // [web:23]
  const session = await invoke<number>('connect'); // comando Tauri que creaste [web:23]

  const reader = new TauriMessageReader(session);
  const writer = new TauriMessageWriter(session);

  return {
    reader: reader as MessageReader,
    writer: writer as MessageWriter,
  };
}
```

Esta estructura coincide con lo que `monaco-languageclient` espera en `connectionProvider.get`.[^4][^1]
2. Implementa `TauriMessageWriter`: envía cada mensaje LSP al backend mediante `invoke` o eventos.[^7][^1]

```ts
import type { Message } from 'vscode-jsonrpc';
import { invoke } from '@tauri-apps/api/tauri';

class TauriMessageWriter {
  constructor(private sessionId: number) {}

  write(msg: Message): void {
    const json = JSON.stringify(msg); // [web:32]
    void invoke('lsp_write', { sessionId: this.sessionId, message: json }); // [web:23]
  }

  // Métodos onClose, dispose, etc., según interfaz MessageWriter.
}
```

En el backend, `lsp_write` escribirá este JSON en stdin del proceso LSP correspondiente al `sessionId`.[^8][^1]
3. Implementa `TauriMessageReader`: escucha eventos de Tauri que contain mensajes desde el servidor LSP.[^7][^1]

```ts
import { listen } from '@tauri-apps/api/event';
import type { Message } from 'vscode-jsonrpc';
import {
  MessageReader,
  DataCallback,
  CloseHandler,
} from 'vscode-jsonrpc';

class TauriMessageReader implements MessageReader {
  private callback?: DataCallback;
  private closeHandler?: CloseHandler;

  constructor(private sessionId: number) {
    // Escucha eventos específicos de esta sesión, ej. 'lsp://session/<id>' [web:23]
    void listen<string>(`lsp://session/${sessionId}`, (event) => {
      if (!this.callback) return;
      const msg = JSON.parse(event.payload) as Message; // [web:32]
      this.callback(msg);
    });
  }

  onData(cb: DataCallback): void {
    this.callback = cb;
  }

  onClose(cb: CloseHandler): void {
    this.closeHandler = cb;
  }

  dispose(): void {
    if (this.closeHandler) this.closeHandler(); // [web:32]
  }
}
```

En Rust, tendrás que emitir estos eventos cuando leas de stdout del proceso LSP.[^8][^1]

***

### 7. Integrar Monaco Editor en el frontend

1. Instala y configura Monaco en tu app (ejemplo con React).[^6][^3]
    - Usa un wrapper como `@monaco-editor/react` o integra `monaco-editor` directamente con un `useEffect` que inicialice el editor.[^3][^6]

Ejemplo simplificado sin wrapper:[^6]

```ts
import * as monaco from 'monaco-editor';

useEffect(() => {
  const editor = monaco.editor.create(containerRef.current!, {
    value: 'console.log("Hello LSP");',
    language: 'typescript',
    automaticLayout: true,
  });
  return () => editor.dispose();
}, []);
```

Monaco ya aporta soporte básico a TS/JS vía su propio worker, al que luego se le añadirán capacidades LSP.[^13][^3]
2. Configura modelo de documento con un `uri` estable (ej. `inmemory://model.ts`) para que el cliente LSP pueda mapearlo.[^3][^4]

***

### 8. Crear e iniciar el `MonacoLanguageClient`

Ahora se conecta Monaco con el servidor LSP usando el transporte sobre Tauri.[^3][^4][^1]

1. Crea el cliente cuando el editor esté listo.[^6][^4]

```ts
import {
  MonacoLanguageClient,
  CloseAction,
  ErrorAction,
} from 'monaco-languageclient';
import { createTauriMessageConnection } from './tauri-transport'; // lo de la sección anterior [web:23]

async function startLanguageClient(editor: monaco.editor.IStandaloneCodeEditor) {
  const client = new MonacoLanguageClient({
    name: 'TS/JS Language Client',
    clientOptions: {
      // Qué documentos maneja este cliente
      documentSelector: ['typescript', 'javascript'], // [web:18]
      errorHandler: {
        error: () => ErrorAction.Continue,
        closed: () => CloseAction.Restart,
      },
    },
    connectionProvider: {
      get: async (encoding) => createTauriMessageConnection(encoding), // [web:23]
    },
  });

  client.start(); // inicia handshake LSP (initialize, initialized, etc.) [web:15][web:19]
}
```

Este patrón coincide con los ejemplos oficiales de `monaco-languageclient`, solo cambiando el proveedor de conexión.[^4][^3][^1]
2. Llama a `startLanguageClient(editor)` tras crear Monaco y antes de que el usuario empiece a escribir.[^3][^4]

***

### 9. Configurar correctamente `typescript-language-server`

El servidor TS/JS necesita conocer el workspace y `tsconfig.json` para funcionar bien.[^2][^9]

- Por defecto, `typescript-language-server` detecta el workspace a partir de la `rootUri` enviada en el mensaje `initialize`, que `monaco-languageclient` construye usando la configuración del cliente y la URI del documento.[^2][^4]
- Si quieres forzar una carpeta raíz específica, puedes ajustar en el backend la forma en que se lanza el servidor (por ejemplo, mediante `cwd` en el `Command` de Rust apuntando a la carpeta del proyecto actual).[^9][^2]
- Asegúrate de tener un `tsconfig.json` razonable en el workspace para que los diagnósticos y el autocompletado sean precisos.[^9][^2]

***

### 10. Comandos pnpm y flujo de desarrollo

- Desarrollo:[^5]

```bash
pnpm tauri dev
```

Esto arranca el frontend Vite y el backend Tauri, de modo que podrás probar el editor con el LSP integrado.[^5]
- Build:[^5]

```bash
pnpm tauri build
```

Al empaquetar, asegúrate de que el binario de `typescript-language-server` y `tsserver` están disponibles para el ejecutable final (globalmente o empaquetados junto a la app según tu estrategia).[^2][^9]

***

### 11. Resumen de la integración

Esta guía monta un stack moderno: Monaco + `monaco-languageclient` en el WebView de Tauri, conectados por un transporte LSP sobre IPC a un `typescript-language-server --stdio` lanzado como proceso hijo.  Siguiendo el patrón de `MessageTransports` personalizado sugerido por los maintainers para Tauri, evitas tener que abrir puertos o correr un servidor Node separado, manteniendo todo dentro del sandbox de Tauri 2 y reutilizando la infraestructura madura del ecosistema VS Code.[^7][^4][^1][^3][^8][^2]
<span style="display:none">[^14][^15][^16][^17][^18][^19][^20][^21][^22][^23]</span>

<div align="center">⁂</div>

[^1]: https://github.com/TypeFox/monaco-languageclient/discussions/585

[^2]: https://www.npmjs.com/package/typescript-language-server

[^3]: https://www.typefox.io/blog/monaco-languageclient-v10/

[^4]: https://github.com/TypeFox/monaco-languageclient

[^5]: https://openwebinars.net/blog/tutorial-tauri-desarrollo-aplicacion-escritorio/

[^6]: https://www.npmjs.com/package/monaco-languageclient

[^7]: https://github.com/TypeFox/monaco-languageclient/discussions/583

[^8]: https://github.com/TypeFox/monaco-languageclient/discussions/570

[^9]: https://github.com/prabirshrestha/typescript-language-server

[^10]: https://v2.tauri.app/es/develop/debug/vscode/

[^11]: https://classic.yarnpkg.com/en/package/vscode-ws-jsonrpc

[^12]: https://www.npmjs.com/package/vscode-ws-jsonrpc/v/2.0.1

[^13]: https://github.com/TypeFox/monaco-languageclient/discussions/400

[^14]: https://codesandbox.io/examples/package/monaco-languageclient

[^15]: https://www.clouddefense.ai/code/javascript/example/monaco-languageclient

[^16]: https://gitee.com/chitti/monaco-languageclient?skip_mobile=true

[^17]: https://libraries.io/npm/monaco-languageclient-examples

[^18]: https://software-engineering-corner.hashnode.dev/develop-a-web-editor-for-your-dsl-using-react-and-monaco-editor-library-with-language-server-support

[^19]: https://www.rj-texted.se/Forum/viewtopic.php?t=5006

[^20]: https://www.reddit.com/r/kde/comments/yk8mvc/having_problems_with_typescriptlanguageserver_for/

[^21]: https://www.reddit.com/r/AskProgramming/comments/p6b005/type_error_in_monacolanguageclient/

[^22]: https://www.zeusedit.com/lsp/typescript.html

[^23]: https://codesandbox.io/examples/package/vscode-ws-jsonrpc

