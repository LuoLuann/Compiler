const Lexer = require('./lexer/lexer');
const readline = require('readline');
const fs = require("fs")

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

r1.question("Enter the path of the file: ", (filepath) => {
    try {
        const input = fs.readFileSync(filepath, "utf8");
        const lexer = new Lexer(input);
        lexer.tokenize();

        console.log(lexer.tokensList)

        // Salva os tokens no arquivo de saída
        const tokensJson = JSON.stringify(lexer.tokensList, null, 2);
        fs.writeFileSync(`output_2.txt`, tokensJson);

        console.log("Output written to output.txt")

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