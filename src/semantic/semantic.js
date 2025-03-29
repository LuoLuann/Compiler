// semanticAnalyzer.js
const SymbolTable = require('../parser/utils/symbolTable');

class SemanticAnalyzer {
  constructor(ast) {
    this.ast = ast;
    this.symbolTable = new SymbolTable();
    this.currentReturnType = null;
  }

  analyze() {
    this.visitProgram(this.ast);
  }

  visitProgram(node) {
    node.globalDeclarations.forEach(decl => {
      this.visitDeclaration(decl);
    });

    this.visitMainFunction(node.main);
  }

  visitDeclaration(decl) {
    switch (decl.type) {
      case "ConstantDeclaration":
        this.visitConstantDeclaration(decl);
        break;
      case "FunctionDeclaration":
      case "ProcedureDeclaration":
        this.visitFunctionOrProcedureDeclaration(decl);
        break;
      default:
        throw new Error(`Declaração global não suportada: ${decl.type}`);
    }
  }

  visitMainFunction(mainFunc) {


    this.symbolTable.add(mainFunc.name, { type: null, params: [], constant: false });
    this.symbolTable.enterScope();
    let previousReturnType = this.currentReturnType;
    this.currentReturnType = null;
    this.visitBlock(mainFunc.body);
    this.currentReturnType = previousReturnType;
    this.symbolTable.exitScope();
  }

  visitConstantDeclaration(decl) {
    // decl.id, decl.varType, decl.value
    if (this.symbolTable.existsInCurrentScope(decl.id)) {
      this.logError(`Constante "${decl.id}" já declarada no escopo atual`, this.currentToken());
      throw new Error(`Erro Semântico: Constante "${decl.id}" já declarada no escopo atual.`);
    } else if (this.symbolTable.existsInGlobalScope(decl.id)) {
      this.logError(`Constante "${decl.id}" já declarada`, this.currentToken());
      throw new Error(`Erro Semântico: Constante "${decl.id}" já declarada.`);
    }
    // Verifica o tipo da expressão atribuída à constante
    const exprType = this.evaluateExpressionType(decl.value);
    if (exprType !== decl.varType) {
      throw new Error(
        `Tipo incompatível na declaração da constante ${decl.id}: esperado ${decl.varType}, mas encontrado ${exprType}.`
      );
    }
    this.symbolTable.add(decl.id,
      { type: decl.varType, constant: true });
  }

  visitFunctionOrProcedureDeclaration(decl) {
    // Para funções, decl.returnType não é nulo; para procedimentos, é nulo.
    if (this.symbolTable.existsInCurrentScope(decl.id)) {
      throw new Error(`Função/procedimento ${decl.id} já declarado neste escopo.`);
    }
    this.symbolTable.add(decl.id, { type: decl.returnType, params: decl.params, constant: false });

    this.symbolTable.enterScope();
    // Adiciona os parâmetros à tabela de símbolos
    decl.params.forEach(param => {
      if (this.symbolTable.existsInCurrentScope(param.id)) {
        throw new Error(`Parâmetro ${param.id} já declarado na função ${decl.id}.`);
      }
      this.symbolTable.add(param.id, { type: param.type, constant: false });
    });

    // Define o contexto para verificação de retorno
    let previousReturnType = this.currentReturnType;
    this.currentReturnType = decl.returnType;

    this.visitBlock(decl.body);

    this.currentReturnType = previousReturnType;
    this.symbolTable.exitScope();
  }

  visitBlock(block) {
    // Em alguns casos, já pode ter sido aberto um novo escopo (como em funções), mas para blocos internos pode ser necessário criar um novo.
    this.symbolTable.enterScope();
    block.commands.forEach(cmd => {
      this.visitCommand(cmd);
    });
    this.symbolTable.exitScope();
  }

  visitCommand(cmd) {
    switch (cmd.type) {
      case "variableDeclaration":
        this.visitVariableDeclaration(cmd);
        break;
      case "ConstantDeclaration":
        this.visitConstantDeclaration(cmd);
        break;
      case "Assignment":
        this.visitAssignment(cmd);
        break;
      case "printStatement":
        this.visitPrintStatement(cmd);
        break;
      case "WhileLoop":
        this.visitWhileLoop(cmd);
        break;
      case "ForLoop":
        this.visitForLoop(cmd);
        break;
      case "IFStatement":
        this.visitIfStatement(cmd);
        break;
      case "ReturnStatement":
        this.visitReturnStatement(cmd);
        break;
      default:
        throw new Error(`Comando não suportado: ${cmd.type}`);
    }
  }

  visitVariableDeclaration(decl) {
    // decl.id, decl.varType, decl.value (opcional)
    console.log("decl: ", decl)
    if (this.symbolTable.existsInCurrentScope(decl.id)) {
      this.logError(`Constante "${decl.id}" já declarada no escopo atual`, this.currentToken());
      throw new Error(`Erro Semântico: Constante "${decl.id}" já declarada no escopo atual.`);
    }

    let exprType = null;
    if (decl.value) {
      console.log("entrou")
      exprType = this.evaluateExpressionType(decl.value);
      console.log("exprType: ", exprType)
      if (exprType !== decl.varType) {
        throw new Error(
          `Tipo incompatível na declaração da variável ${decl.id}: esperado ${decl.varType}, mas encontrado ${exprType}.`
        );
      }
    }
    this.symbolTable.add(decl.id, { type: decl.varType, constant: false });
  }

