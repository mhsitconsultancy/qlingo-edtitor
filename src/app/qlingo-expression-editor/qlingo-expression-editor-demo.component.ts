import { Component } from '@angular/core';

/**
 * Demo component showing how to use the QLingo Expression Editor
 */
@Component({
  selector: 'app-qlingo-expression-editor-demo',
  template: `
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-12">
          <h2 class="mb-4">
            <i class="bi bi-code-square me-2"></i>
            QLingo Expression Editor Demo
          </h2>

          <div class="alert alert-info">
            <h5>About QLingo Expression Editor</h5>
            <p>
              This component provides a visual, structured way to build and edit QLingo expressions.
              Instead of typing code, you can use dropdowns and forms to construct expressions following
              the QLingo grammar rules.
            </p>
            <ul>
              <li>Parse existing expressions and edit them visually</li>
              <li>Context-aware options based on BNF grammar rules</li>
              <li>Support for all QLingo features: literals, variables, operators, functions, if/else, switch/case</li>
              <li>Live preview of expression results</li>
              <li>Switch between visual and text editing modes</li>
            </ul>
          </div>

          <!-- Example 1: Simple Expression -->
          <div class="card mb-4">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">Example 1: Simple Arithmetic Expression</h5>
            </div>
            <div class="card-body">
              <app-qlingo-expression-editor
                [expression]="example1"
                [availableVariables]="[]"
                [enablePreview]="true"
                (expressionApplied)="onExpressionApplied('Example 1', $event)">
              </app-qlingo-expression-editor>
            </div>
          </div>

          <!-- Example 2: Variables -->
          <div class="card mb-4">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0">Example 2: Using Variables</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-secondary mb-3">
                <strong>Available Variables:</strong> {{ example2Variables.join(', ') }}
                <br>
                <strong>Variable Values:</strong> {{ example2Values | json }}
              </div>
              <app-qlingo-expression-editor
                [expression]="example2"
                [availableVariables]="example2Variables"
                [variables]="example2Values"
                [enablePreview]="true"
                (expressionApplied)="onExpressionApplied('Example 2', $event)">
              </app-qlingo-expression-editor>
            </div>
          </div>

          <!-- Example 3: If/Then/Else -->
          <div class="card mb-4">
            <div class="card-header bg-warning">
              <h5 class="mb-0">Example 3: Conditional Logic (If/Then/Else)</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-secondary mb-3">
                <strong>Available Variables:</strong> {{ example3Variables.join(', ') }}
                <br>
                <strong>Variable Values:</strong> {{ example3Values | json }}
              </div>
              <app-qlingo-expression-editor
                [expression]="example3"
                [availableVariables]="example3Variables"
                [variables]="example3Values"
                [enablePreview]="true"
                (expressionApplied)="onExpressionApplied('Example 3', $event)">
              </app-qlingo-expression-editor>
            </div>
          </div>

          <!-- Example 4: Function Calls -->
          <div class="card mb-4">
            <div class="card-header bg-info text-white">
              <h5 class="mb-0">Example 4: Function Calls</h5>
            </div>
            <div class="card-body">
              <app-qlingo-expression-editor
                [expression]="example4"
                [availableVariables]="[]"
                [enablePreview]="true"
                (expressionApplied)="onExpressionApplied('Example 4', $event)">
              </app-qlingo-expression-editor>
            </div>
          </div>

          <!-- Example 5: Switch/Case -->
          <div class="card mb-4">
            <div class="card-header bg-danger text-white">
              <h5 class="mb-0">Example 5: Switch/Case Statement</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-secondary mb-3">
                <strong>Available Variables:</strong> {{ example5Variables.join(', ') }}
                <br>
                <strong>Variable Values:</strong> {{ example5Values | json }}
              </div>
              <app-qlingo-expression-editor
                [expression]="example5"
                [availableVariables]="example5Variables"
                [variables]="example5Values"
                [enablePreview]="true"
                (expressionApplied)="onExpressionApplied('Example 5', $event)">
              </app-qlingo-expression-editor>
            </div>
          </div>

          <!-- Example 6: Blank (Build from Scratch) -->
          <div class="card mb-4">
            <div class="card-header bg-secondary text-white">
              <h5 class="mb-0">Example 6: Build Your Own Expression</h5>
            </div>
            <div class="card-body">
              <div class="alert alert-secondary mb-3">
                <strong>Available Variables:</strong> {{ example6Variables.join(', ') }}
              </div>
              <app-qlingo-expression-editor
                [expression]="example6"
                [availableVariables]="example6Variables"
                [variables]="example6Values"
                [enablePreview]="true"
                (expressionApplied)="onExpressionApplied('Example 6', $event)">
              </app-qlingo-expression-editor>
            </div>
          </div>

          <!-- Applied Expressions Log -->
          <div class="card" *ngIf="appliedExpressions.length > 0">
            <div class="card-header">
              <h5 class="mb-0">
                <i class="bi bi-clock-history me-2"></i>
                Applied Expressions History
              </h5>
            </div>
            <div class="card-body">
              <div class="list-group">
                <div
                  *ngFor="let item of appliedExpressions; let i = index"
                  class="list-group-item">
                  <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">{{ item.name }}</h6>
                    <small class="text-muted">{{ item.timestamp | date:'short' }}</small>
                  </div>
                  <pre class="mb-0 mt-2"><code>{{ item.expression }}</code></pre>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    pre code {
      background: #f8f9fa;
      padding: 0.5rem;
      border-radius: 0.25rem;
      display: block;
      font-size: 0.85rem;
    }
  `]
})
export class QlingoExpressionEditorDemoComponent {

  // Example 1: Simple arithmetic
  example1 = '(5 + 3) * 2';

  // Example 2: Variables
  example2 = '@{firstName} & " " & @{lastName}';
  example2Variables = ['firstName', 'lastName', 'age'];
  example2Values = {
    firstName: 'John',
    lastName: 'Doe',
    age: 30
  };

  // Example 3: If/Then/Else
  example3 = 'If (@{age} >= 18) { "Adult" } Else { "Minor" }';
  example3Variables = ['age', 'name'];
  example3Values = {
    age: 25,
    name: 'Alice'
  };

  // Example 4: Function calls
  example4 = 'UCase("hello world")';

  // Example 5: Switch/Case
  example5 = 'Switch (@{dayOfWeek}) { Case 1: "Monday" Case 2: "Tuesday" Case 3: "Wednesday" Default: "Other Day" }';
  example5Variables = ['dayOfWeek'];
  example5Values = {
    dayOfWeek: 2
  };

  // Example 6: Blank
  example6 = '';
  example6Variables = ['name', 'age', 'email', 'score'];
  example6Values = {
    name: 'Test User',
    age: 42,
    email: 'test@example.com',
    score: 95
  };

  // Applied expressions history
  appliedExpressions: Array<{ name: string; expression: string; timestamp: Date }> = [];

  onExpressionApplied(name: string, expression: string): void {
    console.log(`Expression applied from ${name}:`, expression);
    this.appliedExpressions.unshift({
      name,
      expression,
      timestamp: new Date()
    });

    // Keep only last 10
    if (this.appliedExpressions.length > 10) {
      this.appliedExpressions = this.appliedExpressions.slice(0, 10);
    }

    // Show alert
    alert(`Expression applied from ${name}:\n\n${expression}`);
  }
}
