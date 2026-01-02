# DeepWiki Q&A with Code Context for Repository: cline/cline
## Q1
Como funciona el cache de los modelos, por que esta extension lo que hace es mandar bastante informacion en cache
### Answer
# Cómo funciona el caché de los modelos en Cline

Cline utiliza una característica llamada **Prompt Caching** (caché de prompts) proporcionada por Anthropic y otros proveedores de API para optimizar costos y rendimiento. Esta extensión efectivamente envía mucha información en caché por diseño.

## Qué información se envía en caché

La extensión cachea principalmente dos tipos de contenido:

1. **El System Prompt (prompt del sistema)**: Contiene todas las instrucciones, herramientas disponibles, reglas de comportamiento, información del sistema, y contexto de la tarea. Este prompt es extenso y se marca con `cache_control: { type: "ephemeral" }` para ser cacheado. cline:72-78 

2. **Los últimos dos mensajes de usuario**: La extensión marca específicamente los últimos dos mensajes de usuario como efímeros para el caché. Esto permite que el servidor reutilice el contexto de la conversación anterior. cline:14-43 

## Cómo funciona el mecanismo de caché

El sistema funciona de la siguiente manera:

- El último mensaje de usuario se cachea para la **próxima solicitud**
- El segundo al último mensaje de usuario se marca como efímero para que el servidor sepa qué recuperar del caché para la **solicitud actual**
- El contenido cacheado se almacena en los servidores de Anthropic y se reutiliza en solicitudes subsecuentes dentro de un período de tiempo limitado cline:18-31 

## Soporte de caché por modelo

No todos los modelos soportan caché de prompts. La información de soporte se define en las configuraciones de cada modelo con la propiedad `supportsPromptCache`. Por ejemplo, los modelos Claude modernos tienen `supportsPromptCache: true`, mientras que modelos más antiguos o a través de Claude Code tienen esta característica desactivada. cline:319-331 

## Beneficios de costos

El caché de prompts reduce significativamente los costos porque:

- **Cache Reads (lecturas de caché)**: Cuestan solo una fracción del precio de los tokens de entrada normales (por ejemplo, $0.30 vs $3.00 por millón de tokens para Claude Sonnet)
- **Cache Writes (escrituras de caché)**: Cuestan un poco más que los tokens de entrada normales, pero ahorran en solicitudes futuras cline:326-331 

La extensión calcula estos costos por separado para dar al usuario una visión clara del ahorro logrado mediante el caché. cline:52-62 

## Notas

- El caché solo está disponible cuando se usa directamente la API de Anthropic o ciertos proveedores compatibles como AWS Bedrock (cuando está habilitado), LiteLLM, OpenRouter y Vertex AI
- El caché de prompts es especialmente beneficioso para Cline porque el system prompt es grande (contiene todas las definiciones de herramientas, instrucciones, contexto del proyecto, etc.) y permanece relativamente constante entre solicitudes
- El caché tiene una vida útil limitada (típicamente 5 minutos) después de la cual expira y debe recrearse
### Citations
**File:** src/core/api/providers/anthropic.ts (L72-78)
```typescript
					system: [
						{
							text: systemPrompt,
							type: "text",
							cache_control: { type: "ephemeral" },
						},
					], // setting cache breakpoint for system prompt so new tasks can reuse it
```
**File:** src/core/api/transform/anthropic-format.ts (L14-43)
```typescript
export function sanitizeAnthropicMessages(
	clineMessages: Array<ClineStorageMessage | Anthropic.MessageParam>,
	supportCache: boolean,
): Array<Anthropic.MessageParam> {
	// The latest message will be the new user message, one before will be the assistant message from a previous request,
	// and the user message before that will be a previously cached user message. So we need to mark the latest user message
	// as ephemeral to cache it for the next request, and mark the second to last user message as ephemeral to let the server
	// know the last message to retrieve from the cache for the current request.
	const userMsgIndices = clineMessages.reduce((acc, msg, index) => {
		if (msg.role === "user") {
			acc.push(index)
		}
		return acc
	}, [] as number[])
	// Set to -1 if there are no user messages so the indices are invalid
	const indicesLength = userMsgIndices.length ?? -1
	const lastUserMsgIndex = userMsgIndices[indicesLength - 1]
	const secondLastMsgUserIndex = userMsgIndices[indicesLength - 2]

	return clineMessages.map((msg, index) => {
		const anthropicMsg = convertClineStorageToAnthropicMessage(msg)

		// Add cache control to the last two user messages
		if (supportCache && (index === lastUserMsgIndex || index === secondLastMsgUserIndex)) {
			return addCacheControl(anthropicMsg)
		}

		return anthropicMsg
	})
}
```
**File:** src/shared/api.ts (L319-331)
```typescript
export const anthropicModels = {
	"claude-sonnet-4-5-20250929": {
		maxTokens: 8192,
		contextWindow: 200_000,
		supportsImages: true,
		supportsPromptCache: true,
		supportsReasoning: true,
		inputPrice: 3.0,
		outputPrice: 15.0,
		cacheWritesPrice: 3.75,
		cacheReadsPrice: 0.3,
	},
	"claude-sonnet-4-5-20250929:1m": {
```
**File:** src/utils/cost.ts (L52-62)
```typescript
	const cacheWritesCost = (effectiveCacheWritesPrice / 1_000_000) * cacheCreationInputTokens
	const cacheReadsCost = (effectiveCacheReadsPrice / 1_000_000) * cacheReadInputTokens

	// Use effectiveInputPrice for baseInputCost. Note: 'inputTokens' here is the potentially adjusted count (e.g., non-cached for OpenAI)
	const baseInputCost = (effectiveInputPrice / 1_000_000) * inputTokens

	// Use effectiveOutputPrice for outputCost
	const outputCost = (effectiveOutputPrice / 1_000_000) * outputTokens

	const totalCost = cacheWritesCost + cacheReadsCost + baseInputCost + outputCost
	return totalCost
```
## Q2
y el mismo gemini se puede habilitar el cache?
### Answer
# Soporte de Prompt Caching para Gemini en Cline

