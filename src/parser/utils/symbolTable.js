

class SymbolTable {
    constructor() {
        // pilha de escopos começando pelo global
        this.scopes = [new Map()]
    }

    add(identifier, properties) {
        const currentScope = this.currentScope()
        if(currentScope.has(identifier)) {
            throw new Error(`Symbol ${identifier} already declared in current scope.`)
        }
        currentScope.set(identifier, properties)
    }

    update(identifier, properties) {
        for (let i = this.scopes.length - 1; i>= 0; i--) {
            if (this.scopes[i].has(identifier)) {
                this.scopes[i].set(identifier, {...this.scopes[i].get(identifier), ...properties })
            }
        }

        throw new Error(`Symbol ${identifier} is not defined`);
    }

    get (identifier) {
        for (let i = this.scopes.length - 1; i>= 0; i--) {
            if (this.scopes[i].has(identifier)) {
                return this.scopes[i].get(identifier)
            }
        }
        throw new Error(`Symbol ${identifier} is not defined`)
    }

    existsInCurrentScope(identifier) {
        return this.currentScope().has(identifier)
    }

    enterScope() {
        this.scopes.push(new Map())
    }

    exitScope() {
        if (this.scopes.length === 1) {
            throw new Error("Cannot exit global scope")
        }
        this.scopes.pop()
    }

    printCurrentScope() {
        console.log("Current scope: ", this.currentScope())
    }

    printAllScopes() {
        console.log("All scopes: ")
        for (let i = 0; i < this.scopes.length; i++) {
            console.log(`Scope ${i}: `, this.scopes[i])
        }

    }
}

module.exports = SymbolTable;