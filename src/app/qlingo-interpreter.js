export class QLingoInterpreter {
  constructor(templateContext = {}, variables = {}) {
    this.variables = { ...variables };
    this.functions = this.getBuiltInFunctions();
    this.templateContext = templateContext; // External template values
  }

  // Built-in functions
  getBuiltInFunctions() {
    return {
      // NUMERIC FUNCTIONS
      Abs: (n) => Math.abs(Number(n)),
      Ceil: (n) => Math.ceil(Number(n)),
      Floor: (n) => Math.floor(Number(n)),
      Round: (n, decimals = 0) => {
        const num = Number(n);
        const d = Number(decimals);
        if (isNaN(num) || isNaN(d)) return NaN;
        const factor = Math.pow(10, d);
        return Math.round(num * factor) / factor;
      },
      Int: (n) => {
        const num = Number(n);
        if (isNaN(num)) return NaN;
        return num < 0 ? Math.ceil(num) : Math.floor(num);
      },
      Sqrt: (n) => {
        const num = Number(n);
        return num >= 0 ? Math.sqrt(num) : NaN;
      },
      Max: (...args) => {
        const nums = args.map(a => Number(a));
        return Math.max.apply(null, nums);
      },
      Min: (...args) => {
        const nums = args.map(a => Number(a));
        return Math.min.apply(null, nums);
      },
      Power: (base, exp) => Math.pow(Number(base), Number(exp)),
      Mod: (n, m) => {
        const a = Number(n);
        const b = Number(m);
        return b === 0 ? NaN : (a % b);
      },
      RandomBetween: (min, max) => {
        const a = Number(min);
        const b = Number(max);
        if (isNaN(a) || isNaN(b)) return NaN;
        return Math.floor(Math.random() * (b - a + 1)) + a;
      },
      /* FormatNumber might be part of the numeric functions list */
      FormatNumber: (n, decimals = 0, decimalSeparator = '.', thousandsSeparator = ',') => {
        const num = Number(n);
        const d = Number(decimals);
        if (isNaN(num) || isNaN(d)) return '';
        const fixed = num.toFixed(d);
        const parts = fixed.split('.');
        let intPart = parts[0];
        const fracPart = parts[1] ? decimalSeparator + parts[1] : '';
        // add thousands separator
        intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        return intPart + fracPart;
      },

      // DATE FUNCTIONS
      Now: () => new Date(),

      // Extract day of month
      GetDay: (date) => {
        const d = new Date(date);
        return d.getDate();
      },

      // Extract month number (1‑12)
      GetMonth: (date) => {
        const d = new Date(date);
        return d.getMonth() + 1;
      },

      // Extract full year (e.g., 2025)
      GetYear: (date) => {
        const d = new Date(date);
        return d.getFullYear();
      },

      // Extract day of week (1‑7 or 0‑6 depending spec) – let's assume 1=Sunday, 7=Saturday
      GetDayOfWeek: (date) => {
        const d = new Date(date);
        // JavaScript: getDay() returns 0 for Sunday, 6 for Saturday
        return d.getDay() + 1;
      },

      // Extract hour (0‑23)
      GetHour: (date) => {
        const d = new Date(date);
        return d.getHours();
      },

      // Extract minute (0‑59)
      GetMinute: (date) => {
        const d = new Date(date);
        return d.getMinutes();
      },

      // Extract second (0‑59)
      GetSecond: (date) => {
        const d = new Date(date);
        return d.getSeconds();
      },

      // Age: difference in years between date and now (or other date) — you may need spec‑adjustment
      Age: (birthDate, asOfDate = new Date()) => {
        const b = new Date(birthDate);
        const a = new Date(asOfDate);
        let age = a.getFullYear() - b.getFullYear();
        // adjust if before birthday this year
        const m = a.getMonth() - b.getMonth();
        const d = a.getDate() - b.getDate();
        if (m < 0 || (m === 0 && d < 0)) {
          age--;
        }
        return age;
      },

      // FormatDate: convert a Date to a string via given format (spec dependent)
      // Simple implementation supporting yyyy, MM, dd, HH, mm, ss
      FormatDate: (date, formatStr = "yyyy‑MM‑dd HH:mm:ss") => {
        const d = new Date(date);
        const zeroPad = (num, len = 2) => String(num).padStart(len, '0');
        const replacements = {
          yyyy: d.getFullYear(),
          yy: String(d.getFullYear()).slice(-2),
          MM: zeroPad(d.getMonth() + 1),
          M: d.getMonth() + 1,
          dd: zeroPad(d.getDate()),
          d: d.getDate(),
          HH: zeroPad(d.getHours()),
          H: d.getHours(),
          mm: zeroPad(d.getMinutes()),
          m: d.getMinutes(),
          ss: zeroPad(d.getSeconds()),
          s: d.getSeconds()
        };
        let result = formatStr;
        for (const key in replacements) {
          result = result.replace(new RegExp(key, 'g'), replacements[key]);
        }
        return result;
      },

      // DateAdd: add interval (days/hours/minutes) to date – spec may define interval type
      DateAdd: (date, intervalType, amount) => {
        const d = new Date(date);
        const amt = Number(amount);
        switch (intervalType.toLowerCase()) {
          case 'years':
          case 'year':
            d.setFullYear(d.getFullYear() + amt);
            break;
          case 'months':
          case 'month':
            d.setMonth(d.getMonth() + amt);
            break;
          case 'days':
          case 'day':
            d.setDate(d.getDate() + amt);
            break;
          case 'hours':
          case 'hour':
            d.setHours(d.getHours() + amt);
            break;
          case 'minutes':
          case 'minute':
            d.setMinutes(d.getMinutes() + amt);
            break;
          case 'seconds':
          case 'second':
            d.setSeconds(d.getSeconds() + amt);
            break;
          default:
            throw new Error(`Unknown interval type: ${intervalType}`);
        }
        return d;
      },

      // DateDiff: difference between two dates in given units (days, months, years)
      DateDiff: (date1, date2, intervalType) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        switch (intervalType.toLowerCase()) {
          case 'years':
          case 'year':
            return d2.getFullYear() - d1.getFullYear();
          case 'months':
          case 'month':
            return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
          case 'days':
          case 'day':
            return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
          case 'hours':
          case 'hour':
            return Math.floor((d2 - d1) / (1000 * 60 * 60));
          case 'minutes':
          case 'minute':
            return Math.floor((d2 - d1) / (1000 * 60));
          case 'seconds':
          case 'second':
            return Math.floor((d2 - d1) / 1000);
          default:
            throw new Error(`Unknown interval type: ${intervalType}`);
        }
      },

      // CONVERSION FUNCTIONS
      // Convert to Boolean: truthy/falsy logic
      AsBoolean: (value) => {
        // Treat strings “true”, “false”, “1”, “0” specially
        if (typeof value === 'string') {
          const s = value.trim().toLowerCase();
          if (s === 'true' || s === '1') return true;
          if (s === 'false' || s === '0' || s === '') return false;
        }
        return Boolean(value);
      },

      // Convert to Number: parse string or other types
      AsNumber: (value) => {
        const n = Number(value);
        return isNaN(n) ? 0 : n;
      },

      // Convert to String: simply stringify value
      AsString: (value) => {
        if (value === null || value === undefined) return '';
        return String(value);
      },

      // Convert to Date: parse string or accept Date object
      AsDate: (value) => {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          // invalid date; depending on spec you may return null or throw
          return null;
        }
        return d;
      },

      // STRING FUNCTIONS
      // Converts all uppercase letters in the input to lowercase.
      LCase: (str) => {
        return String(str).toLowerCase();
      },

      // Converts all lowercase letters in the input to uppercase.
      UCase: (str) => {
        return String(str).toUpperCase();
      },

      // Title‑case: first letter of each word uppercase, remaining letters lowercase.
      TCase: (str) => {
        const s = String(str);
        return s.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      },

      // Returns the number of characters in the input (treated as string).
      Length: (str) => {
        return String(str).length;
      },

      // Returns true if input is null, undefined or empty string.
      IsNullOrEmpty: (str) => {
        return (str === null || str === undefined || String(str) === '');
      },

      // Returns a substring of the input: starting at index (zero‑based), for length chars. If length = ‑1, returns rest.
      SubString: (str, start, len) => {
        const s = String(str);
        const st = parseInt(start, 10);
        if (isNaN(st) || st < 0) return '';
        if (len === -1) {
          return s.substring(st);
        } else {
          const l = parseInt(len, 10);
          if (isNaN(l) || l < 0) return '';
          return s.substring(st, st + l);
        }
      },

      // Removes whitespace from both start and end.
      Trim: (str) => {
        return String(str).trim();
      },

      // Removes whitespace from the left side.
      LTrim: (str) => {
        return String(str).replace(/^[\s]+/, '');
      },

      // Removes whitespace from the right side.
      RTrim: (str) => {
        return String(str).replace(/[\s]+$/, '');
      },

      // Returns zero‐based index of search inside str, starting at index (zero‑based). Returns ‑1 if not found. Case‐sensitive.
      Find: (str, search, startIndex) => {
        const s = String(str);
        const find = String(search);
        const si = parseInt(startIndex, 10) || 0;
        if (si < 0 || si >= s.length) return -1;
        return s.indexOf(find, si);
      },

      // Replaces at position: in str, starting at index (zero‑based) replace numChars characters with newText.
      Replace: (str, newText, startIndex, numChars) => {
        const s = String(str);
        const si = parseInt(startIndex, 10) || 0;
        const nc = parseInt(numChars, 10) || 0;
        if (si < 0) return s;
        return s.substring(0, si) + String(newText) + s.substring(si + nc);
      },

      // Searches for searchText in str and replaces *all* occurrences with replaceText (case‐sensitive).
      FindAndReplace: (str, searchText, replaceText) => {
        const s = String(str);
        const st = String(searchText);
        const rt = String(replaceText);
        // Escape the searchText for use in RegExp
        const esc = st.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        return s.replace(new RegExp(esc, 'g'), rt);
      },

      // For each character in charsToFind, replace with replaceWith in str.
      FindAndReplaceChars: (str, charsToFind, replaceWith) => {
        const s = String(str);
        const ctf = String(charsToFind);
        const rw = String(replaceWith);
        // Create regex class of each char in charsToFind, escaping regex‐metas
        const escChars = ctf.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp('[' + escChars + ']', 'g');
        return s.replace(regex, rw);
      },

      // Returns the text from str that matches the given regular expression.
      // If firstMatchOnly = true, return only first match; else return all matches concatenated (maybe joined).
      FindByRegExp: (str, pattern, firstMatchOnly) => {
        const s = String(str);
        const pat = String(pattern);
        const regex = new RegExp(pat, 'g');
        if (firstMatchOnly) {
          const m = s.match(regex);
          return m ? m[0] : '';
        } else {
          const m = s.match(regex);
          return m ? m.join('') : '';
        }
      },

      // Find occurrences matching regex, replace them with replaceWith. If firstMatchOnly = true then only the first occurrence is replaced, else all.
      FindAndReplaceByRegExp: (str, pattern, replaceWith, firstMatchOnly) => {
        const s = String(str);
        const pat = String(pattern);
        const rw = String(replaceWith);
        if (firstMatchOnly) {
          const regex = new RegExp(pat);
          return s.replace(regex, rw);
        } else {
          const regex = new RegExp(pat, 'g');
          return s.replace(regex, rw);
        }
      },

      // Remove all non‐digit characters from the string and return only digits (as string).
      CleanNumber: (str) => {
        const s = String(str);
        const digits = s.replace(/\D+/g, '');
        return digits;
      },

      // Remove characters not recommended in URL from key. Unsafe chars: space " ", single quote ', double quote ", colon :, question mark ?, ampersand &, asterisk *, pound/hash #, less‐than <, greater‐than >, pipe |.
      // If replaceWith is provided, replace them; else remove them.
      CleanRecipientKey: (str, replaceWith = '') => {
        const s = String(str);
        // define unsafe chars set
        const unsafe = /[ '\":\?\&\*\#\<\>\|]/g;
        return s.replace(unsafe, replaceWith);
      },

      // Generate a unique, non‐guessable secure ID: e.g., a UUID or random hex string.
      SecureID: () => {
        // Simple implementation: random 128‑bit hex (32 chars)
        const hex = () => Math.floor((1 + Math.random()) * 0x100000000).toString(16).substring(1);
        return (hex() + hex() + hex() + hex());
      },

      // Convert string of hex values into their Unicode character equivalents. Each sequence of four hex digits is converted.
      HexToUnicode: (hexString) => {
        let s = String(hexString).replace(/\s+/g, '');
        // pad with leading zeros so length %4 = 0
        if (s.length % 4 !== 0) {
          s = s.padStart(s.length + (4 - (s.length % 4)), '0');
        }
        let result = '';
        for (let i = 0; i < s.length; i += 4) {
          const code = parseInt(s.substr(i, 4), 16);
          result += String.fromCharCode(code);
        }
        return result;
      },

      // Encode string for URL (percent‐encode reserved characters).
      HtmlEncode: (str) => {
        const s = String(str);
        // Using built‐in encodeURIComponent for simplicity
        return encodeURIComponent(s);
      },

      translate: (lang, value) => {
        return lang + ':' + value;
      }
    };
  }

  // Execute QLingo source code
  execute(source) {
    // Pre-process template markers
    const processedSource = this.processTemplateMarkers(source);

    // Tokenize
    const tokens = this.tokenize(processedSource);

    // Parse
    const ast = this.parse(tokens);

    // Evaluate
    return this.evaluate(ast);
  }

  // Process external template markers like @@Language@@, @@Counter@@, @@Counter:00@@
  processTemplateMarkers(source) {
    return source.replace(/@@([^@:]+)(?::([^@]+))?@@/g, (match, marker, format) => {
      const value = this.templateContext[marker];

      if (value === undefined) {
        throw new Error(`Template marker not found: ${marker}`);
      }

      // Apply format if specified
      if (format && typeof value === 'number') {
        // Numeric formatting (e.g., 00 for zero-padded)
        const padding = format.length;
        return String(value).padStart(padding, '0');
      }

      // Check if we're inside a string literal by looking at context
      // For safety, we'll return raw values and let the parser handle typing
      // This works because the tokenizer will properly parse the result

      // For strings: return the raw value without quotes
      // The tokenizer will see it as part of the string if it's within quotes
      if (typeof value === 'string') {
        // Escape any quotes in the value to prevent breaking the string
        return value.replace(/"/g, '\\"').replace(/'/g, "\\'");
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      } else if (value === null) {
        return 'NULL';
      }

      return String(value);
    });
  }

  // Tokenizer
  tokenize(source) {
    const tokens = [];
    let i = 0;

    // Comments
    source = source.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    while (i < source.length) {
      let char = source[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        const quote = char;
        let str = '';
        i++;
        while (i < source.length && source[i] !== quote) {
          if (source[i] === '\\' && i + 1 < source.length) {
            i++;
            str += source[i];
          } else {
            str += source[i];
          }
          i++;
        }
        i++; // Skip closing quote
        tokens.push({ type: 'STRING', value: str });
        continue;
      }

      // Numbers
      if (/\d/.test(char)) {
        let num = '';
        while (i < source.length && /[\d.]/.test(source[i])) {
          num += source[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(num) });
        continue;
      }

      // Operators and symbols
      if ('(){}[],;:'.includes(char)) {
        tokens.push({ type: char, value: char });
        i++;
        continue;
      }

      // Two-character operators
      const twoChar = source.substr(i, 2);
      if (['==', '!=', '<=', '>=', '||', '&&'].includes(twoChar)) {
        tokens.push({ type: 'OPERATOR', value: twoChar });
        i += 2;
        continue;
      }

      // Single-character operators
      if ('+-*/%^<>=!&'.includes(char)) {
        var char2 = char === '=' ? '==' : char;
        tokens.push({ type: 'OPERATOR', value: char2 });
        i++;
        continue;
      }

      // Variable references @{name}
      if (char === '@' && i + 1 < source.length && source[i + 1] === '{') {
        i += 2;
        let varName = '';
        while (i < source.length && source[i] !== '}') {
          varName += source[i];
          i++;
        }
        i++; // Skip closing }
        tokens.push({ type: 'VARIABLE', value: varName });
        continue;
      }

      // Data binding references like |->[FieldName]
      if (char === '|' && source.substr(i, 3) === '|->') {
        i += 3; // skip '|->'
        if (source[i] === '[') {
          i++; // skip '['
          let fieldName = '';
          while (i < source.length && source[i] !== ']') {
            fieldName += source[i];
            i++;
          }
          i++; // skip closing ']'
          tokens.push({ type: 'VARIABLE', value: fieldName.trim() });
          continue;
        }
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
          ident += source[i];
          i++;
        }

        const upper = ident.toUpperCase();
        const keywords = ['IF', 'THEN', 'ELSE', 'ELSEIF', 'ENDIF', 'SWITCH', 'CASE',
          'DEFAULT', 'ENDSWITCH', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE'];

        if (keywords.includes(upper)) {
          tokens.push({ type: upper, value: upper });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: ident });
        }
        continue;
      }

      i++;
    }

    return tokens;
  }

  // Parser
  parse(tokens) {
    let pos = 0;

    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    const expect = (type) => {
      const token = consume();
      if (!token || (token.type !== type && token.value !== type)) {
        throw new Error(`Expected ${type} but got ${token ? token.type : 'EOF'}`);
      }
      return token;
    };

    const parseExpression = () => {
      return parseLogicalOr();
    };

    const parseLogicalOr = () => {
      let left = parseLogicalAnd();

      while (peek() && peek().type === 'OR') {
        consume();
        const right = parseLogicalAnd();
        left = { type: 'BinaryOp', op: 'OR', left, right };
      }

      return left;
    };

    const parseLogicalAnd = () => {
      let left = parseLogicalNot();

      while (peek() && peek().type === 'AND') {
        consume();
        const right = parseLogicalNot();
        left = { type: 'BinaryOp', op: 'AND', left, right };
      }

      return left;
    };

    const parseLogicalNot = () => {
      if (peek() && peek().type === 'NOT') {
        consume();
        return { type: 'UnaryOp', op: 'NOT', operand: parseLogicalNot() };
      }
      return parseComparison();
    };

    const parseComparison = () => {
      let left = parseAdditive();

      while (peek() && peek().type === 'OPERATOR' &&
      ['==', '!=', '<', '>', '<=', '>='].includes(peek().value)) {
        const op = consume().value;
        const right = parseAdditive();
        left = { type: 'BinaryOp', op, left, right };
      }

      return left;
    };

    const parseAdditive = () => {
      let left = parseMultiplicative();

      while (peek() && peek().type === 'OPERATOR' && ['+', '-', '&'].includes(peek().value)) {
        const op = consume().value;
        const right = parseMultiplicative();
        left = { type: 'BinaryOp', op, left, right };
      }

      return left;
    };

    const parseMultiplicative = () => {
      let left = parseExponential();

      while (peek() && peek().type === 'OPERATOR' && ['*', '/', '%'].includes(peek().value)) {
        const op = consume().value;
        const right = parseExponential();
        left = { type: 'BinaryOp', op, left, right };
      }

      return left;
    };

    const parseExponential = () => {
      let left = parseUnary();

      while (peek() && peek().type === 'OPERATOR' && peek().value === '^') {
        consume();
        const right = parseUnary();
        left = { type: 'BinaryOp', op: '^', left, right };
      }

      return left;
    };

    const parseUnary = () => {
      if (peek() && peek().type === 'OPERATOR' && ['+', '-', '!'].includes(peek().value)) {
        const op = consume().value;
        return { type: 'UnaryOp', op, operand: parseUnary() };
      }
      return parsePrimary();
    };

    const parsePrimary = () => {
      const token = peek();

      if (!token) {
        throw new Error('Unexpected end of input');
      }

      // Parenthesized expression
      if (token.type === '(') {
        consume();
        const expr = parseExpression();
        expect(')');
        return expr;
      }

      // Literals
      if (token.type === 'STRING') {
        consume();
        return { type: 'Literal', value: token.value, dataType: 'string' };
      }

      if (token.type === 'NUMBER') {
        consume();
        return { type: 'Literal', value: token.value, dataType: 'number' };
      }

      if (token.type === 'TRUE' || token.type === 'FALSE') {
        consume();
        return { type: 'Literal', value: token.type === 'TRUE', dataType: 'boolean' };
      }

      if (token.type === 'NULL') {
        consume();
        return { type: 'Literal', value: null, dataType: 'null' };
      }

      // Variable reference
      if (token.type === 'VARIABLE') {
        consume();
        return { type: 'Variable', name: token.value };
      }

      // If statement (either legacy or C-style)
      if (token.type === 'IF') {
        return parseIf();
      }

      // Switch statement
      if (token.type === 'SWITCH') {
        return parseSwitch();
      }

      // Function call or identifier
      if (token.type === 'IDENTIFIER') {
        const name = consume().value;

        if (peek() && peek().type === '(') {
          consume();
          const args = [];

          if (peek() && peek().type !== ')') {
            args.push(parseExpression());

            while (peek() && peek().type === ',') {
              consume();
              args.push(parseExpression());
            }
          }

          expect(')');
          return { type: 'FunctionCall', name, args };
        }

        return { type: 'Identifier', name };
      }

      throw new Error(`Unexpected token: ${token.type}`);
    };

    // Parses a block: { expr; expr; ... } and returns a Block node (returns last expr value on evaluation)
    const parseBlock = () => {
      expect('{');
      const body = [];

      while (peek() && peek().type !== '}') {
        // Parse expressions inside block; allow optional semicolons
        const expr = parseExpression();
        body.push(expr);

        // consume optional semicolon separators
        if (peek() && peek().type === ';') {
          consume();
        } else {
          // If next token starts a new expression (IDENTIFIER, STRING, NUMBER, VARIABLE, IF, etc.) continue,
          // otherwise the while condition will handle it (like encountering '}' or 'ELSE').
        }
      }

      expect('}');
      return { type: 'Block', body };
    };

    // Parse If supporting both legacy and C-style syntax
    const parseIf = () => {
      expect('IF');

      // If next token is '(' => C-style If (condition) { ... } Else { ... }
      if (peek() && peek().type === '(') {
        consume(); // consume '('
        const condition = parseExpression();
        expect(')');

        // Expect a block for consequent (C-like)
        let consequent = null;
        if (peek() && peek().type === '{') {
          consequent = parseBlock();
        } else {
          // allow single-expression consequent as convenience
          consequent = parseExpression();
        }

        // Else branch - optional
        let alternate = null;
        if (peek() && peek().type === 'ELSE') {
          consume();
          if (peek() && peek().type === '{') {
            alternate = parseBlock();
          } else {
            alternate = parseExpression();
          }
        }

        return { type: 'If', condition, consequent, alternate };
      }

      // Otherwise, support legacy QLingo If condition Then ... [Else ...] [EndIf]
      const condition = parseExpression();

      // Legacy uses THEN
      if (peek() && peek().type === 'THEN') {
        consume();
      }

      const consequent = parseExpression();

      let alternate = null;
      if (peek() && peek().type === 'ELSE') {
        consume();
        alternate = parseExpression();
      }

      if (peek() && peek().type === 'ENDIF') {
        consume();
      }

      return { type: 'If', condition, consequent, alternate };
    };

    const parseSwitch = () => {
      expect('SWITCH');

      // Condition in parentheses
      expect('(');
      const discriminant = parseExpression();
      expect(')');

      // Expect opening brace for switch body
      expect('{');

      const cases = [];
      let defaultCase = null;

      while (peek() && peek().type !== '}') {
        if (peek().type === 'CASE') {
          consume();
          const test = parseExpression();

          // Optional colon after Case
          if (peek() && peek().type === ':') consume();

          // Consequent: either a block { ... } or a single expression
          const consequent = (peek() && peek().type === '{') ? parseBlock() : parseExpression();
          cases.push({ test, consequent });

        } else if (peek().type === 'DEFAULT') {
          consume();
          // Optional colon after Default
          if (peek() && peek().type === ':') consume();
          defaultCase = (peek() && peek().type === '{') ? parseBlock() : parseExpression();

        } else {
          // Unexpected token inside switch
          throw new Error(`Unexpected token in switch: ${peek().type}`);
        }
      }

      // Closing brace
      expect('}');

      return { type: 'Switch', discriminant, cases, default: defaultCase };
    };

    return parseExpression();
  }

  // Evaluator
  evaluate(node) {
    if (!node) {
      return null;
    }

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Variable': {
        const key = node.name.toLowerCase();
        const vars = Object.fromEntries(
          Object.entries(this.variables).map(([k, v]) => [k.toLowerCase(), v])
        );

        if (!(key in vars)) {
          throw new Error(`Undefined variable: ${node.name}`);
        }
        return vars[key];
      }

      case 'Identifier': {
        const key = node.name.toLowerCase();
        const vars = Object.fromEntries(
          Object.entries(this.variables).map(([k, v]) => [k.toLowerCase(), v])
        );

        if (key in vars) {
          return vars[key];
        }
        throw new Error(`Undefined identifier: ${node.name}`);
      }

      case 'BinaryOp':
        return this.evaluateBinaryOp(node);

      case 'UnaryOp':
        return this.evaluateUnaryOp(node);

      case 'FunctionCall':
        return this.evaluateFunctionCall(node);

      case 'If':
        return this.evaluateIf(node);

      case 'Switch':
        return this.evaluateSwitch(node);

      case 'Block':
        return this.evaluateBlock(node);

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  evaluateBlock(node) {
    let result = null;
    for (const stmt of node.body) {
      result = this.evaluate(stmt);
    }
    return result;
  }

  evaluateBinaryOp(node) {
    const left = this.evaluate(node.left);
    const right = this.evaluate(node.right);

    switch (node.op) {
      // Arithmetic
      case '+':
        // String concatenation if either operand is a string
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        return left + right;
      case '&':
        // String concatenation if either operand is a string
        return String(left) + String(right);
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      case '^': return Math.pow(left, right);

      // Comparison
      case '==': return left == right;
      case '!=': return left != right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;

      // Logical
      case 'AND': return left && right;
      case 'OR': return left || right;
      case '||': return String(left) + String(right); // Alternative string concat

      default:
        throw new Error(`Unknown operator: ${node.op}`);
    }
  }

  evaluateUnaryOp(node) {
    const operand = this.evaluate(node.operand);

    switch (node.op) {
      case '+': return +operand;
      case '-': return -operand;
      case 'NOT': return !operand;
      case '!': return !operand;
      default:
        throw new Error(`Unknown unary operator: ${node.op}`);
    }
  }

  evaluateFunctionCall(node) {
    const name = node.name.toLowerCase();

    // Create a lowercased lookup map on the fly
    const funcs = Object.fromEntries(
      Object.entries(this.functions).map(([k, v]) => [k.toLowerCase(), v])
    );

    const func = funcs[name];

    if (!func) {
      throw new Error(`Undefined function: ${node.name}`);
    }

    const args = node.args.map(arg => this.evaluate(arg));
    return func(...args);
  }

  evaluateIf(node) {
    const condition = this.evaluate(node.condition);

    if (condition) {
      return this.evaluate(node.consequent);
    } else if (node.alternate) {
      return this.evaluate(node.alternate);
    }

    return null;
  }

  evaluateSwitch(node) {
    const discriminant = this.evaluate(node.discriminant);

    for (const caseNode of node.cases) {
      const testValue = this.evaluate(caseNode.test);
      if (discriminant == testValue) {
        return this.evaluate(caseNode.consequent);
      }
    }

    if (node.default) {
      return this.evaluate(node.default);
    }

    return null;
  }

  // Set a variable
  setVariable(name, value) {
    this.variables[name] = value;
  }

  // Register a custom function
  registerFunction(name, func) {
    this.functions[name] = func;
  }

  // Set template context
  setTemplateContext(context) {
    this.templateContext = { ...this.templateContext, ...context };
  }
}

// Example usage (C-style If):
// const interpreter = new QLingoInterpreter();
// interpreter.setVariable('age', 25);
// const result = interpreter.execute('If ( @{age} > 18 ) { "Adult" } Else { "Minor" }');
// console.log(result); // "Adult"
