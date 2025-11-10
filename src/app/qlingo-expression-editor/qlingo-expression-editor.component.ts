import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  QLingoExpressionBuilderService,
  ExpressionNode,
  ExpressionOption,
  ExpressionContext
} from '../qlingo-expression-builder.service';
import { QLingoInterpreter } from '../qlingo-interpreter';

/**
 * Interactive structured editor for QLingo expressions
 * Allows users to build/edit expressions using dropdowns and forms
 * instead of typing raw QLingo code
 */
@Component({
  selector: 'app-qlingo-expression-editor',
  templateUrl: './qlingo-expression-editor.component.html',
  styleUrls: ['./qlingo-expression-editor.component.scss'],
  standalone: false
})
export class QlingoExpressionEditorComponent implements OnInit {

  /**
   * Input: Initial QLingo expression to parse and edit
   */
  @Input() expression: string = '';

  /**
   * Input: Available variables that can be referenced
   */
  @Input() availableVariables: string[] = [];

  /**
   * Input: Template context for resolving @@markers@@
   */
  @Input() templateContext: any = {};

  /**
   * Input: Variable values for testing/preview
   */
  @Input() variables: any = {};

  /**
   * Input: Enable live preview/evaluation
   */
  @Input() enablePreview: boolean = true;

  /**
   * Output: Emits when expression changes
   */
  @Output() expressionChange = new EventEmitter<string>();

  /**
   * Output: Emits when expression is valid and user clicks apply
   */
  @Output() expressionApplied = new EventEmitter<string>();

  // Component state
  rootNode: ExpressionNode | null = null;
  selectedNode: ExpressionNode | null = null;
  selectedNodePath: number[] = [];
  generatedExpression: string = '';
  previewResult: any = null;
  previewError: string | null = null;
  editMode: 'visual' | 'text' = 'visual';
  textExpression: string = '';

  // Store the original text to preserve formatting until edited
  private originalTextExpression: string = '';
  private expressionWasEdited: boolean = false;

  // UI state
  showNodeOptions: boolean = false;
  availableOptions: ExpressionOption[] = [];
  optionsByCategory: Map<string, ExpressionOption[]> = new Map();

  constructor(
    private expressionBuilder: QLingoExpressionBuilderService
  ) { }

  ngOnInit(): void {
    this.initializeExpression();
  }

  /**
   * Parse the input expression or create a new empty one
   */
  initializeExpression(): void {
    try {
      // Store the original expression to preserve formatting
      if (this.expression && this.expression.trim()) {
        this.originalTextExpression = this.expression;
        this.rootNode = this.expressionBuilder.parseExpression(
          this.expression,
          this.templateContext,
          this.variables
        );
      } else {
        // Start with an empty expression
        this.originalTextExpression = '';
        this.rootNode = { type: 'Empty', nodeType: 'primary' };
      }
      this.selectedNode = this.rootNode;
      this.selectedNodePath = [];
      this.expressionWasEdited = false;
      this.updateGeneratedExpression();
    } catch (error: any) {
      console.error('Failed to parse expression:', error);
      // Fall back to empty expression
      this.rootNode = { type: 'Empty', nodeType: 'primary' };
      this.selectedNode = this.rootNode;
      this.selectedNodePath = [];
      this.expressionWasEdited = false;
    }
  }

  /**
   * Regenerate the QLingo expression from the tree
   */
  updateGeneratedExpression(): void {
    if (this.rootNode) {
      this.generatedExpression = this.expressionBuilder.nodeToExpression(this.rootNode);
      this.expressionChange.emit(this.generatedExpression);

      // Update preview if enabled
      if (this.enablePreview) {
        this.updatePreview();
      }
    }
  }

  /**
   * Evaluate the expression and show the result
   */
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
   * Select a node for editing
   */
  selectNode(node: ExpressionNode, path: number[]): void {
    this.selectedNode = node;
    this.selectedNodePath = [...path];
    this.showNodeOptions = false;
  }

