# VS CODE HIGHLIGHT SYSTEM

El sistema de highlights que cambia de color (rojo para eliminaciones, verde para adiciones) funciona a través de un sistema de **decoraciones del editor** con múltiples capas:

## 1. Definición de Colores del Tema

Los colores predeterminados para cambios insertados y eliminados están definidos en el registro de colores del tema. Por ejemplo, el color para texto insertado (verde) y texto eliminado (rojo) están registrados como: [1](#0-0) 

Estos colores base se utilizan luego en diferentes contextos, como líneas completas y texto específico. [2](#0-1) 

## 2. Sistema de Decoraciones

El sistema funciona mediante **decoraciones del editor**, que son esencialmente elementos HTML con CSS aplicado dinámicamente. Hay dos componentes principales:

### Creación de Tipos de Decoración

Cuando se crea un tipo de decoración (por ejemplo, para resaltar cambios), el sistema genera automáticamente clases CSS únicas. La clase `DecorationCSSRules` es responsable de construir el CSS: [3](#0-2) 

### Generación de CSS

El sistema utiliza un mapa de propiedades CSS para convertir opciones de decoración en CSS real: [4](#0-3) 

La propiedad `backgroundColor` se traduce directamente a `background-color` en CSS. [5](#0-4) 

## 3. Resolución de Colores del Tema

Cuando se usa un `ThemeColor` (como `diffEditor.insertedTextBackground`), el sistema lo resuelve dinámicamente según el tema activo: [6](#0-5) 

## 4. Renderizado de Decoraciones

Las decoraciones se renderizan como elementos `<div>` con clases CSS específicas que contienen los estilos de color de fondo: [7](#0-6) 

## 5. API para Extensiones

Las extensiones pueden crear sus propias decoraciones usando la API pública: [8](#0-7) 

## Ejemplo: Merge Conflicts

Un ejemplo concreto de cómo se usa este sistema es la extensión de merge conflicts, que crea decoraciones para resaltar cambios actuales e incoming: [9](#0-8) 

## Notes

- El sistema es completamente dinámico: las reglas CSS se generan e inyectan en tiempo de ejecución
- Soporta temas claros, oscuros y de alto contraste automáticamente
- Los colores se pueden especificar como valores CSS directos (ej: `#ff0000`) o como referencias a colores del tema (ej: `diffEditor.removedTextBackground`)
- El sistema usa conteo de referencias para limpiar las reglas CSS cuando ya no se necesitan
- Las decoraciones pueden aplicarse a líneas completas (`isWholeLine: true`) o a rangos específicos de texto

### Citations

**File:** src/vs/platform/theme/common/colors/editorColors.ts (L267-276)
```typescript
export const defaultInsertColor = new Color(new RGBA(155, 185, 85, .2));
export const defaultRemoveColor = new Color(new RGBA(255, 0, 0, .2));

export const diffInserted = registerColor('diffEditor.insertedTextBackground',
	{ dark: '#9ccc2c33', light: '#9ccc2c40', hcDark: null, hcLight: null },
	nls.localize('diffEditorInserted', 'Background color for text that got inserted. The color must not be opaque so as not to hide underlying decorations.'), true);

export const diffRemoved = registerColor('diffEditor.removedTextBackground',
	{ dark: '#ff000033', light: '#ff000033', hcDark: null, hcLight: null },
	nls.localize('diffEditorRemoved', 'Background color for text that got removed. The color must not be opaque so as not to hide underlying decorations.'), true);
```

**File:** src/vs/platform/theme/common/colors/editorColors.ts (L279-286)
```typescript
export const diffInsertedLine = registerColor('diffEditor.insertedLineBackground',
	{ dark: defaultInsertColor, light: defaultInsertColor, hcDark: null, hcLight: null },
	nls.localize('diffEditorInsertedLines', 'Background color for lines that got inserted. The color must not be opaque so as not to hide underlying decorations.'), true);

export const diffRemovedLine = registerColor('diffEditor.removedLineBackground',
	{ dark: defaultRemoveColor, light: defaultRemoveColor, hcDark: null, hcLight: null },
	nls.localize('diffEditorRemovedLines', 'Background color for lines that got removed. The color must not be opaque so as not to hide underlying decorations.'), true);

```

**File:** src/vs/editor/browser/services/abstractCodeEditorService.ts (L585-621)
```typescript
export const _CSS_MAP: { [prop: string]: string } = {
	color: 'color:{0} !important;',
	opacity: 'opacity:{0};',
	backgroundColor: 'background-color:{0};',

	outline: 'outline:{0};',
	outlineColor: 'outline-color:{0};',
	outlineStyle: 'outline-style:{0};',
	outlineWidth: 'outline-width:{0};',

	border: 'border:{0};',
	borderColor: 'border-color:{0};',
	borderRadius: 'border-radius:{0};',
	borderSpacing: 'border-spacing:{0};',
	borderStyle: 'border-style:{0};',
	borderWidth: 'border-width:{0};',

	fontStyle: 'font-style:{0};',
	fontWeight: 'font-weight:{0};',
	fontSize: 'font-size:{0};',
	fontFamily: 'font-family:{0};',
	textDecoration: 'text-decoration:{0};',
	cursor: 'cursor:{0};',
	letterSpacing: 'letter-spacing:{0};',

	gutterIconPath: 'background:{0} center center no-repeat;',
	gutterIconSize: 'background-size:{0};',

	contentText: 'content:\'{0}\';',
	contentIconPath: 'content:{0};',
	margin: 'margin:{0};',
	padding: 'padding:{0};',
	width: 'width:{0};',
	height: 'height:{0};',

	verticalAlign: 'vertical-align:{0};',
};
```

**File:** src/vs/editor/browser/services/abstractCodeEditorService.ts (L624-663)
```typescript
class DecorationCSSRules {

	private _theme: IColorTheme;
	private readonly _className: string;
	private readonly _unThemedSelector: string;
	private _hasContent: boolean;
	private _hasLetterSpacing: boolean;
	private readonly _ruleType: ModelDecorationCSSRuleType;
	private _themeListener: IDisposable | null;
	private readonly _providerArgs: ProviderArguments;
	private _usesThemeColors: boolean;

	constructor(ruleType: ModelDecorationCSSRuleType, providerArgs: ProviderArguments, themeService: IThemeService) {
		this._theme = themeService.getColorTheme();
		this._ruleType = ruleType;
		this._providerArgs = providerArgs;
		this._usesThemeColors = false;
		this._hasContent = false;
		this._hasLetterSpacing = false;

		let className = CSSNameHelper.getClassName(this._providerArgs.key, ruleType);
		if (this._providerArgs.parentTypeKey) {
			className = className + ' ' + CSSNameHelper.getClassName(this._providerArgs.parentTypeKey, ruleType);
		}
		this._className = className;

		this._unThemedSelector = CSSNameHelper.getSelector(this._providerArgs.key, this._providerArgs.parentTypeKey, ruleType);

		this._buildCSS();

		if (this._usesThemeColors) {
			this._themeListener = themeService.onDidColorThemeChange(theme => {
				this._theme = themeService.getColorTheme();
				this._removeCSS();
				this._buildCSS();
			});
		} else {
			this._themeListener = null;
		}
	}
```

**File:** src/vs/editor/browser/services/abstractCodeEditorService.ts (L755-764)
```typescript
	private getCSSTextForModelDecorationClassName(opts: IThemeDecorationRenderOptions | undefined): string {
		if (!opts) {
			return '';
		}
		const cssTextArr: string[] = [];
		this.collectCSSText(opts, ['backgroundColor'], cssTextArr);
		this.collectCSSText(opts, ['outline', 'outlineColor', 'outlineStyle', 'outlineWidth'], cssTextArr);
		this.collectBorderSettingsCSSText(opts, cssTextArr);
		return cssTextArr.join('');
	}
```

**File:** src/vs/editor/browser/services/abstractCodeEditorService.ts (L848-858)
```typescript
	private resolveValue(value: string | ThemeColor): string {
		if (isThemeColor(value)) {
			this._usesThemeColors = true;
			const color = this._theme.getColor(value.id);
			if (color) {
				return color.toString();
			}
			return 'transparent';
		}
		return value;
	}
```

**File:** src/vs/editor/browser/viewParts/decorations/decorations.ts (L115-139)
```typescript
	private _renderWholeLineDecorations(ctx: RenderingContext, decorations: ViewModelDecoration[], output: string[]): void {
		const visibleStartLineNumber = ctx.visibleRange.startLineNumber;
		const visibleEndLineNumber = ctx.visibleRange.endLineNumber;

		for (let i = 0, lenI = decorations.length; i < lenI; i++) {
			const d = decorations[i];

			if (!d.options.isWholeLine) {
				continue;
			}

			const decorationOutput = (
				'<div class="cdr '
				+ d.options.className
				+ '" style="left:0;width:100%;"></div>'
			);

			const startLineNumber = Math.max(d.range.startLineNumber, visibleStartLineNumber);
			const endLineNumber = Math.min(d.range.endLineNumber, visibleEndLineNumber);
			for (let j = startLineNumber; j <= endLineNumber; j++) {
				const lineIndex = j - visibleStartLineNumber;
				output[lineIndex] += decorationOutput;
			}
		}
	}
```

**File:** src/vscode-dts/vscode.d.ts (L987-992)
```typescript
	export interface ThemableDecorationRenderOptions {
		/**
		 * Background color of the decoration. Use rgba() and define transparent background colors to play well with other decorations.
		 * Alternatively a color from the color registry can be {@link ThemeColor referenced}.
		 */
		backgroundColor?: string | ThemeColor;
```

**File:** extensions/merge-conflict/src/mergeDecorator.ts (L68-74)
```typescript
			this.decorations['current.content'] = vscode.window.createTextEditorDecorationType(
				this.generateBlockRenderOptions('merge.currentContentBackground', 'editorOverviewRuler.currentContentForeground', config)
			);

			this.decorations['incoming.content'] = vscode.window.createTextEditorDecorationType(
				this.generateBlockRenderOptions('merge.incomingContentBackground', 'editorOverviewRuler.incomingContentForeground', config)
			);
```
---

# MONACO INVESTIGATION

# Sistema de Highlights en Monaco Editor

El sistema de highlights en Monaco Editor funciona a través de dos mecanismos principales:

## 1. Colores de Tema para el Diff Editor

Monaco Editor utiliza un sistema de colores temáticos específicos para mostrar cambios. Los colores principales para resaltar diferencias son:

- **`diffEditor.insertedTextBackground`**: Color de fondo para texto insertado (típicamente verde)
- **`diffEditor.removedTextBackground`**: Color de fondo para texto eliminado (típicamente rojo)
- **`diffEditor.insertedTextBorder`**: Borde para el texto insertado
- **`diffEditor.removedTextBorder`**: Borde para el texto eliminado [1](#0-0) 

Estos colores se pueden personalizar mediante la API `monaco.editor.defineTheme()`, donde puedes especificar el objeto `colors` con los tokens de color deseados. [2](#0-1) 

## 2. Sistema de Decoraciones

Para highlights personalizados en el editor, Monaco utiliza un sistema de **decoraciones**. Las decoraciones permiten aplicar estilos visuales a rangos específicos de código mediante:

- **`createDecorationsCollection()`**: Método para crear y gestionar decoraciones
- **Opciones de decoración**: Permiten especificar clases CSS personalizadas [3](#0-2) 

Las decoraciones pueden aplicarse a:
- Líneas completas (`isWholeLine: true`)
- Rangos de texto específicos (`inlineClassName`)
- Márgenes (`linesDecorationsClassName`, `glyphMarginClassName`)

## 3. Diff Editor en Acción

El Diff Editor compara automáticamente dos modelos (original y modificado) y aplica los colores de tema correspondientes para mostrar las diferencias: [4](#0-3) 

## 4. Aplicación de Estilos CSS

Los estilos visuales se aplican mediante clases CSS que puedes definir. Por ejemplo, para crear backgrounds de colores personalizados: [5](#0-4) 

## Notes

- El sistema de colores en Monaco Editor está completamente integrado con VS Code, ya que Monaco es el editor que alimenta VS Code.
- Los colores por defecto para inserciones (verde) y eliminaciones (rojo) son estándares de la industria, pero son completamente personalizables a través de temas.
- El Diff Editor calcula automáticamente las diferencias entre dos modelos y aplica los highlights apropiados sin necesidad de intervención manual.
- Las decoraciones son objetos desechables - debes llamar a `.dispose()` o utilizar `createDecorationsCollection()` para gestionarlas adecuadamente.

### Citations

**File:** website/src/website/data/playground-samples/customizing-the-appearence/exposed-colors/sample.js (L3-16)
```javascript
monaco.editor.defineTheme("myTheme", {
	base: "vs",
	inherit: true,
	rules: [],
	colors: {
		"editor.foreground": "#000000",
		"editor.background": "#EDF9FA",
		"editorCursor.foreground": "#8B0000",
		"editor.lineHighlightBackground": "#0000FF20",
		"editorLineNumber.foreground": "#008800",
		"editor.selectionBackground": "#88000030",
		"editor.inactiveSelectionBackground": "#88000015",
	},
});
```

**File:** website/src/website/data/playground-samples/customizing-the-appearence/exposed-colors/sample.js (L93-96)
```javascript
("diffEditor.insertedTextBackground"); // Background color for text that got inserted.
("diffEditor.removedTextBackground"); // Background color for text that got removed.
("diffEditor.insertedTextBorder"); // Outline color for the text that got inserted.
("diffEditor.removedTextBorder"); // Outline color for text that got removed.
```

**File:** website/src/website/data/playground-samples/interacting-with-the-editor/line-and-inline-decorations/sample.js (L18-30)
```javascript
var decorations = editor.createDecorationsCollection([
	{
		range: new monaco.Range(3, 1, 5, 1),
		options: {
			isWholeLine: true,
			linesDecorationsClassName: "myLineDecoration",
		},
	},
	{
		range: new monaco.Range(7, 1, 7, 24),
		options: { inlineClassName: "myInlineDecoration" },
	},
]);
```

**File:** website/src/website/data/playground-samples/creating-the-diffeditor/multi-line-example/sample.js (L1-20)
```javascript
var originalModel = monaco.editor.createModel(
	"This line is removed on the right.\njust some text\nabcd\nefgh\nSome more text",
	"text/plain"
);
var modifiedModel = monaco.editor.createModel(
	"just some text\nabcz\nzzzzefgh\nSome more text.\nThis line is removed on the left.",
	"text/plain"
);

var diffEditor = monaco.editor.createDiffEditor(
	document.getElementById("container"),
	{
		// You can optionally disable the resizing
		enableSplitViewResizing: false,
	}
);
diffEditor.setModel({
	original: originalModel,
	modified: modifiedModel,
});
```

**File:** website/src/website/data/playground-samples/interacting-with-the-editor/listening-to-mouse-events/sample.js (L33-41)
```javascript
editor.changeViewZones(function (changeAccessor) {
	var domNode = document.createElement("div");
	domNode.style.background = "lightgreen";
	viewZoneId = changeAccessor.addZone({
		afterLineNumber: 3,
		heightInLines: 3,
		domNode: domNode,
	});
});
```
