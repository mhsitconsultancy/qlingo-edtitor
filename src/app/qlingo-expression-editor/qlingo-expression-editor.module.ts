import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QlingoExpressionEditorComponent } from './qlingo-expression-editor.component';
import { QlingoExpressionEditorInlineComponent } from './qlingo-expression-editor-inline.component';
import { QlingoExpressionEditorDemoComponent } from './qlingo-expression-editor-demo.component';
import { QLingoExpressionBuilderService } from '../../services/qlingo-expression-builder.service';

@NgModule({
  declarations: [
    QlingoExpressionEditorComponent,
    QlingoExpressionEditorInlineComponent,
    QlingoExpressionEditorDemoComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  providers: [
    QLingoExpressionBuilderService
  ],
  exports: [
    QlingoExpressionEditorComponent,
    QlingoExpressionEditorInlineComponent,
    QlingoExpressionEditorDemoComponent
  ]
})
export class QlingoExpressionEditorModule { }
