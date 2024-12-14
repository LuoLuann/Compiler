var fs = require("fs");
var jison = require("jison");

var bnf = fs.readFileSync("grammar.jison", "utf8");
var parser = new jison.Parser(bnf);

var input = fs.readFileSync("test.txt", "utf8");
// try {
    parser.parse(input);
    console.log("Entrada analisada com sucesso!");
// } catch (e) {
//     console.log("Erro de análise:", e);
// }

module.exports = parser;