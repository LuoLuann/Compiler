class Token {
    constructor(type, value, line) {
        this.type = type;
        this.value = value;
        this.line = line;
    }

    toString() {
        return `Token(${this.type}, '${this.value}', ${this.line})`;
    }   
}

module.exports = Token;