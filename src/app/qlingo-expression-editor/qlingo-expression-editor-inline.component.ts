import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  QLingoExpressionBuilderService,
  ExpressionNode,
  ExpressionOption
} from '../qlingo-expression-builder.service';
import { QLingoInterpreter } from '../qlingo-interpreter';

/**
 * Inline expression editor - displays expression as a flow with dropdowns and inputs
 */
@Component({
  selector: 'app-qlingo-expression-editor-inline',
  templateUrl: './qlingo-expression-editor-inline.component.html',
  styleUrls: ['./qlingo-expression-editor-inline.component.scss'],
  standalone: false
})
export class QlingoExpressionEditorInlineComponent implements OnInit {

  @Input() expression: string = '';
  @Input() availableVariables: string[] = [];
  @Input() templateContext: any = {};
  @Input() variables: any = {};
  @Input() enablePreview: boolean = true;

  @Output() expressionChange = new EventEmitter<string>();
  @Output() expressionApplied = new EventEmitter<string>();

  rootNode: ExpressionNode | null = null;
  generatedExpression: string = '';
  previewResult: any = null;
  previewError: string | null = null;

  // Track which node is being edited
  editingNodePath: number[] | null = null;

  constructor(private expressionBuilder: QLingoExpressionBuilderService) { }

  ngOnInit(): void {
    this.initializeExpression();
  }

  initializeExpression(): void {
    try {
      if (this.expression && this.expression.trim()) {
        this.rootNode = this.expressionBuilder.parseExpression(
          this.expression,
          this.templateContext,
          this.variables
        );
      } else {
        this.rootNode = { type: 'Empty', nodeType: 'primary' };
      }
      this.updateGeneratedExpression();
    } catch (error: any) {
      console.error('Failed to parse expression:', error);
      this.rootNode = { type: 'Empty', nodeType: 'primary' };
    }
  }

  updateGeneratedExpression(): void {
    if (this.rootNode) {
      this.generatedExpression = this.expressionBuilder.nodeToExpression(this.rootNode);
      this.expressionChange.emit(this.generatedExpression);
      if (this.enablePreview) {
        this.updatePreview();
      }
    }
  }

  updatePreview(): void {
    try {
      if (!this.generatedExpression || this.generatedExpression.trim() === '') {
        this.previewResult = null;
        this.previewError = null;
        return;
      }
      const interpreter = new QLingoInterpreter(this.templateContext, this.variables);
      this.previewResult = interpreter.execute(this.generatedExpression);
      this.previewError = null;
    } catch (error: any) {
      this.previewResult = null;
      this.previewError = error.message || 'Unknown error';
    }
  }

  /**
   * Get the node at a specific path
   */
  getNodeAtPath(path: number[]): ExpressionNode | null {
    if (!this.rootNode || path.length === 0) return this.rootNode;

    let current = this.rootNode;
    for (const index of path) {
      current = this.getChildNode(current, index)!;
      if (!current) return null;
    }
    return current;
  }

  /**
   * Update node at path
   */
  updateNodeAtPath(path: number[], newNode: ExpressionNode): void {
    if (path.length === 0) {
      this.rootNode = newNode;
    } else {
      const parentPath = path.slice(0, -1);
      const childIndex = path[path.length - 1];
      const parent = this.getNodeAtPath(parentPath);
      if (parent) {
        this.setChildNode(parent, childIndex, newNode);
      }
    }
    this.updateGeneratedExpression();
  }

  private getChildNode(node: ExpressionNode, index: number): ExpressionNode | null {
    if (node.type === 'BinaryOp') {
      return index === 0 ? node.left! : node.right!;
    } else if (node.type === 'UnaryOp') {
      return node.operand!;
    } else if (node.type === 'FunctionCall') {
      return node.args![index];
    } else if (node.type === 'If') {
      return [node.condition!, node.consequent!, node.alternate!][index];
    } else if (node.type === 'Switch') {
      if (index === 0) return node.discriminant!;
      const caseCount = node.cases!.length;
      if (index <= caseCount * 2) {
        const caseIndex = Math.floor((index - 1) / 2);
        return (index - 1) % 2 === 0 ? node.cases![caseIndex].test : node.cases![caseIndex].consequent;
      }
      return node.default!;
    }
    return null;
  }

