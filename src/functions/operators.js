// @flow
import defineFunction, {ordargument} from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";
import domTree from "../domTree";
import utils from "../utils";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

// \operatorname
// amsopn.dtx: \mathop{#1\kern\z@\operator@font#3}\newmcodes@
defineFunction({
    type: "operatorname",
    names: ["\\operatorname"],
    props: {
        numArgs: 1,
    },
    handler: (context, args) => {
        const body = args[0];
        return {
            type: "operatorname",
            value: ordargument(body),
        };
    },

    htmlBuilder: (group, options) => {
        const output = [];
        if (group.value.value.length > 0) {
            let letter = "";
            let mode = "";

            // Consolidate Greek letter function names into symbol characters.
            const temp = html.buildExpression(
                group.value.value, options.withFont("mathrm"), true);

            // All we want from temp are the letters. With them, we'll
            // create a text operator similar to \tan or \cos.
            for (let i = 0; i < temp.length; i++) {
                const child = temp[i];

                if (child instanceof domTree.symbolNode) {
                    letter = child.value;

                    // In the amsopn package, \newmcodes@ changes four
                    // characters, *-/:’, from math operators back into text.
                    // Given what is in temp, we have to address two of them.
                    letter = letter.replace(/\u2212/, "-");   // minus => hyphen
                    letter = letter.replace(/\u2217/, "*");

                    // Use math mode for Greek letters
                    mode = (/[\u0391-\u03D7]/.test(letter) ? "math" : "text");
                    output.push(buildCommon.mathsym(letter, mode));
                } else {
                    output.push(child);
                }
            }
        }
        const span = buildCommon.makeSpan(["mop"], output, options);
        return span;
    },

    mathmlBuilder: (group, options) => {
        // The steps taken here are similar to the html version.
        let output = [];
        if (group.value.value.length > 0) {
            const temp = mml.buildExpression(
                group.value.value, options.withFont("mathrm"));

            let word = "";
            for (let i = 0; i < temp.length; i++) {
                if (utils.contains(["mi", "mn", "mo"], temp[i].type)) {
                    word += temp[i].children[0].text;
                } else if (temp[i].type === "mspace") {
                    if (group.value.value[i].value === "\\,") {
                        word += "\u2006";
                    } else {
                        // TODO(kevinb) differentiate based on space width
                        word += " ";
                    }
                } else {
                    if (temp[i].lexer) {
                        const pos = temp[i].lexer.pos;
                        throw new Error(
                            `unrecognized group in \\operatorname at ${pos}`);
                    }
                }
            }
            word = word.replace(/\u2212/g, "-");
            word = word.replace(/\u2217/g, "*");
            output = [new mathMLTree.TextNode(word)];
        }
        const identifier = new mathMLTree.MathNode("mi", output);
        identifier.setAttribute("mathvariant", "normal");

        const operator = new mathMLTree.MathNode("mo",
            [mml.makeText("&ApplyFunction;", "text")]);

        return new domTree.documentFragment([identifier, operator]);
    },
});
