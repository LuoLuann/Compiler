const SymbolTable = require('../parser/utils/symbolTable');

class SemanticAnalyzer {
  constructor(ast) {
    this.ast = ast;
    this.symbolTable = new SymbolTable();
    this.currentReturnType = null;
    this.loopDepth = 0;
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
    if (this.symbolTable.existsInCurrentScope(decl.id)) {
      this.logError(`Constante "${decl.id}" já declarada no escopo atual`, this.currentToken());
      throw new Error(`Erro Semântico: Constante "${decl.id}" já declarada no escopo atual.`);
    } else if (this.symbolTable.existsInGlobalScope(decl.id)) {
      this.logError(`Constante "${decl.id}" já declarada`, this.currentToken());
      throw new Error(`Erro Semântico: Constante "${decl.id}" já declarada.`);
    }
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
    if (this.symbolTable.existsInCurrentScope(decl.id) || this.symbolTable.existsInGlobalScope(decl.id)) {
      throw new Error(`${decl.id} já declarado.`);
    }
    this.symbolTable.add(decl.id, { type: decl.returnType, params: decl.params, constant: false, isFunction: decl.isFunction });
    this.symbolTable.enterScope();
    decl.params.forEach(param => {
      if (this.symbolTable.existsInCurrentScope(param.id)) {
        throw new Error(`Parâmetro ${param.id} já declarado na função ${decl.id}.`);
      }
      this.symbolTable.add(param.id, { type: param.type, constant: false });
    })
    const returnStatement = decl.body.commands.find(command => command.type === "ReturnStatement");
    if (returnStatement) {
      decl.body.commands = decl.body.commands.filter(command => command !== returnStatement);
    }
    this.visitBlock(decl.body);

    if (decl.isFunction && decl.returnType !== null) {
      const returnType = decl.returnType;

      if (returnStatement) {
        const returnExpressionType = this.evaluateExpressionType(returnStatement.expression);

        if (returnStatement.expression === null || returnStatement.expression === undefined) {
          throw new Error(`Função "${decl.id}" especifica o retorno ${returnType}, mas retorna null.`);
        }
        if (returnExpressionType !== returnType) {
          throw new Error(`Tipo de retorno incompatível para a função "${decl.id}". Esperado: ${returnType}, mas encontrado: ${returnExpressionType}.`);
        }

      } else {
        throw new Error(`Função "${decl.id}" especifica o retorno ${returnType}, mas não há um valor de retorno.`);
      }
    } else if (!decl.isFunction && decl.returnType) {
      throw new Error(`Funções sem retorno não podem ser tipadas`);
    }
    this.symbolTable.exitScope();
  }

  visitBlock(block) {
    // this.symbolTable.enterScope();
    block.commands.forEach(cmd => {
      this.visitCommand(cmd);
    });
    // this.symbolTable.exitScope();
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
      case "CallExpression":
        this.visitFunctionCall(cmd)
        break;
      case "BreakStatement":
      case "ContinueStatement":
        this.visitBreakAndContinue(cmd)
        break;
      default:
        throw new Error(`Comando não suportado: ${cmd.type}`);
    }
  }

  visitVariableDeclaration(decl) {
    // decl.id, decl.varType, decl.value (opcional)
    if (this.symbolTable.existsInCurrentScope(decl.id)) {
      this.logError(`Constante "${decl.id}" já declarada no escopo atual`, this.currentToken());
      throw new Error(`Erro Semântico: Constante "${decl.id}" já declarada no escopo atual.`);
    }

    let exprType = null;
    if (decl.value) {
      exprType = this.evaluateExpressionType(decl.value);
      if (exprType !== decl.varType) {
        throw new Error(
          `Tipo incompatível na declaração da variável ${decl.id}: esperado ${decl.varType}, mas encontrado ${exprType}.`
        );
      }
    }
    this.symbolTable.add(decl.id, { type: decl.varType, constant: false });
  }
  visitFunctionCall(callExpr) {
    const funcSymbol = this.symbolTable.get(callExpr.callee.name)
    if (!funcSymbol) {
      throw new Error(`Função ${callExpr.callee.name} não declarada.`);
    }
    if (callExpr.arguments.length !== funcSymbol.params.length) {
      throw new Error(`Número de argumentos incorreto para ${callExpr.callee.name}.`);
    }
    if (funcSymbol.isFunction && funcSymbol.type !== null) {
      throw new Error(`Chamada inválida: a função "${callExpr.callee.name}" deve ser utilizada em uma atribuição, pois retorna um valor.`);
    }

    callExpr.arguments.forEach((arg, i) => {
      const argType = this.evaluateExpressionType(arg)
      const paramType = funcSymbol.params[i].type

      if (argType !== paramType) {
        throw new Error(
          `Tipo incompatível no parâmetro ${i + 1} de ${callExpr.callee.name}: esperado ${paramType}, mas encontrado ${argType}.`
        );
      }
      return funcSymbol.type
    })
  }
  visitAssignment(assign) {
    // assign.id, assign.value
    let symbol = null;

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
    this.loopDepth++;
    
    this.symbolTable.enterScope();
    this.visitBlock(loop.body);
    this.symbolTable.exitScope();

    this.loopDepth--;
  }

  visitForLoop(loop) {
    const condType = this.evaluateExpressionType(loop.condition);
    if (condType !== "boolean") {
      throw new Error("Condição do for deve ser do tipo boolean.");
    }
    this.evaluateExpressionType(loop.increment);
  
    this.loopDepth++;
    
    this.symbolTable.enterScope();
    this.visitBlock(loop.body);
    this.symbolTable.exitScope();
    
    this.loopDepth--;
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

  visitBreakAndContinue(cmd) {
    console.log(this.loopDepth)
    if (this.loopDepth === 0) {
      switch (cmd.type) {
        case "BreakStatement":
          throw new Error("'Break' usado fora de um laço.");
        case "ContinueStatement":
          throw new Error("'Continue' usado fora de um laço.");
      }
    }
  }

  evaluateExpressionType(expr) {
    console.log(expr)
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
