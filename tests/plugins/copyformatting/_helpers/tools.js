/* exported testAttributes, testGettingWordOffset, testApplyingFormat, testConvertingStyles, assertCopyFormattingState,
	assertApplyFormattingState, testCopyFormattingFlow
 */

'use strict';

// Based on http://yuilibrary.com/yui/docs/api/files/test_js_ObjectAssert.js.html#l12.
YUITest.ObjectAssert.areDeepEqual = function( expected, actual, message ) {
	var expectedKeys = YUITest.Object.keys( expected ),
		actualKeys = YUITest.Object.keys( actual ),
		areEqual = YUITest.ObjectAssert.areEqual;

	YUITest.Assert._increment();

	// First check keys array length.
	if ( expectedKeys.length != actualKeys.length ) {
		YUITest.Assert.fail( YUITest.Assert._formatMessage( message,
			'Object should have ' + expectedKeys.length + ' keys but has ' + actualKeys.length ) );
	}

	// Then check values.
	for ( var name in expected ) {
		if ( expected.hasOwnProperty( name ) ) {
			if ( typeof expected[ name ] === 'object' ) {
				areEqual( expected[ name ], actual[ name ] );
			}
			else if ( expected[ name ] !== actual[ name ] ) {
				throw new YUITest.ComparisonFailure( YUITest.Assert._formatMessage( message,
					'Values should be equal for property ' + name ), expected[ name ], actual[ name ] );
			}
		}
	}
};

function testAttributes( element, expected, exclude ) {
	var attributes;

	element = new CKEDITOR.dom.element( document.getElementsByTagName( element )[ 0 ] );
	attributes = CKEDITOR.plugins.copyformatting._getAttributes( element, exclude );

	assert.isObject( attributes );
	objectAssert.areEqual( expected, attributes );
}

function testGettingWordOffset( editor, htmlWithSelection, expected ) {
	var word, range, contents;

	bender.tools.selection.setWithHtml( editor, htmlWithSelection );

	word = CKEDITOR.plugins.copyformatting._getSelectedWordOffset( editor.getSelection().getRanges()[ 0 ] );

	range = editor.createRange();
	range.setStart( word.startNode, word.startOffset );
	range.setEnd( word.endNode, word.endOffset );
	range.select();

	// Strip all HTML tags from range's content and compare only fetched text.
	contents = range.extractContents().getHtml().replace( /<.*?>/g, '' );

	assert.areSame( expected, contents );
}

/**
 * @param {CKEDITOR.editor} editor Editor's instance.
 * @param {String} htmlWithSelection HTML with selection that will be put into editor.
 * @param {String} expectedContent Expected content of styled element.
 * @param {CKEDTITOR.style[]} newStyles Array of styles to be applied.
 * @param {CKEDITOR.style[]} oldStyles Array of styles to be removed.
 */
function testApplyingFormat( editor, htmlWithSelection, expectedContent, newStyles, oldStyles ) {
	var applied = 0,
		removed = 0,
		range,
		i;

	oldStyles = CKEDITOR.tools.isArray( oldStyles ) ? oldStyles : [];

	bender.tools.selection.setWithHtml( editor, htmlWithSelection );
	CKEDITOR.plugins.copyformatting._applyFormat( newStyles, editor );

	range = editor.getSelection().getRanges()[ 0 ];
	range.shrink( CKEDITOR.SHRINK_TEXT );

	// Check if all old styles were removed.
	for ( i = 0; i < oldStyles.length; i++ ) {
		if ( !oldStyles[ i ].checkActive( range.startPath(), editor ) ) {
			++removed;
		}
	}

	assert.areSame( oldStyles.length, removed, 'Old styles were removed correctly.' );

	// Now check if all new styles were applied.
	for ( i = 0; i < newStyles.length; i++ ) {
		if ( newStyles[ i ].checkActive( range.startPath(), editor ) ) {
			++applied;
		}
	}

	assert.areSame( newStyles.length, applied, 'New styles were applied correctly.' );

	// Content is now placed inside the element of the first applied style.
	assert.areSame( expectedContent, editor.editable().findOne( newStyles[ 0 ].element ).getHtml() );
}

function testConvertingStyles( elementHtml, expectedStyles ) {
	var element = CKEDITOR.dom.element.createFromHtml( elementHtml ),
		style = CKEDITOR.plugins.copyformatting._convertElementToStyle( element );

	objectAssert.areDeepEqual( expectedStyles, style._.definition );
}

