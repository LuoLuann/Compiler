class SymbolTable {
    constructor() {
        // pilha de escopos começando pelo global
        this.scopes = [new Map()]

        /**
         * {
            "pi": { "type": "integer", "value": 3, "constant": true },
            "add": {
                "type": "function",
                "params": [
                    { "id": "x", "type": "integer" },
                    { "id": "y", "type": "integer" }
                ],
                "returnType": "integer"
            }
        }
         */
    }

    add(identifier, properties) {
        const currentScope = this.currentScope()
        if(currentScope.has(identifier)) {
            throw new Error(`Symbol ${identifier} already declared in current scope.`)
        }
        currentScope.set(identifier, properties)
    }

    update(identifier, properties) {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            if (this.scopes[i].has(identifier)) {
                this.scopes[i].set(identifier, { ...this.scopes[i].get(identifier), ...properties });
                return;
            }
        }
        throw new Error(`Symbol ${identifier} is not defined`);
    }

    currentScope() {
        return this.scopes[this.scopes.length - 1];
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
        console.log("Current scope: ", JSON.stringify([...this.currentScope().entries()], null, 2));
    }
    
    printAllScopes() {
        console.log("All scopes: ");
        this.scopes.forEach((scope, index) => {
            console.log(`Scope ${index}: `, JSON.stringify([...scope.entries()], null, 2));
        });
    }
    existsInGlobalScope(id) {
        return this.scopes[0].has(id)
    }

    getByNameInGlobalScope(name) {
        return this.scopes[0].get(name)
    }
}

module.exports = SymbolTable;