import { Injectable } from '@angular/core';
import { QLingoInterpreter } from './qlingo-interpreter';

/**
 * Service for building and editing QLingo expressions with a structured UI
 */
@Injectable({
  providedIn: 'root'
})
export class QLingoExpressionBuilderService {

  constructor() { }

  /**
   * Parse a QLingo expression into an AST that can be edited
   */
  parseExpression(expression: string, templateContext: any = {}, variables: any = {}): ExpressionNode {
    const interpreter = new QLingoInterpreter(templateContext, variables);
    const processedSource = (interpreter as any).processTemplateMarkers(expression);
    const tokens = (interpreter as any).tokenize(processedSource);
    const ast = (interpreter as any).parse(tokens);

    return this.astToExpressionNode(ast);
  }

  /**
   * Convert interpreter AST to our editable expression node structure
   */
  private astToExpressionNode(ast: any): ExpressionNode {
    if (!ast) {
      return { type: 'Empty', nodeType: 'primary' };
    }

    switch (ast.type) {
      case 'Literal':
        return {
          type: 'Literal',
          nodeType: 'primary',
          dataType: ast.dataType,
          value: ast.value
        };

      case 'Variable':
        // Detect varType based on AST properties or syntax
        // The QLingo interpreter may provide a 'syntax' or 'binding' property
        let varType: string = 'datafield'; // Default to datafield

        // Check if AST has syntax indicator
        if (ast.syntax === 'variable' || ast.binding === '@') {
          varType = 'variable';
        } else if (ast.syntax === 'datafield' || ast.binding === '|->') {
          varType = 'datafield';
        }
        // If no indicator, check the original name format if available
        else if (ast.originalSyntax) {
          varType = ast.originalSyntax.startsWith('@{') ? 'variable' : 'datafield';
        }

        return {
          type: 'Variable',
          nodeType: 'primary',
          name: ast.name,
          varType: varType
        };

      case 'Identifier':
        return {
          type: 'Identifier',
          nodeType: 'primary',
          name: ast.name
        };

      case 'BinaryOp':
        return {
          type: 'BinaryOp',
          nodeType: 'operator',
          operator: ast.op,
          left: this.astToExpressionNode(ast.left),
          right: this.astToExpressionNode(ast.right)
        };

      case 'UnaryOp':
        return {
          type: 'UnaryOp',
          nodeType: 'operator',
          operator: ast.op,
          operand: this.astToExpressionNode(ast.operand)
        };

      case 'FunctionCall':
        return {
          type: 'FunctionCall',
          nodeType: 'function',
          name: ast.name,
          args: ast.args.map((arg: any) => this.astToExpressionNode(arg))
        };

      case 'If':
        return {
          type: 'If',
          nodeType: 'control-flow',
          condition: this.astToExpressionNode(ast.condition),
          consequent: this.astToExpressionNode(ast.consequent),
          alternate: ast.alternate ? this.astToExpressionNode(ast.alternate) : undefined
        };

      case 'Switch':
        return {
          type: 'Switch',
          nodeType: 'control-flow',
          discriminant: this.astToExpressionNode(ast.discriminant),
          cases: ast.cases.map((c: any) => ({
            test: this.astToExpressionNode(c.test),
            consequent: this.astToExpressionNode(c.consequent)
          })),
          default: ast.default ? this.astToExpressionNode(ast.default) : undefined
        };

      case 'Block':
        return {
          type: 'Block',
          nodeType: 'block',
          body: ast.body.map((stmt: any) => this.astToExpressionNode(stmt))
        };

      default:
        return { type: 'Empty', nodeType: 'primary' };
    }
  }

