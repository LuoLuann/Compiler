const Lexer = require('./lexer/lexer');
const readline = require('readline');
const Parser = require('./parser/parser');
const SemanticAnalyzer = require('./semantic/semantic');
const ThreeAddressCodeGenerator = require('./threeAddressCodeGenerator/ThreeAddressCodeGenerator');
const fs = require("fs");

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const dirPath = './tests';
const files = fs.readdirSync(dirPath).filter(file => fs.statSync(`${dirPath}/${file}`).isFile());

console.log("Arquivos disponíveis:");
files.forEach((file, index) => {
    console.log(`${index + 1} - ${file}`);
});

r1.question("Digite o número do arquivo que deseja processar: ", (choice) => {
    try {
        const index = parseInt(choice, 10);
        if (isNaN(index) || index < 1 || index > files.length) {
            console.log("Opção inválida.");
            r1.close();
            return;
        }

        const filepath = `${dirPath}/${files[index - 1]}`;

        const input = fs.readFileSync(filepath, "utf8");
        const lexer = new Lexer(input);
        lexer.tokenize();

        let tokens = lexer.tokensList;
        const parser = new Parser(tokens);
        const ast = parser.parse();

        // console.log("\nAST gerada:");
        // console.log(JSON.stringify(ast, null, 2));

        const semanticAnalyzer = new SemanticAnalyzer(ast);
        semanticAnalyzer.analyze();

        const astSemantic = semanticAnalyzer.ast;

        const tacGenerator = new ThreeAddressCodeGenerator(astSemantic);
        const tacInstructions = tacGenerator.generate();

        fs.writeFileSync(`output_tokens.json`, JSON.stringify(lexer.tokensList, null, 2));
        fs.writeFileSync(`output_ast.json`, JSON.stringify(ast, null, 2));

        console.log("AST salva em output_ast.json");
        console.log("Tokens salvos em output_tokens.json");

        fs.writeFileSync(`output_tac.txt`, tacInstructions.join("\n"));
        console.log("Código de 3 endereços salvo em output_tac.txt");

    } catch (error) {
        console.log("❌ Erro ao processar o arquivo.");
        console.error(error.message);
    } finally {
        r1.close();
    }
});