## Caché Implícito Automático

Gemini utiliza un sistema de **"caché implícito"** (implicit caching) que funciona de manera diferente a otros proveedores como Anthropic. No requiere la creación explícita de cachés - el caching ocurre automáticamente por parte de la API de Gemini. cline:33-52 

El sistema está diseñado con las siguientes características:
- **Un caché por tarea**: Crea un único caché por tarea y lo reutiliza en turnos subsecuentes
- **Claves de caché estables**: Usa el ulid como identificador estable para los cachés
- **Actualizaciones eficientes**: Solo actualiza cachés cuando hay nuevo contenido que agregar
- **Contabilidad de costos dividida**: Separa costos inmediatos de costos continuos de almacenamiento en caché cline:97-105 

## Modelos con Prompt Caching Habilitado

**Sí, el prompt caching está habilitado para varios modelos de Gemini**. Los siguientes modelos tienen `supportsPromptCache: true`:

### Modelos de Gemini 3:
- `gemini-3-pro-preview` - con precios de cache reads
- `gemini-3-flash-preview` - con cache writes y reads cline:1311-1368 

### Modelos de Gemini 2.5:
- `gemini-2.5-pro` - con precios de cache reads
- `gemini-2.5-flash` - sin precios de cache especificados
- `gemini-2.5-flash-lite-preview-06-17` - con precios de cache reads cline:1369-1421 

### Modelos de Gemini 2.0 y 1.5:
- `gemini-2.0-flash-001` - con cache writes y reads
- `gemini-1.5-flash-002` - con cache writes y reads (con precios por niveles) cline:1422-1495 

### Modelos SIN Prompt Caching:
Algunos modelos experimentales no tienen caching habilitado:
- `gemini-2.0-flash-thinking-exp-*`
- `gemini-2.0-flash-exp`
- `gemini-1.5-pro-*`
- `gemini-exp-1206` cline:1448-1535 

## Funcionamiento Técnico

Durante la generación de contenido, el sistema detecta automáticamente los tokens en caché:

1. **Detección de cache hits**: El sistema lee `cachedContentTokenCount` de los metadatos de uso de la respuesta
2. **Contabilidad de tokens**: Los tokens en caché se separan de los tokens de entrada regulares
3. **Cálculo de costos**: Se calculan costos inmediatos incluyendo:
   - Costos de tokens de entrada (tokens no cacheados)
   - Costos de tokens de salida
   - Costos de lectura de caché cline:236-264 

## Cálculo de Costos

El método `calculateCost` maneja la contabilidad de costos de caché:

- Resta los tokens cacheados del total de tokens de entrada
- Calcula costos solo para tokens de entrada no cacheados
- Añade costos de lectura de caché cuando hay cache hits
- Gemini **no tiene costos de escritura de caché** en el modelo de caché implícito cline:350-413 

## Disponibilidad en Vertex AI

Los mismos modelos de Gemini también están disponibles a través de Google Vertex AI con soporte de prompt caching, incluyendo modelos como `gemini-3-pro-preview` y `gemini-3-flash-preview`. cline:912-942 

## Historial de Implementación

El soporte para caché implícito de Gemini fue añadido en la versión 3.15.0 y mejorado en la versión 3.15.2 de Cline. cline:941-974 

## Notas

- El caching de Gemini es **automático** - no requiere configuración manual o creación explícita de cachés
- El sistema de caching único de Gemini cobra por mantener tokens en caché por hora
- La implementación en Cline optimiza tanto rendimiento como costos al minimizar creaciones redundantes de caché
- El caché es especialmente efectivo para conversaciones largas donde el contexto del sistema se reutiliza múltiples veces
### Citations
**File:** src/core/api/providers/gemini.ts (L33-52)
```typescript
/**
 * Handler for Google's Gemini API with optimized caching strategy and accurate cost accounting.
 *
 * Key features:
 * - One cache per task: Creates a single cache per task and reuses it for subsequent turns
 * - Stable cache keys: Uses ulid as a stable identifier for caches
 * - Efficient cache updates: Only updates caches when there's new content to add
 * - Split cost accounting: Separates immediate costs from ongoing cache storage costs
 *
 * Cost accounting approach:
 * - Immediate costs (per message): Input tokens, output tokens, and cache read costs
 * - Ongoing costs (per task): Cache storage costs for the TTL period
 *
 * Gemini's caching system is unique in that it charges for holding tokens in cache by the hour.
 * This implementation optimizes for both performance and cost by:
 * 1. Minimizing redundant cache creations
 * 2. Properly accounting for cache costs in the billing calculations
 * 3. Using a stable cache key to ensure cache reuse across turns
 * 4. Separating immediate costs from ongoing costs to avoid double-counting
 */
```
**File:** src/core/api/providers/gemini.ts (L97-105)
```typescript
	 * Creates a message using the Gemini API with implicit caching.
	 *
	 * Cost accounting:
	 * - Immediate costs (returned in the usage object): Input tokens, output tokens, cache read costs
	 *
	 * @param systemPrompt The system prompt to use for the message
	 * @param messages The conversation history to include in the message
	 * @returns An async generator that yields chunks of the response with accurate immediate costs
	 */
```
**File:** src/core/api/providers/gemini.ts (L236-264)
```typescript
				if (chunk.usageMetadata) {
					responseId = chunk.responseId
					lastUsageMetadata = chunk.usageMetadata
					promptTokens = lastUsageMetadata.promptTokenCount ?? promptTokens
					outputTokens = lastUsageMetadata.candidatesTokenCount ?? outputTokens
					thoughtsTokenCount = lastUsageMetadata.thoughtsTokenCount ?? thoughtsTokenCount
					cacheReadTokens = lastUsageMetadata.cachedContentTokenCount ?? cacheReadTokens
				}
			}
			apiSuccess = true

			if (lastUsageMetadata) {
				const totalCost = this.calculateCost({
					info,
					inputTokens: promptTokens,
					outputTokens,
					thoughtsTokenCount,
					cacheReadTokens,
				})
				yield {
					type: "usage",
					inputTokens: promptTokens - cacheReadTokens,
					outputTokens,
					thoughtsTokenCount,
					cacheReadTokens,
					cacheWriteTokens: 0,
					totalCost,
					id: responseId,
				}
```
**File:** src/core/api/providers/gemini.ts (L350-413)
```typescript
	public calculateCost({
		info,
		inputTokens,
		outputTokens,
		thoughtsTokenCount = 0,
		cacheReadTokens = 0,
	}: {
		info: ModelInfo
		inputTokens: number
		outputTokens: number
		thoughtsTokenCount: number
		cacheReadTokens?: number
	}) {
		// Exit early if any required pricing information is missing
		if (!info.inputPrice || !info.outputPrice) {
			return undefined
		}

		let inputPrice = info.inputPrice
		let outputPrice = info.outputPrice
		// Right now, we only show the immediate costs of caching and not the ongoing costs of storing the cache
		let cacheReadsPrice = info.cacheReadsPrice ?? 0

		// If there's tiered pricing then adjust prices based on the input tokens used
		if (info.tiers) {
			const tier = info.tiers.find((tier) => inputTokens <= tier.contextWindow)
			if (tier) {
				inputPrice = tier.inputPrice ?? inputPrice
				outputPrice = tier.outputPrice ?? outputPrice
				cacheReadsPrice = tier.cacheReadsPrice ?? cacheReadsPrice
			}
		}

		// Subtract the cached input tokens from the total input tokens
		const uncachedInputTokens = inputTokens - (cacheReadTokens ?? 0)

		// Calculate immediate costs only

		// 1. Input token costs (for uncached tokens)
		const inputTokensCost = inputPrice * (uncachedInputTokens / 1_000_000)

		// 2. Output token costs
		const responseTokensCost = outputPrice * ((outputTokens + thoughtsTokenCount) / 1_000_000)

		// 3. Cache read costs (immediate)
		const cacheReadCost = (cacheReadTokens ?? 0) > 0 ? cacheReadsPrice * ((cacheReadTokens ?? 0) / 1_000_000) : 0

		// Calculate total immediate cost (excluding cache write/storage costs)
		const totalCost = inputTokensCost + responseTokensCost + cacheReadCost

		// Create the trace object for debugging
		const trace: Record<string, { price: number; tokens: number; cost: number }> = {
			input: { price: inputPrice, tokens: uncachedInputTokens, cost: inputTokensCost },
			output: { price: outputPrice, tokens: outputTokens, cost: responseTokensCost },
		}

		// Only include cache read costs in the trace (cache write costs are tracked separately)
		if ((cacheReadTokens ?? 0) > 0) {
			trace.cacheRead = { price: cacheReadsPrice, tokens: cacheReadTokens ?? 0, cost: cacheReadCost }
		}

		// console.log(`[GeminiHandler] calculateCost -> ${totalCost}`, trace)
		return totalCost
	}
```
**File:** src/shared/api.ts (L912-942)
```typescript
	"gemini-3-pro-preview": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		supportsGlobalEndpoint: true,
		inputPrice: 2.0,
		outputPrice: 12.0,
		temperature: 1.0,
		supportsReasoning: true,
		thinkingConfig: {
			geminiThinkingLevel: "high",
			supportsThinkingLevel: true,
		},
	},
	"gemini-3-flash-preview": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		supportsGlobalEndpoint: true,
		inputPrice: 0.5,
		outputPrice: 3.0,
		cacheWritesPrice: 0.05,
		temperature: 1.0,
		supportsReasoning: true,
		thinkingConfig: {
			geminiThinkingLevel: "high",
			supportsThinkingLevel: true,
		},
	},
```
**File:** src/shared/api.ts (L1311-1368)
```typescript
	"gemini-3-pro-preview": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 4.0,
		outputPrice: 18.0,
		cacheReadsPrice: 0.4,
		thinkingConfig: {
			// If you don't specify a thinking level, Gemini will use the model's default
			// dynamic thinking level, "high", for Gemini 3 Pro Preview.
			geminiThinkingLevel: "high",
			supportsThinkingLevel: true,
		},
		tiers: [
			{
				contextWindow: 200000,
				inputPrice: 2.0,
				outputPrice: 12.0,
				cacheReadsPrice: 0.2,
			},
			{
				contextWindow: Infinity,
				inputPrice: 4.0,
				outputPrice: 18.0,
				cacheReadsPrice: 0.4,
			},
		],
	},
	"gemini-3-flash-preview": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		supportsGlobalEndpoint: true,
		inputPrice: 0.5,
		outputPrice: 3.0,
		cacheWritesPrice: 0.05,
		supportsReasoning: true,
		thinkingConfig: {
			geminiThinkingLevel: "low",
			supportsThinkingLevel: true,
		},
		tiers: [
			{
				contextWindow: 200000,
				inputPrice: 0.3,
				outputPrice: 2.5,
				cacheReadsPrice: 0.03,
			},
			{
				contextWindow: Infinity,
				inputPrice: 0.3,
				outputPrice: 2.5,
				cacheReadsPrice: 0.03,
			},
		],
	},
```
**File:** src/shared/api.ts (L1369-1421)
```typescript
	"gemini-2.5-pro": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 2.5,
		outputPrice: 15,
		cacheReadsPrice: 0.625,
		thinkingConfig: {
			maxBudget: 32767,
		},
		tiers: [
			{
				contextWindow: 200000,
				inputPrice: 1.25,
				outputPrice: 10,
				cacheReadsPrice: 0.31,
			},
			{
				contextWindow: Infinity,
				inputPrice: 2.5,
				outputPrice: 15,
				cacheReadsPrice: 0.625,
			},
		],
	},
	"gemini-2.5-flash-lite-preview-06-17": {
		maxTokens: 64000,
		contextWindow: 1_000_000,
		supportsImages: true,
		supportsPromptCache: true,
		supportsGlobalEndpoint: true,
		inputPrice: 0.1,
		outputPrice: 0.4,
		cacheReadsPrice: 0.025,
		description: "Preview version - may not be available in all regions",
		thinkingConfig: {
			maxBudget: 24576,
		},
	},
	"gemini-2.5-flash": {
		maxTokens: 65536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.3,
		outputPrice: 2.5,
		cacheReadsPrice: 0.075,
		thinkingConfig: {
			maxBudget: 24576,
			outputPrice: 3.5,
		},
	},
```
**File:** src/shared/api.ts (L1422-1535)
```typescript
	"gemini-2.0-flash-001": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.1,
		outputPrice: 0.4,
		cacheReadsPrice: 0.025,
		cacheWritesPrice: 1.0,
	},
	"gemini-2.0-flash-lite-preview-02-05": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-2.0-pro-exp-02-05": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-2.0-flash-thinking-exp-01-21": {
		maxTokens: 65_536,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-2.0-flash-thinking-exp-1219": {
		maxTokens: 8192,
		contextWindow: 32_767,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-2.0-flash-exp": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-1.5-flash-002": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: true,
		inputPrice: 0.15, // Default price (highest tier)
		outputPrice: 0.6, // Default price (highest tier)
		cacheReadsPrice: 0.0375,
		cacheWritesPrice: 1.0,
		tiers: [
			{
				contextWindow: 128000,
				inputPrice: 0.075,
				outputPrice: 0.3,
				cacheReadsPrice: 0.01875,
			},
			{
				contextWindow: Infinity,
				inputPrice: 0.15,
				outputPrice: 0.6,
				cacheReadsPrice: 0.0375,
			},
		],
	},
	"gemini-1.5-flash-exp-0827": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-1.5-flash-8b-exp-0827": {
		maxTokens: 8192,
		contextWindow: 1_048_576,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-1.5-pro-002": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-1.5-pro-exp-0827": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
	"gemini-exp-1206": {
		maxTokens: 8192,
		contextWindow: 2_097_152,
		supportsImages: true,
		supportsPromptCache: false,
		inputPrice: 0,
		outputPrice: 0,
	},
```
**File:** CHANGELOG.md (L941-974)
```markdown
## [3.15.2]

- Added details to auto approve menu and more sensible default controls
- Add detailed configuration options for LiteLLM provider
- Add webview telemetry for users who have opted in to telemetry
- Update Gemini in OpenRouter/Cline providers to use implicit caching
- Fix freezing issues during rendering of large streaming text
- Fix grey screen webview crashes by releasing memory after every diff edit
- Fix breaking out of diff auto-scroll
- Fix IME composition Enter auto‑sending edited message

## [3.15.1]

- Fix bug where PowerShell commands weren't given enough time before giving up and showing an error

## [3.15.0]

- Add Task Timeline visualization to tasks (Thanks eomcaleb!)
- Add cache to ui for OpenAi provider
- Add FeatureFlagProvider service for the Node.js extension side
- Add copy buttons to task header and assistant messages
- Add a more simplified home header was added
- Add ability to favorite a task, allowing it to be kept when clearing all tasks
- Add npm script for issue creation (Thanks DaveFres!)
- Add confirmation dialog to Delete All History button
- Add ability to allow the user to type their next message into the chat while Cline is taking action
- Add ability to generate commit message via cline (Thanks zapp88!)
- Add improvements to caching for gemini models on OpenRouter and Cline providers
- Add improvements to allow scrolling the file being edited.
- Add ui for windsurf and cursor rules
- Add mistral medium-3 model
- Add option to collect events to send them in a bundle to avoid sending too many events
- Add support to quote a previous message in chat
- Add support for Gemini Implicit Caching
```