  /**
   * Convert expression node back to QLingo source code
   */
  nodeToExpression(node: ExpressionNode): string {
    if (!node) {
      return '';
    }

    switch (node.type) {
      case 'Empty':
        return '';

      case 'Literal':
        if (node.dataType === 'string') {
          return `"${node.value}"`;
        } else if (node.dataType === 'boolean') {
          return node.value ? 'TRUE' : 'FALSE';
        } else if (node.dataType === 'null') {
          return 'NULL';
        } else {
          return String(node.value);
        }

      case 'Variable':
        // Check varType to determine the syntax
        if (node.varType === 'variable') {
          return `@{${node.name}}`;
        } else {
          // Default to datafield format (|->[FieldName])
          return `|->[${node.name}]`;
        }

      case 'Identifier':
        return node.name!;

      case 'BinaryOp':
        const left = this.nodeToExpression(node.left!);
        const right = this.nodeToExpression(node.right!);

        // Add parentheses for clarity in complex expressions
        const needsParens = (n: ExpressionNode) =>
          n.type === 'BinaryOp' && this.getOperatorPrecedence(n.operator!) < this.getOperatorPrecedence(node.operator!);

        const leftExpr = needsParens(node.left!) ? `(${left})` : left;
        const rightExpr = needsParens(node.right!) ? `(${right})` : right;

        return `${leftExpr} ${node.operator} ${rightExpr}`;

      case 'UnaryOp':
        const operand = this.nodeToExpression(node.operand!);
        return `${node.operator} ${operand}`;

      case 'FunctionCall':
        const args = node.args!.map(arg => this.nodeToExpression(arg)).join(', ');
        return `${node.name}(${args})`;

      case 'If':
        const condition = this.nodeToExpression(node.condition!);
        const consequent = this.nodeToExpression(node.consequent!);

        if (node.alternate) {
          // Check if alternate is another If (else-if case)
          if (node.alternate.type === 'If') {
            // Generate Else If syntax instead of Else { If }
            const alternateCondition = this.nodeToExpression(node.alternate.condition!);
            const alternateConsequent = this.nodeToExpression(node.alternate.consequent!);

            // Recursively handle further else-if or final else
            if (node.alternate.alternate) {
              const furtherAlternate = this.nodeToExpression(node.alternate);
              // Extract the else-if chain from the recursive call
              const elseIfPart = furtherAlternate.substring(furtherAlternate.indexOf('Else If'));
              return `If (${condition}) { ${consequent} } ${elseIfPart}`;
            } else {
              return `If (${condition}) { ${consequent} } Else If (${alternateCondition}) { ${alternateConsequent} }`;
            }
          } else {
            // Simple else with non-If alternate
            const alternate = this.nodeToExpression(node.alternate);
            return `If (${condition}) { ${consequent} } Else { ${alternate} }`;
          }
        } else {
          return `If (${condition}) { ${consequent} }`;
        }

      case 'Switch':
        const discriminant = this.nodeToExpression(node.discriminant!);
        const cases = node.cases!.map(c =>
          `Case ${this.nodeToExpression(c.test)}: ${this.nodeToExpression(c.consequent)}`
        ).join(' ');
        const defaultCase = node.default ? `Default: ${this.nodeToExpression(node.default)}` : '';

        return `Switch (${discriminant}) { ${cases} ${defaultCase} }`;

      case 'Block':
        return node.body!.map(stmt => this.nodeToExpression(stmt)).join('; ');

      default:
        return '';
    }
  }

