export class QLingoInterpreter {
  constructor(templateContext?: { [key: string]: any }, variables?: { [key: string]: any });
  execute(source: string): any;
}