function assertCopyFormattingState( editor, expectedStyles, additionalData ) {
	var cmd = editor.getCommand( 'copyFormatting' ),
		areaWithCursor = CKEDITOR.plugins.copyformatting._getCursorContainer( editor );

	if ( !additionalData || additionalData.sticky ) {
		assert.areSame( CKEDITOR.TRISTATE_ON, cmd.state, 'Button is active' );
		assert.isTrue( areaWithCursor.hasClass( 'cke_copyformatting_active' ),
			'Editable area has class indicating that Copy Formatting is active' );
	} else if ( additionalData.from == 'keystrokeHandler' ) {
		assert.areSame( CKEDITOR.TRISTATE_OFF, cmd.state, 'Button is not active (keystroke)' );
		assert.isFalse( areaWithCursor.hasClass( 'cke_copyformatting_active' ),
			'Editable area does not have class indicating that Copy Formatting is active' );
	}

	assert.isArray( cmd.styles, 'Styles are stored in the array' );
	assert.areSame( expectedStyles.length, cmd.styles.length, 'There are correct amount of styles' );

	for ( var i = 0; i < expectedStyles.length; i++ ) {
		assert.isInstanceOf( CKEDITOR.style, cmd.styles[ i ], 'Style #' + i + ' is an instanceof CKEDITOR.style' );
		objectAssert.areDeepEqual( expectedStyles[ i ], cmd.styles[ i ]._.definition, 'Style # ' + i +
			' has correct definition' );
	}
}

function assertApplyFormattingState( editor, expectedStyles, styledElement, additionalData ) {
	var cmd = editor.getCommand( 'copyFormatting' ),
		path = new CKEDITOR.dom.elementPath( styledElement, editor.editable() ),
		areaWithCursor = CKEDITOR.plugins.copyformatting._getCursorContainer( editor );

	if ( !additionalData ) {
		assert.areSame( CKEDITOR.TRISTATE_OFF, cmd.state, 'Button is not active' );
		assert.isNull( cmd.styles, 'Styles are removed from store' );
		assert.isFalse( areaWithCursor.hasClass( 'cke_copyformatting_active' ),
			'Editable area does not have class indicating that Copy Formatting is active' );

	} else if ( additionalData.from === 'keystrokeHandler' ) {
		assert.areSame( CKEDITOR.TRISTATE_OFF, cmd.state, 'Button is not active' );
		assert.isArray( cmd.styles, 'Styles are not removed from store' );
		assert.isFalse( areaWithCursor.hasClass( 'cke_copyformatting_active' ),
			'Editable area does not have class indicating that Copy Formatting is active' );

	} else if ( additionalData.sticky ) {
		assert.areSame( CKEDITOR.TRISTATE_ON, cmd.state, 'Button is active' );
		assert.isArray( cmd.styles, 'Styles are not removed from store' );
		assert.isTrue( areaWithCursor.hasClass( 'cke_copyformatting_active' ),
			'Editable area does not have class indicating that Copy Formatting is active' );
	}

	// If we test removing formatting, we should check if there is no styles left on the element.
	if ( expectedStyles.length > 0 ) {
		for ( var i = 0; i < expectedStyles.length; i++ ) {
			assert.isTrue( expectedStyles[ i ].checkActive( path, editor ), 'Style #' + i + ' is correctly applied' );
		}
	} else {
		assert.areSame( 0, CKEDITOR.plugins.copyformatting._extractStylesFromElement( styledElement ).length,
			'There are no styles applied to element' );
	}
}

/**
 * @param {CKEDITOR.editor} editor Editor's instance.
 * @param {String} htmlWithSelection HTML with selection that will be put into the editor.
 * @param {Object[]} expectedStyles Array of definitions of styles that will be applied.
 * @param {CKEDITOR.style[]} removedStyles Array of styles that should be removed.
 * @param {Object} rangeInfo Object with information about range that should be created for the test.
 * @param {Object} additionalData Additional data to be passed to plugin's commands.
 */
function testCopyFormattingFlow( editor, htmlWithSelection, expectedStyles, removedStyles, rangeInfo, additionalData ) {
	var cmd = editor.getCommand( 'copyFormatting' ),
		styles,
		i,
		removed,
		element,
		range;

	bender.tools.selection.setWithHtml( editor, htmlWithSelection );

	editor.execCommand( 'copyFormatting', additionalData );

	assertCopyFormattingState( editor, expectedStyles, additionalData );

	styles = cmd.styles;

	// Select text node inside element (as the text is selected when element is clicked).
	element = editor.editable().findOne( rangeInfo.elementName ).getChild( 0 );
	range = editor.createRange();

	if ( rangeInfo.element ) {
		range.selectNodeContents( element );
	} else {
		range.setStart( element, rangeInfo.startOffset );
		range.setEnd( element, rangeInfo.endOffset );
	}

	if ( rangeInfo.collapsed ) {
		range.collapse();
	}

	range.select();

	editor.execCommand( 'applyFormatting', additionalData );

	assertApplyFormattingState( editor, styles, element, additionalData );

	// Check if styles that should be removed are really removed.
	for ( i = removed = 0; i < removedStyles.length; i++ ) {
		if ( !removedStyles[ i ].checkActive( range.startPath(), editor ) ) {
			++removed;
		}
	}

	assert.areSame( removedStyles.length, removed, 'All preexisting styles are removed correctly' );

	// Reset command to inital state.
	if ( cmd.state === CKEDITOR.TRISTATE_ON || cmd.styles ) {
		cmd.styles = null;
		cmd.sticky = false;
		cmd.setState( CKEDITOR.TRISTATE_OFF );
	}
}
