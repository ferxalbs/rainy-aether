# Implementación de Modelos de Pensamiento (Thinking Models)

## 📋 Resumen

Se ha implementado soporte completo para los modelos de pensamiento de Gemini, incluyendo:

1. **Configuración de Thinking** en el proveedor de Gemini
2. **Categorización de modelos** por tipo y capacidades
3. **Selector mejorado** con iconos y badges visuales

---

## 🎯 Características Implementadas

### 1. Soporte para ThinkingConfig en GeminiProvider

**Archivo:** `src/services/agent/providers/gemini.ts`

- Se agregó la interfaz `GeminiThinkingConfig` que soporta:
  - `thinkingBudget`: Para modelos Gemini 2.5 (-1 = auto, 0 = disabled)
  - `thinkingLevel`: Para Gemini 3 Pro ('LOW' | 'HIGH')

- El constructor de `GeminiProvider` ahora acepta un parámetro `thinkingConfig` opcional
- Tanto `sendMessage` como `streamMessage` incluyen la configuración de thinking en las peticiones a la API

### 2. ModelConfig Expandido

**Archivo:** `src/services/agent/providers/index.ts`

Se expandió la interfaz `ModelConfig` con:

```typescript
{
  supportsThinking?: boolean;     // Si el modelo soporta thinking
  thinkingMode?: ThinkingMode;    // 'none' | 'auto' | 'low' | 'high'
  thinkingConfig?: GeminiThinkingConfig;  // Configuración específica
  category?: 'standard' | 'thinking';     // Categoría visual
}
```

### 3. Modelos Disponibles

#### Gemini Standard (Sin Thinking)
- **Gemini 2.5 Flash Lite** - Rápido y eficiente
- **Gemini 2.5 Flash** - Último modelo con mejor rendimiento
- **Gemini 3 Pro** - Modelo más poderoso

#### Gemini Thinking Models
- **Gemini 2.5 Flash (Thinking Auto)** - Budget automático (`thinkingBudget: -1`)
- **Gemini 3 Pro (Thinking Low)** - Razonamiento de baja profundidad (`thinkingLevel: 'LOW'`)
- **Gemini 3 Pro (Thinking High)** - Razonamiento de alta profundidad (`thinkingLevel: 'HIGH'`)

### 4. Selector de Modelos Mejorado

**Archivo:** `src/components/agents/ModelSelector.tsx`

Características:
- ✅ **Categorización visual** por proveedor y tipo
- ✅ **Iconos distintivos**:
  - 🧠 Brain (púrpura) para modelos de pensamiento
  - ⚡ Zap (azul) para modelos Gemini estándar
  - ⚡ Zap (verde) para modelos Groq
  - ⚡ Zap (naranja) para modelos Cerebras

- ✅ **Badges de nivel de pensamiento**:
  - `Auto` - Púrpura
  - `Low` - Azul
  - `High` - Rosa

- ✅ **Grupos separados**:
  - Gemini - Standard
  - Gemini - Thinking Models (con icono de cerebro)
  - Groq
  - Cerebras

---

## 🔧 Configuración Técnica

### ThinkingConfig por Modelo

```typescript
// Gemini 2.5 - Sin thinking
{ thinkingBudget: 0 }

// Gemini 2.5 - Thinking automático
{ thinkingBudget: -1 }

// Gemini 3 Pro - Thinking Low
{ thinkingLevel: 'LOW' }

// Gemini 3 Pro - Thinking High
{ thinkingLevel: 'HIGH' }
```

### Cómo funciona

1. El usuario selecciona un modelo en el selector
2. El `ModelConfig` incluye el `thinkingConfig` correspondiente
3. `createProvider()` pasa el `thinkingConfig` al constructor de `GeminiProvider`
4. En cada llamada a la API, se incluye el `thinkingConfig` en la configuración:

```typescript
config.config.thinkingConfig = {
  thinkingBudget?: number,
  thinkingLevel?: 'LOW' | 'HIGH'
}
```

