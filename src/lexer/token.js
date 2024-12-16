class Token {
    constructor(type, value, line) {
        this.type = type; // ex: type: COLON, value: :, line: 13
        this.value = value;
        this.line = line;
    }

    toString() {
        return `Token(${this.type}, '${this.value}', ${this.line})`;
    }   
}

module.exports = Token;