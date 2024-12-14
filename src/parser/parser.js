const SymbolTable = require("./utils/symbolTable");

class Parser {
    constructor(list_tokens) {
        this.tokens = list_tokens;
        this.current = 0 // ponteiro para o token atual
        this.symbolTable = new SymbolTable()
    }
    
    parse() {
        const ast = this.program();
    
        // Verificar se todos os tokens foram consumidos
        if (this.current < this.tokens.length) {
            const leftoverToken = this.currentToken();
            throw new SyntaxError(
                `Tokens não consumidos após o fim do programa: ${leftoverToken.type} (${leftoverToken.value}) na linha ${leftoverToken.line}.`
            );
        }
    
        return ast;
    }
    

    program() {
        const globalDeclarations = [];
    
        while (this.currentToken().type === "CONST" || 
        this.currentToken().type === "FUNCTION" && 
        this.lookAhead().type !== "MAIN"
    ) {
            globalDeclarations.push(this.globalDeclaration());
        }
        
        if (this.currentToken().type === "EOF") {
            throw new SyntaxError("Program must contain a main function.");
        }
    
        const main = this.mainDeclaration();
    
        return {
            type: "Program",
            globalDeclarations,
            main
        };
    }

    mainDeclaration() {
        this.match("FUNCTION")

        const mainFunction = this.match("MAIN");

        if (mainFunction.value !== "main") {
            throw new SyntaxError(
                `Expected function 'main', but found '${mainFunction.value}' on line ${mainFunction.line}`
            );
        }

        this.symbolTable.enterScope()

        const body = this.block()

        this.symbolTable.exitScope()

        this.symbolTable.add("main", { type: "function", scope: body });

        return {
            type: "MainFunction",
            name: mainFunction.value,
            body
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

    trackProcessing(context) {
        const current = this.currentToken();
        const lookahead = this.lookAhead() || { type: "EOF", value: "EOF", line: -1 };
        console.log(`Contexto: ${context}`);
        console.log(`Token atual: ${JSON.stringify(current)}`);
        console.log(`Próximo token (lookahead): ${JSON.stringify(lookahead)}`);
        console.log("-".repeat(50));
    }

    block () {
        this.trackProcessing("Início do bloco");
        this.match("LBRACE")

        let commands = []

        while (this.currentToken().type !== "RBRACE" && this.currentToken().type !== "EOF") {
            this.trackProcessing("Dentro do bloco");

            commands.push(this.command())
        }
        
        this.match("RBRACE")

        return {
            type: "Block",
            commands
        }
    }

    command() {
        this.trackProcessing("Início do comando");
        const token = this.currentToken();
    
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
        this.match("CONST");

        const id = this.match("IDENTIFIER").value

        this.match("COLON")

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
        return {
            type: "ReturnStatement",
            expression
        }
    }

    ifStatement() {
        this.match("IF")

        this.match("LPAREN")

        const condition = this.expression();

        console.log("condition: ", condition)

        this.match("RPAREN")

        const body = this.block();

        let elseBranch = null
        if (this.currentToken().type === "ELSE") {
            this.match("ELSE")
            if (this.currentToken().type === "IF") {
                elseBranch = this.ifStatement()
            } else {
                elseBranch = this.block()
            }
        }

        return {
            type: 'IFStatement',
            condition,
            body,
            elseBranch
        }
    }

    variableDeclaration() {
        this.match("VARIABLE")

        const id = this.match("IDENTIFIER").value

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
    
            if (this.currentToken().type !== "RPAREN") {
                params.push(...this.parameters())
            }
    
            this.match("RPAREN")
        }


        let returnType = null

        if (this.currentToken().type === 'COLON') {
            this.match("COLON")
            returnType = this.match("TYPE").value
        }

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
        while(this.currentToken().type == 'IDENTIFIER') {
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
        // processar o lado esquerdo da expressao para verificar se é:
        // 1. um número (literal)
        // 2. uma variavel(identifier)
        // 3. uma subexpressão (3 + 5)
        const left = this.arithmeticExpression()

        console.log("dentro de expression")
        console.log("token atual: ", this.currentToken())
        console.log("prox token: ", this.lookAhead())

        // é processado apos encontrar um operador relacional, ele pode ser:
        // 1. um numero
        // 2. outra subexpressão (3 * 5)
        if (["EQUAL", "DIFFERENT", "GREATER", "GREATER_OR_EQUAL", "LESS", "LESS_OR_EQUAL"].includes(this.currentToken().type)) {
            const operator = this.match(this.currentToken().type); // Consome o operador relacional

            console.log("aqui dentro ooooo")
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
        this.trackProcessing(`Tentando casar ${expectedType}, current token: ${this.currentToken()}`);
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

        return {
            type: "printStatement",
            body: value
        }
    }
}

module.exports = Parser;