import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { QlingoExpressionEditorModule } from './qlingo-expression-editor/qlingo-expression-editor.module';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, QlingoExpressionEditorModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('qlingo-editor');
}
