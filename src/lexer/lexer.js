const Token = require('./token');
const rules = require('./utils/rules');

class Lexer {
    constructor(code) {
        this.code = code;
        this.tokensList = [];
        this.patterns = rules;
    }

    tokenize() {
        const lines = this.code.split("\n");

        lines.forEach((line, index) => {
            this._lineToTokens(line, index + 1);
        });
    }

    _lineToTokens(line, lineNumber) {
        let lineTokens = [];
        line = line.trim();

        while (line) {
            let matched = false;
            
            for (let { regex, type } of this.patterns) {
                const match = line.match(regex);
                
                if (match) {
                    matched = true;

                    const value = match[0];

                    const token = new Token(type, value, lineNumber);

                    lineTokens.push(token);

                    line = line.slice(value.length).trim();
                    break;
                }
            }

            if (!matched) {
                throw new Error(`Invalid syntax at line ${lineNumber}: ${line}`);
            }
        }

        this.tokensList.push(...lineTokens);
    }
}

module.exports = Lexer;