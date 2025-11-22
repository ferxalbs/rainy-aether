Para que **Rainy Aether** brille en su lanzamiento del **Research Preview (21 de Noviembre)** y no sufra problemas de rendimiento vergonzosos, he preparado este listado de modificaciones quirúrgicas.

Nos enfocaremos en **`src-tauri/src/project_manager.rs`** y **`src-tauri/Cargo.toml`**, que es donde residen los cuellos de botella actuales.

Aquí tienes el plan de acción dividido por prioridades:

-----

### 🚀 FASE 1: "Quick Wins" para el 21 de Noviembre (Objetivo: 80/100)

Estas modificaciones son rápidas de implementar (1-2 horas) y evitarán que el IDE se congele con proyectos medianos.

#### 1\. Paralelizar la Búsqueda (Multithreading)

**Problema:** Actualmente, tu función `search_in_directory` en `project_manager.rs` busca archivo por archivo (secuencialmente). Si el proyecto tiene 5,000 archivos, tardará una eternidad y bloqueará el hilo.
**Solución:** Usar la crate **`rayon`** para convertir los iteradores en paralelos. Esto usará todos los núcleos del CPU del usuario.

* **Paso A:** Agrega esto a `src-tauri/Cargo.toml`:

    ```toml
    [dependencies]
    rayon = "1.11.0"
    ```

* **Paso B:** Modifica `src-tauri/src/project_manager.rs`:

    ```rust
    // Al inicio del archivo
    use rayon::prelude::*; // Importar Rayon

    // Dentro de fn search_in_directory
    // CAMBIAR: el bucle 'for entry in entries' POR:
    let entries: Vec<_> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .collect(); // Recolectamos primero para poder paralelizar

    // Usamos par_iter() en lugar de iter()
    entries.par_iter().for_each(|entry| {
        // ... mover aquí tu lógica de validación (should_ignore, is_binary, etc.) ...
        // Nota: Tendrás que usar un Mutex<Vec<FileSearchResult>> para guardar resultados de forma segura entre hilos
    });
    ```

#### 2\. Eliminar el Bloqueo de 5MB (Experiencia de Usuario)

**Problema:** En `get_file_content`, si el archivo pesa más de 5MB, devuelves un error. Esto se ve mal en un IDE "profesional".
**Solución:** Cargar los primeros 100KB (Head) para mostrar una vista previa y avisar al usuario.

* **Modifica `src-tauri/src/project_manager.rs` (`get_file_content`):**

    ```rust
    use std::io::Read; // Necesario para take()

    #[tauri::command]
    pub async fn get_file_content(path: String) -> Result<String, String> {
        let file_path = PathBuf::from(&path);
        let metadata = fs::metadata(&file_path).map_err(|e| e.to_string())?;

        // Si es muy grande, leemos solo el principio (ej. 100KB)
        if metadata.len() > 5 * 1024 * 1024 {
            let file = fs::File::open(&file_path).map_err(|e| e.to_string())?;
            let mut reader = std::io::BufReader::new(file);
            let mut buffer = String::new();
            
            // Intentamos leer hasta 100KB
            reader.take(100 * 1024).read_to_string(&mut buffer).map_err(|e| e.to_string())?;
            
            // Añadimos una marca visual para el usuario (o manéjalo en el frontend con un flag)
            buffer.push_str("\n\n[... CONTENIDO TRUNCADO POR TAMAÑO ...]"); 
            return Ok(buffer);
        }

        fs::read_to_string(&file_path).map_err(|e| e.to_string())
    }
    ```

#### 3\. Optimización de Lectura de Directorios (Lazy Loading)

**Problema:** Tu función `read_directory_shallow` ya hace un buen trabajo limitando la profundidad, pero `load_project_structure` carga 2 niveles por defecto.
**Sugerencia:** Para el 21 de Noviembre, cambia la profundidad inicial a **1 nivel** en `load_project_structure`. Esto hará que la apertura inicial del proyecto sea instantánea, y luego el usuario expandirá las carpetas según necesite.

-----

### 🏗️ FASE 2: Arquitectura Estable para Enero 2026 (Objetivo: 95/100)

Estas son modificaciones estructurales que requieren más tiempo, pero son obligatorias para competir con VS Code.

#### 1\. Integrar el Motor `ripgrep` (Búsqueda Nativa)

**Por qué:** Tu búsqueda actual usa `String::contains` o Regex en memoria. Esto carga el contenido del archivo a la RAM. Con repositorios grandes, **Rainy Aether consumirá gigas de RAM** solo buscando.
**Qué modificar:**

* Eliminar la lógica manual de búsqueda en `project_manager.rs`.
* Usar la crate **`grep`** (la librería base de ripgrep) o invocar el binario `rg` como sidecar.
* Esto permite buscar en el disco sin cargar los archivos completos a la RAM del editor.

#### 2\. Implementar `Ropey` (Edición de Texto)

**Por qué:** Actualmente manejas el contenido como `String`. Si editas un archivo de 1MB al principio, Rust tiene que reescribir todo el string en memoria.
**Qué modificar:**

* En el backend, no uses `String` para mantener el estado de los archivos abiertos.
* Usa la estructura de datos **Rope** (crate `ropey`). Esto divide el texto en fragmentos (chunks), haciendo que la edición sea instantánea sin importar el tamaño del archivo.

#### 3\. Virtual File System (VFS) para Agentes

**Por qué:** Los agentes (Abby, Rainy) necesitan leer el código. Si leen del disco, no verán lo que tú acabas de escribir y *aún no has guardado* (Ctrl+S).
**Qué modificar:**

* Crear un `StateManager` global en Rust que intercepte las lecturas.
* Si el archivo está abierto en el editor (memoria), el agente lee del **Rope** en memoria.
* Si el archivo está cerrado, lee del disco.

### 📝 Resumen del Checklist Técnico

1. **[HOY]** Editar `src-tauri/Cargo.toml`: Agregar `rayon = "1.8"`.
2. **[HOY]** Editar `src-tauri/src/project_manager.rs`: Implementar `par_iter()` en `search_in_directory`.
3. **[HOY]** Editar `src-tauri/src/project_manager.rs`: Implementar lectura parcial (`take`) en `get_file_content`.
4. **[ENERO]** Planificar migración a `ripgrep` y `ropey`.

¡Con los cambios de la Fase 1, tu Research Preview del día 21 volará\! 🚀
