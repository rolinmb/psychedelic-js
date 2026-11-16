function init() {
    const canvas = document.getElementById("canvas");
    const generateBtn = document.getElementById("generate-btn");
    const downloadBtn = document.getElementById("download-btn");
    const filenameInput = document.getElementById("filename");
    const formatSelect = document.getElementById("image-format");
    const widthSlider = document.getElementById("canvas-width");
    const heightSlider = document.getElementById("canvas-height");
    const widthValue = document.getElementById("width-value");
    const heightValue = document.getElementById("height-value");
    const ctx = canvas.getContext("2d");
    let hasGeneratedImg = false;

    function resizeCanvas() {
        canvas.width = Number(widthSlider.value);
        canvas.height = Number(heightSlider.value);

        widthValue.textContent = canvas.width;
        heightValue.textContent = canvas.height;

        // Redraw if an image has previously been generated.
        if (hasGeneratedImg) {
            try {
                generateImage(canvas, ctx);
                hasGeneratedImg = true;
            } catch (error) {
                console.error("Image redraw failed:", error);
                alert(error.message);
            }
        }
    }

    widthSlider.addEventListener("input", () => {
        widthValue.textContent = widthSlider.value;
    });

    widthSlider.addEventListener("change", resizeCanvas);

    heightSlider.addEventListener("input", () => {
        heightValue.textContent = heightSlider.value;
    });

    heightSlider.addEventListener("change", resizeCanvas);

    generateBtn.addEventListener("click", () => {
        try {
            generateImage(canvas, ctx);
            hasGeneratedImg = true;

        } catch (error) {
            console.error("Image generation failed:", error);
            alert(error.message);
        }
    });

    downloadBtn.addEventListener("click", () => {
        let filename = filenameInput.value.trim();
        const format = formatSelect.value;

        if (!filename) {
            filename = "canvas";
        }

        const extension = format.split("/")[1];

        canvas.toBlob((blob) => {

            if (!blob) {
                console.error("Canvas conversion failed.");
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = `${filename}.${extension}`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);

        }, format);

    });
}

function tokenizeExpression(expression) {

    const tokens = [];

    const pattern =
        /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[a-zA-Z_][a-zA-Z0-9_]*|^(?:&\^|<<|>>|[()+\-*/%&|^,])/;

    let position = 0;

    while (position < expression.length) {

        const remaining = expression.slice(position);

        // Ignore whitespace
        if (/^\s+/.test(remaining)) {
            position += remaining.match(/^\s+/)[0].length;
            continue;
        }

        const match = remaining.match(pattern);

        if (!match) {
            throw new Error(
                `Unexpected character at position ${position}: ${remaining[0]}`
            );
        }

        tokens.push(match[0]);

        position += match[0].length;
    }

    return tokens;
}

function parseExpression(expression) {

    const tokens = tokenizeExpression(expression);

    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume() {
        return tokens[position++];
    }

    function expect(token) {
        if (consume() !== token) {
            throw new Error(`Expected '${token}'`);
        }
    }

    // Operator precedence
    const precedence = {
        "|": 1,
        "^": 2,
        "&": 3,
        "&^": 3,
        "<<": 4,
        ">>": 4,
        "+": 5,
        "-": 5,
        "*": 6,
        "/": 6,
        "%": 6
    };

    // Parse binary expressions using precedence climbing.
    function parseBinary(minPrecedence = 0) {

        let left = parseUnary();

        while (true) {

            const operator = peek();
            const currentPrecedence = precedence[operator];

            if (
                currentPrecedence === undefined ||
                currentPrecedence < minPrecedence
            ) {
                break;
            }

            consume();

            const right = parseBinary(currentPrecedence + 1);

            left = {
                type: "BinaryExpression",
                operator: operator,
                left: left,
                right: right
            };
        }

        return left;
    }

    // Parse unary operators.
    function parseUnary() {

        const operator = peek();

        if (operator === "+" || operator === "-") {

            consume();

            return {
                type: "UnaryExpression",
                operator: operator,
                operand: parseUnary()
            };
        }

        return parsePrimary();
    }

    // Parse literals, variables, function calls and parentheses.
    function parsePrimary() {

        const token = peek();

        if (token === undefined) {
            throw new Error("Unexpected end of expression");
        }

        // Parenthesized expression
        if (token === "(") {

            consume();

            const expression = parseBinary();

            expect(")");

            return {
                type: "ParenthesizedExpression",
                expression: expression
            };
        }

        // Numeric literal
        if (/^(?:\d|\.)/.test(token)) {

            consume();

            return {
                type: "Literal",
                value: Number(token)
            };
        }

        // Identifier or function call
        if (/^[a-zA-Z_]/.test(token)) {

            const name = consume();

            // Function call
            if (peek() === "(") {

                consume();

                const args = [];

                if (peek() !== ")") {

                    while (true) {

                        args.push(parseBinary());

                        if (peek() !== ",") {
                            break;
                        }

                        consume();
                    }
                }

                expect(")");

                return {
                    type: "CallExpression",
                    name: name,
                    args: args
                };
            }

            // Variable identifier
            return {
                type: "Identifier",
                name: name
            };
        }

        throw new Error(`Unexpected token: ${token}`);
    }

    const ast = parseBinary();

    if (position !== tokens.length) {
        throw new Error(`Unexpected token: ${peek()}`);
    }

    return ast;
}