  private setChildNode(node: ExpressionNode, index: number, newNode: ExpressionNode): void {
    if (node.type === 'BinaryOp') {
      if (index === 0) node.left = newNode;
      else node.right = newNode;
    } else if (node.type === 'UnaryOp') {
      node.operand = newNode;
    } else if (node.type === 'FunctionCall') {
      node.args![index] = newNode;
    } else if (node.type === 'If') {
      if (index === 0) node.condition = newNode;
      else if (index === 1) node.consequent = newNode;
      else node.alternate = newNode;
    } else if (node.type === 'Switch') {
      if (index === 0) {
        node.discriminant = newNode;
      } else {
        const caseCount = node.cases!.length;
        if (index <= caseCount * 2) {
          const caseIndex = Math.floor((index - 1) / 2);
          if ((index - 1) % 2 === 0) {
            node.cases![caseIndex].test = newNode;
          } else {
            node.cases![caseIndex].consequent = newNode;
          }
        } else {
          node.default = newNode;
        }
      }
    }
  }

  /**
   * Get available options for a node position
   */
  getOptionsForNode(node: ExpressionNode): ExpressionOption[] {
    return this.expressionBuilder.getValidOptions({
      expectedType: 'expression',
      availableVariables: this.availableVariables,
      isRoot: node === this.rootNode
    });
  }

  /**
   * Replace a node with a selected option
   */
  replaceNode(path: number[], optionKey: string): void {
    if (!optionKey) return;

    const option = this.parseOptionKey(optionKey);
    if (!option) return;

    const newNode = this.expressionBuilder.createEmptyNode(option);
    this.updateNodeAtPath(path, newNode);
    this.editingNodePath = null;
  }

  /**
   * Parse option key from dropdown
   */
  private parseOptionKey(key: string): ExpressionOption | null {
    const parts = key.split('-');
    const category = parts[0];
    const value = parts.slice(1).join('-');

    switch (category) {
      case 'literal':
        if (value === 'string') {
          return { category: 'Literal', label: 'String', type: 'Literal', dataType: 'string', value: '' };
        } else if (value === 'number') {
          return { category: 'Literal', label: 'Number', type: 'Literal', dataType: 'number', value: 0 };
        } else if (value === 'boolean') {
          const isTrue = key.includes('true');
          return { category: 'Literal', label: 'Boolean', type: 'Literal', dataType: 'boolean', value: isTrue };
        } else if (value === 'null') {
          return { category: 'Literal', label: 'NULL', type: 'Literal', dataType: 'null', value: null };
        }
        break;

      case 'variable':
        return { category: 'Variable', label: 'Variable', type: 'Variable', name: '' };

      case 'func':
        return this.createFunctionOption(value);

      case 'if':
        return { category: 'Control Flow', label: 'If/Then/Else', type: 'If' };

      case 'switch':
        return { category: 'Control Flow', label: 'Switch/Case', type: 'Switch' };

      case 'op':
        return this.createOperatorOption(value);
    }

    return null;
  }

  private createFunctionOption(funcName: string): ExpressionOption {
    const functions: { [key: string]: { name: string; paramCount: number } } = {
      'abs': { name: 'Abs', paramCount: 1 },
      'ceil': { name: 'Ceil', paramCount: 1 },
      'floor': { name: 'Floor', paramCount: 1 },
      'round': { name: 'Round', paramCount: 2 },
      'max': { name: 'Max', paramCount: 2 },
      'min': { name: 'Min', paramCount: 2 },
      'ucase': { name: 'UCase', paramCount: 1 },
      'lcase': { name: 'LCase', paramCount: 1 },
      'tcase': { name: 'TCase', paramCount: 1 },
      'length': { name: 'Length', paramCount: 1 },
      'trim': { name: 'Trim', paramCount: 1 },
      'substring': { name: 'SubString', paramCount: 3 },
      'isnullorempty': { name: 'IsNullOrEmpty', paramCount: 1 },
      'isnull': { name: 'IsNull', paramCount: 1 },
      'isempty': { name: 'IsEmpty', paramCount: 1 }
    };

    const func = functions[funcName] || { name: funcName, paramCount: 1 };

    return {
      category: 'Function',
      label: func.name,
      type: 'FunctionCall',
      name: func.name,
      paramCount: func.paramCount
    };
  }

