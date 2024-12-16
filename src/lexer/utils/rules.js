module.exports = [
    // Reserved keywords (prioritized to avoid conflicts with IDENTIFIER)
    { regex: /^\bif\b/, type: "IF" },
    { regex: /^\belse\b/, type: "ELSE" },
    { regex: /^\bwhile\b/, type: "WHILE" },
    { regex: /^\bfor\b/, type: "FOR" },
    { regex: /^\breturn\b/, type: "RETURN" },
    { regex: /^\bbreak\b/, type: "BREAK" },
    { regex: /^\bcontinue\b/, type: "CONTINUE" },
    { regex: /^\bconst\b/, type: "CONST" },
    { regex: /^\bvar\b/, type: "VARIABLE" },
    { regex: /^\bfunction\b/, type: "FUNCTION" },
    { regex: /^\bprint\b/, type: "PRINT" },
    { regex: /^\bmain\b/, type: "MAIN" },
    { regex: /^\binteger\b|^\bboolean\b/, type: "TYPE" },

    { regex: /^\true\b|\false\b/, type: "BOOLEAN" },

    { regex: /^[a-zA-Z_][a-zA-Z0-9_]*/, type: "IDENTIFIER" },
    
    // Numbers (integers and decimals)
    { regex: /^\d+/, type: "NUMBER" },

    // Symbols and operators
    { regex: /^==/, type: "EQUAL" },
    { regex: /^!=/, type: "DIFFERENT" },
    { regex: /^>=/, type: "GREATER_OR_EQUAL" },
    { regex: /^<=/, type: "LESS_OR_EQUAL" },
    { regex: /^>/, type: "GREATER" },
    { regex: /^</, type: "LESS" },
    { regex: /^\+/, type: "PLUS" },
    { regex: /^\-/, type: "MINUS" },
    { regex: /^\*/, type: "MULTIPLY" },
    { regex: /^\//, type: "DIVIDE" },
    { regex: /^=/, type: "ASSIGN" },
    { regex: /^;/, type: "SEMICOLON" },
    { regex: /^\(/, type: "LPAREN" },
    { regex: /^\)/, type: "RPAREN" },
    { regex: /^\{/, type: "LBRACE" },
    { regex: /^\}/, type: "RBRACE" },
    { regex: /^\,/, type: "COMMA" },
    { regex: /^\:/, type: "COLON" },

    // Whitespace (ignored)
    { regex: /^\s+/, type: "WHITESPACE" },

    // Comments (single-line)
    { regex: /^\/\/[^\n]*/, type: "COMMENT" },
];
