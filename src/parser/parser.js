const SymbolTable = require("./utils/symbolTable");
const chalk = require('chalk')

class Parser {
    constructor(list_tokens) {
        this.tokens = list_tokens;
        this.current = 0
        this.symbolTable = new SymbolTable()
    }


    logInfo(message, token = null) {
        let lineInfo = token ? ` [Linha: ${token.line}]` : "";
        // console.log(chalk.blue(`[INFO] ${message}${lineInfo}`));
    }

    logWarning(message, token = null) {
        let lineInfo = token ? ` [Linha: ${token.line}]` : "";
        // console.log(chalk.yellow(`[WARN] ${message}${lineInfo}`));
    }

    logError(message, token = null) {
        let lineInfo = token ? ` [Linha: ${token.line}]` : "";
        // console.error(chalk.red(`[ERROR] ${message}${lineInfo}`));
    }

    logProcessing(context) {
        const current = this.currentToken();
        // console.log(
        //     chalk.magenta(`\n[PROCESS] ${context} | Token Atual: ${JSON.stringify(current)}\n`)
        // );
    }

    parse() {
        const ast = this.program();
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

    trackProcessing(context = '') {
        const current = this.currentToken();
        const lookahead = this.lookAhead() || { type: "EOF", value: "EOF", line: -1 };
        // console.log(`Contexto: ${context}`);
        // console.log(`Token atual: ${JSON.stringify(current)}`);
        // console.log(`Próximo token (lookahead): ${JSON.stringify(lookahead)}`);
        // console.log("-".repeat(50));
    }

    block() {
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
            case "CONST":
                return this.constantDeclaration();
            case "IDENTIFIER":
                if (this.lookAhead().type === "ASSIGN") {
                    return this.assignment();
                } else if (this.lookAhead().type === "LPAREN") {
                    return this.functionCall();
                } else {
                    throw new SyntaxError(`Unexpected token after IDENTIFIER: ${this.lookAhead().type} on line ${this.currentToken().line}`);
                }
            case "IF":
                return this.ifStatement();
            case "WHILE":
                return this.whileLoop();
            case "PRINT":
                return this.printStatement();
            case "BREAK":
                return this.breakStatement();
            case "CONTINUE":
                return this.continueStatement();
            case "RETURN":
                return this.returnStatement();
            case "FUNCTION":
                return this.functionDeclaration();
            case "FOR":
                return this.forLoop();
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

        this.symbolTable.add(id, { type, value, constant: true, line: this.currentToken().line })

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
        this.match("VARIABLE");

        const id = this.match("IDENTIFIER").value;

        this.match("COLON");
        const type = this.match("TYPE").value;

        if (type !== 'number' && type !== 'boolean') {
            this.logError(`Tipo inválido "${type}`)
            throw new Error(`Erro: Tipo inválido "${type}"`);
        }
        let value = null;

        if (this.currentToken().type === "ASSIGN") {
            this.match("ASSIGN");
            value = this.expression();
            this.match("SEMICOLON");
        }

        // Verifica se a variável já foi declarada no escopo
        if (this.symbolTable.existsInCurrentScope(id)) {
            this.logError(`Variável "${id}" já declarada no escopo atual`, this.currentToken());
            throw new Error(`Erro Semântico: Variável "${id}" já declarada no escopo atual.`);
        }

        this.logInfo(`Variável "${id}" declarada com sucesso (${type})`, this.currentToken());

        this.symbolTable.add(id, { type, value, constant: false, line: this.currentToken().line });

        return {
            type: "variableDeclaration",
            id,
            varType: type,
            value
        };
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
        let isFunction = false

        if (this.currentToken().type === 'COLON') {
            this.match("COLON")
            returnType = this.match("TYPE").value
            isFunction = true
        }

        this.symbolTable.enterScope()

        const body = this.block()

        this.symbolTable.exitScope()

        this.symbolTable.add(id, {
            type: 'function',
            isFunction,
            params,
            returnType,
            line: this.currentToken().line
        })

        return {
            type: returnType !== null ? "FunctionDeclaration" : "ProcedureDeclaration",
            id,
            isFunction,
            params,
            returnType,
            body,
        }
    }

    parameters() {
        const params = []
        while (this.currentToken().type == 'IDENTIFIER') {
            const id = this.match('IDENTIFIER').value

            this.match('COLON')

            let type = this.match("TYPE").value

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
        // if (this.lookAhead().type === "LPAREN") {
        //     value = this.functionCall();
        //     return {
        //         type: "Assignment",
        //         id,
        //         value
        //     };
        // }
        if (this.currentToken().type === "IDENTIFIER" && this.lookAhead().type === "LPAREN") {
            const value = this.functionCall();
            return {
                type: "Assignment",
                value
            };
        }
        const left = this.arithmeticExpression()

        // é processado apos encontrar um operador relacional, ele pode ser:
        // 1. um numero
        // 2. outra subexpressão (3 * 5)
        if (["EQUAL", "DIFFERENT", "GREATER", "GREATER_OR_EQUAL", "LESS", "LESS_OR_EQUAL"].includes(this.currentToken().type)) {
            const operator = this.match(this.currentToken().type); // Consome o operador relacional

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

        while (["PLUS", "MINUS"].includes(this.currentToken().type)) {
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
            case "BOOLEAN":
                return {
                    type: "Literal",
                    value: this.match("BOOLEAN").value
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
        this.logProcessing(`Tentando casar ${expectedType}`);
        const token = this.currentToken();
        if (token.type === expectedType) {
            this.current++;
            this.logInfo(`Token casado: ${expectedType} (${token.value})`, token);
            return token;
        } else {
            this.logError(`Esperado ${expectedType}, mas encontrado ${token.type} (${token.value})`, token);
            throw new SyntaxError(
                `Erro Sintático: Esperado ${expectedType}, mas encontrado ${token.type} (${token.value}) na linha ${token.line}`
            );
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

    whileLoop() {
        this.match("WHILE")

        this.match("LPAREN")

        const condition = this.expression()

        this.match("RPAREN")

        const body = this.block()

        return {
            type: "WhileLoop",
            condition,
            body
        }
    }

    assignment() {
        const id = this.match("IDENTIFIER").value; // Consome o IDENTIFIER (variável)
        let value = null;
        this.match("ASSIGN");  // Consome o operador de atribuição '='

        if (this.lookAhead().type === "LPAREN") {
            value = this.functionCall();
            return {
                type: "Assignment",
                id,
                value
            };
        }

        value = this.expression();
        this.match("SEMICOLON");

        return {
            type: "Assignment",
            id,
            value
        };
    }

    updateExpression() {
        /**
         * Lida com:
         * - Atribuição: i = i + 1
         * - Incremento: i++ ou ++i
         * - Decremento: i-- ou --i
         * 
         * Retorna um nó AST correspondente.
         */

        const token = this.currentToken();
        if (["PLUS_PLUS", "MINUS_MINUS"].includes(token.type)) {
            const operator = this.match(token.type).value;
            const argument = this.match("IDENTIFIER").value;

            return {
                type: "UpdateExpression",
                operator: operator,
                argument: { type: "Identifier", name: argument },
                prefix: true
            };
        }

        // Handle postfix update operators (e.g., i++, i--)
        if (token.type === "IDENTIFIER" && ["PLUS_PLUS", "MINUS_MINUS"].includes(this.lookAhead(1)?.type)) {
            const argument = this.match("IDENTIFIER").value;
            const operator = this.match(this.lookAhead(1).type).value;

            return {
                type: "UpdateExpression",
                operator: operator,
                argument: { type: "Identifier", name: argument },
                prefix: false
            };
        }

        // Handle assignment expressions (e.g., i = i + 1)
        if (token.type === "IDENTIFIER" && this.lookAhead(1)?.type === "ASSIGN") {
            const left = this.match("IDENTIFIER").value;
            this.match("ASSIGN");
            const right = this.arithmeticExpression(); // Assegure-se que arithmeticExpression() consome todos os tokens necessários

            return {
                type: "AssignmentExpression",
                operator: "=",
                left: { type: "Identifier", name: left },
                right: right
            };
        }

        throw new SyntaxError(`Unexpected token in updateExpression: ${token.type} on line ${token.line}`);
    }

    forLoop() {
        this.match("FOR")

        this.symbolTable.printCurrentScope()
        this.match("LPAREN")

        this.match("VARIABLE")

        const id = this.match("IDENTIFIER").value

        this.match("COLON")

        const type = this.match("TYPE").value
        let value = null

        if (this.currentToken().type === "ASSIGN") {
            this.match("ASSIGN")
            value = this.expression()
        }

        this.match("SEMICOLON")

        const condition = this.expression()

        this.match("SEMICOLON")

        const increment = this.updateExpression()

        this.match("RPAREN")

        const body = this.block()

        return {
            type: "ForLoop",
            id,
            varType: type,
            value,
            condition,
            increment,
            body
        }
    }

    breakStatement() {
        this.match("BREAK")
        this.match("SEMICOLON")

        return {
            type: "BreakStatement"
        }
    }

    continueStatement() {
        this.match("CONTINUE")
        this.match("SEMICOLON")

        return {
            type: "ContinueStatement"
        }
    }

    functionCall() {
        this.trackProcessing("function call")
        const functionName = this.match("IDENTIFIER").value; 
        this.match("LPAREN"); // Consome o LPAREN

        var functionInfos = this.symbolTable.getByNameInGlobalScope(functionName)

        const args = [];
        if (this.currentToken().type !== "RPAREN") {
            args.push(this.expression());
            while (this.currentToken().type === "COMMA") {
                this.match("COMMA");
                args.push(this.expression());
            }
        }
        this.trackProcessing()

        this.match("RPAREN");

        this.match("SEMICOLON");

        return {
            type: "CallExpression",
            id: functionName,
            isFunction: functionInfos.isFunction,
            callee: { type: "Identifier", name: functionName },
            arguments: args
        };
    }

}

module.exports = Parser;