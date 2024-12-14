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
        // console.log("look ahead: ", this.lookAhead())
        this.match("CONST"); // consome uma constante
        // console.log("current token: ", this.currentToken())
        // console.log("look ahead: ", this.lookAhead()) 
        const id = this.match("IDENTIFIER").value
        // console.log("current token: ", this.currentToken())
        // console.log("look ahead: ", this.lookAhead())
        this.match("COLON")
        // console.log("current token: ", this.currentToken())
        // console.log("look ahead 2 : ", this.lookAhead(2))

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

        console.log("current token: ", this.currentToken())
        console.log("look ahead: ", this.lookAhead())
        console.log("look ahead 2: ", this.lookAhead(2))

        if (this.currentToken().type !== "RPAREN") {
            console.log("dentro if", this.currentToken())
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
        console.log("current type in parameters: ", this.currentToken())
        while(this.currentToken().type == 'IDENTIFIER') {
            const id = this.match('IDENTIFIER').value
            console.log("id: ", id)

            this.match('COLON')

            const type = this.match("TYPE").value
            params.push({ id, type })

            if (this.currentToken().type === "COMMA") {
                this.match("COMMA")
            } else {
                break
            }
        }
        console.log("params: ", params)
        return params
    }

    expression() {
        const token = this.currentToken()
        // console.log("token dentro de expression: ", token)
        // processar o lado esquerdo da expressao para verificar se é:
        // 1. um número (literal)
        // 2. uma variavel(identifier)
        // 3. uma subexpressão (3 + 5)
        const left = this.arithmeticExpression()
        // console.log("left dentro de expression: ", left)

        // é processado apos encontrar um operador relacional, ele pode ser:
        // 1. um numero
        // 2. outra subexpressão (3 * 5)
        if (["EQUAL", "DIFFERENT", "GREATER", "GREATER_OR_EQUAL", "LESS", "LESS_OR_EQUAL"].includes(token.type)) {
            const operator = this.match(token.type)
            // console.log("operator dentro de expression: ", operator)

            const right = this.arithmeticExpression()

            return {
                type: "RelationalExpression",
                operator: operator.value,
                left,
                right
            }
        }  
        return left
    }

    arithmeticExpression() {
        /**
         * {
                "type": "ArithmeticExpression",
                "operator": "+",
                "left": { "type": "Literal", "value": 3 },
                "right": { "type": "Literal", "value": 2 }
            }

         */

            let left = this.term()

            while(["PLUS", "MINUS"].includes(this.currentToken().type)) {
                const operator = this.match(this.currentToken().type)
                const right = this.term()

                left = {
                    type: "ArithmeticExpression",
                    operator: operator.value,
                    left, 
                    right
                }
            }
            // console.log("token dentro de arithmeticExpression: ", left)

            return left
    }

    term() {
        let left = this.factor()

        while (["MULTIPLY", "DIVIDE"].includes(this.currentToken().type)) {
            const operator = this.match(this.currentToken().type)
            const right = this.factor()
            
            left = {
                type: "ArithmeticExpression",
                operator: operator.value,
                left, 
                right
            }

        }

        return left
    }

    factor() {
        const token = this.currentToken()

        switch (token.type) {
            case "NUMBER":
                return {
                    type: 'Literal',
                    value: this.match("NUMBER").value
                }
        
            case "IDENTIFIER":
                return {
                    type: "Identifier",
                    name: this.match("IDENTIFIER").value
                }
            case "LPAREN":
                this.match("LPAREN"); // Consome "("
                const expr = this.expression(); // Processa a expressão aninhada
                this.match("RPAREN"); // Consome ")"
                return expr;
        }

        throw new SyntaxError(
            `Fator inválido: Token inesperado ${token.type} (${token.value}) na linha ${token.line}`
        );
    }

    currentToken() {
        if (this.current < this.tokens.length) {
            return this.tokens[this.current]
        }
        return { type: "EOF", value: "EOF", line: -1 }; // Retorna um token fictício EOF se chegarmos ao final
    }

    lookAhead(i = 1) {
        return this.tokens[this.current + i]
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