------

# GEMINI CODE

<br />

PythonJavaScriptGoREST

In a typical AI workflow, you might pass the same input tokens over and over to a model. The Gemini API offers two different caching mechanisms:

- Implicit caching (automatically enabled on most Gemini models, no cost saving guarantee)
- Explicit caching (can be manually enabled on most models, cost saving guarantee)

Explicit caching is useful in cases where you want to guarantee cost savings, but with some added developer work.

## Implicit caching

Implicit caching is enabled by default and available for most Gemini models. We automatically pass on cost savings if your request hits caches. There is nothing you need to do in order to enable this. It is effective as of May 8th, 2025. The minimum input token count for context caching is listed in the following table for each model:

|         Model          | Min token limit |
|------------------------|-----------------|
| Gemini 3 Flash Preview | 1024            |
| Gemini 3 Pro Preview   | 4096            |
| Gemini 2.5 Flash       | 1024            |
| Gemini 2.5 Pro         | 4096            |

To increase the chance of an implicit cache hit:

- Try putting large and common contents at the beginning of your prompt
- Try to send requests with similar prefix in a short amount of time

You can see the number of tokens which were cache hits in the response object's`usage_metadata`field.

## Explicit caching

Using the Gemini API explicit caching feature, you can pass some content to the model once, cache the input tokens, and then refer to the cached tokens for subsequent requests. At certain volumes, using cached tokens is lower cost than passing in the same corpus of tokens repeatedly.