  /**
   * Get valid options for a given context in the expression tree
   */
  getValidOptions(context: ExpressionContext): ExpressionOption[] {
    const options: ExpressionOption[] = [];

    switch (context.expectedType) {
      case 'expression':
      case 'primary':
        // All primary expressions
        options.push(
          { category: 'Literal', label: 'String', type: 'Literal', dataType: 'string' },
          { category: 'Literal', label: 'Number', type: 'Literal', dataType: 'number' },
          { category: 'Literal', label: 'Boolean (TRUE)', type: 'Literal', dataType: 'boolean', value: true },
          { category: 'Literal', label: 'Boolean (FALSE)', type: 'Literal', dataType: 'boolean', value: false },
          { category: 'Literal', label: 'NULL', type: 'Literal', dataType: 'null', value: null }
        );

        // Variables
        if (context.availableVariables && context.availableVariables.length > 0) {
          context.availableVariables.forEach(varName => {
            options.push({
              category: 'Variable',
              label: varName,
              type: 'Variable',
              name: varName
            });
          });
        } else {
          options.push({
            category: 'Variable',
            label: 'Variable Reference',
            type: 'Variable'
          });
        }

        // Control flow
        options.push(
          { category: 'Control Flow', label: 'If/Then/Else', type: 'If' },
          { category: 'Control Flow', label: 'Switch/Case', type: 'Switch' }
        );

        // Functions
        this.getBuiltInFunctions().forEach(func => {
          options.push({
            category: `Function (${func.category})`,
            label: func.name,
            type: 'FunctionCall',
            name: func.name,
            description: func.description,
            paramCount: func.paramCount
          });
        });

        // Operators (if not at root level)
        if (!context.isRoot) {
          options.push(
            { category: 'Operator', label: 'Arithmetic (+, -, *, /, %, ^)', type: 'BinaryOp' },
            { category: 'Operator', label: 'Comparison (==, !=, <, >, <=, >=)', type: 'BinaryOp' },
            { category: 'Operator', label: 'Logical (AND, OR)', type: 'BinaryOp' },
            { category: 'Operator', label: 'String Concatenation (&)', type: 'BinaryOp', operator: '&' }
          );
        }
        break;

      case 'operator':
        // Binary operators
        options.push(
          { category: 'Arithmetic', label: '+', type: 'BinaryOp', operator: '+' },
          { category: 'Arithmetic', label: '-', type: 'BinaryOp', operator: '-' },
          { category: 'Arithmetic', label: '*', type: 'BinaryOp', operator: '*' },
          { category: 'Arithmetic', label: '/', type: 'BinaryOp', operator: '/' },
          { category: 'Arithmetic', label: '%', type: 'BinaryOp', operator: '%' },
          { category: 'Arithmetic', label: '^', type: 'BinaryOp', operator: '^' },
          { category: 'Comparison', label: '==', type: 'BinaryOp', operator: '==' },
          { category: 'Comparison', label: '!=', type: 'BinaryOp', operator: '!=' },
          { category: 'Comparison', label: '<', type: 'BinaryOp', operator: '<' },
          { category: 'Comparison', label: '>', type: 'BinaryOp', operator: '>' },
          { category: 'Comparison', label: '<=', type: 'BinaryOp', operator: '<=' },
          { category: 'Comparison', label: '>=', type: 'BinaryOp', operator: '>=' },
          { category: 'Logical', label: 'AND', type: 'BinaryOp', operator: 'AND' },
          { category: 'Logical', label: 'OR', type: 'BinaryOp', operator: 'OR' },
          { category: 'String', label: '&', type: 'BinaryOp', operator: '&' }
        );
        break;

      case 'function-args':
        // Same as expression but with emphasis on matching types
        return this.getValidOptions({ ...context, expectedType: 'expression' });
    }

    return options;
  }