// Evaluate an expression tree recursively.
function evalExprTreeNode(node, vars = {}) {

    if (!node || typeof node !== "object") {
        throw new Error("Invalid expression node");
    }

    switch (node.type) {

        // Numeric literals
        case "Literal":
            {
                const value = Number(node.value);

                if (!Number.isFinite(value)) {
                    throw new Error(`Invalid numeric literal: ${node.value}`);
                }

                return value;
            }

            // Variable identifiers
        case "Identifier":
            {
                const varName = node.name;

                if (Object.hasOwn(vars, varName)) {
                    return Number(vars[varName]);
                }

                throw new Error(`Undefined variable: ${varName}`);
            }

            // Function calls
        case "CallExpression":
            {

                const functions = {
                    sin: Math.sin,
                    cos: Math.cos,
                    tan: Math.tan,
                    exp: Math.exp,
                    sqrt: Math.sqrt,
                    abs: Math.abs,
                    pow: Math.pow
                };

                const func = functions[node.name];

                if (!func) {
                    throw new Error(`Undefined function: ${node.name}`);
                }

                const expectedArgs = node.name === "pow" ? 2 : 1;

                if (node.args.length !== expectedArgs) {
                    throw new Error(
                        `${node.name} expects ${expectedArgs} arguments`
                    );
                }

                const args = node.args.map(arg =>
                    evalExprTreeNode(arg, vars)
                );

                return func(...args);
            }

            // Binary expressions
        case "BinaryExpression":
            {

                const left = evalExprTreeNode(node.left, vars);
                const right = evalExprTreeNode(node.right, vars);

                switch (node.operator) {

                    case "+":
                        return left + right;

                    case "-":
                        return left - right;

                    case "*":
                        return left * right;

                    case "/":
                        return left / right;

                    case "%":
                        return ieeeRemainder(left, right);

                    case "&":
                        return bitwiseOperation(left, right, "&");

                    case "|":
                        return bitwiseOperation(left, right, "|");

                    case "^":
                        return bitwiseOperation(left, right, "^");

                    case "&^":
                        return bitwiseOperation(left, right, "&^");

                    case "<<":
                        return bitwiseOperation(left, right, "<<");

                    case ">>":
                        return bitwiseOperation(left, right, ">>");

                    default:
                        throw new Error(
                            `Unsupported binary operator: ${node.operator}`
                        );
                }
            }

            // Parenthesized expressions
        case "ParenthesizedExpression":
            return evalExprTreeNode(node.expression, vars);

            // Unary expressions
        case "UnaryExpression":
            {

                const operand = evalExprTreeNode(node.operand, vars);

                switch (node.operator) {

                    case "+":
                        return operand;

                    case "-":
                        return -operand;

                    default:
                        throw new Error(
                            `Unsupported unary operator: ${node.operator}`
                        );
                }
            }

        default:
            throw new Error(`Unsupported expression type: ${node.type}`);
    }
}


// IEEE 754 remainder, corresponding to Go's math.Remainder.
function ieeeRemainder(x, y) {

    if (!Number.isFinite(x) || Number.isNaN(y) || y === 0) {
        return NaN;
    }

    if (!Number.isFinite(y)) {
        return x;
    }

    const quotient = x / y;
    const lower = Math.floor(quotient);
    const fraction = quotient - lower;

    let nearest;

    if (fraction < 0.5) {
        nearest = lower;
    } else if (fraction > 0.5) {
        nearest = lower + 1;
    } else {
        nearest = lower % 2 === 0 ? lower : lower + 1;
    }

    return x - nearest * y;
}

