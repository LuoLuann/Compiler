const Token = require('./token');
const tokens = require('./utils/tokens');

class Lexer {
    constructor(code) {
        this.code = code;
        this.tokensList = [];
        this.patterns = tokens; // Seus tokens importados
    }

    tokenize() {
        const lines = this.code.split("\n");

        lines.forEach((line, index) => {
            this._lineToTokens(line, index + 1); // Tokenizando cada linha
        });
    }

    _lineToTokens(line, lineNumber) {
        let lineTokens = [];
        line = line.trim(); // Remove espaços extras no início e no final
        let count = 0
        while (line) {
            let matched = false;

            console.log("line: ", line)

            // Percorre todos os padrões de tokens
            for (let { regex, type } of this.patterns) {
                const match = line.match(regex); // Verifica se há correspondência

                
                
                if (match) {
                    matched = true;

                    if (type === 'WHITESPACE') {
                        line = line.slice(value.length).trim();
                        break;
                    }
                    const value = match[0];

                    if (type === 'NUMBER') {
                        console.log(`Número capturado: "${value}"`);
                    }

                    const token = new Token(type, value, lineNumber);  // Cria um novo token

                    lineTokens.push(token);

                    console.log("line tokens: ", lineTokens)

                    line = line.slice(value.length).trim(); // Remove token encontrado e limpa a linha
                    console.log("Linha após slice: ", line);
                    break; // Move para o próximo token
                }
            }

            if (!matched) {
                throw new Error(`Invalid syntax at line ${lineNumber}: ${line}`);
            }

            count++
            if (!line.trim()) {
                console.log(`Linha vazia após ${count} iterações.`);
                break;
            }
    
            console.log(`Iteração atual: ${count}`);
        }

        this.tokensList.push(...lineTokens);
    }
}

module.exports = Lexer;