  private createOperatorOption(opName: string): ExpressionOption {
    const operators: { [key: string]: string } = {
      'concat': '&',
      'add': '+',
      'subtract': '-',
      'multiply': '*',
      'divide': '/',
      'equals': '==',
      'not-equals': '!=',
      'greater': '>',
      'less': '<',
      'and': 'AND',
      'or': 'OR',
      'not': 'NOT'
    };

    const operator = operators[opName] || opName;
    const isUnary = ['NOT', '!', '+', '-'].includes(operator) && opName === 'not';

    return {
      category: 'Operator',
      label: operator,
      type: isUnary ? 'UnaryOp' : 'BinaryOp',
      operator: operator
    };
  }

  /**
   * Start editing a node
   */
  startEditing(path: number[]): void {
    this.editingNodePath = path;
  }

  /**
   * Check if a node is being edited
   */
  isEditing(path: number[]): boolean {
    return this.editingNodePath !== null &&
           this.editingNodePath.length === path.length &&
           this.editingNodePath.every((v, i) => v === path[i]);
  }

  /**
   * Stop editing
   */
  stopEditing(): void {
    this.editingNodePath = null;
  }

  /**
   * Update literal value
   */
  updateLiteral(path: number[], value: any): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'Literal') {
      if (node.dataType === 'number') {
        node.value = parseFloat(value);
      } else if (node.dataType === 'boolean') {
        node.value = value === true || value === 'true';
      } else {
        node.value = value;
      }
      this.updateGeneratedExpression();
    }
  }

  /**
   * Update variable name
   */
  updateVariable(path: number[], name: string): void {
    const node = this.getNodeAtPath(path);
    if (node && (node.type === 'Variable' || node.type === 'Identifier')) {
      node.name = name;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Update operator
   */
  updateOperator(path: number[], operator: string): void {
    if (!operator) return;

    // Handle clear action
    if (operator === 'clear') {
      this.clearNode(path);
      return;
    }

    const node = this.getNodeAtPath(path);
    if (node && (node.type === 'BinaryOp' || node.type === 'UnaryOp')) {
      node.operator = operator;
      this.updateGeneratedExpression();
    }
  }

  applyExpression(): void {
    this.expressionApplied.emit(this.generatedExpression);
  }

  reset(): void {
    this.initializeExpression();
  }

  getTypeOf(value: any): string {
    return typeof value;
  }

  hasPreviewResult(): boolean {
    return !this.previewError && this.previewResult !== null && this.previewResult !== undefined;
  }

  hasPreviewError(): boolean {
    return !!this.previewError;
  }

  isPreviewResultNull(): boolean {
    return !this.previewError && this.previewResult === null && !!this.generatedExpression;
  }

  /**
   * Change the type of literal at path
   */
  changeLiteralType(path: number[], dataType: string): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'Literal') {
      node.dataType = dataType;
      if (dataType === 'string') {
        node.value = '';
      } else if (dataType === 'number') {
        node.value = 0;
      } else if (dataType === 'boolean') {
        node.value = true;
      } else if (dataType === 'null') {
        node.value = null;
      }
      this.updateGeneratedExpression();
    }
  }

  /**
   * Change literal type or change to a different expression type
   */
  changeLiteralOrType(path: number[], optionKey: string): void {
    if (!optionKey) return;

    // Handle clear action
    if (optionKey === 'clear') {
      this.clearNode(path);
      return;
    }

    // If it's a literal type change (literal-string, literal-number, etc.)
    if (optionKey.startsWith('literal-')) {
      const dataType = optionKey.replace('literal-', '');
      this.changeLiteralType(path, dataType);
    } else {
      // Otherwise, replace with a different expression type
      this.replaceNode(path, optionKey);
    }
  }

  /**
   * Change variable to a different expression type
   */
  changeVariableOrType(path: number[], optionKey: string): void {
    if (!optionKey || optionKey === 'variable') return;
    if (optionKey === 'clear') {
      this.clearNode(path);
      return;
    }
    this.replaceNode(path, optionKey);
  }

  /**
   * Change function to a different function or expression type
   */
  changeFunctionOrType(path: number[], optionKey: string): void {
    if (!optionKey) return;
    if (optionKey === 'clear') {
      this.clearNode(path);
      return;
    }
    this.replaceNode(path, optionKey);
  }

  /**
   * Change control flow keyword (e.g., from If to Switch)
   */
  changeControlFlowType(path: number[], optionKey: string): void {
    if (!optionKey) return;
    if (optionKey === 'clear') {
      this.clearNode(path);
      return;
    }
    this.replaceNode(path, optionKey);
  }

  /**
   * Toggle the Else branch on/off, or add Else If
   */
  toggleElse(path: number[], action: string): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'If') {
      if (action === 'add-else') {
        // Add simple else branch
        node.alternate = { type: 'Empty', nodeType: 'primary' };
        this.updateGeneratedExpression();
      } else if (action === 'add-else-if') {
        // Add else-if (nested If statement)
        node.alternate = {
          type: 'If',
          nodeType: 'primary',
          condition: { type: 'Empty', nodeType: 'primary' },
          consequent: { type: 'Empty', nodeType: 'primary' },
          alternate: undefined
        };
        this.updateGeneratedExpression();
      } else if (action === 'remove-else') {
        // Remove else branch
        node.alternate = undefined;
        this.updateGeneratedExpression();
      } else if (action === 'convert-to-else') {
        // Convert Else If to simple Else (keep only the consequent)
        if (node.alternate && node.alternate.type === 'If') {
          node.alternate = node.alternate.consequent || { type: 'Empty', nodeType: 'primary' };
          this.updateGeneratedExpression();
        }
      } else if (action === 'convert-to-else-if') {
        // Convert simple Else to Else If
        if (node.alternate && node.alternate.type !== 'If') {
          const currentAlternate = node.alternate;
          node.alternate = {
            type: 'If',
            nodeType: 'primary',
            condition: { type: 'Empty', nodeType: 'primary' },
            consequent: currentAlternate,
            alternate: undefined
          };
          this.updateGeneratedExpression();
        }
      }
    }
  }

  /**
   * Toggle else on an alternate If node (for else-if chains)
   */
  toggleElseOnAlternate(path: number[], action: string): void {
    this.toggleElse(path, action);
  }

  /**
   * Add a new case to a switch statement
   */
  addSwitchCase(path: number[]): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'Switch') {
      if (!node.cases) {
        node.cases = [];
      }
      node.cases.push({
        test: { type: 'Empty', nodeType: 'primary' },
        consequent: { type: 'Empty', nodeType: 'primary' }
      });
      this.updateGeneratedExpression();
    }
  }

  /**
   * Remove a case from a switch statement
   */
  removeSwitchCase(path: number[], caseIndex: number): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'Switch' && node.cases && node.cases.length > 1) {
      node.cases.splice(caseIndex, 1);
      this.updateGeneratedExpression();
    }
  }

  /**
   * Add default case to switch statement
   */
  addSwitchDefault(path: number[]): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'Switch') {
      node.default = { type: 'Empty', nodeType: 'primary' };
      this.updateGeneratedExpression();
    }
  }

  /**
   * Remove default case from switch statement
   */
  removeSwitchDefault(path: number[]): void {
    const node = this.getNodeAtPath(path);
    if (node && node.type === 'Switch') {
      node.default = undefined;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Get the current function name as an option key
   */
  getFunctionOptionKey(funcName: string): string {
    const funcMap: { [key: string]: string } = {
      'Abs': 'func-abs',
      'Ceil': 'func-ceil',
      'Floor': 'func-floor',
      'Round': 'func-round',
      'Max': 'func-max',
      'Min': 'func-min',
      'UCase': 'func-ucase',
      'LCase': 'func-lcase',
      'TCase': 'func-tcase',
      'Length': 'func-length',
      'Trim': 'func-trim',
      'SubString': 'func-substring',
      'IsNullOrEmpty': 'func-isnullorempty',
      'IsNull': 'func-isnull',
      'IsEmpty': 'func-isempty'
    };
    return funcMap[funcName] || 'func-' + funcName.toLowerCase();
  }

  /**
   * Clear/delete a node by replacing it with an Empty node
   */
  clearNode(path: number[]): void {
    const emptyNode: ExpressionNode = { type: 'Empty', nodeType: 'primary' };

    // Special case: if clearing root, just replace it
    if (path.length === 0) {
      this.rootNode = emptyNode;
      this.updateGeneratedExpression();
      return;
    }

    // Otherwise, replace the node at the path
    this.updateNodeAtPath(path, emptyNode);
  }
}
