/**
 * @fileoverview Implements toMark
 * @author Sungho Kim(sungho-kim@nhnent.com) FE Development Team/NHN Ent.
 */

'use strict';

var DomRunner = require('./domRunner'),
    toDom = require('./toDom'),
    basicRenderer = require('./renderer.basic'),
    gfmRenderer = require('./renderer.gfm');

var FIND_FIRST_LAST_WITH_SPACE_RETURNS_RX = /^[\n]+|[\s\n]+$/g,
    FIND_TRIPLE_OVER_RETURNS_RX = /(\n){3,}/g,
    FIND_RETURNS_RX = /([ \xA0]){2,}\n/g,
    FIND_EMPTYLINE_WITH_RETURN_RX = /\n[ \xA0]+\n\n/g,
    FIND_MULTIPLE_EMPTYLINE_BETWEEN_BLOCK_RX = /(\n\n)?([ \xA0]+\n){2,}/g,
    FIND_DUPLICATED_2_RETURNS_WITH_BR_RX = /[ \xA0]+\n\n\n/g,
    FIND_DUPLICATED_RETURN_WITH_BR_RX = /[ \xA0]+\n\n/g;
/**
 * toMark
 * @exports toMark
 * @param {string} htmlStr html string to convert
 * @param {object} options option
 * @param {boolean} options.gfm if this property is false turn off it cant parse gfm
 * @param {Renderer} options.renderer pass renderer to use
 * @return {string} converted markdown text
 * @example
 * toMark('<h1>hello world</h1>'); // "# hello world"
 * toMark('<del>strike</del>'); // "~~strike~~"
 * toMark('<del>strike</del>', {gfm: false}); // "strike"
 */
function toMark(htmlStr, options) {
    var runner,
        isGfm = true,
        renderer;

    if (!htmlStr) {
        return '';
    }

    renderer = gfmRenderer;

    if (options) {
        isGfm = options.gfm;

        if (isGfm === false) {
            renderer = basicRenderer;
        }

        renderer = options.renderer || renderer;
    }

    runner = new DomRunner(toDom(htmlStr));

    return finalize(parse(runner, renderer), isGfm);
}

/**
 * parse
 * Parse dom to markdown
 * @param {DomRunner} runner runner
 * @param {Renderer} renderer renderer
 * @return {string} markdown text
 */
function parse(runner, renderer) {
    var markdownContent = '';

    while (runner.next()) {
        markdownContent += tracker(runner, renderer);
    }

    return markdownContent;
}

/**
 * finalize
 * Remove first and last return character
 * @param {string} text text to finalize
 * @param {boolean} isGfm isGfm flag
 * @return {string} result
 */
function finalize(text, isGfm) {
    //console.log(JSON.stringify(text));
    //collapse duplicated returns made by <br /> and block element
    //블럭요소가 만들어내는 개행두개와 겹친 BR에 대한 처리
    text = text.replace(FIND_DUPLICATED_2_RETURNS_WITH_BR_RX, '\n\n');
    //console.log(JSON.stringify(text));

    //collpase emptyline and additional return
    //빈라인과 개행이 함게 있다면 개행 하나로 처리
    text = text.replace(FIND_EMPTYLINE_WITH_RETURN_RX, '\n  \n');
    //console.log(JSON.stringify(text));

    //collapse return and <br>
    //개행과 br이 함께 있다면 개행하나로 처리
    text = text.replace(FIND_DUPLICATED_RETURN_WITH_BR_RX, '\n');
    //console.log(JSON.stringify(text));

    //collapse over triple returns made by consecutive block elements
    //개행이 여러개 있다면 한개의 빈라인으로 대체
    text = text.replace(FIND_TRIPLE_OVER_RETURNS_RX, '\n\n');
    //console.log(JSON.stringify(text));

    //remove multi empty lines between block
    //빈라인이 여러개 있다면 한개로 대체
    text = text.replace(FIND_MULTIPLE_EMPTYLINE_BETWEEN_BLOCK_RX, '\n\n');
    //console.log(JSON.stringify(text));

    //remove first and last \n
    //시작과 마지막 개행제거
    text = text.replace(FIND_FIRST_LAST_WITH_SPACE_RETURNS_RX, '');
    //console.log(JSON.stringify(text));

    //in gfm replace '  \n' make by <br> to '\n'
    //gfm모드인경우 임의 개행에 스페이스를 제거
    if (isGfm) {
        text = text.replace(FIND_RETURNS_RX, '\n');
    }
    //console.log(JSON.stringify(text));

    return text;
}

/**
 * tracker
 * Iterate childNodes and process conversion using recursive call
 * @param {DomRunner} runner dom runner
 * @param {Renderer} renderer renderer to use
 * @return {string} processed text
 */
function tracker(runner, renderer) {
    var i,
        t,
        subContent = '',
        content;

    var node = runner.getNode();

    for (i = 0, t = node.childNodes.length; i < t; i += 1) {
        runner.next();
        subContent += tracker(runner, renderer);
    }

    content = renderer.convert(node, subContent);

    return content;
}

module.exports = toMark;