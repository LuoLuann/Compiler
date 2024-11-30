class Token {
    constructor(type, value, line, lengthToken) {
        this.type = type;
        this.value = value;
        this.line = line;
    }

    toString() {
        return `Token(${this.type}, '${this.value}', ${this.line}, ${this.length})`;
    }   
}

module.exports = Token;