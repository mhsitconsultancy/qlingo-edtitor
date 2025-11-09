# QLingo Expression Editor

A visual, structured editor for building and editing QLingo expressions. This component provides a user-friendly interface for creating QLingo expressions without having to manually write code, while following the BNF grammar rules.

## Features

- **Visual Expression Building**: Build expressions using a tree-based visual interface
- **Context-Aware Options**: Dropdown lists show only valid options based on current position in the grammar
- **Parse Existing Expressions**: Load and edit existing QLingo expressions
- **Dual-Mode Editing**: Switch between visual and text editing modes
- **Live Preview**: See the result of your expression in real-time
- **Grammar-Based Validation**: All options follow the QLingo BNF grammar rules
- **Support for All QLingo Features**:
  - Literals (string, number, boolean, null)
  - Variables (`@{varName}`)
  - Binary operators (arithmetic, comparison, logical, string concatenation)
  - Unary operators (-, +, NOT)
  - Function calls (all 50+ built-in functions)
  - If/Then/Else statements
  - Switch/Case statements
  - Blocks

## Architecture

### Components

1. **QLingoExpressionBuilderService** (`qlingo-expression-builder.service.ts`)
   - Parses QLingo expressions into an AST (Abstract Syntax Tree)
   - Converts AST back to QLingo source code
   - Provides context-aware options based on grammar rules
   - Manages expression node creation and manipulation

2. **QlingoExpressionEditorComponent** (`qlingo-expression-editor.component.ts`)
   - Main UI component for editing expressions
   - Displays expression tree visually
   - Handles node selection and editing
   - Provides dropdowns for valid options
   - Includes live preview functionality

3. **QlingoExpressionEditorDemoComponent** (`qlingo-expression-editor-demo.component.ts`)
   - Demonstrates usage with multiple examples
   - Shows different expression types and features

## Usage

### Basic Usage

```typescript
import { QlingoExpressionEditorModule } from './path/to/qlingo-expression-editor.module';

@NgModule({
  imports: [
    QlingoExpressionEditorModule
  ]
})
export class YourModule { }
```

```html
<app-qlingo-expression-editor
  [expression]="initialExpression"
  [availableVariables]="['name', 'age', 'email']"
  [enablePreview]="true"
  (expressionChange)="onExpressionChange($event)"
  (expressionApplied)="onExpressionApplied($event)">
</app-qlingo-expression-editor>
```

### Component Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `expression` | `string` | `''` | Initial QLingo expression to parse and edit |
| `availableVariables` | `string[]` | `[]` | List of variable names that can be used |
| `templateContext` | `any` | `{}` | Template context for resolving `@@markers@@` |
| `variables` | `any` | `{}` | Variable values for testing/preview |
| `enablePreview` | `boolean` | `true` | Enable live preview/evaluation |

### Component Outputs

| Output | Type | Description |
|--------|------|-------------|
| `expressionChange` | `EventEmitter<string>` | Emitted when expression changes |
| `expressionApplied` | `EventEmitter<string>` | Emitted when user clicks "Apply Expression" |

### Example: Simple Expression

```typescript
export class MyComponent {
  myExpression = '5 + 3 * 2';

  onExpressionApplied(expression: string): void {
    console.log('Applied expression:', expression);
    // Use the expression...
  }
}
```

```html
<app-qlingo-expression-editor
  [expression]="myExpression"
  (expressionApplied)="onExpressionApplied($event)">
</app-qlingo-expression-editor>
```

### Example: With Variables

```typescript
export class MyComponent {
  myExpression = '@{firstName} & " " & @{lastName}';
  variables = ['firstName', 'lastName', 'age'];
  variableValues = {
    firstName: 'John',
    lastName: 'Doe',
    age: 30
  };

  onExpressionApplied(expression: string): void {
    console.log('Applied expression:', expression);
  }
}
```

```html
<app-qlingo-expression-editor
  [expression]="myExpression"
  [availableVariables]="variables"
  [variables]="variableValues"
  [enablePreview]="true"
  (expressionApplied)="onExpressionApplied($event)">
</app-qlingo-expression-editor>
```

### Example: Conditional Logic

```typescript
export class MyComponent {
  myExpression = 'If (@{age} >= 18) { "Adult" } Else { "Minor" }';
  variables = ['age', 'name'];
  variableValues = {
    age: 25,
    name: 'Alice'
  };
}
```

## How It Works

### 1. Parsing
When an expression is loaded, the service:
1. Preprocesses template markers (`@@Language@@`)
2. Tokenizes the expression
3. Parses tokens into an AST using the QLingo grammar
4. Converts the AST to an editable tree structure