  visitAssignment(assign) {
    // assign.id, assign.value
    let symbol = null;

    console.log("assign: ", assign)


    try {
      symbol = this.symbolTable.get(assign.id);
    } catch (err) {
      throw new Error(`Variável ${assign.id} não declarada.`);
    }
    if (symbol.constant) {
      throw new Error(`Atribuição inválida: ${assign.id} é uma constante.`);
    }
    const exprType = this.evaluateExpressionType(assign.value);

    if (exprType !== symbol.type) {
      throw new Error(
        `Tipo incompatível na atribuição para ${assign.id}: esperado ${symbol.type}, mas encontrado ${exprType}.`
      );
    }

    this.symbolTable.update(assign.id, { value: assign.value });

  }

  visitPrintStatement(printStmt) {
    // Apenas verifica se a expressão é válida semanticamente.
    this.evaluateExpressionType(printStmt.body);
  }

  visitWhileLoop(loop) {
    const condType = this.evaluateExpressionType(loop.condition);
    if (condType !== "boolean") {
      throw new Error("Condição do while deve ser do tipo boolean.");
    }
    this.visitBlock(loop.body);
  }

  visitForLoop(loop) {
    // Para o for, é necessário verificar cada parte:
    // Inicialização (normalmente uma atribuição ou declaração)
    // Condição: deve ser booleana
    // Incremento: verificado conforme a lógica da linguagem
    const condType = this.evaluateExpressionType(loop.condition);
    if (condType !== "boolean") {
      throw new Error("Condição do for deve ser do tipo boolean.");
    }
    // Verifica o incremento (por exemplo, i = i + 1)
    this.evaluateExpressionType(loop.increment);
    this.visitBlock(loop.body);
  }

  visitIfStatement(ifStmt) {
    const condType = this.evaluateExpressionType(ifStmt.condition);
    if (condType !== "boolean") {
      throw new Error("Condição do if deve ser do tipo boolean.");
    }
    this.visitBlock(ifStmt.body);
    if (ifStmt.elseBranch) {
      if (ifStmt.elseBranch.type === "IFStatement") {
        this.visitIfStatement(ifStmt.elseBranch);
      } else {
        this.visitBlock(ifStmt.elseBranch);
      }
    }
  }

  visitReturnStatement(retStmt) {
    if (this.currentReturnType === null && retStmt.expression) {
      throw new Error("Procedimentos não podem retornar valor.");
    }
    if (this.currentReturnType !== null) {
      if (retStmt.expression === null) {
        throw new Error("Função deve retornar um valor.");
      }
      const exprType = this.evaluateExpressionType(retStmt.expression);
      if (exprType !== this.currentReturnType) {
        throw new Error(
          `Tipo de retorno incompatível: esperado ${this.currentReturnType}, mas encontrado ${exprType}.`
        );
      }
    }
  }

  evaluateExpressionType(expr) {
    // Método que analisa o nó da expressão e retorna seu tipo.
    switch (expr.type) {
      case "Literal":
        if (/^\d+$/.test(expr.value)) {
          return "number";
        }
        if (expr.value === "true" || expr.value === "false") {
          return "boolean";
        }
        throw new Error(`Literal desconhecido: ${expr.value}`);
      case "Identifier":
        const symbol = this.symbolTable.get(expr.name);
        return symbol.type;
      case "ArithmeticExpression": {
        const leftType = this.evaluateExpressionType(expr.left);
        const rightType = this.evaluateExpressionType(expr.right);
        if (leftType !== "number" || rightType !== "number") {
          throw new Error("Operação aritmética com tipos não inteiros.");
        }
        return "number";
      }
      case "RelationalExpression": {
        const leftType = this.evaluateExpressionType(expr.left);
        const rightType = this.evaluateExpressionType(expr.right);
        if (leftType !== rightType) {
          throw new Error("Operação relacional com tipos incompatíveis.");
        }
        return "boolean";
      }
      case "CallExpression": {
        // Verifica se a função foi declarada e se os argumentos são compatíveis.
        const funcSymbol = this.symbolTable.get(expr.callee.name);
        if (!funcSymbol) {
          throw new Error(`Função ${expr.callee.name} não declarada.`);
        }
        if (expr.arguments.length !== funcSymbol.params.length) {
          throw new Error(`Número de argumentos incorreto para ${expr.callee.name}.`);
        }
        expr.arguments.forEach((arg, i) => {
          const argType = this.evaluateExpressionType(arg);
          const paramType = funcSymbol.params[i].type;
          if (argType !== paramType) {
            throw new Error(
              `Tipo incompatível no parâmetro ${i + 1} de ${expr.callee.name}: esperado ${paramType}, mas encontrado ${argType}.`
            );
          }
        });
        return funcSymbol.type;
      }
      default:
        throw new Error(`Expressão não suportada: ${expr.type}`);
    }
  }
}

module.exports = SemanticAnalyzer;
