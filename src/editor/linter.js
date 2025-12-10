// CodeMirror linter integration for sequence diagrams
// Shows error markers in scrollbar and gutter

import { parse } from '../ast/parser.js';

/**
 * Lint the sequence diagram text and return errors
 * @param {string} text - Editor text
 * @returns {Array} Array of lint error objects
 */
function lintSequenceDiagram(text) {
  const ast = parse(text);
  const errors = ast.filter(node => node.type === 'error');

  return errors.map(error => ({
    from: CodeMirror.Pos(error.sourceLineStart - 1, 0),
    to: CodeMirror.Pos(error.sourceLineEnd - 1, 999),
    message: error.message,
    severity: 'error'
  }));
}

/**
 * Register the sequence diagram linter
 * @param {CodeMirror} CodeMirror - CodeMirror constructor
 */
export function registerLinter(CodeMirror) {
  CodeMirror.registerHelper('lint', 'sequence-diagram', lintSequenceDiagram);
}

/**
 * Setup linting on the editor
 * @param {CodeMirror} editor - CodeMirror instance
 */
export function setupLinting(editor) {
  editor.setOption('lint', {
    getAnnotations: lintSequenceDiagram,
    async: false
  });
  editor.setOption('gutters', ['CodeMirror-lint-markers', 'CodeMirror-linenumbers']);
}