### 2. Visual Editing
Users can:
1. Click on any node in the expression tree to select it
2. See available options based on the grammar context
3. Replace nodes with different types (literals, operators, functions, etc.)
4. Edit node properties (values, variable names, operators)
5. Add/remove function arguments and switch cases

### 3. Context-Aware Options
The service provides different options based on context:

- **At expression root**: All primary expressions (literals, variables, functions, control flow)
- **Inside operators**: Compatible operands based on operator type
- **Function arguments**: Appropriate expressions for the function
- **Control flow sections**: Valid expressions for conditions and branches

### 4. Code Generation
As users edit the tree:
1. The service regenerates the QLingo source code
2. The expression is emitted via `expressionChange`
3. If preview is enabled, the expression is evaluated with test data
4. Results or errors are displayed

## Expression Node Types

The editor supports all QLingo node types:

- **Empty**: Placeholder for unfinished parts
- **Literal**: String, number, boolean, or null values
- **Variable**: Variable references (`@{name}`)
- **Identifier**: Named identifiers
- **BinaryOp**: Binary operations (+, -, *, /, %, ^, ==, !=, <, >, <=, >=, AND, OR, &)
- **UnaryOp**: Unary operations (-, +, NOT, !)
- **FunctionCall**: Calls to built-in functions
- **If**: If/Then/Else conditional expressions
- **Switch**: Switch/Case expressions
- **Block**: Block expressions `{ ... }`

## Built-in Functions

The editor provides access to all QLingo built-in functions, organized by category:

### Numeric Functions
- `Abs`, `Ceil`, `Floor`, `Round`, `Int`, `Sqrt`
- `Max`, `Min`, `Power`, `Mod`
- `RandomBetween`, `FormatNumber`

### Date Functions
- `Now`, `GetDay`, `GetMonth`, `GetYear`, `GetDayOfWeek`
- `GetHour`, `GetMinute`, `GetSecond`
- `Age`, `FormatDate`, `DateAdd`, `DateDiff`

### String Functions
- `LCase`, `UCase`, `TCase`, `Length`, `IsNullOrEmpty`
- `SubString`, `Trim`, `LTrim`, `RTrim`
- `Find`, `Replace`, `FindAndReplace`, `FindAndReplaceChars`
- `FindByRegExp`, `FindAndReplaceByRegExp`
- `CleanNumber`, `CleanRecipientKey`, `SecureID`
- `HexToUnicode`, `HtmlEncode`

### Conversion Functions
- `AsBoolean`, `AsNumber`, `AsString`, `AsDate`

## Customization

### Styling
The component uses Bootstrap 5 classes and custom SCSS. You can override styles by:

```scss
// In your component or global styles
.qlingo-expression-editor {
  .expression-node {
    // Custom node styles
  }

  .node-primary {
    border-color: your-color;
  }
}
```

### Adding Custom Functions
To add custom functions to the dropdown:

```typescript
// Extend QLingoExpressionBuilderService
// Override getBuiltInFunctions() to add your functions
```

## Demo

To see all features in action, use the demo component:

```html
<app-qlingo-expression-editor-demo></app-qlingo-expression-editor-demo>
```

The demo includes examples of:
- Simple arithmetic expressions
- Variable usage
- If/Then/Else conditions
- Function calls
- Switch/Case statements
- Building expressions from scratch

## Grammar Reference

The editor follows the QLingo BNF grammar defined in `qlingo-grammar.bnf`. Key rules:

1. **Operator Precedence** (highest to lowest):
   - Parentheses
   - Unary operators (-, +, NOT)
   - Exponentiation (^)
   - Multiplicative (*, /, %)
   - Additive (+, -, &)
   - Comparison (==, !=, <, >, <=, >=)
   - Logical (AND, OR)

2. **Keywords**: Case-insensitive
3. **Variables**: `@{name}` or `|->[name]` syntax
4. **Template Markers**: `@@Name@@` or `@@Name:Format@@`
5. **Comments**: `//` and `/* */` (removed during parsing)

## Limitations

- No support for variable assignment (QLingo is expression-based only)
- No looping constructs (by design - QLingo doesn't have loops)
- Template markers are preprocessed and not visually editable
- Maximum expression complexity limited by browser performance

## Dependencies

- Angular 17+
- Bootstrap 5 (for styling)
- Bootstrap Icons (for icons)
- FormsModule (for form controls)
- QLingo Interpreter (existing service)

## Future Enhancements

Possible improvements:
- Undo/redo functionality
- Expression templates/snippets
- Drag-and-drop node reordering
- Expression validation with detailed error messages
- Export/import expressions
- Syntax highlighting in text mode
- Autocomplete in text mode
- Expression performance metrics

## License

Part of the Britannia/Britnet project.
