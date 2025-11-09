import {HttpClient} from "@angular/common/http";
import {Inject, Injectable} from "@angular/core";
import {QLingoInterpreter} from "./qlingo-interpreter";

@Injectable({providedIn: 'root'})
export class QlingoService {
  constructor(
    private http: HttpClient,
    @Inject('BASE_URL') public baseUrl: string)
  {
  }

  public evaluateAdor(
    definition: string,
    context: { [key: string]: any } = {},
    variables: { [key: string]: any } = {}
  ): { value?: any, error?: string } {
    try {
      const interpreter = new QLingoInterpreter(context, variables);
      const value = interpreter.execute(definition || '');
      return { value };
    } catch (e: any) {
      return { error: e?.message || String(e) };
    }
  }
}