function compileExpression(node) {

    if (!node || typeof node !== "object") {
        throw new Error("Invalid expression node");
    }

    switch (node.type) {

        // Numeric literals
        case "Literal":
            {

                const value = Number(node.value);

                if (!Number.isFinite(value)) {
                    throw new Error(`Invalid numeric literal: ${node.value}`);
                }

                // Constant: no evaluation required.
                return () => value;
            }

            // Variable identifiers
        case "Identifier":
            {

                const name = node.name;

                return (vars) => {

                    if (Object.hasOwn(vars, name)) {
                        return Number(vars[name]);
                    }

                    throw new Error(`Undefined variable: ${name}`);
                };
            }

            // Function calls
        case "CallExpression":
            {

                const functions = {
                    sin: Math.sin,
                    cos: Math.cos,
                    tan: Math.tan,
                    exp: Math.exp,
                    sqrt: Math.sqrt,
                    abs: Math.abs,
                    pow: Math.pow
                };

                const func = functions[node.name];

                if (!func) {
                    throw new Error(`Undefined function: ${node.name}`);
                }

                const expectedArgs = node.name === "pow" ? 2 : 1;

                if (node.args.length !== expectedArgs) {
                    throw new Error(
                        `${node.name} expects ${expectedArgs} arguments`
                    );
                }

                // Compile arguments only once.
                const args = node.args.map(compileExpression);

                return (vars) => {
                    return func(...args.map(arg => arg(vars)));
                };
            }

            // Binary expressions
        case "BinaryExpression":
            {

                // Compile both sides once.
                const left = compileExpression(node.left);
                const right = compileExpression(node.right);

                switch (node.operator) {

                    case "+":
                        return vars => left(vars) + right(vars);

                    case "-":
                        return vars => left(vars) - right(vars);

                    case "*":
                        return vars => left(vars) * right(vars);

                    case "/":
                        return vars => left(vars) / right(vars);

                    case "%":
                        return vars => ieeeRemainder(
                            left(vars),
                            right(vars)
                        );

                    case "&":
                        return vars => bitwiseOperation(
                            left(vars), right(vars), "&"
                        );

                    case "|":
                        return vars => bitwiseOperation(
                            left(vars), right(vars), "|"
                        );

                    case "^":
                        return vars => bitwiseOperation(
                            left(vars), right(vars), "^"
                        );

                    case "&^":
                        return vars => bitwiseOperation(
                            left(vars), right(vars), "&^"
                        );

                    case "<<":
                        return vars => bitwiseOperation(
                            left(vars), right(vars), "<<"
                        );

                    case ">>":
                        return vars => bitwiseOperation(
                            left(vars), right(vars), ">>"
                        );

                    default:
                        throw new Error(
                            `Unsupported binary operator: ${node.operator}`
                        );
                }
            }

            // Parenthesized expressions
        case "ParenthesizedExpression":
            {

                return compileExpression(node.expression);
            }

            // Unary expressions
        case "UnaryExpression":
            {

                const operand = compileExpression(node.operand);

                switch (node.operator) {

                    case "+":
                        return vars => operand(vars);

                    case "-":
                        return vars => -operand(vars);

                    default:
                        throw new Error(
                            `Unsupported unary operator: ${node.operator}`
                        );
                }
            }

        default:
            throw new Error(
                `Unsupported expression type: ${node.type}`
            );
    }
}

function generateImage(canvas, ctx) {

    const expressionInputs = {
        r: document.getElementById("r-expression"),
        g: document.getElementById("g-expression"),
        b: document.getElementById("b-expression"),
        a: document.getElementById("a-expression")
    };

    // Parse and compile each expression once.
    const expressions = {};

    for (const [channel, input] of Object.entries(expressionInputs)) {

        const source = input.value.trim();

        expressions[channel] = source ?
            compileExpression(parseExpression(source)) :
            null;
    }

    const width = canvas.width;
    const height = canvas.height;

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    const t = performance.now() / 1000;

    // Reuse the same variables object for every pixel.
    const variables = {
        x: 0,
        y: 0,
        t: t
    };

    function getChannel(expression, fallback) {

        if (!expression) return fallback;

        const value = expression(variables);

        if (!Number.isFinite(value)) return 0;

        return Math.round(Math.max(0, Math.min(255, value)));
    }

    // Generate pixels.
    for (let y = 0; y < height; y++) {

        variables.y = y;

        for (let x = 0; x < width; x++) {

            variables.x = x;

            const index = (y * width + x) * 4;

            pixels[index] = getChannel(expressions.r, 0);
            pixels[index + 1] = getChannel(expressions.g, 0);
            pixels[index + 2] = getChannel(expressions.b, 0);
            pixels[index + 3] = getChannel(expressions.a, 255);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

document.addEventListener("DOMContentLoaded", init);