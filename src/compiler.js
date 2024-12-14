const Lexer = require('./lexer/lexer');
const readline = require('readline');
const Parser = require('./parser/parser')
const fs = require("fs")

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const filepath = '.\tests\test2.txt'

r1.question("Enter the path of the file: ", (filepath) => {
    try {
        const input = fs.readFileSync(filepath, "utf8");
        const lexer = new Lexer(input);
        lexer.tokenize();

        let tokens = lexer.tokensList

        const parser = new Parser(tokens)

        const ast = parser.parse()

        const astJson = JSON.stringify(ast, null, 2)

        // Salva os tokens no arquivo de saída
        const tokensJson = JSON.stringify(lexer.tokensList, null, 2);
        fs.writeFileSync(`output_2.txt`, tokensJson);

        fs.writeFileSync(`output_ast.txt`, astJson);
        console.log("AST salva em output_ast.txt");

        console.log("\nTabela de Símbolos:");
        parser.symbolTable.printAllScopes(); // Imprime todos os escopos da tabela de símbolos

        // Exibe a saída do parser (AST)
        console.log("\nAST gerada:");
        console.log(JSON.stringify(ast, null, 2));
    } catch (error) {
        console.log("File not found ", + filepath);
        console.log(error)
    } finally {
        r1.close();
    }
})
// const code = `
//     var = 10;
//     if (x > 3) {
//         print(x);
//     }
// `

// const lexer = new Lexer(code)

// lexer.tokenize();

// console.log(lexer.tokensList)