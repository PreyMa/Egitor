function Egitor(){

  const createCSSClass= (function() {
    const styleElement= document.createElement('style');
    styleElement.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild( styleElement );

    return function( name, rules ) {
      name= '.'+ name;
      if( !(styleElement.sheet||{}).insertRule ) {
        (styleElement.styleSheet || styleElement.sheet).addRule( name, rules );

      } else {
        styleElement.sheet.insertRule( name+ '{'+ rules+ '}', 0 );
      }
    }
  })();

  function insert( a, b, pos ) {
   return [a.slice(0, pos), b, a.slice(pos)].join('');
  }

  function extract( str, pos, end= -1 ) {
    end= end < 0 ? pos+1 : end;
    return str.slice(0, pos) + str.slice(end);
  }

  function clamp( v, min, max ) {
    if( v < min ) {
      return min;
    }
    if( v > max ) {
      return max;
    }
    return v;
  }

  function copyElementWidth( from, to, off= 0 ) {
    to.style.width=  ''+ (off+ from.scrollWidth)+ 'px';
  }

  function copyElementScroll( from, to ) {
    to.scrollTop= from.scrollTop;
    to.scrollLeft= from.scrollLeft;
  }

  const isLetter= (function() {
    const re= /(\d|[A-Za-z_ÁÀȦÂÄǞǍĂĀÃÅǺǼǢĆĊĈČĎḌḐḒÉÈĖÊËĚĔĒẼE̊ẸǴĠĜǦĞG̃ĢĤḤáàȧâäǟǎăāãåǻǽǣćċĉčďḍḑḓéèėêëěĕēẽe̊ẹǵġĝǧğg̃ģĥḥÍÌİÎÏǏĬĪĨỊĴĶǨĹĻĽĿḼM̂M̄ʼNŃN̂ṄN̈ŇN̄ÑŅṊÓÒȮȰÔÖȪǑŎŌÕȬŐỌǾƠíìiîïǐĭīĩịĵķǩĺļľŀḽm̂m̄ŉńn̂ṅn̈ňn̄ñņṋóòôȯȱöȫǒŏōõȭőọǿơP̄ŔŘŖŚŜṠŠȘṢŤȚṬṰÚÙÛÜǓŬŪŨŰŮỤẂẀŴẄÝỲŶŸȲỸŹŻŽẒǮp̄ŕřŗśŝṡšşṣťțṭṱúùûüǔŭūũűůụẃẁŵẅýỳŷÿȳỹźżžẓǯßœŒçÇ])/;
    return function( s ) {
      return s.match( re ) ? true : false;
    }
  })();

  const isWhitespace= (function() {
    const re= /\s/;
    return function( s ) {
      return s.match( re ) ? true : false;
    }
  })();

  // Sorted by priority: Letter > Symbol > WS
  const CharType= {
    None: -1,
    Whitespace: 0,
    Symbol: 1,
    Letter: 2
  };

  function toCharType( c= null ) {
    if( c === null || !c.length ) {
      return CharType.None;
    }
    if( isWhitespace(c) ) {
      return CharType.Whitespace;
    }
    if( isLetter(c) ) {
      return CharType.Letter;
    }
    return CharType.Symbol;
  }

  function deleteAllChildren( node ) {
    while( node.firstChild ) {
      node.removeChild( node.firstChild );
    }
  }

  let currentContext= null;

  function Styling( name, color, bold, italic, underline ) {
    this.name= name;
    this._id= (Styling.staticCounter++);

    color= color || 'black';
    let css= 'display: inherit; color: '+ color+ ';';

    if( bold ) {
      css+= 'font-weight: bold;';
    }
    if( italic ) {
      css+= 'font-style: italic;'
    }
    if( underline ) {
      css+= 'text-decoration: underline';
    }
    createCSSClass( 'editor-class-'+name, css );
  }

  Styling.staticCounter= 0;

  Styling.prototype.createElement= function() {
    let e= document.createElement('span');
    e.classList.add( 'editor-class-'+this.name );
    return e;
  }

  Styling.prototype.equals= function( x ) {
    return this._id === x._id;
  }

  const defStyles= [
    new Styling( 'text' ),
    new Styling( 'keyword', 'blue', true ),
    new Styling( 'string', 'green' )
  ];


  function StyleEntry( s, e, t= null ) {
    this.start= s;
    this.end= e;
    this.type= t ? t : defStyles[0];
  }

  StyleEntry.prototype.copy= function() {
    return new StyleEntry( this.start, this.end, this.type );
  }

  StyleEntry.prototype.createSection= function( text ) {
    const section= this.type.createElement();
    section.innerHTML= text.substring( this.start, this.end );
    return section;
  }


  function Selection( c, p ) {
    // Check if position offset was provided
    let o= (typeof p === 'undefined') ? 0 : p;

    // Cursor object provided
    if( c instanceof Cursor ) {
      this.beginLine= c.curLine;
      this.beginChar= c.curChar+ o;

    // Line object provided
    } else if( c instanceof Line ) {
      this.beginLine= c;
      this.beginChar= o;

    } else {
      throw Error('Invalid arguments');
    }

    this.endLine= null;
    this.endChar= -1;
  }

  Selection.prototype.normalize= function() {
    let topLine= null;
    let topChar= 0;
    let bottomLine= null;
    let bottomChar= 0;

    // Normalize the bing and end positions to top and bottom ones
    if( (this.endChar < this.beginChar && this.endLine === this.beginLine) ||
        (this.endLine.number < this.beginLine.number) ) {
      topLine= this.endLine;
      topChar= this.endChar;
      bottomLine= this.beginLine;
      bottomChar= this.beginChar;

    } else {
      bottomLine= this.endLine;
      bottomChar= this.endChar;
      topLine= this.beginLine;
      topChar= this.beginChar;
    }

    return { topLine, topChar, bottomLine, bottomChar };
  }

  Selection.prototype.lineSpan= function() {
    if( !this.endLine ) {
      return 0;
    }

    return Math.abs( this.beginLine.number- this.endLine.number )+ 1;
  }

  Selection.prototype.set= function( c, show= true ) {
    // Check if the selection changed line and the selection shrunk
    if( this.endLine && (this.endLine !== c.curLine) ) {
      // Cursor moved line down and the selection is from top to bottom
      if( (this.endLine.number < c.curLine.number) && (this.endLine.number < this.beginLine.number) ) {
        this.endLine.unsetSelection();
      // Cursor moved line up and the selection is from bottom to top
      } else if( (this.endLine.number > c.curLine.number) && (this.endLine.number > this.beginLine.number) ) {
        this.endLine.unsetSelection();
      }
    }

    // Set end line
    this.endLine= c.curLine;
    this.endChar= c.curChar;

    if( show ) {
      this.forEach((l, b, e) => {
        if( b < 0 ) {
          l.selectLine();
        } else {
          l.setSelection( b, e );
        }
      });
    }
  };

  Selection.StopLoop= false;  // Break/Short circuit from the forEach loop
  Selection.NoIncrement= 1;   // Stay at the current index
  Selection.DoubleIncrement= 2;

  Selection.prototype.forEach= function( fn ) {
    let n= this.normalize();
    if( n.topLine === n.bottomLine ) {
      fn(n.topLine, n.topChar, n.bottomChar, 0, true);
      return 1;
    }

    let i= 1;
    let end= n.bottomLine.number- n.topLine.number;

    let r= fn( n.topLine, n.topChar, n.topLine.text.length, 0, false );
    if( r === Selection.StopLoop ) {
      return 1;

      // Instead of moving forward stay at the same index and reduce the number
      // of remaining iterations instead. Useful if the current line got deleted
      // and the neighbouring line is now at the current index
    } else if( r === Selection.NoIncrement ) {
      i--;
      end--;

      // Move two indexes forward at the same time and increase the number of
      // remaining iterations. Useful if a line was inserted before the current line
      // which needs to be jumped over
    } else if( r === Selection.DoubleIncrement ) {
      i++;
      end++;
    }

    let c= 1; // Independet iteration counter
    for( ; i < end; i++ ) {
      let num= n.topLine.number+i;
      let l= currentContext.lines[num];

      // Make sure the line knows its current position
      // If lines are deleted during looping the number might not be correct anymore
      l.setNumber( num, false ); // Doesn't update the html
      r= fn( l, -1, l.text.length, c, false );

      // Process callback function return value
      if( r === Selection.StopLoop ) {
        return c+1;

      } else if( r === Selection.NoIncrement ) {
        i--;
        end--;

      } else if( r === Selection.DoubleIncrement ) {
        i++;
        end++;
      }

      c++;
    }

    n.bottomLine.setNumber( n.topLine.number+ i );
    fn( n.bottomLine, 0, n.bottomChar, c, true );
    return c+1;
  }

  Selection.prototype.destroy= function() {
    const lines= currentContext.lines;
    let n= this.normalize();

    for( let i= n.topLine.number; i< n.bottomLine.number+1; i++ ) {
      if( i >= lines.length ) {
        return;
      }
      lines[i].setSelection( -1 );
    }
  }

  function LineData( t, s, e ) {
      this.text= t || '';
      this.styling= s || [];
      this.elements= e || [];
  }

  LineData.prototype.addStyle= function(s) {
    if( Array.isArray(s) ) {
      Array.prototype.push.apply( this.styling, s );
      return;
    }
    this.styling.push(s);
  }

  LineData.prototype.addElement= function(e) {
    this.elements.push(e);
  }


  function Cursor() {
  	this.curLine= null;
    this.curChar= 0;
    this.shadowPosition= 0;

    this.selection= null;

    this.onMove= null;

    this.newLine();
  }

  Cursor.prototype.getCurChar= function() {
    return this.curLine ? this.curLine.text.charAt( this.curChar ) : null;
  }

  Cursor.prototype.isEOL= function() {
    return (this.curChar >= this.curLine.text.length-1);
  }

  Cursor.prototype.isEOF= function() {
    return this.curLine.isLastLine() && (this.curChar === this.curLine.text.length);
  }

  Cursor.prototype.isBOF= function() {
    return !this.curLine.number && !this.curChar;
  }

  Cursor.prototype.hide= function() {
    this.curLine.hideCursor();
  }

  Cursor.prototype.show= function() {
    this.curLine.showCursor();
  }

  Cursor.prototype.setListener= function( nm, fn ) {
    switch(nm) {
      case 'move':
        this.onMove= fn;
        break;

      default:
        throw Error('Unknown listener type!');
    }
    return this;
  }

  Cursor.prototype.getNextChar= function( wrapLine= true ) {
    const lines= currentContext.lines;

    if( this.curLine ) {
      // In the same line
      if( !this.isEOL() ) {
        return this.curLine.text.charAt( this.curChar+ 1 );
      }
      // Jump to the next line
      if( wrapLine && (this.curLine.number !== lines.length-1) ) {
        return lines[ this.curLine.number+ 1 ].text.charAt( 0 );
      }
    }
    return '';
  }

  Cursor.prototype.getPrevChar= function( wrapLine= true ) {
    const lines= currentContext.lines;

    if( this.curLine ) {
      // In the same line
      if( this.curChar ) {
        return this.curLine.text.charAt( this.curChar- 1 );
      }
      // Jump to the next line
      if( wrapLine && this.curLine.number ) {
        const line= lines[ this.curLine.number- 1 ];
        return line.text.charAt( line.text.length-1 );
      }
    }
    return '';
  }

  Cursor.prototype.writeCharacter= function( c ) {
    if( this.selection ) {
      this.removeSelection();
    }

  	this.curLine.writeCharacter( this.curChar, c );
    this.move( this.curLine.number, this.curChar+ c.length );
  }

  Cursor.prototype.newLine= function() {
    if( this.selection ) {
      this.removeSelection();
    }

  	let num= this.curLine ? this.curLine.number+ 1 : 0;

    // Move the text infront of the cursor to the new line
    let text= this.curLine ? this.curLine.split( this.curChar ) : null;
    let line= new Line( num, text );

    // Make line current if it is the first line in the document
    if( !this.curLine ) {
    	this.curLine= line;
    }

    // Move to the begin of the new line
    this.move( num, 0 );
  }

  Cursor.prototype.move= function( line, col, select= false, keepShadow= false ) {
    // Create new selection if none is currently active
    if( select && !this.selection ) {
      this.selection= new Selection( this );
    }

    // Move the cursor to the next/previous line
    const n= currentContext.lines[line];
  	if( this.curLine !== n ) {
    	this.hide();
    	this.curLine= n;
    }

    // Set the cursor in the line
    col= this.curLine.setCursor( col );
    this.curChar= col;

    if( !keepShadow ) {
      this.shadowPosition= col;
    }

    if( select ) {
      // Update the selection
      this.selection.set( this );

    } else {
      // If a selection is active delete it
      if( this.selection ) {
        this.selection.destroy();
        this.selection= null;
      }
    }

    // Call event listner if one is currently set
    if( this.onMove ) {
      this.onMove();
    }
  }

  Cursor.prototype.moveUp= function( select ) {
    if( this.curLine.number ) {
      this.move( this.curLine.number- 1, this.shadowPosition, select, true );
      return true;
    }
    return false;
  }

  Cursor.prototype.moveDown= function( select ) {
    const lines= currentContext.lines;

    if( this.curLine.number !== lines.length-1 ) {
      this.move( this.curLine.number+ 1, this.shadowPosition, select, true );
      return true;
    }
    return false;
  }

  Cursor.prototype.movePrevious= function( select ) {
    if( this.curChar ) {
      this.move( this.curLine.number, this.curChar-1, select )
    } else {
      if( this.moveUp( select ) ) {
        this.moveEnd( select );
      }
    }
  }

  Cursor.prototype.moveNext= function( select ) {
    if( this.curChar !== this.curLine.text.length ) {
      this.move( this.curLine.number, this.curChar+1, select )
    } else {
      if( this.moveDown( select ) ) {
        this.moveBegin( select );
      }
    }
  }

  Cursor.prototype.moveEnd= function( select ) {
    if( this.curChar !== this.curLine.text.length ) {
      this.move( this.curLine.number, this.curLine.text.length, select );
    } else {
      this.shadowPosition= this.curChar;
    }
  }

  Cursor.prototype.moveBegin= function( select ) {
    if( this.curChar ) {
      // Move to first char in line that is not whitespace
      this.move( this.curLine.number, this.curLine.firstNonWSChar(), select );
    } else {
      this.shadowPosition= this.curChar;
    }
  }

  Cursor.prototype.moveNextWord= function( select ) {
    // Jump over whitespace ahead of the cursor
    while( isWhitespace(this.getCurChar()) && !this.isEOF() ) {
      this.moveNext( select );
    }

    const letter= isLetter( this.getCurChar() );
    let c;
    do {
      this.moveNext( select );
      c= this.getCurChar();
    } while( (letter === isLetter(c)) && !isWhitespace(c) && !this.isEOF() );
  }

  Cursor.prototype.movePreviousWord= function( select ) {
    // Move once and jump over whitespace behind the cursor
    do {
      this.movePrevious( select );
    } while( isWhitespace(this.getCurChar()) && !this.isBOF() );

    const letter= isLetter( this.getCurChar() );
    let c= this.getPrevChar();
    while( (letter === isLetter(c)) && !isWhitespace(c) && !this.isBOF() ) {
      this.movePrevious( select );
      c= this.getPrevChar();
    }
  }

  Cursor.prototype.moveLines= function( num, select ) {
    // Move the cursor by a specified number of lines
    // Negative offsets move the cursor up, positives down
    const max= currentContext.lines.length-1;
    num= clamp( this.curLine.number+ num, 0, max )
    this.move( num, this.curChar, select );
  }

  Cursor.prototype._removeSelection= function( selection ) {
    // Iterate over all selected lines
    let first= null, begin;
    let num= selection.forEach( (l, b, e, i) => {
      // Neither the first or last line
      if( b< 0 ) {
        l.destroy( false );
        return Selection.NoIncrement;
      }

      // First line
      if( !i ) {
        first= l;
        begin= b;
      }

      // First or last line
      l.removeTextSection( b, e );
    });

    // Remove line break
    if( num > 1 ) {
      first.removeCharacter( first.text.length );
    }

    selection.destroy();
    this.move( first.number, begin );
    this.curLine.updateLineNumbers();
  }

  Cursor.prototype.removeSelection= function( selection= null ) {
    // Remove a provided selection
    if( selection ) {
      return this._removeSelection( selection );
    }

    // Remove the cursors current selection
    this._removeSelection( this.selection );
    this.selection= null;
  }

  Cursor.prototype.removeWord= function( infront ) {
    if( this.selection ) {
      return this.removeSelection();
    }

    let s= new Selection( this );
    if( infront ) {
      this.moveNextWord();
    } else {
      this.movePreviousWord();
    }

    s.set( this, false ); // Set selection, but hide it
    this.removeSelection( s );
  }

  Cursor.prototype.findCharTypeLeft= function( t ) {
    let i= this.curChar;
    while( (i > 0) && (toCharType(this.curLine.text.charAt(i-1)) === t) ) {
      i--;
    }
    return i;
  }

  Cursor.prototype.findCharTypeRight= function( t ) {
    const str= this.curLine.text;
    let i= this.curChar;
    while( (i < str.length) && (toCharType(str.charAt(i)) === t) ) {
      i++;
    }
    return i;
  }

  Cursor.prototype.selectNearestWord= function() {
    let c= toCharType( this.getCurChar() );
    let p= toCharType( this.getPrevChar() );

    let l= this.curChar;
    let r= this.curChar;

    // If left and right are identical
    if( p === c ) {
      l= this.findCharTypeLeft( c );
      r= this.findCharTypeRight( c );

    // If left has a larger priority
    } else if( p > c ) {
      l= this.findCharTypeLeft( p );

    // If right has a larger priority
    } else {
      r= this.findCharTypeRight( c );
    }

    if( this.selection ) {
      this.selection.destroy();
    }

    // Beginn new selection
    this.selection= new Selection( this, l- this.curChar );
    // Move cursor to the end of the word/selection and create selection
    this.move( this.curLine.number, r, true );
  }

  Cursor.prototype.removeCharacter= function( infront ) {
    if( this.selection ) {
      return this.removeSelection();
    }

    let pos= infront ? this.curChar+ 1 : this.curChar;
    let p= this.curLine.removeCharacter( pos-1 );
    if( !infront ) {
      this.movePrevious();
      if( p !== -1 ) {
        this.move( this.curLine.number, p );
      }
    }
  }

  Cursor.prototype.selectionToString= function() {
    let t= '';
    this.selection.forEach( (l, b, e, i) => {
      // Don't add a NL if its the last line
      // -> neither the first line (!i) nor an line inbetween (b>=0)
      t += l.getString( b, e, ((b >= 0) && !i) );
    });

    return t;
  }

  Cursor.prototype.removeCurrentLine= function() {
    const lines= currentContext.lines;

    if( lines.length === 1 ) {
      this.curLine.reset();
    } else {
      this.curLine.destroy();
      this.curLine= lines[ this.curLine.number ];
    }
    this.move( this.curLine.number, 0 );
  }

  Cursor.prototype.copyCurrent= function() {
    if( this.selection ) {
      return this.selectionToString();
    }

    return this.curLine.getString();
  }

  Cursor.prototype.cutCurrent= function() {
    if( this.selection ) {
      let s= this.selectionToString();
      this.removeSelection();
      return s;
    }

    let s= this.curLine.getString();
    this.removeCurrentLine();
    return s;
  }

  Cursor.prototype.selectAll= function() {
    if( this.selection ) {
      this.selection.destroy();
    }

    const lines= currentContext.lines;
    this.selection= new Selection( lines[0] );
    this.move( lines.length-1, lines[lines.length-1].text.length, true );
  }

  Cursor.prototype.insertText= function( t ) {
    const lines= t.replace(/\r/g, '').split('\n');
    const lastLine= lines[lines.length-1];

    let line= null;

    // One line selections are removed imediately and get treated as insertions
    // without a selection at all
    if( this.selection && (this.selection.lineSpan() === 1) ) {
      this.removeSelection();
    }

    // Multiline selection
    if( this.selection ) {

      this.selection.forEach((l, b, e, i) => {
        // Neither first or last line
        if( b < 0 ) {
          // Replace the line data
          if( i < lines.length-1 ) {
            l.reset( lines[i] );
            return;
          }

          // Remove any remaining lines of the selection
          l.destroy( false ); // Don't update line numbers yet
          return Selection.NoIncrement;
        }

        // First line of the selection
        if( !i ) {
          l.removeTextSection( b, e );
          l.append( lines[i] );
          return;
        }

        // Last line of the selection
        l.removeTextSection( b, e );
        l.writeCharacter( 0, lastLine );
        line= l;
      });

      // Insert any lines that didn't fit in the selection
      for( let i= this.selection.lineSpan(); i< lines.length-1; i++ ) {
        new Line( this.curLine.number+ i, lines[i], false );
      }

      this.selection.destroy();
      this.selection= null;

    } else {
      // Just insert at current position
      if( lines.length === 1 ) {
        this.writeCharacter( lines[0] );
        return;
      }

      // Split the line
      let data= this.curLine.split( this.curChar );
      this.curLine.writeCharacter( this.curChar, lines[0] );

      // Create new lines and populate them
      for( let i= 1; i< lines.length-1; i++ ) {
        line= new Line( this.curLine.number+ i, lines[i], false );
      }

      // Create last line and fill it with the splitted off section
      line= new Line( this.curLine.number+ lines.length- 1, data, false );
      line.writeCharacter( 0, lastLine );
    }

    // Update all line numbers only once at the end
    this.curLine.updateLineNumbers();

    // Set new cursor position
    this.move( line.number, lastLine.length );
  }

  Cursor.prototype.duplicateSelection= function() {
    // Requires a selection to be present
    if( !this.selection ) {
      return;
    }

    let first= null;
    this.selection.forEach((l, b, e, i) => {
      first= i ? first : l; // Save first line

      let d= l.copyData();
      new Line( first.number+ i, d, false ); // Don't update numbers yet

      // Jump over newly added line
      return Selection.DoubleIncrement;
    });
    first.updateLineNumbers();
  }

  Cursor.prototype.duplicateLine= function() {
    if( this.selection ) {
      return this.duplicateSelection();
    }

    // Create a copy of the current line data
    // and insert a new line above the current one
    let d= this.curLine.copyData();
    new Line( this.curLine.number, d );
  }


  function Line( pos= 0, content= null, updateLines= true ) {
  	this.number= pos;
    this.text= '';
    this.styling= [];
    this.displayCursor= false;

    // Actual text layer
    let text= document.createElement('DIV');
    text.classList.add('line');
    text.innerHTML= '<div class="line-number"> '+ (pos+ 1)+ ' </div> <div class="line-text"></div><div class="line-tail line-text"></div>';

  	this.textElement= text;

    // Selection overlay
    let selection= document.createElement('DIV');
    selection.classList.add('overlay-line');
    selection.innerHTML= '<div class="selection-overlay-spacer overlay-spacer"></div> <div class="overlay-text line-text"><span class="selection-spacer"></span><span class="selected"></span></div>';

    this.selectionOverlayElement= selection;

    // Cursor overlay
    let overlay= document.createElement('DIV');
    overlay.classList.add('overlay-line');
    overlay.innerHTML= '<div class="overlay-spacer"></div> <div class="overlay-text line-text"></div>';

    this.cursorOverlayElement= overlay;

    // Add line to the array of lines
    const lines= currentContext.lines;
  	lines.splice( pos, 0, this );

    // Insert text
    if( content !== null ) {
      this.append( content );
    } else {
      // Add default styling
      this.addDefaultStyling();
    }

    // Attach line elements in their respective layers
    const t= currentContext.textElement;
    const o= currentContext.cursorElement;
    const s= currentContext.selectionElement;

    t.insertBefore( this.textElement, t.children[ pos ]);
    o.insertBefore( this.cursorOverlayElement, o.children[ pos ]);
    s.insertBefore( this.selectionOverlayElement, s.children[pos]);

    // Update all following lines
    if( updateLines ) {
      this.updateLineNumbers();
    }
  }

  Line.prototype.updateLineNumbers= function() {
    const lines= currentContext.lines;
    for( let i= this.number; i< lines.length; i++ ) {
      lines[i].setNumber( i );
    }
  }

  Line.prototype.reset= function( txt= null ) {
    this.text= (txt !== null) ? txt : '';
    this.addDefaultStyling();
  }

  Line.prototype.isLastLine= function() {
    return (this.number === currentContext.lines.length-1);
  }

  Line.prototype.selectLine= function( p= 0 ) {
    // Select whole line
    this.setSelection( p, -1 );
  }

  Line.prototype.unsetSelection= function() {
    // Unselect whole line
    this.setSelection( -1 );
  }

  Line.prototype.setSelection= function( begin, end ) {
    const c= this.selectionOverlayElement.children[1];
    if( begin < 0 ) {
      c.children[0].innerHTML= '';
      c.children[1].innerHTML= '';
    } else {
      end= end < 0 ? this.text.length : end;
      c.children[0].innerHTML= ''.padStart( begin, ' ');
      c.children[1].innerHTML= ''.padStart( end-begin, ' ');
    }
  }

  Line.prototype.getStyling= function( p ) {
    // Find the correct index of styling object / section span element for a provided position
    // TODO: Could be changed to use linear binary search
    for( let i= 0; i!= this.styling.length; i++ ) {
      let s= this.styling[i];
      if( (s.start <= p) && (s.end > p) ) {
        return i;
      }
    }
    return this.styling.length-1;
  }

  Line.prototype.setNumber= function( n, upd= true ) {
  	this.number= n;
    if( upd ) {
      this.textElement.children[0].innerHTML= (n+1);
    }
  }

  Line.prototype.getData= function() {
    return new LineData(
      this.text,
      this.styling,
      Array.from( this.textElement.children[1].children )
    );
  }

  Line.prototype.copyData= function() {
    // Copy styling objects
    let s= new Array( this.styling.length );
    this.styling.forEach((x, i) => { s[i]= x.copy(); });

    // Copy DOM elements
    let c= this.textElement.children[1].children;
    let e= Array( c.length )
    for( let i= 0; i!= c.length; i++ ) {
      e[i]= c[i].cloneNode(true);
    }

    return new LineData( this.text, s, e );
  }

  Line.prototype.split= function( pos ) {
    // Return no split if position is at the end of the line
    if( pos === this.text.length ) {
      return null;
    }

    // Split the text string
    let data= new LineData();
    let text= this.text;
    this.text= text.substring( 0, pos );
    data.text= text.substring( pos, text.length );

    let idx= this.getStyling( pos );
    const s= this.styling[idx];
    const container= this.textElement.children[1];

    // If the split is not on a section border
    // -> Split the section into two
    if( s.start !== pos ) {
      // Copy the split styling object
      data.addStyle( s.copy() );

      // Duplicate the splitted section and split its inner html
      let o= pos- s.start;
      let inner= container.children[idx].innerHTML;
      data.addElement( s.type.createElement() );
      data.elements[0].innerHTML=        inner.substring( o );
      container.children[idx].innerHTML= inner.substring( 0, o );

      s.end= pos;
      data.styling[0].start+= o;

      idx++;
    }

    // Move any remaining sections
    if( idx < this.styling.length ) {
      // Steal the html elements from the text container
      let node= container.children[idx];
      while( node ) {
        data.addElement( node );
        let next= node.nextSibling;
        container.removeChild( node );
        node= next;
      }

      // Just split the styling array (keep the first element)
      data.addStyle( this.styling.splice( idx, this.styling.length- idx) );
    }

    if( !this.styling.length ) {
      this.addDefaultStyling();
    }

    return data;
  }

  Line.prototype.mergeElements= function() {
    const container= this.textElement.children[1];

    for( let i= 0; i< this.styling.length; ) {
      const s= this.styling[i];
      const n= (i !== this.styling.length-1) ? this.styling[i+1] : null;

      // Remove empty elements/styling from the dom
      if( s.start === s.end ) {
        // If the whole line is empty keep one section instead of adding the dafault style afterwards again
        if( this.text.length ||  (this.styling.length !== 1)) {
          this.styling.splice( i, 1 );
          container.removeChild( container.children[i] );
        } else {
          i++; // break;
        }

      // Merge neighbouring elements if they have the same type
      } else if( n && s.type.equals( n.type ) ) {
        s.end= n.end;
        container.children[i].innerHTML= this.text.substring( s.start, s.end );

        this.styling.splice( i+1, 1 );
        container.removeChild( container.children[i+1] );

      // Move to the next element
      } else {
        i++;
      }
    }

    if( !this.styling.length ) {
      this.addDefaultStyling();
    }
  }

  Line.prototype.append= function( data ) {
    // Data may also be a simple string
    if( typeof data === 'string' ) {
      if( !this.styling.length ) {
        this.addDefaultStyling();
      }
      this.writeCharacter( this.text.length, data );
      return;
    }

    // Add the elements
    data.elements.forEach( (e) => {
      this.textElement.children[1].appendChild( e );
    });

    // Add the styling and offset the start and end
    const shift= this.text.length- data.styling[0].start;
    data.styling.forEach( (s) => {
      s.start+= shift;
      s.end  += shift;
      this.styling.push(s);
    });

    this.text+= data.text;

    this.mergeElements();
  }

  Line.prototype.updateSectionPositions= function( idx, offset ) {
    for(; idx < this.styling.length; idx++ ) {
      this.styling[idx].start+= offset;
      this.styling[idx].end+=   offset;
    }
  }

  Line.prototype.writeCharacter= function( pos, c ) {
  	let t= insert( this.text, c, pos );
    this.text= t;

    let idx= this.getStyling( pos );
    let elem= this.textElement.children[1].children[idx];
  	t= insert( elem.innerHTML, c, pos- this.styling[idx].start );
    // Update the section length
    this.styling[idx].end+= c.length;
    this.updateSectionPositions( idx+1, c.length );

    elem.innerHTML= t;
  }

  Line.prototype.removeSectionByIndex= function( idx, update= true ) {
    // Remove text element from the DOM and styling object from the styling array
    const container= this.textElement.children[1];
    container.removeChild( container.children[idx] );
    const style= this.styling[idx];
    const len= style.end- style.start;
    this.styling.splice( idx, 1 );

    // Add default section if the line is now completely empty;
    if( !this.styling.length ) {
      this.addDefaultStyling();
      return true;
    }
    if( update ) {
      this.updateSectionPositions( idx+1, -len );
    }
    return false;
  }

  Line.prototype.removeTextSection= function( pos, end ) {
    if( typeof end === 'undefined') {
      end= this.text.length;
    }

    if( pos >= end ) {
      if( pos === end ) {
        return;
      }
      throw Error('Invalid arguments');
    }

    pos= clamp( pos, 0, this.text.length );
    end= clamp( end, 0, this.text.length );

    // Update text string
    let t= extract( this.text, pos, end );
    this.text= t;

    const container= this.textElement.children[1];
    let idx= this.getStyling( pos );
    let offset= 0;

    while( pos < end ) {
      // Get styling and text element objects
      const section= container.children[idx];
      const style= this.styling[idx];

      // Get the relative positions inside of the section
      let relpos= pos- style.start;
      let relend= end- style.start;
      let sectionLen= style.end- style.start;
      pos= style.end;

      // Move the section by the number of characters the previous one was shrunk
      style.start-= offset;
      style.end  -= offset;

      // Delete whole section
      if( !relpos && relend >= sectionLen ) {
        this.removeSectionByIndex( idx, false );  // Do not update the following sections
        offset+= sectionLen;

      // Shrink the section
      } else {
        // Clamp the relative end to the length and shrink the string
        relend= clamp( relend, 0, sectionLen );
        let len= relend- relpos;
        t= extract( section.innerHTML, relpos, relend );
        section.innerHTML= t;

        // Move the end by the number of deleted chars
        style.end-= len;
        offset+= len;

        // Go to next section
        idx++;
      }
    }

    // If all sections are removed from a line, a default styling is
    // added instead which should not be updated
    if( this.styling[0].start !== 0 ) {
      this.updateSectionPositions( idx, -offset );
    }
    this.mergeElements();
  }

  Line.prototype.removeCharacter= function( pos ) {
    const lines= currentContext.lines;

    // Remove NL of previous line
    if( pos < 0 ) {
      // If not the first line
      if( this.number ) {
        let len= lines[ this.number- 1 ].text.length;

        // Append the text of this line to the previous one
        lines[ this.number- 1 ].append( this.getData() );
        this.destroy();

        // Request to set the cursor at the position of the previous lines original length
        return len;
      }
    // Remove NL of this line
    } else if( pos >= this.text.length ) {
      // If not the last line
      if( this.number !== lines.length -1 ) {
        let len= this.text.length;

        // Append the text of the next line to this one and destroy the next line
        let next= lines[ this.number+ 1 ];
        this.append( next.getData() );
        next.destroy();

        // Request to keep the cursor at the same position
        // (Actually not necessary as _Delete does not move the cursor anyway)
        return len;
      }
    // Remove some char in the line
    } else {
      this.removeTextSection( pos, pos+1 );
    }
    return -1;
  }

  Line.prototype.getString= function( b, e, nl= true ) {
    b= (typeof b === 'undefined') ? 0 : b;
    e= (typeof e === 'undefined') ? this.text.length : e;

    // Get substring of text data, and add a NL if needed
    return this.text.substring(b, e) + ((e >= this.text.length) && !this.isLastLine() && nl ? '\n' : '');
  }

  Line.prototype.destroy= function( upd= true ) {
    const t= currentContext.textElement;
    const o= currentContext.cursorElement;
    const s= currentContext.selectionElement;
    const lines= currentContext.lines;

    let pos= this.number;
    t.removeChild( t.children[pos] );
    o.removeChild( o.children[pos] );
    s.removeChild( s.children[pos] );

    lines.splice( pos, 1 );

    // Update all following lines
    if( upd ) {
      this.updateLineNumbers();
    }
  }

  Line.prototype.setCursor= function( col ) {
  	col= col<= this.text.length ? col : this.text.length;
    this.cursorOverlayElement.children[1].innerHTML= '|'.padStart( col+1, ' ' );
    this.displayCursor= true;
    return col;
  }

  Line.prototype.hideCursor= function() {
  	if( this.displayCursor ) {
    	this.cursorOverlayElement.children[1].innerHTML= this.cursorOverlayElement.children[1].innerHTML.slice(0, -1);
      this.displayCursor= false;
    }
  }

  Line.prototype.showCursor= function() {
  	if( !this.displayCursor ) {
    	this.cursorOverlayElement.children[1].innerHTML+= '|';
      this.displayCursor= true;
    }
  }

  Line.prototype.addDefaultStyling= function() {
    this.addStyling( [new StyleEntry(0, this.text.length)] );
  }

  Line.prototype.addStyling= function( a ) {
    if( !a || !a.length || (a[a.length-1].end !== this.text.length) ) {
      throw Error('Invalid styling for line: ', this);
    }

    // Remove all children
    const container= this.textElement.children[1];
    deleteAllChildren( container );

    // Iterate over styling and create elements in the text container
    this.styling= a;
    this.styling.forEach( (s) => {
      container.appendChild( s.createSection( this.text ) );
    });
  }

  Line.prototype.firstNonWSChar= function() {
    // Get first char that is not whitespace
    for( let i= 0; i!== this.text.length; i++ ) {
      if( !isWhitespace( this.text.charAt(i) ) ) {
        return i;
      }
    }
    return 0;
  }

  function CursorAnimator( c ) {
    this.speed= 600;

    this.cursor= c;
    this.cursorState= true;
    this.focused= true;
    this.timer= null;

    this.type();
  }

  CursorAnimator.prototype.setFocus= function( v ) {
    this.focused= v;
    if( v ) {
      this.type();
    } else {
      window.clearTimeout( this.timer );
      this.timer= null;
      this.setCursor( false );
    }
  }

  CursorAnimator.prototype.setCursor= function( v ) {
    this.cursorState= v;
    v ? this.cursor.show() : this.cursor.hide();
  }

  CursorAnimator.prototype.type= function() {
    this.setCursor( true );
    if( this.timer !== null ) {
      window.clearTimeout( this.timer );
    }
    this.blink();
  }

  CursorAnimator.prototype.blink= function() {
    this.timer= window.setTimeout(() => {
      if( this.focused ) {
        this.setCursor( !this.cursorState );
        this.blink();
      }
    }, this.speed);
  }

  function InputAdapter( e ) {
    const t= document.createElement('textarea');
    this.element= t;
    this.element.style.opacity= '0';
    this.element.style.filter= 'alpha(opacity=0)';
    e.appendChild( this.element );

    this.handler= null;
    this.hasFocus= false;

    this.lastEvent= null;

    const _ctrl_v= {key: 'v', keyCode: 86, ctrlKey: true, shiftKey: false};
    const _ctrl_c= {key: 'c', keyCode: 67, ctrlKey: true, shiftKey: false};
    const _ctrl_x= {key: 'x', keyCode: 88, ctrlKey: true, shiftKey: false};

    // Add keyboard event handlers to the hidden textarea element
    t.addEventListener( 'keydown', (e) => { this.handleEvent( e ); });

    t.addEventListener( 'paste', (e) => { this.handleEvent( e, _ctrl_v, (e.clipboardData || window.clipboardData).getData('Text') ); });

    t.addEventListener( 'copy', (e) => { this.handleEvent( e, _ctrl_c ); });

    t.addEventListener( 'cut', (e) => { this.handleEvent( e, _ctrl_x ); });
  }

  InputAdapter.prototype.handleEvent= function( e, k= null, data= null ) {
    this.lastEvent= e;
    if( this.hasFocus && this.handler ) {
      if( !(e instanceof KeyboardEvent) || e.ctrlKey ) {
        e.preventDefault();
      }

      // Either substitute key provided or not Ctrl+c/v/x
      if( k || !(e.ctrlKey && (e.key === 'v' || e.key === 'c' || e.key === 'x')) ) {
        this.handler( k ? k : e, data );
      }
      this.element.value= '';
    }
  }

  InputAdapter.prototype.setFocus= function( v= true ) {
    v ? this.element.focus() : this.element.blur();
    this.hasFocus= v;
  }

  InputAdapter.prototype.onInput= function( f ) {
    this.handler= f;
  }

  InputAdapter.prototype.toClipboard= function( s ) {
    const c= this.lastEvent.clipboardData || window.clipboardData;
    if( c ) {
      c.clearData();
      c.setData('Text', s );
    }
  }

  const _Enter= 13;
  const _ArrowUp= 38;
  const _ArrowLeft= 37;
  const _ArrowRight= 39;
  const _ArrowDown= 40;
  const _End= 35;
  const _Pos1= 36;
  const _Backspace= 8;
  const _Tabulator= 9;
  const _Delete= 46;
  const _PageUp= 33;
  const _PageDown= 34;

  function Editor( anchor ) {
    this.tabLength= 2;

    this.focus();

    this._createDOM( anchor );
    this._setupEvents();

    this.lines= [];

    const cursor= new Cursor();
    this.cursor= cursor;
    cursor.setListener('move', () => { this._updateScrollPosition(); });

    this.anim= new CursorAnimator( cursor );

    // TEST
    this.lines[0].text= "Das ist ein langer String.";
    this.lines[0].addStyling( [new StyleEntry( 0,  4),
                               new StyleEntry( 4,  8),
                               new StyleEntry( 8, 12),
                               new StyleEntry(12, 19),
                               new StyleEntry(19, 26)
                              ] );


    const input= new InputAdapter( this.inputContainer );
    this.input= input;

    input.setFocus();
    input.onInput( (e, v) => {
      // Is writeable character
      if( e.key.length === 1 ) {
        if( !e.ctrlKey ) {
          cursor.writeCharacter( e.key );

        } else {
          switch( e.key ) {
            case 'v':
            case 'V':
              cursor.insertText( v.replace('\t', this._getTabulator()) );
              break;

            case 'c':
            case 'C':
              input.toClipboard( cursor.copyCurrent() );
              break;

            case 'x':
            case 'X':
              input.toClipboard( cursor.cutCurrent() );
              break;

            case 'd':
              cursor.selectNearestWord();
              break;

            case 'D':
              cursor.duplicateLine();
              break;

            case 'a':
            case 'A':
              cursor.selectAll();
              break;
          }
        }
      } else {
        const s= e.shiftKey;
      	switch( e.keyCode ) {
          case _Enter:
            cursor.newLine();
            break;

          case _ArrowUp:
            cursor.moveUp( s );
            break;

          case _ArrowDown:
            cursor.moveDown( s );
            break;

          case _ArrowLeft:
            e.ctrlKey ? cursor.movePreviousWord( s ) : cursor.movePrevious( s );
            break;

          case _ArrowRight:
            e.ctrlKey ? cursor.moveNextWord( s ) : cursor.moveNext( s );
            break;

          case _End:
            cursor.moveEnd( s );
            break;

          case _Pos1:
            cursor.moveBegin( s );
            break;

          case _Backspace:
            e.ctrlKey ? cursor.removeWord( false ) : cursor.removeCharacter( false );
            break;

          case _Delete:
            e.ctrlKey ? cursor.removeWord( true ) : cursor.removeCharacter( true );
            break;

          case _Tabulator:
            cursor.writeCharacter( this._getTabulator() );
            e.preventDefault(); // Prevent unfocus via tab key
            break;

          case _PageDown:
            cursor.moveLines( Math.round( this._getHeightInLines() ), s );
            break;

          case _PageUp:
            cursor.moveLines( -Math.round( this._getHeightInLines() ), s );
            break;
        }
      }
      this.anim.type();     // Pause the cursor blinking animation while typing
      this._updateWidths(); // Make all overlays as big as the text layer
    });



    // Initially ocus the editor
    this._isConstruct= true;
    this.focus();
  }

  Editor.prototype._createDOM= function( anchor ) {
    this.anchor= anchor;
    deleteAllChildren( anchor );

    anchor.innerHTML= `<div class= "editor">
      <div class="size-probe container"><div><div class="line"><div class="line-probe line-text">E</div></div></div></div>
      <div class="background container">
        <div class="sidebar"><div class="filler"></div></div>
      </div>
      <div class="selection-overlay container"><div class="filler"></div></div>
      <div class="text-field container" ><div class="filler"></div></div>
      <div class= "cursor-overlay container"><div class="cursor-content"><div class="filler"></div></div></div>
      <div class="input-container"></div>
    </div>`;

    this.sizeElement=       anchor.getElementsByClassName('size-probe')[0].firstElementChild;
    this.lineHeightElement= anchor.getElementsByClassName('line-probe')[0];
    this.backElement=       anchor.getElementsByClassName('background')[0];
    this.textElement=       anchor.getElementsByClassName('text-field')[0];
    this.cursorElement=     anchor.getElementsByClassName('cursor-overlay')[0].firstElementChild;
    this.selectionElement=  anchor.getElementsByClassName('selection-overlay')[0];
    this.inputContainer=    anchor.getElementsByClassName('input-container')[0];
  }

  Editor.prototype._setupEvents= function() {
    // Register clicks and keep track if they are inside of the editor to allow for unfocusing
    let isMouseOver= false;
    this.anchor.addEventListener('mouseover', () => { isMouseOver= true;  });
    this.anchor.addEventListener('mouseout',  () => { isMouseOver= false; });
    document.addEventListener('click', (e) => { isMouseOver ? this.focus() : this.unfocus(); e.preventDefault(); });

    // Set scroll position for all stacked overlays
    // Only run every frame and ignore any other incoming events
    let doScroll= true;
    const ce= this.cursorElement.parentElement;
    ce.addEventListener('scroll', () => {
      if( doScroll ) {
        doScroll= false;
        window.requestAnimationFrame(() => {
          copyElementScroll( ce, this.textElement );
          copyElementScroll( ce, this.selectionElement );
          copyElementScroll( ce, this.backElement );
          doScroll= true;
        });
      }
    });
  }

  Editor.prototype._updateWidths= function() {
    const te= this.textElement;
    copyElementWidth( te, this.cursorElement.lastElementChild );
    copyElementWidth( te, this.selectionElement.lastElementChild );
    copyElementWidth( te, this.backElement.lastElementChild.lastElementChild );
  }

  Editor.prototype._updateScrollPosition= function() {
    // Get bounding boxes for current overlay line and editor root element
    const ovLine= this.cursor.curLine.cursorOverlayElement.children[1];
    const lineRect= ovLine.getBoundingClientRect();
    const rootRect= this.sizeElement.getBoundingClientRect();

    const ce= this.cursorElement.parentElement;

    // Cursor leaves bottom of the screen
    if( lineRect.bottom > rootRect.bottom ) {
      ce.scrollTop+= lineRect.bottom- rootRect.bottom;

    // Cursor leaves top of the screen
    } else if( lineRect.top < rootRect.top ) {
      ce.scrollTop-= rootRect.top- lineRect.top;
    }

    // Cursor leaves right of the screen
    if( lineRect.right > rootRect.right ) {
      ce.scrollLeft+= lineRect.right- rootRect.right;

    // Cursor leaves left of the screen
    }else if( lineRect.right < rootRect.left ) {
      ce.scrollLeft-= rootRect.left- lineRect.right;
    }
  }

  Editor.prototype._getHeightInLines= function() {
    return this.sizeElement.clientHeight / this.lineHeightElement.clientHeight;
  }

  Editor.prototype.isFocused= function() {
    return this === currentContext;
  }

  Editor.prototype.unfocus= function() {
    if( this.isFocused() ) {
      console.log('unfocus');
      this.input.setFocus( false );
      this.anim.setFocus( false );
      currentContext= null;
    }
  }

  Editor.prototype.focus= function() {
    if( !this.isFocused() ) {
      console.log('focus');
      // Unfocus context if one is currently focused
      if( currentContext ) {
        currentContext.unfocus();
      }

      currentContext= this;

      // If constructor has run allow setting the focus
      if( this._isConstruct ) {
        this.anim.setFocus( true );
      }
    }

    // Always set the input focus
    if( this._isConstruct ) {
      this.input.setFocus( true );
    }
  }

  Editor.prototype._getTabulator= function() {
    return ''.padStart( this.tabLength );
  }

  return Editor;
}