  /**
   * Show options to replace/modify the selected node
   */
  showOptionsForNode(node: ExpressionNode): void {
    const context: ExpressionContext = {
      expectedType: 'expression',
      availableVariables: this.availableVariables,
      isRoot: node === this.rootNode,
      parentNode: this.getParentNode(this.selectedNodePath)
    };

    this.availableOptions = this.expressionBuilder.getValidOptions(context);
    this.groupOptionsByCategory();
    this.showNodeOptions = true;
  }

  /**
   * Group options by category for easier navigation
   */
  private groupOptionsByCategory(): void {
    this.optionsByCategory.clear();

    this.availableOptions.forEach(option => {
      if (!this.optionsByCategory.has(option.category)) {
        this.optionsByCategory.set(option.category, []);
      }
      this.optionsByCategory.get(option.category)!.push(option);
    });
  }

  /**
   * Replace the selected node with a new node type
   */
  replaceNodeWithOption(option: ExpressionOption): void {
    if (!this.selectedNode) return;

    const newNode = this.expressionBuilder.createEmptyNode(option);

    // Replace the node in the tree
    if (this.selectedNodePath.length === 0) {
      // Replacing root
      this.rootNode = newNode;
      this.selectedNode = newNode;
    } else {
      // Replace child node
      this.replaceNodeAtPath(this.rootNode!, this.selectedNodePath, newNode);
      this.selectedNode = newNode;
    }

    this.showNodeOptions = false;
    this.expressionWasEdited = true;
    this.updateGeneratedExpression();
  }

  /**
   * Replace a node at a specific path in the tree
   */
  private replaceNodeAtPath(root: ExpressionNode, path: number[], newNode: ExpressionNode): void {
    if (path.length === 0) return;

    let current = root;
    for (let i = 0; i < path.length - 1; i++) {
      current = this.getChildNode(current, path[i])!;
    }

    this.setChildNode(current, path[path.length - 1], newNode);
  }

