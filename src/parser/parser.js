const SymbolTable = require("./utils/symbolTable");

class Parser {
    constructor(list_tokens) {
        this.tokens = list_tokens;
        this.current = 0 // ponteiro para o token atual
        this.symbolTable = new SymbolTable()
    }

    parse() {
        return this.program()
    }

    program() {
        const globalDeclarations = []

        while (this.currentToken().type === 'CONST' || this.currentToken().type === 'FUNCTION') {
            globalDeclarations.push(this.globalDeclaration())
        }

        // Garantir que há uma função main
        this.match("FUNCTION"); // `function`
        const mainFunction = this.match("IDENTIFIER")

        if (mainFunction.value !== "main") {
            throw new SyntaxError(`Function main expect as "main" but was found "${mainFunction.value}" on line ${mainFunction.line}`)
        }

        this.match("SYMBOL"); // `{`

        this.symbolTable.enterScope()

        const body = this.block()

        this.symbolTable.exitScope()

        this.match("SYMBOL");

        return {
            type: "Program",
            globalDeclarations,
            main: {
                name: mainFunction.value,
                body
            }
        }
    }

    globalDeclaration() {
        const token = this.currentToken()

        if (token.type === 'CONST') {
            return this.constantDeclaration();
        } else if (token.type === "FUNCTION") {
            return this.functionDeclaration();
        } else {
            throw new SyntaxError(`Declaração global inválida: "${token.type}" na linha ${token.line}`);
        }
    }

    constantDeclaration() {
        console.log("look ahead: ", this.lookAhead())
        this.match("CONST"); // consome uma constante
        console.log("current token: ", this.currentToken())
        console.log("look ahead: ", this.lookAhead()) 
        const id = this.match("IDENTIFIER").value
        console.log("current token: ", this.currentToken())
        console.log("look ahead: ", this.lookAhead())
        this.match("COLON")
        console.log("current token: ", this.currentToken())
        console.log("look ahead: ", this.lookAhead())

        const type = this.match("TYPE").value

        this.match("ASSIGN")

        const value = this.expression() // analisar a expressão

        this.match("SEMICOLON")

        this.symbolTable.add(id, { type, value, constant: true })

        return {
            type: "ConstantDeclaration",
            id,
            varType: type,
            value
        }
    }

    functionDeclaration() {
        this.match("FUNCTION")
        const id = this.match("IDENTIFIER").value

        this.match("LPAREN")

        const params = []

        if (this.currentToken().type !== "RPAREN") {
            params.push(...this.parameters())
        }

        this.match("RPAREN")

        let returnType = null


        if (this.currentToken().type === 'COLON') {
            this.match("COLON")
            returnType = this.match("TYPE").value
        }

        this.match("LBRACE")

        this.symbolTable.enterScope()

        const body = this.block()

        this.symbolTable.exitScope()

        this.match("RBRACE")

        this.symbolTable.add(id, {
            type: 'function',
            params,
            returnType
        })

        return {
            type: "FunctionDeclaration",
            id,
            params,
            returnType,
            body,
        }
    }

    parameters() {
        const params = []

        while(this.currentToken.type === 'IDENTIFIER') {
            const id = this.match('IDENTIFIER').value

            this.match('COLON')

            const type = this.match("TYPE").value
            params.push({ id, type })

            if (this.currentToken().type === "COMMA") {
                this.match("COMMA")
            } else {
                break
            }
        }

        return params
    }

    expression() {

    }

    currentToken() {
        if (this.current < this.tokens.length) {
            return this.tokens[this.current]
        }
        return { type: "EOF", value: "EOF", line: -1 }; // Retorna um token fictício EOF se chegarmos ao final
    }

    lookAhead() {
        return this.tokens[this.current + 1]
    }
    match(expectedType) {
        const token = this.currentToken()

        if (token.type === expectedType) {
            this.current++
            return token
        } else {
            throw new SyntaxError(`Expect ${expectedType}, but found ${token.type} on line ${token.line}`)
        }
    }
}

module.exports = Parser;