%lex
%%
[a-z][a-z0-9]*   { console.log("Token ID:", yytext); return 'ID'; }
[0-9]+                  { console.log("Token D:", yytext); return 'D'; }
\s+                     { /* Ignora espaços em branco */ }
<<EOF>>                 return 'EOF';  // Fim de arquivo
/lex


%start program

%%

program
    : IDs EOF  { console.log('IDs encontrados:', $1); }
    ;

IDs
    : ID           { return [$1]; }  // Um único ID
    | ID IDs       { $$ = [$1, ...$2]; }  // Vários IDs
    ;

%%