  /**
   * Get a child node by index
   */
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
      if (index < node.cases!.length * 2) {
        const caseIndex = Math.floor(index / 2);
        return index % 2 === 0 ? node.cases![caseIndex].test : node.cases![caseIndex].consequent;
      } else {
        return node.default!;
      }
    } else if (node.type === 'Block') {
      return node.body![index];
    }
    return null;
  }

  /**
   * Set a child node by index
   */
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
      if (index < node.cases!.length * 2) {
        const caseIndex = Math.floor(index / 2);
        if (index % 2 === 0) {
          node.cases![caseIndex].test = newNode;
        } else {
          node.cases![caseIndex].consequent = newNode;
        }
      } else {
        node.default = newNode;
      }
    } else if (node.type === 'Block') {
      node.body![index] = newNode;
    }
  }

  /**
   * Get the parent node of the current selection
   */
  private getParentNode(path: number[]): ExpressionNode | undefined {
    if (path.length <= 1) return undefined;

    let current = this.rootNode!;
    for (let i = 0; i < path.length - 1; i++) {
      current = this.getChildNode(current, path[i])!;
    }
    return current;
  }

  /**
   * Get the type of a value for display
   */
  getTypeOf(value: any): string {
    return typeof value;
  }

  /**
   * Check if preview has a successful result
   */
  hasPreviewResult(): boolean {
    return !this.previewError && this.previewResult !== null && this.previewResult !== undefined;
  }

  /**
   * Check if preview has an error
   */
  hasPreviewError(): boolean {
    return !!this.previewError;
  }

  /**
   * Check if preview result is null
   */
  isPreviewResultNull(): boolean {
    return !this.previewError && this.previewResult === null && !!this.generatedExpression;
  }

  /**
   * Update a literal value
   */
  updateLiteralValue(node: ExpressionNode, value: any): void {
    if (node.type === 'Literal') {
      if (node.dataType === 'number') {
        node.value = parseFloat(value);
      } else if (node.dataType === 'boolean') {
        node.value = value === true || value === 'true' || value === 'TRUE';
      } else {
        node.value = value;
      }
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Update a variable name
   */
  updateVariableName(node: ExpressionNode, name: string): void {
    if (node.type === 'Variable' || node.type === 'Identifier') {
      node.name = name;
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Update an operator
   */
  updateOperator(node: ExpressionNode, operator: string): void {
    if (node.type === 'BinaryOp' || node.type === 'UnaryOp') {
      node.operator = operator;
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Add a new case to a switch statement
   */
  addSwitchCase(node: ExpressionNode): void {
    if (node.type === 'Switch') {
      node.cases!.push({
        test: { type: 'Empty', nodeType: 'primary' },
        consequent: { type: 'Empty', nodeType: 'primary' }
      });
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Remove a case from a switch statement
   */
  removeSwitchCase(node: ExpressionNode, index: number): void {
    if (node.type === 'Switch' && node.cases!.length > 1) {
      node.cases!.splice(index, 1);
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Add a new argument to a function call
   */
  addFunctionArg(node: ExpressionNode): void {
    if (node.type === 'FunctionCall') {
      node.args!.push({ type: 'Empty', nodeType: 'primary' });
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Remove an argument from a function call
   */
  removeFunctionArg(node: ExpressionNode, index: number): void {
    if (node.type === 'FunctionCall' && node.args!.length > 0) {
      node.args!.splice(index, 1);
      this.expressionWasEdited = true;
      this.updateGeneratedExpression();
    }
  }

  /**
   * Get a human-readable label for a node
   */
  getNodeLabel(node: ExpressionNode): string {
    if (!node) return '';

    switch (node.type) {
      case 'Empty':
        return '[ Click to add ]';
      case 'Literal':
        if (node.dataType === 'string') return `"${node.value}"`;
        if (node.dataType === 'null') return 'NULL';
        return String(node.value);
      case 'Variable':
        return `@{${node.name || '?'}}`;
      case 'Identifier':
        return node.name || '?';
      case 'BinaryOp':
        return `... ${node.operator} ...`;
      case 'UnaryOp':
        return `${node.operator} ...`;
      case 'FunctionCall':
        return `${node.name}(...)`;
      case 'If':
        return 'If/Then/Else';
      case 'Switch':
        return 'Switch/Case';
      case 'Block':
        return '{ ... }';
      default:
        return node.type;
    }
  }

  /**
   * Switch between visual and text editing modes
   */
  switchMode(mode: 'visual' | 'text'): void {
    if (mode === 'text' && this.editMode === 'visual') {
      // Switching to text mode - preserve original formatting if not edited
      if (this.expressionWasEdited) {
        this.textExpression = this.generatedExpression;
        this.originalTextExpression = this.generatedExpression;
      } else {
        this.textExpression = this.originalTextExpression;
      }
    } else if (mode === 'visual' && this.editMode === 'text') {
      // Switching to visual mode - parse text and store as original
      try {
        this.originalTextExpression = this.textExpression;
        this.expression = this.textExpression;
        this.expressionWasEdited = false;
        this.initializeExpression();
      } catch (error: any) {
        alert('Failed to parse expression: ' + error.message);
        return;
      }
    }
    this.editMode = mode;
  }

  /**
   * Handle expression change from inline editor
   */
  onInlineExpressionChange(expression: string): void {
    this.generatedExpression = expression;
    this.expressionWasEdited = true;
    this.expressionChange.emit(expression);
  }

  /**
   * Apply the expression
   */
  applyExpression(): void {
    this.expressionApplied.emit(this.generatedExpression);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.initializeExpression();
  }

  /**
   * Get CSS class for node based on type
   */
  getNodeClass(node: ExpressionNode): string {
    const classes = ['expression-node'];
    classes.push(`node-${node.nodeType}`);
    if (node === this.selectedNode) {
      classes.push('selected');
    }
    if (node.type === 'Empty') {
      classes.push('empty');
    }
    return classes.join(' ');
  }
}
