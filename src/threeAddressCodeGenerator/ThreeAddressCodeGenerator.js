class ThreeAddressCodeGenerator {
  constructor(ast) {
    this.ast = ast;
    this.instructions = [];
    this.tempCount = 0;
    this.labelCount = 0;
    // Para tratar break/continue em laços, utiliza uma pilha
    this.loopStack = [];
  }

  newTemp() {
    return `T${this.tempCount++}`;
  }

  newLabel() {
    return `L${this.labelCount++}`;
  }

  generate() {
    this.visitProgram(this.ast);
    this.optimizeInstructions();
    return this.instructions;
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

  visitConstantDeclaration(decl) {
    const value = this.visitExpression(decl.value);
    this.instructions.push(`${decl.id} = ${value}`);
  }

  visitFunctionOrProcedureDeclaration(decl) {
    this.instructions.push(`${decl.id}:`);
    this.visitBlock(decl.body);
    this.instructions.push(`end ${decl.id}`);
  }

  visitMainFunction(mainFunc) {
    this.instructions.push('main:');
    this.visitBlock(mainFunc.body);
    this.instructions.push('end main');
  }

  visitBlock(block) {
    block.commands.forEach(cmd => {
      this.visitCommand(cmd);
    });
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
        this.visitFunctionCall(cmd);
        break;
      case "BreakStatement":
      case "ContinueStatement":
        this.visitBreakAndContinue(cmd);
        break;
      default:
        throw new Error(`Comando não suportado: ${cmd.type}`);
    }
  }

  visitVariableDeclaration(decl) {
    const value = this.visitExpression(decl.value);
    this.instructions.push(`${decl.id} = ${value}`);
  }

  visitAssignment(assign) {
    const value = this.visitExpression(assign.value);
    this.instructions.push(`${assign.id} = ${value}`);
  }

  visitPrintStatement(printStmt) {
    const value = this.visitExpression(printStmt.body);
    this.instructions.push(`print ${value}`);
  }

  visitWhileLoop(loop) {
    const startLabel = this.newLabel();
    const endLabel = this.newLabel();

    this.loopStack.push({ breakLabel: endLabel, continueLabel: startLabel });

    this.instructions.push(`${startLabel}:`);
    const condition = this.visitExpression(loop.condition);
    this.instructions.push(`ifFalse ${condition} goto ${endLabel}`);
    this.visitBlock(loop.body);
    this.instructions.push(`goto ${startLabel}`);
    this.instructions.push(`${endLabel}:`);

    this.loopStack.pop();
  }

  visitForLoop(loop) {
    if (loop.value) {
      const initVal = this.visitExpression(loop.value);
      this.instructions.push(`${loop.id} = ${initVal}`);
    }

    const startLabel = this.newLabel();
    const endLabel = this.newLabel();

    this.loopStack.push({ breakLabel: endLabel, continueLabel: startLabel });

    this.instructions.push(`${startLabel}:`);
    const condition = this.visitExpression(loop.condition);
    this.instructions.push(`ifFalse ${condition} goto ${endLabel}`);
    this.visitBlock(loop.body);
    this.visitExpression(loop.increment);
    this.instructions.push(`goto ${startLabel}`);
    this.instructions.push(`${endLabel}:`);

    this.loopStack.pop();
  }

  visitIfStatement(ifStmt) {
    const elseLabel = this.newLabel();
    const endLabel = this.newLabel();
    const condition = this.visitExpression(ifStmt.condition);
    this.instructions.push(`ifFalse ${condition} goto ${elseLabel}`);
    this.visitBlock(ifStmt.body);
    this.instructions.push(`goto ${endLabel}`);
    this.instructions.push(`${elseLabel}:`);
    if (ifStmt.elseBranch) {
      if (ifStmt.elseBranch.type === "IFStatement") {
        this.visitIfStatement(ifStmt.elseBranch);
      } else {
        this.visitBlock(ifStmt.elseBranch);
      }
    }
    this.instructions.push(`${endLabel}:`);
  }

  visitFunctionCall(callExpr) {
    let args = [];
    callExpr.arguments.forEach(arg => {
      const argValue = this.visitExpression(arg);
      args.push(argValue);
    });
    const temp = this.newTemp();
    this.instructions.push(`${temp} = call ${callExpr.callee.name}, ${args.join(', ')}`);
    return temp;
  }

  visitBreakAndContinue(cmd) {
    if (this.loopStack.length === 0) {
      throw new Error(`${cmd.type} usado fora de um laço.`);
    }
    const currentLoop = this.loopStack[this.loopStack.length - 1];
    if (cmd.type === "BreakStatement") {
      this.instructions.push(`goto ${currentLoop.breakLabel}`);
    } else if (cmd.type === "ContinueStatement") {
      this.instructions.push(`goto ${currentLoop.continueLabel}`);
    }
  }

  visitExpression(expr) {
    switch (expr.type) {
      case "Literal":
        return expr.value;
      case "Identifier":
        return expr.name;
      case "ArithmeticExpression":
        return this.visitArithmeticExpression(expr);
      case "RelationalExpression":
        return this.visitRelationalExpression(expr);
      case "CallExpression":
        return this.visitFunctionCall(expr);
      case "AssignmentExpression":
        return this.visitAssignmentExpression(expr);
      default:
        throw new Error(`Expressão não suportada: ${expr.type}`);
    }
  }

  isNumeric(value) {
    return !isNaN(value);
  }

  computeArithmetic(operator, left, right) {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      default:
        throw new Error("Operador aritmético desconhecido: " + operator);
    }
  }

  visitArithmeticExpression(expr) {
    const left = this.visitExpression(expr.left);
    const right = this.visitExpression(expr.right);
    if (this.isNumeric(left) && this.isNumeric(right)) {
      const result = this.computeArithmetic(expr.operator, Number(left), Number(right));
      return result.toString();
    }
    const temp = this.newTemp();
    this.instructions.push(`${temp} = ${left} ${expr.operator} ${right}`);
    return temp;
  }

  visitRelationalExpression(expr) {
    const left = this.visitExpression(expr.left);
    const right = this.visitExpression(expr.right);

    if (this.isNumeric(left) && this.isNumeric(right)) {
      let result;
      switch (expr.operator) {
        case '==': result = (Number(left) == Number(right)) ? 1 : 0; break;
        case '!=': result = (Number(left) != Number(right)) ? 1 : 0; break;
        case '<': result = (Number(left) < Number(right)) ? 1 : 0; break;
        case '<=': result = (Number(left) <= Number(right)) ? 1 : 0; break;
        case '>': result = (Number(left) > Number(right)) ? 1 : 0; break;
        case '>=': result = (Number(left) >= Number(right)) ? 1 : 0; break;
        default:
          throw new Error("Operador relacional desconhecido: " + expr.operator);
      }
      return result.toString();
    }
    const temp = this.newTemp();
    this.instructions.push(`${temp} = ${left} ${expr.operator} ${right}`);
    return temp;
  }

  visitAssignmentExpression(expr) {
    const right = this.visitExpression(expr.right);
    const left = expr.left.name;
    this.instructions.push(`${left} = ${right}`);
    return left;
  }

  optimizeInstructions() {
    let tempInstr = [];
    for (let i = 0; i < this.instructions.length; i++) {
      const curr = this.instructions[i];
      if (this.isUnconditionalGoto(curr)) {
        tempInstr.push(curr);
        while (i + 1 < this.instructions.length && this.isUnconditionalGoto(this.instructions[i + 1])) {
          i++;
        }
      } else {
        tempInstr.push(curr);
      }
    }

    const jumpTargets = new Set();
    tempInstr.forEach(instr => {
      if (this.isUnconditionalGoto(instr) || this.isConditionalGoto(instr)) {
        const match = instr.match(/goto\s+(\w+)/);
        if (match) {
          jumpTargets.add(match[1]);
        }
      }
    });

    this.instructions = tempInstr.filter(instr => {
      if (this.isLabel(instr)) {
        const labelName = instr.slice(0, instr.length - 1);
        if (!labelName.startsWith("L")) {
          return true; 
        }
        return jumpTargets.has(labelName);
      }
      return true;
    });
  }

  isLabel(instr) {
    return /^\w+:$/.test(instr);
  }

  isUnconditionalGoto(instr) {
    return /^goto\s+\w+/.test(instr);
  }

  isConditionalGoto(instr) {
    return /^ifFalse\s+.*\s+goto\s+\w+/.test(instr);
  }

}

module.exports = ThreeAddressCodeGenerator;
