const SymbolTable = require("./utils/symbolTable");

class Parser {
    constructor(list_tokens) {
        this.tokens = list_tokens;
        this.current = 0 // ponteiro para o token atual
        this.symbolTable = new SymbolTable()
    }
    
    parse() {
        const ast = this.program()

        if (this.currentToken().type !== "EOF") {
            throw new SyntaxError(
                `Tokens unexpected after end of program: ${this.currentToken().value} on line ${this.currentToken().line}`
            )
        }

        return ast
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

        this.match("LBRACE"); // `{`

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
            throw new SyntaxError(`Invalid global declaration: "${token.type}" on line ${token.line}`);
        }
    }

    block () {

        if (this.currentToken().type === 'EOF') {
            console.log("entrou nessa bct")
            return null
        }
        console.log("cu aa ", this.currentToken())
        console.log("pre rbrace ", this.lookAhead())
        console.log("pre rbrace ", this.lookAhead(2))

        this.match("LBRACE")

        let commands = []

        while (this.currentToken().type !== "RBRACE" && this.currentToken().type !== "EOF") {
            commands.push(this.comand())
        }
        console.log("cu ", this.currentToken())
        console.log("pre rbrace ", this.lookAhead())
        console.log("pre rbrace ", this.lookAhead(2))
        this.match("RBRACE")

        if (this.currentToken().type === 'EOF') {
            return null
        }

        return {
            type: "Block",
            commands
        }
    }

    comand() {
        const token = this.currentToken();
        console.log("token on command: ", token);
    
        // Verifica se o token é EOF (fim do arquivo)
        if (token.type === "EOF") {
            return null; // Retorna nulo ou algo indicando que o comando não existe
        }
    
        switch (token.type) {
            case "VARIABLE":
                return this.variableDeclaration();
            case "IDENTIFIER":
                if (this.lookAhead().type === "ASSIGN") {
                    return this.assignment();
                } else if (this.lookAhead().type === "LPAREN") {
                    return this.functionDeclaration();
                }
                break;
            case "IF":
                return this.ifStatement();
            case "WHILE": 
                return this.whileLoop();
            case "PRINT":
                return this.printStatement();
            case "BREAK":
            case "CONTINUE":
            case "RETURN":
                return this.returnStatement();
            case "FUNCTION":
                return this.functionDeclaration();
            default:
                throw new SyntaxError(
                    `Invalid command: Token unexpected type: ${token.type} value: (${token.value}) on line ${token.line}`
                );
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

    returnStatement() {
        this.match("RETURN")

        let expression = null
        if (this.currentToken().type !== "SEMICOLON") {
            expression = this.expression()
        }

        this.match("SEMICOLON")
        this.match("RBRACE")
        return {
            type: "ReturnStatement",
            expression
        }
    }

    variableDeclaration() {
        this.match("VARIABLE")

        const id = this.match("IDENTIFIER").value

        // console.log("id: ", id)
        // console.log("current token on this.variableDeclaration: ", this.currentToken())

        this.match("COLON")

        const type = this.match("TYPE").value
        let value = null

        if(this.currentToken().type === "ASSIGN") {
            this.match("ASSIGN")
            value = this.expression()
        }

        this.match("SEMICOLON")

        return {
            type: "variableDeclaration",
            id,
            varType: type,
            value
        }
    }

    functionDeclaration() {
        this.match("FUNCTION")
        const id = this.match("IDENTIFIER").value

        const params = []
        if (id !== "main") {
            this.match("LPAREN")
    
            // console.log("current token: ", this.currentToken())
            // console.log("look ahead: ", this.lookAhead())
            // console.log("look ahead 2: ", this.lookAhead(2))
    
            if (this.currentToken().type !== "RPAREN") {
                // console.log("dentro if", this.currentToken())
                params.push(...this.parameters())
            }
    
            this.match("RPAREN")
        }


        let returnType = null

        if (this.currentToken().type === 'COLON') {
            this.match("COLON")
            returnType = this.match("TYPE").value
        }
        console.log("current token apos params: ", this.currentToken())
        console.log("look ahead token apos params: ", this.lookAhead())

        this.symbolTable.enterScope()
        const body = this.block()

        this.symbolTable.exitScope()

        // this.match("RBRACE")

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
        // console.log("current type in parameters: ", this.currentToken())
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
        // console.log("params: ", params)
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

    printStatement() {
        this.match("PRINT")

        this.match("LPAREN")

        const value = this.expression()

        this.match("RPAREN")
        this.match("SEMICOLON")

        console.log({
            type: "printStatement",
            body: value
        })
        return {
            type: "printStatement",
            body: value
        }
    }
}

module.exports = Parser;