  /**
   * Get metadata about built-in functions
   */
  private getBuiltInFunctions(): FunctionMetadata[] {
    return [
      // Numeric functions
      { category: 'Numeric', name: 'Abs', description: 'Absolute value', paramCount: 1 },
      { category: 'Numeric', name: 'Ceil', description: 'Round up to nearest integer', paramCount: 1 },
      { category: 'Numeric', name: 'Floor', description: 'Round down to nearest integer', paramCount: 1 },
      { category: 'Numeric', name: 'Round', description: 'Round to specified decimals', paramCount: [1, 2] },
      { category: 'Numeric', name: 'Int', description: 'Truncate to integer', paramCount: 1 },
      { category: 'Numeric', name: 'Sqrt', description: 'Square root', paramCount: 1 },
      { category: 'Numeric', name: 'Max', description: 'Maximum of values', paramCount: -1 },
      { category: 'Numeric', name: 'Min', description: 'Minimum of values', paramCount: -1 },
      { category: 'Numeric', name: 'Power', description: 'Raise to power', paramCount: 2 },
      { category: 'Numeric', name: 'Mod', description: 'Modulo operation', paramCount: 2 },
      { category: 'Numeric', name: 'RandomBetween', description: 'Random integer between min and max', paramCount: 2 },
      { category: 'Numeric', name: 'FormatNumber', description: 'Format number with separators', paramCount: [1, 2, 3, 4] },

      // Date functions
      { category: 'Date', name: 'Now', description: 'Current date/time', paramCount: 0 },
      { category: 'Date', name: 'GetDay', description: 'Extract day of month', paramCount: 1 },
      { category: 'Date', name: 'GetMonth', description: 'Extract month (1-12)', paramCount: 1 },
      { category: 'Date', name: 'GetYear', description: 'Extract year', paramCount: 1 },
      { category: 'Date', name: 'GetDayOfWeek', description: 'Extract day of week (1-7)', paramCount: 1 },
      { category: 'Date', name: 'GetHour', description: 'Extract hour (0-23)', paramCount: 1 },
      { category: 'Date', name: 'GetMinute', description: 'Extract minute (0-59)', paramCount: 1 },
      { category: 'Date', name: 'GetSecond', description: 'Extract second (0-59)', paramCount: 1 },
      { category: 'Date', name: 'Age', description: 'Calculate age in years', paramCount: [1, 2] },
      { category: 'Date', name: 'FormatDate', description: 'Format date with pattern', paramCount: [1, 2] },
      { category: 'Date', name: 'DateAdd', description: 'Add interval to date', paramCount: 3 },
      { category: 'Date', name: 'DateDiff', description: 'Difference between dates', paramCount: 3 },

      // String functions
      { category: 'String', name: 'LCase', description: 'Convert to lowercase', paramCount: 1 },
      { category: 'String', name: 'UCase', description: 'Convert to uppercase', paramCount: 1 },
      { category: 'String', name: 'TCase', description: 'Convert to title case', paramCount: 1 },
      { category: 'String', name: 'Length', description: 'Get string length', paramCount: 1 },
      { category: 'String', name: 'IsNullOrEmpty', description: 'Check if null or empty', paramCount: 1 },
      { category: 'String', name: 'SubString', description: 'Extract substring', paramCount: 3 },
      { category: 'String', name: 'Trim', description: 'Remove whitespace', paramCount: 1 },
      { category: 'String', name: 'LTrim', description: 'Remove left whitespace', paramCount: 1 },
      { category: 'String', name: 'RTrim', description: 'Remove right whitespace', paramCount: 1 },
      { category: 'String', name: 'Find', description: 'Find substring position', paramCount: 3 },
      { category: 'String', name: 'Replace', description: 'Replace at position', paramCount: 4 },
      { category: 'String', name: 'FindAndReplace', description: 'Find and replace text', paramCount: 3 },
      { category: 'String', name: 'FindAndReplaceChars', description: 'Replace characters', paramCount: 3 },
      { category: 'String', name: 'FindByRegExp', description: 'Find by regex', paramCount: 2 },
      { category: 'String', name: 'FindAndReplaceByRegExp', description: 'Replace by regex', paramCount: [3, 4] },
      { category: 'String', name: 'CleanNumber', description: 'Extract digits only', paramCount: 1 },
      { category: 'String', name: 'CleanRecipientKey', description: 'Remove unsafe URL chars', paramCount: [1, 2] },
      { category: 'String', name: 'SecureID', description: 'Generate secure ID', paramCount: 0 },
      { category: 'String', name: 'HexToUnicode', description: 'Convert hex to Unicode', paramCount: 1 },
      { category: 'String', name: 'HtmlEncode', description: 'Encode for URL', paramCount: 1 },

      // Conversion functions
      { category: 'Conversion', name: 'AsBoolean', description: 'Convert to boolean', paramCount: 1 },
      { category: 'Conversion', name: 'AsNumber', description: 'Convert to number', paramCount: 1 },
      { category: 'Conversion', name: 'AsString', description: 'Convert to string', paramCount: 1 },
      { category: 'Conversion', name: 'AsDate', description: 'Convert to date', paramCount: 1 }
    ];
  }

  /**
   * Get operator precedence (higher number = higher precedence)
   */
  private getOperatorPrecedence(operator: string): number {
    const precedence: { [key: string]: number } = {
      'OR': 1,
      'AND': 2,
      'NOT': 3,
      '==': 4, '!=': 4, '<': 4, '>': 4, '<=': 4, '>=': 4,
      '+': 5, '-': 5, '&': 5,
      '*': 6, '/': 6, '%': 6,
      '^': 7
    };
    return precedence[operator] || 0;
  }

