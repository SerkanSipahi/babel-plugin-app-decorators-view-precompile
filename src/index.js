import * as t from "babel-types";
import template from 'babel-template';
import handlebars from 'handlebars';

/**
 * getComponentName
 * @returns {string}
 */
let getComponentName = function(){
    return this.node.expression.callee.name;
};

/**
 * getTemplate
 * @returns {{error: null, template: null}}
 */
let getTemplate = function(){

    let statement = { error: null, template: null };

    let args = this.node.expression.arguments;
    if(!args.length) {
        return statement;
    }
    if(t.isStringLiteral(args[0])){
        let [{ value }] = args;
        statement.template = value;
    } else if(t.isTemplateLiteral(args[0])){
        let [{ quasis: [{ value: { raw } }] }] = args;
        statement.template = raw;
    } else {
        statement.error = `
            Please use StringLiteral ("foo") or TemplateLiteral (\`bar\`). Do not use
            something like this: "hello" + "World".
        `;
    }

    return statement;
};

/**
 * precompile
 * @howto precompile: https://github.com/wycats/handlebars.js/issues/1033
 * @this-param {string}
 * @returns {string}
 */
let precompile = function(engine){

    let preCompiled = null;
    let template = this;
    if(engine === 'handlebars'){
        let _preCompiled = handlebars.precompile(template);
        preCompiled = `(function() { return ${_preCompiled} })`;
    }


    return preCompiled;
};

/**
 * createAst
 * @this-param {string}
 * @param vars {object}
 * @returns {ast}
 */
let createAst = function(vars = {}){

    let compileTemplate = template(this);
    return compileTemplate(vars);
};

function plugin () {

    return {
        visitor: {
            Decorator(path, { opts }){

                let { engine, regex } = opts;

                let componentName = path::getComponentName('view');
                if(componentName !== 'view'){
                    return;
                }

                let { error, template } = path::getTemplate();

                if(error){
                    throw new Error(error);
                }

                if(!template){
                    return;
                }

                // do nothing when not template vars e.g. {{foo}} found
                if(!regex.test(template)){
                    return;
                }

                let precompiled = template::precompile(engine);
                let ast = precompiled::createAst();

                path.node.expression.arguments.splice(0, 1, ast.expression);
            }
        }
    };
}

export default plugin;