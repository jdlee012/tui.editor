'use strict';

var WysiwygEditor = require('../src/js/wysiwygEditor'),
    EventManager = require('../src/js/eventManager');

describe('WysiwygEditor', function() {
    var $container, em;

    beforeEach(function() {
        $container = $('<div />');

        $('body').append($container);

        em = new EventManager();
    });

    afterEach(function() {
        $('body').empty();
    });

    describe('Initialize', function() {
        var wwe;

        beforeEach(function() {
            wwe = new WysiwygEditor($container, null, em);
        });

        it('init() invoke callback', function(done) {
            wwe.init(300, function() {
                expect($('iframe').length).toEqual(1);
                expect($('iframe').contents().find('body').hasClass('neonEditor-content')).toBe(true);
                done();
            });
        });
    });

    describe('Event', function() {
        var wwe;

        beforeEach(function(done) {
            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                done();
            });
        });

        it('when something changed in editor Emit contentChanged.wysiwygEditor event', function(done) {
            em.listen('contentChanged.wysiwygEditor', function(data) {
                expect(data.replace(/<br \/>/g, '')).toEqual('<p>test</p>');
                done();
            });

            //because squire input event
            wwe.editor._ignoreChange = false;
            wwe.editor.insertHTML('<p>test</p>');
        });

        it('when something changed in editor Emit change.wysiwygEditor event', function(done) {
            //events of squire are asynchronous
            em.listen('change.wysiwygEditor', function(ev) {
                expect(ev.textContent).toEqual('t');
                //cuz, we cant simulate caret change
                //expect(ev.caretOffset).toEqual(1);
                done();
            });

            //because squire input event
            wwe.editor._ignoreChange = false;
            wwe.editor.insertPlainText('t');
        });

        it('when something changed in editor Emit change event', function(done) {
            //squire event fire asynchronous
            em.listen('change', function(ev) {
                expect(ev.textContent).toEqual('t');
                expect(ev.source).toEqual('wysiwyg');
                //expect(ev.caretOffset).toEqual(1);
                done();
            });

            //because squire input event
            wwe.editor._ignoreChange = false;
            wwe.editor.insertHTML('t');
        });
    });

    describe('getValue, setValue', function() {
        var wwe;

        beforeEach(function(done) {
            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                done();
            });
        });

        it('checked checkbox should have checked attribute', function() {
            wwe.getEditor().setHTML('<input type="checkbox" id="task" />');
            wwe.getEditor().getDocument().getElementById('task').checked = true;

            //use toLowerCase and indexOf because IE attribute order,name issue
            expect(wwe.getValue().toLowerCase().indexOf('checked="checked"')).not.toEqual(-1);
        });

        it('unchecked checkbox should not have checked attribute', function() {
            wwe.getEditor().setHTML('<input type="checkbox" id="task" checked="checked" />');
            wwe.getEditor().getDocument().getElementById('task').checked = false;

            expect(wwe.getValue().toLowerCase().indexOf('checked="checked"')).toEqual(-1);
        });

        it('remove all unnecessary brs', function() {
            var html = '<p>1</p><p>2</p>';
            wwe.setValue(html);
            expect(wwe.getValue()).toEqual('<p>1<br /></p><p>2<br /></p>');
        });

        it('dont remove necessary brs', function() {
            var html = '<p>1</p><div><br></div><p>2</p>';
            wwe.setValue(html);
            expect(wwe.getValue()).toEqual('<p>1<br /></p><br /><p>2<br /></p>');
        });

        it('remove contentEditable block tag(div)', function() {
            var html = 'abcde<br />efg';
            wwe.setValue(html);
            expect(wwe.getValue()).toEqual('abcde<br />efg<br />');
        });

        it('empty line replace to br', function() {
            var html = '<div><br /></div>test';
            wwe.setValue(html);
            expect(wwe.getValue()).toEqual('<br />test<br />');
        });

        it('empty line li dont replace to br', function() {
            var html = '<ul><li></li></ul>';
            wwe.setValue(html);
            expect(wwe.getValue()).toEqual(html);
        });

        it('setValue make single line p tag have div block tag', function() {
            wwe.setValue('<p>text1</p>');
            expect(wwe.get$Body().find('div').length).toEqual(1);
            expect(wwe.get$Body().find('div')[0].textContent).toEqual('text1');
        });
    });

    it('get current wysiwyg iframe body that wrapped jquery', function(done) {
        var wwe;

        wwe = new WysiwygEditor($container, null, em);
        wwe.init(300, function() {
            expect(wwe.get$Body().length).toEqual(1);
            expect(wwe.get$Body().prop('tagName')).toEqual('BODY');
            done();
        });
    });

    it('hasFormat with RegExp', function(done) {
        var wwe;

        wwe = new WysiwygEditor($container, null, em);

        wwe.init(300, function() {
            wwe.setValue('<h1>hasHeading</h1>');
            expect(wwe.hasFormatWithRx(/h[\d]/i)[0]).toEqual('H1');
            done();
        });
    });

    it('remove input if current selection\'s have task', function(done) {
        var wwe;

        wwe = new WysiwygEditor($container, null, em);
        wwe.init(300, function() {
            var range = wwe.getEditor().getSelection().cloneRange();

            wwe.setValue('<ul><li><input type="checkbox" /></li></ul>');

            range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('LI')[0].firstChild);
            range.collapse(true);
            wwe.getEditor().setSelection(range);
            wwe._removeTaskInputIfNeed();

            expect(wwe.getValue()).toBe('<ul><li></li></ul>');
            done();
        });
    });

    it('split p tag when return in blank line', function(done) {
        var wwe;

        wwe = new WysiwygEditor($container, null, em);
        wwe.init(300, function() {
            var range = wwe.getEditor().getSelection().cloneRange();

            wwe.setValue('<p>text1<br>text2</p>');
            wwe.get$Body().find('p').append($('<div><br></div'));
            wwe.get$Body().find('p').append($('<div><br></div'));

            range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[3].firstChild);
            range.collapse(true);
            wwe.getEditor().setSelection(range);
            wwe._splitPIfNeed();

            expect(wwe.getValue()).toBe('<p>text1<br />text2<br /></p><br />');
            done();
        });
    });

    describe('unwrapBlockTag()', function() {
        it('unwrap tag of current selection with tag name', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<h1><div>test<br></div></h1>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);
                wwe.unwrapBlockTag('H1');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('test');
                done();
            });
        });

        it('unwrap tag of current selection with condition callback', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<h1><div>test<br></div></h1>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.unwrapBlockTag(function(tagName) {
                    return tagName === 'H1';
                });

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('test');
                done();
            });
        });

        it('remove unused inputbox when change from task to another', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<h1><div><input type="checkbox" />test<br></div></h1>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.unwrapBlockTag();

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('test');
                done();
            });
        });
    });

    describe('changeBlockFormat', function() {
        it('change block format', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<h1><div>test<br></div></h1>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.changeBlockFormat('H1', 'P');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('<p>test</p>');
                done();
            });
        });

        it('unwrap block format', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<h1><div>test<br></div></h1>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.changeBlockFormat('H1');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('test');
                done();
            });
        });

        it('unwrap block format list', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<ul><li><div>test<br></div></li></ul>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.changeBlockFormat('UL', 'OL');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('<ol><li>test</li></ol>');
                done();
            });
        });

        it('if not mached any condition, wrap targetTagName node to first div node', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<div>test<br></div>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.changeBlockFormat('UL', 'P');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('<p>test</p>');
                done();
            });
        });
    });

    describe('changeBlockFormatTo', function() {
        it('change any block for to passed tagName', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<h1><div>test<br></div></h1>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.changeBlockFormatTo('P');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('<p>test</p>');
                done();
            });
        });

        it('remove unused inputbox when change from task to another', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<ul><li><div><input type="checkbox" />test<br></div></li></ul>');

                range.selectNode(wwe.getEditor().getDocument().getElementsByTagName('div')[0].firstChild);
                range.collapse(true);
                wwe.getEditor().setSelection(range);

                wwe.changeBlockFormatTo('H1');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('<h1>test</h1>');
                done();
            });
        });
    });

    describe('replace node\'s content text', function() {
        it('replace text without affect tags', function(done) {
            var wwe;

            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                var range = wwe.getEditor().getSelection().cloneRange();

                wwe.setValue('<ul><li class="custom-class">list1</li><li>list2</li></ul>');

                wwe.replaceContentText(wwe.getEditor().getDocument().body, 'list1', 'list2');

                expect(wwe.getValue().replace(/<br \/>/g, '')).toBe('<ul><li class="custom-class">list2</li><li>list2</li></ul>');
                done();
            });
        });
    });

    describe('editing functions', function() {
        var wwe;

        beforeEach(function(done) {
            wwe = new WysiwygEditor($container, null, em);
            wwe.init(300, function() {
                done();
            });
        });

        it('focus to ww editor', function() {
            $('body').focus();
            expect(document.activeElement).not.toBe(wwe.$iframe[0]);
            wwe.focus();
            expect(document.activeElement).toBe(wwe.$iframe[0]);
        });

        it('when get html data, remove contenteditable block tag which is div', function() {
            wwe.setValue('<ul><li>list</li></ul>');

            //in ie, squire dont make br so we clean up necessary
            expect(wwe.getValue().replace(/<br>/g, '')).toEqual('<ul><li>list</li></ul>');
        });

        it('replace selection content with passed content', function() {
            var selection;

            selection = wwe.getEditor().getSelection();
            wwe.replaceSelection('test', selection);
            expect(wwe.getValue()).toEqual('test<br />');
        });

        it('if replace selection without selection, use current selection', function() {
            wwe.replaceSelection('test');
            expect(wwe.getValue()).toEqual('test<br />');
        });

        it('replace with current cursor\'s containers offset', function() {
            var selection;

            wwe.getEditor().setHTML('test');

            //selection for user cursor mocking
            selection = wwe.getEditor().getSelection();
            selection.setStart(selection.startContainer, 4);
            selection.collapse(true);
            wwe.getEditor().setSelection(selection);

            wwe.replaceRelativeOffset('123', -2, 1);

            expect(wwe.getValue()).toEqual('te123t<br />');
        });

        describe('find element and offset by passing element and offset', function() {
            var firstBlock;

            beforeEach(function() {
                wwe.getEditor().insertPlainText('text1');
                wwe.getEditor().insertPlainText('text2');

                firstBlock = wwe.getEditor().getDocument().body.childNodes[0];
            });

            it('offset is lower than passed element\'s length', function() {
                expect(wwe.getSelectionInfoByOffset(firstBlock.childNodes[0], 3)).toEqual({
                    element: firstBlock.childNodes[0],
                    offset: 3
                });
            });

            it('offset is higher than passed element\'s length', function() {
                expect(wwe.getSelectionInfoByOffset(firstBlock.childNodes[0], 7)).toEqual({
                    element: firstBlock.childNodes[1],
                    offset: 2
                });
            });

            it('offset is higher than exist content length', function() {
                expect(wwe.getSelectionInfoByOffset(firstBlock.childNodes[0], 11)).toEqual({
                    element: firstBlock.childNodes[1],
                    offset: 5
                });
            });
        });
    });
});