  /**
   * Create a new empty node of a given type
   */
  createEmptyNode(option: ExpressionOption): ExpressionNode {
    const node: ExpressionNode = {
      type: option.type,
      nodeType: this.getNodeType(option.type)
    };

    switch (option.type) {
      case 'Literal':
        node.dataType = option.dataType;
        node.value = option.value !== undefined ? option.value : this.getDefaultValue(option.dataType!);
        break;

      case 'Variable':
        node.name = option.name || '';
        break;

      case 'Identifier':
        node.name = option.name || '';
        break;

      case 'BinaryOp':
        node.operator = option.operator || '+';
        node.left = { type: 'Empty', nodeType: 'primary' };
        node.right = { type: 'Empty', nodeType: 'primary' };
        break;

      case 'UnaryOp':
        node.operator = option.operator || '-';
        node.operand = { type: 'Empty', nodeType: 'primary' };
        break;

      case 'FunctionCall':
        node.name = option.name!;
        node.args = [];
        // Create empty argument slots
        if (typeof option.paramCount === 'number' && option.paramCount > 0) {
          for (let i = 0; i < option.paramCount; i++) {
            node.args.push({ type: 'Empty', nodeType: 'primary' });
          }
        } else if (Array.isArray(option.paramCount) && option.paramCount.length > 0) {
          // Use minimum parameter count
          const minParams = Math.min(...option.paramCount);
          for (let i = 0; i < minParams; i++) {
            node.args.push({ type: 'Empty', nodeType: 'primary' });
          }
        }
        break;

      case 'If':
        node.condition = { type: 'Empty', nodeType: 'primary' };
        node.consequent = { type: 'Empty', nodeType: 'primary' };
        node.alternate = undefined; // Don't create else by default
        break;

      case 'Switch':
        node.discriminant = { type: 'Empty', nodeType: 'primary' };
        node.cases = [
          {
            test: { type: 'Empty', nodeType: 'primary' },
            consequent: { type: 'Empty', nodeType: 'primary' }
          }
        ];
        node.default = { type: 'Empty', nodeType: 'primary' };
        break;

      case 'Block':
        node.body = [{ type: 'Empty', nodeType: 'primary' }];
        break;
    }

    return node;
  }

  private getNodeType(type: string): string {
    if (['Literal', 'Variable', 'Identifier', 'Empty'].includes(type)) {
      return 'primary';
    } else if (['BinaryOp', 'UnaryOp'].includes(type)) {
      return 'operator';
    } else if (type === 'FunctionCall') {
      return 'function';
    } else if (['If', 'Switch'].includes(type)) {
      return 'control-flow';
    } else if (type === 'Block') {
      return 'block';
    }
    return 'primary';
  }

  private getDefaultValue(dataType: string): any {
    switch (dataType) {
      case 'string': return '';
      case 'number': return 0;
      case 'boolean': return false;
      case 'null': return null;
      default: return null;
    }
  }
}

/**
 * Represents a node in the editable expression tree
 */
export interface ExpressionNode {
  type: string;
  nodeType: string;

  // For literals
  dataType?: string;
  value?: any;

  // For variables and identifiers
  name?: string;
  varType?: string; // 'variable' for @{VarName} or 'datafield' for |->[FieldName]

  // For binary operators
  operator?: string;
  left?: ExpressionNode;
  right?: ExpressionNode;

  // For unary operators
  operand?: ExpressionNode;

  // For function calls
  args?: ExpressionNode[];

  // For if statements
  condition?: ExpressionNode;
  consequent?: ExpressionNode;
  alternate?: ExpressionNode;

  // For switch statements
  discriminant?: ExpressionNode;
  cases?: { test: ExpressionNode; consequent: ExpressionNode }[];
  default?: ExpressionNode;

  // For blocks
  body?: ExpressionNode[];
}

/**
 * Context for determining valid expression options
 */
export interface ExpressionContext {
  expectedType: 'expression' | 'primary' | 'operator' | 'function-args';
  availableVariables?: string[];
  isRoot?: boolean;
  parentNode?: ExpressionNode;
}

/**
 * An option that can be selected when building an expression
 */
export interface ExpressionOption {
  category: string;
  label: string;
  type: string;
  dataType?: string;
  value?: any;
  name?: string;
  varType?: string; // 'variable' for @{VarName} or 'datafield' for |->[FieldName]
  operator?: string;
  description?: string;
  paramCount?: number | number[];
}

/**
 * Metadata about a built-in function
 */
export interface FunctionMetadata {
  category: string;
  name: string;
  description: string;
  paramCount: number | number[];  // -1 means variadic
}