---

## 🎨 UI/UX

### Selector Visual

```
┌─────────────────────────────────┐
│ Gemini - Standard               │
│   ⚡ Gemini 2.5 Flash Lite      │
│   ⚡ Gemini 2.5 Flash            │
│   ⚡ Gemini 3 Pro                │
├─────────────────────────────────┤
│ 🧠 Gemini - Thinking Models     │
│   🧠 Gemini 2.5 Flash [Auto]    │
│   🧠 Gemini 3 Pro [Low]         │
│   🧠 Gemini 3 Pro [High]        │
├─────────────────────────────────┤
│ Groq                            │
│   ⚡ Llama 3.3 70B              │
│   ⚡ Kimi K2 Instruct           │
└─────────────────────────────────┘
```

### Códigos de Color

- **Púrpura** (`purple-500`): Modelos de pensamiento y badge "Auto"
- **Azul** (`blue-500`): Modelos Gemini estándar y badge "Low"
- **Rosa** (`pink-500`): Badge "High"
- **Verde** (`green-500`): Modelos Groq
- **Naranja** (`orange-500`): Modelos Cerebras

---

## 📝 Ejemplo de Uso

### En el código

```typescript
import { AVAILABLE_MODELS, createProvider } from '@/services/agent/providers';

// Obtener configuración del modelo
const modelConfig = AVAILABLE_MODELS.find(m => m.id === 'gemini-3-pro-thinking-high');

// Crear provider con thinking config
const provider = createProvider(
  'gemini-3-pro-thinking-high',
  { geminiApiKey: 'xxx' },
  0.7,
  2048
);

// El provider automáticamente incluirá:
// { thinkingConfig: { thinkingLevel: 'HIGH' } }
```

### En la UI

El usuario simplemente selecciona el modelo deseado del dropdown, y la configuración de thinking se aplica automáticamente.

---

## 🚀 Próximos Pasos

### Expansión Futura

1. **Otros proveedores**: Añadir soporte para thinking en otros providers cuando esté disponible
2. **Medium Level**: Gemini podría agregar un nivel "MEDIUM" en el futuro
3. **Visualización de thinking**: Mostrar el proceso de pensamiento del modelo en la UI
4. **Métricas**: Tracking de tokens usados en thinking vs respuesta
5. **Configuración personalizada**: Permitir al usuario ajustar thinkingBudget manualmente

### Modelos Adicionales

Preparado para agregar:
- Modelos de otros proveedores (OpenAI, Anthropic, etc.)
- Más variantes de Gemini cuando estén disponibles
- Configuraciones experimentales

---

## 🔍 Referencia de Archivos Modificados

1. ✅ `src/services/agent/providers/gemini.ts` - Provider con thinking support
2. ✅ `src/services/agent/providers/index.ts` - ModelConfig expandido
3. ✅ `src/components/agents/ModelSelector.tsx` - Nuevo selector visual
4. ✅ `src/components/agents/AgentChatWindow.tsx` - Integración del selector
5. ✅ `GEMINI_THINKING.md` - Documentación de referencia

---

## ✨ Beneficios

### Para el Usuario
- 🎯 Selección clara entre modelos estándar y de pensamiento
- 👁️ Visualización inmediata del tipo de modelo (icono de cerebro)
- 🏷️ Badges que indican el nivel de pensamiento
- 📊 Organización clara por proveedor y categoría

### Para el Desarrollo
- 🔧 Sistema extensible para nuevos proveedores
- 🎨 Fácil agregar nuevos modelos y configuraciones
- 📦 Tipado estricto con TypeScript
- 🧪 Configuración centralizada en un solo lugar

---

## 📚 Referencias

- [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)
- [Gemini API Docs](https://ai.google.dev/docs)
- Archivo de referencia: `GEMINI_THINKING.md`

---

**Última actualización:** 2025-11-24
**Versión:** 1.0.0
**Estado:** ✅ Implementado y funcionando

---

*Implementado por Rainy Aether Development Team*