When you cache a set of tokens, you can choose how long you want the cache to exist before the tokens are automatically deleted. This caching duration is called the*time to live*(TTL). If not set, the TTL defaults to 1 hour. The cost for caching depends on the input token size and how long you want the tokens to persist.

This section assumes that you've installed a Gemini SDK (or have curl installed) and that you've configured an API key, as shown in the[quickstart](https://ai.google.dev/gemini-api/docs/quickstart).

### Generate content using a cache

The following example shows how to generate content using a cached system instruction and video file.  

### Videos

    import os
    import pathlib
    import requests
    import time

    from google import genai
    from google.genai import types

    client = genai.Client()

    # Download video file
    url = 'https://storage.googleapis.com/generativeai-downloads/data/SherlockJr._10min.mp4'
    path_to_video_file = pathlib.Path('SherlockJr._10min.mp4')
    if not path_to_video_file.exists():
      with path_to_video_file.open('wb') as wf:
        response = requests.get(url, stream=True)
        for chunk in response.iter_content(chunk_size=32768):
          wf.write(chunk)

    # Upload the video using the Files API
    video_file = client.files.upload(file=path_to_video_file)

    # Wait for the file to finish processing
    while video_file.state.name == 'PROCESSING':
      print('Waiting for video to be processed.')
      time.sleep(2)
      video_file = client.files.get(name=video_file.name)

    print(f'Video processing complete: {video_file.uri}')

    # You must use an explicit version suffix: "-flash-001", not just "-flash".
    model='models/gemini-2.0-flash-001'

    # Create a cache with a 5 minute TTL
    cache = client.caches.create(
        model=model,
        config=types.CreateCachedContentConfig(
          display_name='sherlock jr movie', # used to identify the cache
          system_instruction=(
              'You are an expert video analyzer, and your job is to answer '
              'the user\'s query based on the video file you have access to.'
          ),
          contents=[video_file],
          ttl="300s",
      )
    )

    # Construct a GenerativeModel which uses the created cache.
    response = client.models.generate_content(
      model = model,
      contents= (
        'Introduce different characters in the movie by describing '
        'their personality, looks, and names. Also list the timestamps '
        'they were introduced for the first time.'),
      config=types.GenerateContentConfig(cached_content=cache.name)
    )

    print(response.usage_metadata)

    # The output should look something like this:
    #
    # prompt_token_count: 696219
    # cached_content_token_count: 696190
    # candidates_token_count: 214
    # total_token_count: 696433

    print(response.text)

### PDFs

    from google import genai
    from google.genai import types
    import io
    import httpx

    client = genai.Client()

    long_context_pdf_path = "https://www.nasa.gov/wp-content/uploads/static/history/alsj/a17/A17_FlightPlan.pdf"

    # Retrieve and upload the PDF using the File API
    doc_io = io.BytesIO(httpx.get(long_context_pdf_path).content)

    document = client.files.upload(
      file=doc_io,
      config=dict(mime_type='application/pdf')
    )

    model_name = "gemini-2.0-flash-001"
    system_instruction = "You are an expert analyzing transcripts."

    # Create a cached content object
    cache = client.caches.create(
        model=model_name,
        config=types.CreateCachedContentConfig(
          system_instruction=system_instruction,
          contents=[document],
        )
    )

    # Display the cache details
    print(f'{cache=}')

    # Generate content using the cached prompt and document
    response = client.models.generate_content(
      model=model_name,
      contents="Please summarize this transcript",
      config=types.GenerateContentConfig(
        cached_content=cache.name
      ))

    # (Optional) Print usage metadata for insights into the API call
    print(f'{response.usage_metadata=}')

    # Print the generated text
    print('\n\n', response.text)

### List caches

It's not possible to retrieve or view cached content, but you can retrieve cache metadata (`name`,`model`,`display_name`,`usage_metadata`,`create_time`,`update_time`, and`expire_time`).

To list metadata for all uploaded caches, use`CachedContent.list()`:  

    for cache in client.caches.list():
      print(cache)

To fetch the metadata for one cache object, if you know its name, use`get`:  

    client.caches.get(name=name)

### Update a cache

You can set a new`ttl`or`expire_time`for a cache. Changing anything else about the cache isn't supported.

The following example shows how to update the`ttl`of a cache using`client.caches.update()`.  

    from google import genai
    from google.genai import types

    client.caches.update(
      name = cache.name,
      config  = types.UpdateCachedContentConfig(
          ttl='300s'
      )
    )

To set the expiry time, it will accepts either a`datetime`object or an ISO-formatted datetime string (`dt.isoformat()`, like`2025-01-27T16:02:36.473528+00:00`). Your time must include a time zone (`datetime.utcnow()`doesn't attach a time zone,`datetime.now(datetime.timezone.utc)`does attach a time zone).  

    from google import genai
    from google.genai import types
    import datetime

    # You must use a time zone-aware time.
    in10min = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=10)

    client.caches.update(
      name = cache.name,
      config  = types.UpdateCachedContentConfig(
          expire_time=in10min
      )
    )

### Delete a cache

The caching service provides a delete operation for manually removing content from the cache. The following example shows how to delete a cache:  

    client.caches.delete(cache.name)

### Explicit caching using the OpenAI library

If you're using an[OpenAI library](https://ai.google.dev/gemini-api/docs/openai), you can enable explicit caching using the`cached_content`property on[`extra_body`](https://ai.google.dev/gemini-api/docs/openai#extra-body).

## When to use explicit caching

Context caching is particularly well suited to scenarios where a substantial initial context is referenced repeatedly by shorter requests. Consider using context caching for use cases such as:

- Chatbots with extensive[system instructions](https://ai.google.dev/gemini-api/docs/system-instructions)
- Repetitive analysis of lengthy video files
- Recurring queries against large document sets
- Frequent code repository analysis or bug fixing

### How explicit caching reduces costs

Context caching is a paid feature designed to reduce overall operational costs. Billing is based on the following factors:

1. **Cache token count:**The number of input tokens cached, billed at a reduced rate when included in subsequent prompts.
2. **Storage duration:**The amount of time cached tokens are stored (TTL), billed based on the TTL duration of cached token count. There are no minimum or maximum bounds on the TTL.
3. **Other factors:**Other charges apply, such as for non-cached input tokens and output tokens.

For up-to-date pricing details, refer to the Gemini API[pricing page](https://ai.google.dev/pricing). To learn how to count tokens, see the[Token guide](https://ai.google.dev/gemini-api/docs/tokens).

### Additional considerations

Keep the following considerations in mind when using context caching:

- The*minimum* input token count for context caching varies by model. The*maximum* is the same as the maximum for the given model. (For more on counting tokens, see the[Token guide](https://ai.google.dev/gemini-api/docs/tokens)).
- The model doesn't make any distinction between cached tokens and regular input tokens. Cached content is a prefix to the prompt.
- There are no special rate or usage limits on context caching; the standard rate limits for`GenerateContent`apply, and token limits include cached tokens.
- The number of cached tokens is returned in the`usage_metadata`from the create, get, and list operations of the cache service, and also in`GenerateContent`when using the cache.