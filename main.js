function Egitor(){
  'use strict';

  /** Create a CSS class with a name and set of rules **/
  const createCSSClass= (function() {
    // Create style element in the head
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

  /** Insert string into another string at position **/
  function insert( a, b, pos ) {
   return [a.slice(0, pos), b, a.slice(pos)].join('');
  }

  /** Remove a either a single character or a section from a string **/
  function extract( str, pos, end= -1 ) {
    end= end < 0 ? pos+1 : end;
    return str.slice(0, pos) + str.slice(end);
  }

  /** Clamp a number to a maximum and minimum **/
  function clamp( v, min, max ) {
    if( v < min ) {
      return min;
    }
    if( v > max ) {
      return max;
    }
    return v;
  }

  /** Check whether a number is inside bounds **/
  function isInRange( x, min, max ) {
    return x>min && x<max;
  }

  /** Wrap a callback to restrict call frequency to the frame rate **/
  function debounce( fn ) {
    let deb= true;
    return function() {
      if( deb ) {
        deb= false;

        requestAnimationFrame( () => {
          fn.apply(window, arguments );
          deb= true;
        });
      }
    }
  }

  /** Copy an elements client width to another elements style **/
  function copyElementWidth( from, to, off= 0 ) {
    to.style.width=  ''+ (off+ from.scrollWidth)+ 'px';
  }

  /** Copy an elements scroll position to another one **/
  function copyElementScroll( from, to ) {
    to.scrollTop= from.scrollTop;
    to.scrollLeft= from.scrollLeft;
  }

  /** Delete all of an elements children **/
  function deleteAllChildren( node ) {
    while( node.firstChild ) {
      node.removeChild( node.firstChild );
    }
  }

  /** Check whether a character is a letter **/
  const isLetter= (function() {
    const re= /(\d|[A-Za-z_ÁÀȦÂÄǞǍĂĀÃÅǺǼǢĆĊĈČĎḌḐḒÉÈĖÊËĚĔĒẼE̊ẸǴĠĜǦĞG̃ĢĤḤáàȧâäǟǎăāãåǻǽǣćċĉčďḍḑḓéèėêëěĕēẽe̊ẹǵġĝǧğg̃ģĥḥÍÌİÎÏǏĬĪĨỊĴĶǨĹĻĽĿḼM̂M̄ʼNŃN̂ṄN̈ŇN̄ÑŅṊÓÒȮȰÔÖȪǑŎŌÕȬŐỌǾƠíìiîïǐĭīĩịĵķǩĺļľŀḽm̂m̄ŉńn̂ṅn̈ňn̄ñņṋóòôȯȱöȫǒŏōõȭőọǿơP̄ŔŘŖŚŜṠŠȘṢŤȚṬṰÚÙÛÜǓŬŪŨŰŮỤẂẀŴẄÝỲŶŸȲỸŹŻŽẒǮp̄ŕřŗśŝṡšşṣťțṭṱúùûüǔŭūũűůụẃẁŵẅýỳŷÿȳỹźżžẓǯßœŒçÇ])/;
    return function( s ) {
      return s.match( re ) ? true : false;
    }
  })();

  /** Check whether a character is a digit **/
  const isDigit= (function() {
    const re= /\d/;
    return function( s ) {
      return s.match( re ) ? true : false;
    }
  })();

  /** Check whether a character is a symbol **/
  const isWhitespace= (function() {
    const re= /\s/;
    return function( s ) {
      return s.match( re ) ? true : false;
    }
  })();


  /**
  * Simple String Iterator class
  * Allows iterating over a string in forward and reverse direction
  * Only supposed for reading as it keeps a copy (-on-write-reference?) to the
  * string
  **/
  function StringIterator( s, p= 0 ) {
    this.str= s;
    this.pos= p;
    this.type= CharType.None;
  }

  StringIterator.prototype.get= function( off= 0 ) {
    return this.str.charAt( this.pos+ off );
  }

  StringIterator.prototype.isEnd= function() {
    return this.pos >= this.str.length;
  }

  StringIterator.prototype.isBegin= function() {
    return !this.pos ? true : false;
  }

  StringIterator.prototype.move= function( off ) {
    this.pos+= off;
    this.type= CharType.None;
  }

  StringIterator.prototype.next= function() {
    if( !this.isEnd() ) {
      this.move( 1 );
    }
    return this.isEnd();
  }

  StringIterator.prototype.prev= function() {
    if( !this.isBegin() ) {
      this.move( -1 );
    }
    return this.isBegin();
  }

  StringIterator.prototype.set= function( p= 0 ) {
    this.pos= p;
    return this;
  }

  StringIterator.prototype.setEnd= function() {
    this.pos= this.str.length;
    return this;
  }

  StringIterator.prototype.charType= function() {
    if( this.type === CharType.None ) {
      this.type= toCharType( this.get() );
    }
    return this.type;
  }

  StringIterator.prototype.peakForward= function() {
    return this.isEnd() ? '' : this.get( 1 );
  }

  StringIterator.prototype.peakBack= function() {
    return this.isBegin() ? '' : this.get( -1 );
  }

  StringIterator.prototype.follows= function( s ) {
    // Check for valid args
    if( !s || !s.length || !this.str.length ) {
      return false;
    }

    // Reduce the number of calls to substr
    if( this.get() !== s.charAt(0) ) {
      return false;
    }

    return this.str.substr(this.pos, s.length) === s;
  }


  /**
  * Simple 2D vector class
  * Has a X and Y component and some simple vector calculations
  **/
  function Vector( x, y ) {
    this.set(x, y);
  }

  Vector.prototype.isEqual= function( x, y ) {
    // Compare two vectors
    if( typeof y === 'undefined' ) {
      y= x.y;
      x= x.x;
    }

    return (this.x === x) && (this.y === y);
  }

  Vector.prototype.set= function( x, y ) {
    // Set vectors x and y component
    if( x && typeof y === 'undefined' ) {
      y= x.y;
      x= x.x;
    }

    this.x= x || 0;
    this.y= y || 0;
  }

  Vector.prototype.insideBox= function( xt, yt, xb, yb ) {
    // Check whether the vector point (X,Y) is inside a box created by two opposide points
    // left top (xt,yt) and rigth bottom (xb,yb)
    return (this.x > xt) && (this.y > yt) && (this.x < xb) && (this.y < yb);
  }

  Vector.prototype.mag= function() {
    // Calculate the magnitude
    return Math.sprt( this.x ** 2+ this.y ** 2 );
  }

  /**
  * Character type enum
  * Sorted by priority: Letter > Symbol > WS
  **/
  const CharType= {
    None: -1,
    Whitespace: 0,
    Symbol: 1,
    Letter: 2
  };

  /** Convert a character to an char type enum **/
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

  let currentContext= null;

  /**
  * Editor Text Styling class
  * Defines text styles
  * Features: color, bold, italic, underline
  **/
  function Styling( name, color, bold= false, italic= false, underline= false ) {
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

  const defStyles= {
    Text:     new Styling( 'text' ),
    Keyword:  new Styling( 'keyword',  'blue', true ),
    String:   new Styling( 'string',   '#5aa042' ),
    Comment:  new Styling( 'comment',  'grey', false, true ),
    Constant: new Styling( 'constant', '#efc019' ),
    Special:  new Styling( 'magic',    '#e83be3', true)
  };

  /**
  * Style Entry class
  * Stores begin and end of a text section and its style
  **/
  function StyleEntry( s, e, t= null ) {
    this.start= s;
    this.end= e;
    this.type= t ? t : defStyles.Text;
  }

  StyleEntry.prototype.copy= function() {
    return new StyleEntry( this.start, this.end, this.type );
  }

  StyleEntry.prototype.createSection= function( text ) {
    const section= this.type.createElement();
    this.writeText( section, text );
    return section;
  }

  StyleEntry.prototype.writeText= function( elem, text ) {
    elem.innerText= text.substring( this.start, this.end );
  }

  StyleEntry.prototype.splitSection= function( section, pos ) {
    // Position where to split inside the section
    const o= pos- this.start;
    const inner= section.innerText;

    // Create new element and set its content
    const elem= this.type.createElement();
    elem.innerText= inner.substring( o );

    // Update the end position and the original elements content
    this.end= o;
    this.writeText( section, inner );

    return elem;
  }


  /**
  * Text Selection class
  * Stores line and column positions to the begin and end of a text selection
  * in the editor. Allows for iteration over selected line (sections)
  **/
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

  Selection.prototype.isBottomToTop= function() {
    return (this.endChar < this.beginChar && this.endLine === this.beginLine) ||
           (this.endLine.number < this.beginLine.number);
  }

  Selection.prototype.normalize= function() {
    let topLine= null;
    let topChar= 0;
    let bottomLine= null;
    let bottomChar= 0;

    // Normalize the bing and end positions to top and bottom ones
    if( this.isBottomToTop() ) {
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

  Selection.prototype.getTopVector= function() {
    if( this.isBottomToTop() ) {
      return new Vector(this.endChar, this.endLine.number);
    } else {
      return new Vector(this.beginChar, this.beginLine.number);
    }
  }

  Selection.prototype.lineSpan= function() {
    if( !this.endLine ) {
      return 0;
    }

    return Math.abs( this.beginLine.number- this.endLine.number )+ 1;
  }

  Selection.prototype._removeOld= function( c, up ) {
    let off= up ? -1 : +1;
    for( let i= this.endLine.number; i !== c.number; i+= off ) {
      currentContext.lines[i].unsetSelection();
    }
  }

  Selection.prototype.set= function( c, show= true ) {
    const el= this.endLine, bl= this.beginLine;
    const cl= c.curLine;
    // Check if the selection changed line and the selection shrunk
    if( el && (el !== cl) ) {
      // Cursor moved line down and the selection is from bottom to top
      if( (el.number < cl.number) && (el.number < bl.number) ) {
        this._removeOld( cl, false );
      // Cursor moved line up and the selection is from top to bottom
      } else if( (el.number > cl.number) && (el.number > bl.number) ) {
        this._removeOld( cl, true );
      }
    }

    // Set end line
    this.endLine= c.curLine;
    this.endChar= c.curChar;

    if( show ) {
      let s= this.lineSpan();
      this.forEach((l, b, e, i) => {
        if( b < 0 ) {
          l.selectLine();
        } else {
          // If the first line is not the last make it wrap too
          e= (s > 1) && !i ? e+1 : e;
          l.setSelection( b, e );
        }
      });
    }
  };

  Selection.StopLoop= false;    // Break/Short circuit from the forEach loop
  Selection.NoIncrement= 1;     // Stay at the current index
  Selection.DoubleIncrement= 2; // Move two indeces at a time

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

  Selection.prototype.toString= function() {
    let t= '';
    const sp= this.lineSpan();
    this.forEach( (l, b, e, i) => {
      // Don't add a NL if its the last line
      t += l.getString( b, e, i+1 < sp );
    });
    return t;
  }

  Selection.prototype.toLines= function() {
    const sp= this.lineSpan();
    let a= new Array( sp );
    this.forEach( (l, b, e, i) => {
      // No NLs
      a[i]= l.getString( b, e, false );
    });
    return a;
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


  /**
  * Cursor class
  * Main interface to modify the document
  * Mostly corresponds directly to the functionalities provided by
  * keyboard shortcuts for movement, adding and removing text
  **/
  function Cursor() {
  	this.curLine= null;
    this.curChar= 0;
    this.shadowPosition= 0;

    this.selection= null;

    this.onMove= null;

    // Automatically insert new line as the document is empty
    this._newLine();
  }

  Cursor.prototype.getCurChar= function() {
    return this.curLine ? this.curLine.text.charAt( this.curChar ) : null;
  }

  Cursor.prototype.isEOL= function() {
    return (this.curChar > this.curLine.text.length-1);
  }

  Cursor.prototype.isBOL= function() {
    return (this.curChar <= 0);
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
      let next= this.curLine.getNextSibling();
      if( wrapLine && next ) {
        return next.text.charAt( 0 );
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
      let prev= this.curLine.getPreviousSibling();
      if( wrapLine && prev ) {
        return prev.text.charAt( prev.text.length-1 );
      }
    }
    return '';
  }

  Cursor.prototype._writeCharacter= function( c ) {
    if( this.selection ) {
      this.removeSelection();
    }

  	this.curLine.writeCharacter( this.curChar, c );
    this._move( this.curLine.number, this.curChar+ c.length );
  }

  Cursor.prototype.writeCharacter= function( c ) {
    currentContext.actions.event( new AddWordAction( this, c ) );
    this._writeCharacter( c );
  }

  Cursor.prototype._newLine= function( updLines ) {
    if( this.selection ) {
      this.removeSelection();
    }

  	let num= this.curLine ? this.curLine.number+ 1 : 0;

    // Move the text infront of the cursor to the new line
    let text= this.curLine ? this.curLine.split( this.curChar ) : null;
    let line= new Line( num, text, updLines );

    // Make line current if it is the first line in the document
    if( !this.curLine ) {
    	this.curLine= line;
    }

    // Move to the begin of the new line
    this._move( num, 0 );
  }

  Cursor.prototype.newLine= function() {
    currentContext.actions.event( new AddLineAction( this ) );
    this._newLine();
  }

  Cursor.prototype._move= function( line, col, select= false, keepShadow= false ) {
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
      this.unselect();
    }

    // Call event listner if one is currently set
    if( this.onMove ) {
      this.onMove();
    }
  }

  Cursor.prototype.move= function( l, c, s, k ) {
    currentContext.actions.event( CursorMoveAction.get() );
    this._move( l, c, s, k );
  }

  Cursor.prototype.switchMove= function( action, l, c, s, k ) {
    if( action ) {
      this.move( l, c, s, k );
    } else {
      this._move( l, c, s, k );
    }
  }

  Cursor.prototype.moveUp= function( select, action= true ) {
    if( this.curLine.number ) {
      this.switchMove( action, this.curLine.number- 1, this.shadowPosition, select, true );
      return true;
    }
    return false;
  }

  Cursor.prototype.moveDown= function( select, action= true ) {
    const lines= currentContext.lines;

    if( this.curLine.number !== lines.length-1 ) {
      this.switchMove( action, this.curLine.number+ 1, this.shadowPosition, select, true );
      return true;
    }
    return false;
  }

  Cursor.prototype.movePrevious= function( select, action= true ) {
    if( this.curChar ) {
      this.switchMove( action, this.curLine.number, this.curChar-1, select )
    } else {
      if( this.moveUp( select, action ) ) {
        this.moveEnd( select, action );
      }
    }
  }

  Cursor.prototype.moveNext= function( select, action= true ) {
    if( this.curChar !== this.curLine.text.length ) {
      this.switchMove( action, this.curLine.number, this.curChar+1, select )
    } else {
      if( this.moveDown( select, action ) ) {
        this.moveBegin( select, action );
      }
    }
  }

  Cursor.prototype.moveEnd= function( select, action= true ) {
    if( this.curChar !== this.curLine.text.length ) {
      this.switchMove( action, this.curLine.number, this.curLine.text.length, select );
    } else {
      this.shadowPosition= this.curChar;
    }
  }

  Cursor.prototype.moveBegin= function( select, action= true ) {
    if( this.curChar ) {
      // Move to first char in line that is not whitespace
      this.switchMove( action, this.curLine.number, this.curLine.firstNonWSChar(), select );
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
    } while( (letter === isLetter(c)) && !isWhitespace(c) && !this.isEOL() );
  }

  Cursor.prototype.movePreviousWord= function( select ) {
    // Move once and jump over whitespace behind the cursor
    do {
      this.movePrevious( select );
    } while( isWhitespace(this.getCurChar()) && !this.isBOF() );

    const letter= isLetter( this.getCurChar() );
    let c= this.getPrevChar();
    while( (letter === isLetter(c)) && !isWhitespace(c) && !this.isBOL() ) {
      this.movePrevious( select );
      c= this.getPrevChar();
    }
  }

  Cursor.prototype.moveBOF= function( shift ) {
    this.move( 0, 0, shift );
  }

  Cursor.prototype.moveEOF= function( shift ) {
    const lines= currentContext.lines;
    this.move( lines.length-1, lines[lines.length-1].text.length, shift );
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
    let oldLength= 0, newLength= 0;
    let first= null, begin;
    let num= selection.forEach( (l, b, e, i) => {
      // Store the length of the longest removed/shortened line
      const longest= oldLength < l.text.length;
      if( longest ) {
        oldLength= l.text.length;
      }

      // Neither the first or last line
      if( b< 0 ) {
        l.destroy( false );
        newLength= longest ? 0 : newLength; // Store new length
        return Selection.NoIncrement;
      }

      // First line
      if( !i ) {
        first= l;
        begin= b;
      }

      // First or last line
      l.removeTextSection( b, e, false );
      newLength= longest ? l.text.length : newLength; // Store new length
    });

    // Remove line break
    if( num > 1 ) {
      first.removeCharacter( first.text.length );
    }

    // Update the change of the longest removed/shortened line 'L' in the selection
    // after removing the NL. This might create a new longest line what therefore
    // removes the need to search after a new one if L was shorter than the new one
    currentContext._updateLineLength( oldLength, newLength );

    selection.destroy();
    this._move( first.number, begin );
    this.curLine.updateLineNumbers();
  }

  Cursor.prototype.removeSelection= function( selection= null ) {
    // Remove a provided selection
    if( selection ) {
      return this._removeSelection( selection );
    }

    // Remove the cursors current selection
    currentContext.actions.event( new RemoveTextAction( this ) );
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

    // Either remove a line or a word as move-by-word stops at begin/end of line
    // Invert 'infront' as the cursor moves here in the opposite direction
    if( s.lineSpan() !== 1 ) {
      currentContext.actions.event( new RemoveLineAction( this ) );
    } else {
      currentContext.actions.event( new RemoveWordAction( this, !infront, this.selectionToString( s ) ) );
    }

    this.removeSelection( s );
  }

  Cursor.prototype.findCharTypeLeft= function( t ) {
    let it= this.curLine.textBegin().set( this.curChar );
    while( !it.isBegin() && (toCharType(it.peakBack()) === t) ) {
      it.prev();
    }
    return it.pos;
  }

  Cursor.prototype.findCharTypeRight= function( t ) {
    let it= this.curLine.textBegin().set( this.curChar );
    while( !it.isEnd() && (it.charType() === t) ) {
      it.next();
    }
    return it.pos;
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

    this.unselect();

    // Beginn new selection
    this.selection= new Selection( this, l- this.curChar );
    // Move cursor to the end of the word/selection and create selection
    this.move( this.curLine.number, r, true );
  }

  Cursor.prototype._removeCharacter= function( infront ) {
    if( this.selection ) {
      return this.removeSelection();
    }

    let pos= infront ? this.curChar+ 1 : this.curChar;
    let p= this.curLine.removeCharacter( pos-1 );
    if( !infront ) {
      this.movePrevious( false, false );  // No selection and no action
      if( p !== -1 ) {
        this._move( this.curLine.number, p );
      }
    }
  }

  Cursor.prototype.removeCharacter= function( infront ) {
    let emitLineAction= false;

    // Remove selection action is emitted by 'this.removeSelection()'
    if( !this.selection ) {
      // check if something can be removed
      if( !(this.isBOF() && !infront) && !(this.isEOF() && infront) ) {
        // Remove line action
        // KeyCodes.Backspace at begin of line or KeyCodes.Delete at end of line
        if( (this.isBOL() && !infront) || (this.isEOL() && infront) ) {
          emitLineAction= true;

        // Remove word action
        } else {
          currentContext.actions.event( new RemoveWordAction( this, infront ) );
        }
      }
    }

    this._removeCharacter( infront );

    // Line actions need the cursor position after the line has been removed
    if( emitLineAction ) {
      currentContext.actions.event( new RemoveLineAction( this ) );
    }
  }

  Cursor.prototype.selectionToString= function( s= null ) {
    s= s === null ? this.selection : s;

    return s.toString();
  }

  Cursor.prototype.removeCurrentLine= function() {
    const lines= currentContext.lines;

    if( lines.length === 1 ) {
      this.curLine.reset();
    } else {
      this.curLine.destroy();
    }

    // Move to line above if the deleted one was the last
    let n= this.curLine.number;
    this._move( n < lines.length ? n : n-1, 0 );
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
    this.unselect();

    const lines= currentContext.lines;
    this.selection= new Selection( lines[0] );
    this.moveEOF( true );
  }

  Cursor.prototype._insertText= function( lines ) {
    const lastLine= lines[lines.length-1];

    let line= null; // Last modified line object to set the cursor to

    // One line selections are removed imediately and get treated as insertions
    // without a selection at all
    if( this.selection && (this.selection.lineSpan() === 1) ) {
      this.removeSelection();
    }

    // Multiline selection
    if( this.selection ) {
      // Save the length of the longest line changed and of the new longest line
      let maxOldLen= 0, maxNewLen= 0;
      function lengthDiff( o, n ) {
        maxOldLen= Math.max( maxOldLen, o );
        maxNewLen= Math.max( maxNewLen, n );
      }

      this.selection.forEach((l, b, e, i) => {
        // Get the old length of the current line
        const len= l.text.length;

        // Neither first or last line
        if( b < 0 ) {
          // Replace the line data
          if( i < lines.length-1 ) {
            l.reset( lines[i], false );
            lengthDiff( len, lines[i].length );
            return;
          }

          // Remove any remaining lines of the selection
          l.destroy( false ); // Don't update line numbers yet
          lengthDiff( len, 0 );
          return Selection.NoIncrement;
        }

        if( !i ) {
          // First line of the selection
          l.removeTextSection( b, e, false );
          l.append( lines[i], false );

        } else {
          // Last line of the selection
          l.removeTextSection( b, e, false );
          l.writeCharacter( 0, lastLine, false );
          line= l;
        }

        lengthDiff( len, l.text.length );
      });

      // Insert any lines that didn't fit in the selection
      for( let i= this.selection.lineSpan(); i< lines.length-1; i++ ) {
        new Line( this.curLine.number+ i, lines[i], false );
      }

      currentContext._updateLineLength( maxOldLen, maxNewLen );

      this.unselect()

    } else {
      // Just insert at current position
      if( lines.length === 1 ) {
        this._writeCharacter( lines[0] );
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
    this._move( line.number, lastLine.length );
  }

  Cursor.prototype.insertText= function( t ) {
    // Convert text to array of lines
    const lines= t.replace(/\r/g, '').split('\n');

    currentContext.actions.event( new InsertTextAction( this, lines ) );
    this._insertText( lines );
  }

  Cursor.prototype.duplicateSelection= function() {
    // Requires a selection to be present
    if( !this.selection ) {
      return;
    }

    // Save start position before selection moves down due to the
    // inserted lines
    let topLine= this.selection.getTopVector();
    let lines= new Array( this.selection.lineSpan()+1 );

    // Iterate through lines and duplicate them
    let first= null;
    this.selection.forEach((l, b, e, i) => {
      first= i ? first : l; // Save first line

      let d= l.copyData();
      lines[i]= d.text;                      // Save line text
      new Line( first.number+ i, d, false ); // Don't update numbers yet

      // Jump over newly added line
      return Selection.DoubleIncrement;
    });
    first.updateLineNumbers();

    // Add NL
    lines[ lines.length-1 ]= '';
    currentContext.actions.event( new InsertTextAction(topLine, lines, true) );
  }

  Cursor.prototype.duplicateLine= function() {
    if( this.selection ) {
      return this.duplicateSelection();
    }

    // Create a copy of the current line data
    // and insert a new line above the current one
    let d= this.curLine.copyData();
    currentContext.actions.event( new InsertTextAction(this, [d.text, ''], true) );
    new Line( this.curLine.number, d );
  }

  Cursor.prototype.swapLine= function( up= false) {
    const m= currentContext.lines.length;
    const n= this.curLine.number;
    // Replace with line above
    if( up ) {
      if( n > 0 ) {
        this.curLine.setPosition( n-1 );
      }
    // Replace with line underneath
    } else {
      if( n < m-1 ) {
        this.curLine.setPosition( n+1 );
      }
    }
  }

  Cursor.prototype.unselect= function() {
    if( this.selection ) {
      this.selection.destroy();
      this.selection= null;
    }
  }


  /**
  * Line class
  * A line in the document: Has text, styling and HTML elements
  * Provides an interface to the cursor to deal with its content
  * Any DOM changes like showing/hiding the cursor or selections are done
  * by the object itself
  **/
  function Line( pos= 0, content= null, updateLines= true ) {
  	this.number= pos;
    this.text= '';
    this.styling= [];
    this.displayCursor= false;
    this.parserStorage= null;

    // Actual text layer
    let text= document.createElement('DIV');
    text.classList.add('line');
    text.innerHTML= '<div class="line-number">'+ (pos+ 1)+ '</div><div class="line-text"></div><div class="line-tail line-text"></div>';

  	this.textElement= text;

    // Selection overlay
    let selection= document.createElement('DIV');
    selection.classList.add('overlay-line');
    selection.innerHTML= '<div class="selection-overlay-spacer overlay-spacer"></div><div class="overlay-text line-text"><span class="selection-spacer"></span><span class="selected"></span></div>';

    this.selectionOverlayElement= selection;

    // Cursor overlay
    let overlay= document.createElement('DIV');
    overlay.classList.add('overlay-line');
    overlay.innerHTML= '<div class="overlay-spacer"></div><div class="overlay-text line-text"></div>';

    this.cursorOverlayElement= overlay;

    // Insert text
    if( content !== null ) {
      // Update the line length after the line was attached to the DOM
      this.append( content, false );
    } else {
      // Add default styling
      this.addDefaultStyling();
    }

    // Attach the line to the DOM and the lines-array
    this.attachLineToDOM();
    currentContext._updateLineLength(0, this.text.length);

    // Update all following lines
    if( updateLines ) {
      this.updateLineNumbers();
    }
  }

  Line.prototype.attachLineToDOM= function() {
    const pos= this.number;
    const lines= currentContext.lines;

    // Add line to the array of lines
  	lines.splice( pos, 0, this );

    // Attach line elements in their respective layers
    const t= currentContext.textElement;
    const o= currentContext.cursorElement;
    const s= currentContext.selectionElement;

    t.insertBefore( this.textElement, t.children[ pos ]);
    o.insertBefore( this.cursorOverlayElement, o.children[ pos ]);
    s.insertBefore( this.selectionOverlayElement, s.children[pos]);
  }

  Line.prototype.updateLineNumbers= function( e= -1 ) {
    const lines= currentContext.lines;
    for( let i= this.number; (i< lines.length) && ((e < 0) || (i < e)); i++ ) {
      lines[i].setNumber( i );
    }
  }

  Line.prototype.reset= function( txt= null, upd= true ) {
    const oldLength= this.text.length;

    this.text= (txt !== null) ? txt : '';
    this.addDefaultStyling();

    if( upd ) {
      currentContext._updateLineLength( oldLength, this.text.length );
    }
  }

  Line.prototype.isLastLine= function() {
    return (this.number === currentContext.lines.length-1);
  }

  Line.prototype.textBegin= function() {
    return new StringIterator( this.text );
  }

  Line.prototype.selectLine= function( pos= 0 ) {
    // Select whole line
    this.setSelection( pos, -1 );
  }

  Line.prototype.unsetSelection= function() {
    // Unselect whole line
    this.setSelection( -1 );
  }

  Line.prototype.setSelection= function( begin, end ) {
    const lineClass= 'full-line-selection';
    const c= this.selectionOverlayElement.children[1];
    // Remove selection
    if( begin < 0 ) {
      c.children[0].innerText= '';
      c.children[1].innerText= '';
      c.classList.remove( lineClass )

    // Create/Update selection
    } else {
      // Full line selection that takes up the whole editor length
      if( (end < 0) || (end > this.text.length) ) {
        end= begin+1;
        c.classList.add( lineClass );
      } else {
        c.classList.remove( lineClass );
      }
      // Set width of the selection elements
      c.children[0].innerText= ''.padStart( begin, ' ');
      c.children[1].innerText= ''.padStart( end-begin, ' ');
    }
  }

  Line.prototype.getStorage= function( type= null ) {
    // Only init the storage with an actual object if a parser tries to use it
    if( !this.parserStorage ) {
      this.parserStorage= type ? new type() : {};
    }

    return this.parserStorage;
  }

  Line.prototype.getNextSibling= function() {
    if( this.number < currentContext.lines.length ) {
      return currentContext.lines[ this.number+1 ];
    }
    return null;
  }

  Line.prototype.getPreviousSibling= function() {
    if( this.number ) {
      return currentContext.lines[ this.number-1 ];
    }
    return null;
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
      this.textElement.children[0].innerText= (n+1);
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

  Line.prototype.split= function( pos, upd= true ) {
    // Return no split if position is at the end of the line
    if( pos === this.text.length ) {
      return null;
    }

    // Split the text string
    const data= new LineData();
    const text= this.text;
    const oldLength= text.length;
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
      const e=  container.children[idx];
      data.addElement( s.splitSection(e, pos ) );

      // Safe the offset the section positions have to be moved later
      data.styling[0].start+= e.innerText.length;

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
      // If no sections are left
      this.addDefaultStyling();
    }

    if( upd ) {
      // Update that the length has changed
      currentContext._updateLineLength( oldLength, this.text.length );
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
        s.writeText( container.children[i], this.text );

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

  Line.prototype.append= function( data, upd= true ) {
    const oldLength= this.text.length;

    // Data may also be a simple string
    if( typeof data === 'string' ) {
      if( !this.styling.length ) {
        this.addDefaultStyling();
      }
      this.writeCharacter( this.text.length, data, upd );
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

    if( upd ) {
      currentContext._updateLineLength( oldLength, this.text.length );
    }
  }

  Line.prototype.updateSectionPositions= function( idx, offset ) {
    for(; idx < this.styling.length; idx++ ) {
      this.styling[idx].start+= offset;
      this.styling[idx].end+=   offset;
    }
  }

  Line.prototype.writeCharacter= function( pos, c, upd= true ) {
    const oldLength= this.text.length;
  	const t= insert( this.text, c, pos );
    this.text= t;

    // Get index and element
    const idx= this.getStyling( pos );
    const elem= this.textElement.children[1].children[idx];
    const style= this.styling[idx];

    // Update the section length
    style.end+= c.length;
    this.updateSectionPositions( idx+1, c.length );

    style.writeText( elem, t );
    if( upd ) {
      currentContext._updateLineLength( oldLength, this.text.length );
    }
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

  Line.prototype.removeTextSection= function( pos, end, upd= true ) {
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
    const oldLength= this.text.length;
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
        t= extract( section.innerText, relpos, relend );
        section.innerText= t;

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

    if( upd ) {
      // Update that the length of the line has changed
      currentContext._updateLineLength( oldLength, this.text.length );
    }
  }

  Line.prototype.removeCharacter= function( pos ) {
    // Remove NL of previous line
    if( pos < 0 ) {
      // If not the first line
      let prev= this.getPreviousSibling();
      if( prev ) {
        let len= prev.text.length;

        // Append the text of this line to the previous one
        // Destroy may call _updateLineLength again, as it is guaranteed that
        // after append a now longer line exists
        prev.append( this.getData() );
        this.destroy();

        // Request to set the cursor at the position of the previous lines original length
        return len;
      }
    // Remove NL of this line
    } else if( pos >= this.text.length ) {
      // If not the last line
      let next= this.getNextSibling();
      if( next ) {
        let len= this.text.length;

        // Append the text of the next line to this one and destroy the next line
        this.append( next.getData() );
        next.destroy();

        // Request to keep the cursor at the same position
        // (Actually not necessary as KeyCodes.Delete does not move the cursor anyway)
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
      currentContext._updateLineLength( this.text.length, 0 );
      this.updateLineNumbers();
    }
  }

  Line.prototype.setPosition= function( idx ) {
    const lines= currentContext.lines;
    if( idx < 0 || idx >= lines.length ) {
      throw Error('Invalid arguments');
    }

    // Remove line from DOM
    this.destroy( false );

    // Attach line to DOM at the new position
    const oldPos= this.number;
    this.setNumber( idx );
    this.attachLineToDOM();

    // Only update the line inbetween the two positions
    if( oldPos < idx ) {
      lines[oldPos].setNumber( oldPos, false );
      lines[oldPos].updateLineNumbers( idx+1 );
    } else {
      this.updateLineNumbers( oldPos+1 );
    }
  }

  Line.prototype.setCursor= function( col ) {
  	col= col<= this.text.length ? col : this.text.length;
    this.cursorOverlayElement.children[1].innerText= '|'.padStart( col+1, ' ' );
    this.displayCursor= true;
    return col;
  }

  Line.prototype.hideCursor= function() {
  	if( this.displayCursor ) {
    	this.cursorOverlayElement.children[1].innerText= this.cursorOverlayElement.children[1].innerHTML.slice(0, -1);
      this.displayCursor= false;
    }
  }

  Line.prototype.showCursor= function() {
  	if( !this.displayCursor ) {
    	this.cursorOverlayElement.children[1].innerText+= '|';
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
    let it= this.textBegin();
    while( !it.isEnd() ) {
      if( it.charType() !== CharType.Whitespace ) {
        return it.pos;
      }
      it.next();
    }
    return 0;
  }


  /**
  * Action Line Span class
  * Simple Storage for events emitted by actions
  **/
  function ActionLineSpan( l, s= 1 ) {
    this.lineNum= l;
    this.span= s;
    this.ctx= currentContext;
  }

  ActionLineSpan.prototype.forEach= function( cb ) {
    for( let i= this.lineNum; i!= this.lineNum+ this.span; i++ ) {
      // Check if line exists in the document
      if( i >= this.ctx.lines.length ) {
        break;
      }
      cb( this.ctx.lines[i] );
    }
  }

  ActionLineSpan.prototype.lastLine= function() {
    return this.ctx.lines[ this.lineNum+ this.span- 1 ];
  }


  /**
  * Abstract base class for any actions
  * Provides some common functionalities and throws if
  * abstract methods are called. Actions that happen shortly after each other
  * are grouped together if possible, so that they can be un/redone in a single
  * command. If the cursor moves inbetween the events a new action is created.
  **/
  function ActionBase( c ) {
    // Either get the position from a vector or cursor object
    if( c instanceof Vector ) {
      this.lineNum= c.y;
      this.charCol= c.x;

    } else if( c instanceof Cursor ) {
      this.lineNum= c.curLine.number;
      this.charCol= c.curChar;

    } else {
      throw Error('Invalid argument');
    }

    // Safe initial creation time
    this.time= Date.now();
  }

  ActionBase.prototype.isSameType= function( x ) {
    return this.getType() === x.getType();
  }

  ActionBase.prototype.moveCursor= function() {
    const c= currentContext.cursor;
    c._move( this.lineNum, this.charCol );
    return c;
  }

  ActionBase.prototype.checkTime= function() {
    const t= Date.now();
    if( (t- this.time) > ActionBase.maxTime ) {
      return false;
    }

    // Update time for the next comparison
    this.time= t;
    return true;
  }

  ActionBase.prototype.checkAttach= function( ac ) {
    // Consume cursor move actions and set the timestamp low enough
    // so that the next add word action will create a new element on the stack
    if( ac.isConsumable() ) {
      this.time= 0;
      return 0x2; // Return true
    }

    // Event types are different
    if( !this.isSameType( ac ) ) {
      return 0x1; // Return false
    }

    // Too much time has passed since the last event
    if( !this.checkTime() ) {
      return 0x1;
    }

    return 0; // Don't return
  }

  ActionBase.prototype.copyPosition= function( ac ) {
    this.lineNum= ac.lineNum;
    this.charCol= ac.charCol;
  }

  ActionBase.prototype.isConsumable= function() {
    return false;
  }

  ActionBase.prototype._abstractMethod= function() {
    throw Error('Abstract method missing implementation');
  }

  ActionBase.prototype.emitEvent= function() {
    // Emit an event with a span of one line by default
    return new ActionLineSpan( this.lineNum );
  }

  ActionBase.prototype.getType=      function() { this._abstractMethod(); }
  ActionBase.prototype.attach=       function() { this._abstractMethod(); }
  ActionBase.prototype.undoAction=   function() { this._abstractMethod(); }
  ActionBase.prototype.redoAction=   function() { this._abstractMethod(); }

  // Maximum amount of time that may pass before actions are treated separately
  ActionBase.maxTime= 250;

  // Action type enum
  ActionBase.Types= {
    AddLine: 0,
    RemoveLine: 1,
    AddWord: 2,
    RemoveWord: 3,
    InsertText: 4,
    RemoveText: 5,
    CursorMove: 6
  };


  /**
  * Singleton Cursor Move Action class
  * Dummy class to notify the action on top of the action stack that the
  * cursor has moved when the 'attach' is called. Does not enforce singelton
  * behaviour in the constructor but provides a reusable static instance, as
  * it stores no data or state and can be shared. Does not fully derive from
  * ActionBase class as it only has its interface (prototype) but does not
  * call the ActionBase constructor
  **/
  function CursorMoveAction() {}
  Object.setPrototypeOf( CursorMoveAction.prototype, ActionBase.prototype );

  CursorMoveAction.prototype.getType= function() {
    return ActionBase.Types.CursorMove;
  }

  CursorMoveAction.prototype.isConsumable= function() {
    return true;
  }

  CursorMoveAction.instance= new CursorMoveAction();
  CursorMoveAction.get= function() { return CursorMoveAction.instance; }


  /**
  * Add Word Action class
  * Stores a single words added to the document including trailing whitespace.
  * If a letter or symbol follows the whitespace a new action is created.
  **/
  function AddWordAction( cursor, t ) {
    ActionBase.call( this, cursor );

    this.text= t;
  }
  Object.setPrototypeOf( AddWordAction.prototype, ActionBase.prototype );

  AddWordAction.prototype.getType= function() {
    return ActionBase.Types.AddWord;
  }

  AddWordAction.prototype.attach= function( ac ) {
    let v= this.checkAttach( ac );
    if( v ) {
      return v & 0x2;
    }

    if( this.text.length ) {
      const end= toCharType(this.text.charAt( this.text.length-1 ));
      const inp= toCharType( ac.text.charAt(0) );

      // Trailing whitespace behind the current word is also added to the action
      if( (end !== inp) && (end !== CharType.None) && (inp !== CharType.Whitespace) ) {
        return false;
      }
    }

    this.text+= ac.text;
    return true;
  }

  AddWordAction.prototype.undoAction= function() {
    // Remove text section from the string
    const c= currentContext.cursor;
    c.unselect();
    const b= this.charCol;
    currentContext.lines[ this.lineNum ].removeTextSection( b, b+ this.text.length );
    c._move( this.lineNum, b );
  }

  AddWordAction.prototype.redoAction= function() {
    // Insert characters at their previous position
    const c= this.moveCursor();
    c._writeCharacter( this.text );
  }


  /**
  * Add Line Action class
  * Stores the number of empty lines added to the document.
  **/
  function AddLineAction( cursor ) {
    ActionBase.call( this, cursor );

    this.lines= 1;
  }
  Object.setPrototypeOf( AddLineAction.prototype, ActionBase.prototype );

  AddLineAction.prototype.getType= function() {
    return ActionBase.Types.AddLine;
  }

  AddLineAction.prototype.emitEvent= function() {
    // Also update the line created by splitting the first one
    return new ActionLineSpan( this.lineNum, this.lines+1 );
  }

  AddLineAction.prototype.attach= function( ac ) {
    let v= this.checkAttach( ac );
    if( v ) {
      return v & 0x2;
    }

    this.lines++;
    return true;
  }

  AddLineAction.prototype.undoAction= function() {
    const c= currentContext.cursor;
    c.unselect();

    // Remove any lines except the last one
    for( let i= 1; i< this.lines; i++ ) {
      const l= currentContext.lines[ this.lineNum+1 ];
      l.setNumber( this.lineNum+ 1, false );
      l.destroy( false );
    }

    // Remove last line by deleting NL char
    // Merges both lines
    c._move( this.lineNum+ 1, 0 );
    c.curLine.setNumber( this.lineNum+ 1, false );
    c._removeCharacter( false );
  }

  AddLineAction.prototype.redoAction= function() {
    const c= this.moveCursor();

    // Add all lines back into the document
    for( let i= 0; i!= this.lines; i++ ) {
      c._newLine( false );
    }

    // Update line numbers
    currentContext.lines[ this.lineNum ].updateLineNumbers();
  }


  /**
  * Remove Word Action class
  * Stores a removed word including its trailing whitespace
  **/
  function RemoveWordAction( cursor, front, txt= null ) {
    ActionBase.call( this, cursor );

    this.text= '';
    this.front= front;

    if( txt === null ) {
      txt= front ? cursor.getCurChar() : cursor.getPrevChar();
    }
    this.addText( txt );
  }
  Object.setPrototypeOf( RemoveWordAction.prototype, ActionBase.prototype );

  RemoveWordAction.prototype.getType= function() {
    return ActionBase.Types.RemoveWord;
  }

  RemoveWordAction.prototype.addText= function( txt ) {
    // Save the removed text
    if( this.front ) {
      this.text += txt;

    // If the cursor removed a bit of text behind it, adjust its position
    } else {
      this.charCol -= txt.length;
      this.text= txt+ this.text;
    }
  }

  RemoveWordAction.prototype.getFirstChar= function() {
    // Get the char that was removed first from the document
    return this.front ? this.text.charAt(0) : this.text.charAt( this.text.length-1 );
  }

  RemoveWordAction.prototype.getLastChar= function() {
    // Get the char that was removed most recently from the document
    return !this.front ? this.text.charAt(0) : this.text.charAt( this.text.length-1 );
  }

  RemoveWordAction.prototype.attach= function( ac ) {
    let v= this.checkAttach( ac );
    if( v ) {
      return v & 0x2;
    }

    if( this.front !== ac.front ) {
      return false;
    }

    if( this.text.length ) {
      const end= toCharType( this.getLastChar() );
      const inp= toCharType( ac.getFirstChar() );

      // Trailing whitespace behind the current word is also added to the action
      if( (end !== inp) && (end !== CharType.None) && (inp === CharType.Whitespace) ) {
        return false;
      }
    }

    this.addText( ac.text );
    return true;
  }

  RemoveWordAction.prototype.undoAction= function() {
    AddWordAction.prototype.redoAction.call( this );
  }

  RemoveWordAction.prototype.redoAction= function() {
    AddWordAction.prototype.undoAction.call( this );
  }


  /**
  * Remove Line Action class
  * Stores the number of lines removed from the document
  **/
  function RemoveLineAction( cursor ) {
    ActionBase.call( this, cursor );

    this.lines= 1;
  }
  Object.setPrototypeOf( RemoveLineAction.prototype, ActionBase.prototype );

  RemoveLineAction.prototype.getType= function() {
    return ActionBase.Types.RemoveLine;
  }

  RemoveLineAction.prototype.emitEvent= function() {
    // See RemoveTextAction.prototype.emitEvent
    return new ActionLineSpan( this.lineNum, this.lines.length );
  }

  RemoveLineAction.prototype.attach= function( ac ) {
    let v= this.checkAttach( ac );
    if( v ) {
      return v & 0x2;
    }

    // Save position where insert lines on undo
    this.copyPosition( ac );
    this.lines+= ac.lines;
    return true;
  }

  RemoveLineAction.prototype.undoAction= function() {
    AddLineAction.prototype.redoAction.call( this );
  }

  RemoveLineAction.prototype.redoAction= function() {
    AddLineAction.prototype.undoAction.call( this );
  }


  /**
  * Insert Text Action class
  * Stores insertion position and data of lines added to the document
  * Is used for selections, line duplication and copy/paste
  **/
  function InsertTextAction( cursor, lines, zeroCol= false ) {
    ActionBase.call( this, cursor );

    this.charCol= zeroCol ? 0 : this.charCol;
    this.lines= lines;
  }
  Object.setPrototypeOf( InsertTextAction.prototype, ActionBase.prototype );

  InsertTextAction.prototype.getType= function() {
    return ActionBase.Types.InsertText;
  }

  InsertTextAction.prototype.emitEvent= function() {
    return new ActionLineSpan( this.lineNum, this.lines.length );
  }

  InsertTextAction.prototype.attach= function( ac ) {
    // Text actions are not attachable
    return ac.isConsumable();
  }

  InsertTextAction.prototype.undoAction= function() {
    // Create hidden selection
    const c= this.moveCursor();
    const s= new Selection( c );

    // Offset the char position if the selection is only a single line one
    const idx= this.lines.length-1;
    const off= idx ? 0 : this.charCol;

    // Move cursor and remove selection
    c._move( this.lineNum+ idx, off+ this.lines[ idx ].length );
    s.set( c, false );
    c.removeSelection( s );
  }

  InsertTextAction.prototype.redoAction= function() {
    const c= this.moveCursor();
    c._insertText( this.lines );
  }


  /**
  * Remove Text Action class
  * Stores the original position and data of lines removed from the document
  **/
  function RemoveTextAction( cursor ) {
    const sel= cursor.selection;

    ActionBase.call( this, sel.getTopVector() );
    this.lines= sel.toLines();
  }
  Object.setPrototypeOf( RemoveTextAction.prototype, ActionBase.prototype );

  RemoveTextAction.prototype.getType= function() {
    return ActionBase.Types.RemoveText;
  }

  RemoveTextAction.prototype.emitEvent= function() {
    // On removing only the first line would need to be updated, but
    // on undo requires the whole block to be reparsed. As emit event cannot
    // distinguish between do, undo and redo always the whole block length is
    // returned... possibly inefficient but simpler
    return new ActionLineSpan( this.lineNum, this.lines.length );
  }

  RemoveTextAction.prototype.attach= function( ac ) {
    // Text actions are not attachable
    return ac.isConsumable();
  }

  RemoveTextAction.prototype.undoAction= function() {
    InsertTextAction.prototype.redoAction.call( this );
  }

  RemoveTextAction.prototype.redoAction= function() {
    InsertTextAction.prototype.undoAction.call( this );
  }


  /**
  * Action Stack class
  * Stores a history of actions modifing the document. Allows to move through
  * the history by un/redoing the actions. By going 'back' and 'forward' in time
  * the actions are executed but not discarded. If the stack was moved back to
  * an earlier point in time and a new action is pushed to the stack, any actions
  * that could have been redone are dimissed.
  * Whenever a line is changed a 'line-action' event is sent. It is either created
  * when an action is pushed or the timeout of an action to attach to expires.
  * Therefore attaching to an action does not trigger the event.
  **/
  function ActionStack( l= 0 ) {
    this.arr= [];
    this.pos= 0;  // Points to the next free cell / next action to redo
    this.maxLength= l;
    this.onActionPushed= null;
    this.attachedEventTimer= null;
  }

  ActionStack.prototype.doEvent= function( action, tmr= false ) {
    this.onActionPushed ? this.onActionPushed( action, tmr ) :  0;
  }

  ActionStack.prototype.moveBack= function() {
    // Reached the begin of the history
    if( !this.pos ) {
      return false;
    }

    return this.arr[ --this.pos ];
  }

  ActionStack.prototype.moveForward= function() {
    // Reached top of action stack
    if( this.pos === this.arr.length ) {
      return false;
    }

    return this.arr[ this.pos++ ];
  }

  ActionStack.prototype.push= function( action ) {
    // Dimiss actions infront of the current position in the history
    this.arr.splice( this.pos, this.arr.length- this.pos );

    // Restrict the size of the history by dismissing the oldest action
    if( this.maxLength && (is.pos === this.maxLength) ) {
      this.arr.shift();
    } else {
      this.pos++;
    }

    this.arr.push( action );
    this._clearTimer();
    this.doEvent( action );
  }

  ActionStack.prototype.get= function() {
    return this.pos ? this.arr[ this.pos-1 ] : null;
  }

  ActionStack.prototype.back= function() {
    this._clearTimer();
    const a= this.moveBack();
    if( a ) {
      a.undoAction();
      this.doEvent( a );
    }
  }

  ActionStack.prototype.forward= function() {
    this._clearTimer();
    const a= this.moveForward();
    if( a ) {
      a.redoAction();
      this.doEvent( a );
    }
  }

  ActionStack.prototype.event= function( action ) {
    // Check if there is an old action to attach to
    let cur= this.get();
    if( cur ) {
      // Try to attach
      if( !cur.attach( action ) ) {
        this.push( action );
      } else {
        // If the action was attached, but not consumed, set the timer
        if( !action.isConsumable() ) {
          this._setTimer( cur );
        }
      }
    } else {
      // Set the timer if its the first action (that is not consumable)
      if( !action.isConsumable() ) {
        this.push( action );
      }
    }
  }

  ActionStack.prototype._clearTimer= function() {
    // Reset the timer if one currently exists
    if( this.attachedEventTimer !== null ) {
      window.clearTimeout( this.attachedEventTimer );
      this.attachedEventTimer= null;
    }
  }

  ActionStack.prototype._setTimer= function( action ) {
    // Create a new timer that will send an event if an action surpasses the
    // timeout to attach to it, triggering the parser if one is set
    this._clearTimer();
    this.attachedEventTimer= window.setTimeout( () => {
      // Call with the 'timerbased'-flag set to true
      this.doEvent( action, true );
    }, ActionBase.maxTime );
  }


  /**
  * Event Map class
  * Saves all requested user callbacks by event type. They are internally
  * stored additonally in a table to provide quick lookup by event-type-number
  **/
  function EventMap( enumHint, transform= null ) {
    this.map= new Map();
    this.table= [];

    this.queue= [];

    // Create all event buckets referenced by the map and the array
    for( let k in enumHint ) {
      // New bucket
      let arr= [];
      let idx= enumHint[k];

      // Save the ref in the map; the key can be transformed if needed
      this.map.set( transform ? transform( k ) : k, arr );

      // Create enough empty cells in the table as the enum is iterated in an
      // unsorted fashion
      while( idx >= this.table.length ) {
        this.table.push( null );
      }

      this.table[idx]= arr;
    }
  }

  EventMap.prototype.addListener= function( nm, cb ) {
    // If an event cell does not exist yet, create it
    let a= this.map.get( nm );
    if( !a ) {
      a= [];
      this.map.set( nm, a );
      this.table.push( a );
    }

    // Save cb
    a.push( cb );
  }

  EventMap.prototype.removeListener= function( nm, cb ) {
    let a= this.map.get( nm );
    if( a ) {
      let idx= a.indexOf(cb);
      if( idx >= 0 ) {
        a.splice( idx, 1 );
      }
    }
  }

  EventMap.prototype.call= function( num, args ) {
    this._broadcast( (num < this.table.length) ? this.table[num] : null, args );
  }

  EventMap.prototype.callByName= function( nm, args ) {
    this._broadcast( this.map.get( nm ), args );
  }

  EventMap.prototype.defer= function( n, a ) {
    this.queue.push( {n, a} );
  }

  EventMap.prototype.execDefered= function() {
    this.queue.forEach( d => typeof d.n === 'string' ? this.callByName(d.n, d.a) : this.call(d.n, d.a) );
    this.queue= [];
  }

  EventMap.prototype._broadcast= function( a, args ) {
    // Silent error
    if( !a || !a.length ) {
      return;
    }

    // Only create heavy event objects by event emitter if we reach this place
    args= args.emitEvent ? args.emitEvent() : args;

    // Call the cb either by apply or as a function with a single argument
    if( Array.isArray(args) ) {
      a.forEach( cb => {
        try { cb.apply(window, args) } catch(e) { console.error(e); }
      });
    } else {
      a.forEach( cb => {
        try { cb(args) } catch(e) { console.error(e); }
      });
    }
  }


  /**
  * Cursor Animator class
  * Lets the cursor blink if the editor is focused. Keeps the cursor
  * visible as long as new characters are typed.
  **/
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


  /**
  * Predefined key codes for special keys
  **/
  const KeyCodes= {
    Enter: 13,
    ArrowUp: 38,
    ArrowLeft: 37,
    ArrowRight: 39,
    ArrowDown: 40,
    End: 35,
    Pos1: 36,
    Backspace: 8,
    Tabulator: 9,
    Delete: 46,
    PageUp: 33,
    PageDown: 34,
    letterV: 86,
    letterC: 67,
    letterX: 88
  };


  /**
  * Input Adapter class
  * Provides an event source from the keyboard that also captures genuine
  * copy/paste events that can access the clipboard. Creates a hidden textarea
  * element that is focused. Converts clipboard events to keyboard events to
  * allow for a simpler statemachine.
  **/
  function InputAdapter( e ) {
    const t= document.createElement('textarea');
    this.element= t;
    this.element.style.opacity= '0';
    this.element.style.filter= 'alpha(opacity=0)';
    e.appendChild( this.element );

    this.handler= null;
    this.hasFocus= false;

    this.lastEvent= null;

    const _ctrl_v= {key: 'v', keyCode: KeyCodes.letterV, ctrlKey: true, shiftKey: false};
    const _ctrl_c= {key: 'c', keyCode: KeyCodes.letterC, ctrlKey: true, shiftKey: false};
    const _ctrl_x= {key: 'x', keyCode: KeyCodes.letterX, ctrlKey: true, shiftKey: false};

    // Add keyboard event handlers to the hidden textarea element
    t.addEventListener( 'keydown', (e) => { this.handleEvent( e ); });

    t.addEventListener( 'paste', (e) => { this.handleEvent( e, _ctrl_v, (e.clipboardData || window.clipboardData).getData('Text') ); });

    t.addEventListener( 'copy', (e) => { this.handleEvent( e, _ctrl_c ); });

    t.addEventListener( 'cut', (e) => { this.handleEvent( e, _ctrl_x ); });
  }

  InputAdapter.prototype.handleEvent= function( e, k= null, data= null ) {
    this.lastEvent= e;
    if( this.hasFocus && this.handler ) {
      const copyPaste= (e.ctrlKey && (e.key === 'v' || e.key === 'c' || e.key === 'x'));

      if( !(e instanceof KeyboardEvent) || (e.ctrlKey && !copyPaste)) {
        e.preventDefault();
      }

      // Either substitute key provided or not Ctrl+c/v/x
      if( k || !copyPaste ) {
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


  /**
  * Enum of user events emitted by the editor
  **/
  const EditorEvents= {
    Focused: 0,
    Unfocused: 1,
    CursorSet: 2,
    Type: 3,
    Copy: 4,
    Cut: 5,
    Paste: 6,
    Undo: 7,
    Redo: 8,
    LineAction: 9,
    Scroll: 10
  };

  /**
  * Editor class
  * The actual editor instance used a context.
  * Stores the document data and DOM elements. Inserts the HTML into a provided
  * container element on creation. Does not automatically detect changes of its
  * viewport.
  **/
  function Editor( anchor ) {
    this.tabLength= 2;
    this.maxLineLength= 0;
    this.mousePos= new Vector();
    this.mousePagePos= new Vector();

    const emitter= new EventMap( EditorEvents, (nm) => nm.toLowerCase() );
    this.emitter= emitter;

    const actions= new ActionStack();
    this.actions= actions;

    actions.onActionPushed= ( ac, timerBased ) => {
      // Input based line actions need to be defered until the line data has
      // actually changed
      if( timerBased ) {
        this.emitter.call( EditorEvents.LineAction, ac );
      } else {
        this.emitter.defer( EditorEvents.LineAction, ac );
      }
    };

    this.focus();

    this._createDOM( anchor );
    this._setupEvents();

    this.lines= [];


    const cursor= new Cursor();
    this.cursor= cursor;
    cursor.setListener('move', () => {
      this._updateScrollPosition();
      this.emitter.call( EditorEvents.CursorSet, this );
    });

    this.anim= new CursorAnimator( cursor );

    // TEST
    /*this.lines[0].text= "Das ist ein langer String.";
    this.lines[0].addStyling( [new StyleEntry( 0,  4),
                               new StyleEntry( 4,  8),
                               new StyleEntry( 8, 12),
                               new StyleEntry(12, 19),
                               new StyleEntry(19, 26)
                             ] );*/


    const input= new InputAdapter( this.inputContainer );
    this.input= input;

    input.setFocus();
    input.onInput( (e, v) => {
      // Is writeable character
      if( e.key.length === 1 ) {
        if( !e.ctrlKey ) {
          cursor.writeCharacter( e.key );
          emitter.call( EditorEvents.Type, {ctx: this, key: e.key} );

        } else {
          switch( e.key ) {
            case 'v':
            case 'V':
              cursor.insertText( v.replace('\t', this._getTabulator()) );
              emitter.call( EditorEvents.Paste, {ctx: this, data: v} );
              break;

            case 'c':
            case 'C':
              input.toClipboard( cursor.copyCurrent() );
              emitter.call( EditorEvents.Copy, this );
              break;

            case 'x':
            case 'X':
              input.toClipboard( cursor.cutCurrent() );
              emitter.call( EditorEvents.Cut, this );
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

            case 'z':
            case 'Z':
              actions.back();
              emitter.call( EditorEvents.Undo, this );
              break;

            case 'y':
            case 'Y':
              actions.forward();
              emitter.call( EditorEvents.Redo, this );
              break;
          }
        }
      } else {
        const s= e.shiftKey;
      	switch( e.keyCode ) {
          case KeyCodes.Enter:
            cursor.newLine();
            break;

          case KeyCodes.ArrowUp:
            e.ctrlKey ? cursor.swapLine( true ) : cursor.moveUp( s );
            break;

          case KeyCodes.ArrowDown:
            e.ctrlKey ? cursor.swapLine( false ) : cursor.moveDown( s );
            break;

          case KeyCodes.ArrowLeft:
            e.ctrlKey ? cursor.movePreviousWord( s ) : cursor.movePrevious( s );
            break;

          case KeyCodes.ArrowRight:
            e.ctrlKey ? cursor.moveNextWord( s ) : cursor.moveNext( s );
            break;

          case KeyCodes.End:
            e.ctrlKey ? cursor.moveEOF( s ) : cursor.moveEnd( s );
            break;

          case KeyCodes.Pos1:
            e.ctrlKey ? cursor.moveBOF( s ) : cursor.moveBegin( s );
            break;

          case KeyCodes.Backspace:
            e.ctrlKey ? cursor.removeWord( false ) : cursor.removeCharacter( false );
            break;

          case KeyCodes.Delete:
            e.ctrlKey ? cursor.removeWord( true ) : cursor.removeCharacter( true );
            break;

          case KeyCodes.Tabulator:
            cursor.writeCharacter( this._getTabulator() );
            e.preventDefault(); // Prevent unfocus via tab key

            emitter.call( EditorEvents.Type, {ctx: this, key: e.key} );
            break;

          case KeyCodes.PageDown:
            cursor.moveLines( Math.round( this._getHeightInLines() ), s );
            break;

          case KeyCodes.PageUp:
            cursor.moveLines( -Math.round( this._getHeightInLines() ), s );
            break;
        }
      }
      this.anim.type();     // Pause the cursor blinking animation while typing

      emitter.execDefered();// Execute ayn defered events
    });

    this.viewport= null;
    this.charDimensions= null;
    this.spacerOffset= 0;
    this.scrollTop= 0;
    this.scrollLeft= 0;
    this.updateViewport();  // Initially get the size of the viewport

    // Initially ocus the editor
    this._isConstruct= true;
    this.focus();
  }

  Editor.prototype._createDOM= function( anchor ) {
    this.anchor= anchor;
    deleteAllChildren( anchor );

    anchor.innerHTML= `<div class= "editor">
      <div class="size-probe container"><div><div class="line"><div class="line-probe line-text">Eg</div></div></div></div>
      <div class="background container">
        <div class="sidebar"><div class="filler"></div></div>
      </div>
      <div class="selection-overlay container"><div class="overlay-content"><div class="filler"></div></div></div>
      <div class="text-field container"><div class="overlay-content"><div class="filler"></div></div></div>
      <div class= "cursor-overlay container"><div class="overlay-content"><div class="filler"></div></div></div>
      <div class="input-container"></div>
    </div>`;

    this.sizeElement=       anchor.getElementsByClassName('size-probe')[0].firstElementChild;
    this.lineHeightElement= anchor.getElementsByClassName('line-probe')[0];
    this.backElement=       anchor.getElementsByClassName('background')[0];
    this.textElement=       anchor.getElementsByClassName('text-field')[0].firstElementChild;
    this.cursorElement=     anchor.getElementsByClassName('cursor-overlay')[0].firstElementChild;
    this.selectionElement=  anchor.getElementsByClassName('selection-overlay')[0].firstElementChild;
    this.inputContainer=    anchor.getElementsByClassName('input-container')[0];
  }

  Editor.prototype._setupEvents= function() {
    // Register clicks and keep track if they are inside of the editor to allow for unfocusing
    let isMouseOver= false;
    this.anchor.addEventListener('mouseover', () => { isMouseOver= true;  });
    this.anchor.addEventListener('mouseout',  () => { isMouseOver= false; });

    window.addEventListener('mousedown', e => {
      if( isMouseOver ) {
        if(this.focus() && this._mouseInViewportXY()) {
          this._setCoursorByClick( e );
        }
      } else {
        this.unfocus();
      }

      e.preventDefault();
    });

    let selTimer= null;
    window.addEventListener('mousemove', debounce( e => {
      // Check if mouse position has actually changed
      if( !this.mousePagePos.isEqual( e.pageX, e.pageY ) ) {
        this.mousePos.set( e.clientX, e.clientY );
        this.mousePagePos.set( e.pageX, e.pageY );

        // Check if only the left (primary) mouse button is held down
        if( e.buttons === 1 ) {
          if( this.isFocused() ) {

            // Handle selection inside the editor viewport
            if( this._mouseInViewportY() ) {
              if( selTimer ) {
                window.clearTimeout( selTimer );
                selTimer= null;
              }

              this._setCoursorToXY( e.clientX, e.clientY, true );
            } else {
              // Don't override the timer
              if( !selTimer ) {
                const runTimer= () => {
                  const sz= this.viewport;

                  // Calculate number of ms to pause before the next line will be selected
                  let offset= (this.mousePos.y < sz.top) ? sz.top- this.mousePos.y : this.mousePos.y- sz.bottom;
                  let speed= clamp( 200- 0.8* offset, 20, 5000);
                  selTimer= window.setTimeout(() => {
                    if( this._mouseInViewportY() || !document.hasFocus() ) {
                      selTimer= null;
                      return;
                    }

                    // Move cursor either up or down
                    let up= this.mousePos.y < sz.top;
                    this._moveCursorToLineX( up, this.mousePos.x, true );

                    // Next iteration
                    runTimer();
                  }, speed );
                };

                // Start timer
                runTimer();
              }
            }
          }
        }
      }
    }) );

    window.addEventListener('mouseup', () => {
      // Immediately stop the selection timer if the mouse was released
      if( selTimer ) {
        window.clearTimeout( selTimer );
        selTimer= null;
      }
    });

    // Set scroll position for all stacked overlays
    // Only run every frame and ignore any other incoming events
    const ce= this.cursorElement.parentElement;
    ce.addEventListener('scroll', debounce(() => {
      copyElementScroll( ce, this.textElement.parentElement );
      copyElementScroll( ce, this.selectionElement.parentElement );
      copyElementScroll( ce, this.backElement );

      this.scrollTop= ce.scrollTop;
      this.scrollLeft= ce.scrollLeft;

      this.emitter.call( EditorEvents.Scroll, this );
    }) );

    // Update viewport on scroll and window resize
    document.body.addEventListener('scroll', debounce( () => this.updateViewport() ));
    window.addEventListener('resize', () => { this.updateViewport() } );
  }

  Editor.prototype._setCoursorByClick= function( e ) {
    this._setCoursorToXY( e.clientX, e.clientY );
  }

  Editor.prototype._setCoursorToXY= function( x, y, select= false ) {
    const ce= this.cursorElement.parentElement;
    const char= this.charDimensions;
    const pos= this.viewport;

    // Calculate the line number: (pos inside the editor div + scroll) / height of line
    const line= clamp( Math.floor( (y- pos.top+ ce.scrollTop) / char.height ), 0, this.lines.length-1 );

    // Calculate the column number: (pso inside the editor div + scroll) / width of character
    const col= Math.max(0, Math.round( (x- char.left+ ce.scrollLeft) / (char.width/2) ));

    this.cursor.move( line, col, select );
  }

  Editor.prototype._moveCursorToLineX= function( up, x, select= false ) {
    const ce= this.cursorElement.parentElement;
    const char= this.charDimensions;

    let line= this.cursor.curLine.number;
    line= clamp( line+ (up ? -1 : 1), 0, this.lines.length-1 );

    const col= Math.max(0, Math.round( (x- char.left+ ce.scrollLeft) / (char.width/2) ));

    this.cursor.move( line, col, select );
  }

  Editor.prototype._updateWidths= function() {
    const te= this.textElement;
    copyElementWidth( te, this.cursorElement.lastElementChild );
    copyElementWidth( te, this.selectionElement.lastElementChild );
    copyElementWidth( te, this.backElement.lastElementChild.lastElementChild );
  }

  Editor.prototype._updateScrollPosition= function() {
    // Get elements
    const rootRect= this.viewport;
    const ce= this.cursorElement.parentElement;

    // Get constants
    // Text size probe ontains two chars to account for the spacing inbetween chars
    const width= this.charDimensions.width/2;
    const height= this.charDimensions.height;
    const num= this.cursor.curLine.number;
    const col= this.cursor.curChar;

    // Bounding box values for the current cursor element
    // Calculate the pixel positons to avoid a call to getBoundingCLientRect
    const top= num*height- this.scrollTop+ rootRect.top;
    const bottom= top+ height;
    const right= (col+1)*width- this.scrollLeft+ rootRect.left+ this.spacerOffset;

    // Cursor leaves bottom of the screen
    if( bottom > rootRect.bottom ) {
      ce.scrollTop= (this.scrollTop+= bottom- rootRect.bottom);

    // Cursor leaves top of the screen
    } else if( top < rootRect.top ) {
      ce.scrollTop= (this.scrollTop-= rootRect.top- top);
    }

    // Cursor leaves right of the screen
    if( right > rootRect.right ) {
      ce.scrollLeft= (this.scrollLeft+= right- rootRect.right);

    // Cursor leaves left of the screen
    }else if( right < rootRect.left ) {
      ce.scrollLeft= (this.scrollLeft-= rootRect.left- right);
    }
  }

  Editor.prototype._getHeightInLines= function() {
    return this.sizeElement.clientHeight / this.lineHeightElement.clientHeight;
  }

  Editor.prototype.isFocused= function() {
    return this === currentContext;
  }

  Editor.prototype._mouseInViewportY= function() {
    const vp= this.viewport;
    return isInRange( this.mousePos.y, vp.top, vp.bottom );
  }

  Editor.prototype._mouseInViewportXY= function() {
    const vp= this.viewport;
    return isInRange( this.mousePos.y, vp.top, vp.bottom ) &&
           isInRange( this.mousePos.x, vp.left, vp.right );
  }

  Editor.prototype._updateLineLength= function( oldLen, newLen ) {
    if( this.maxLineLength < newLen ) {
      // New longest line is set
      this.maxLineLength= newLen;
      this._updateWidths();
    } else {
      if( (oldLen > newLen) && (oldLen >= this.maxLineLength) ) {
        // Previously longest line has shrunk
        // Find the currently longest line
        this.maxLineLength= 0;
        this.lines.forEach( l => this.maxLineLength= Math.max(this.maxLineLength, l.text.length) );
        this._updateWidths();
      }
    }
  }

  Editor.prototype.updateViewport= function() {
    this.viewport= this.sizeElement.getBoundingClientRect();
    this.charDimensions= this.sizeElement.firstElementChild.firstElementChild.getBoundingClientRect();
    this.spacerOffset= this.lines[0].cursorOverlayElement.firstElementChild.getBoundingClientRect().width;
  }

  Editor.prototype.unfocus= function() {
    if( this.isFocused() ) {
      console.log('unfocus');
      this.input.setFocus( false );
      this.anim.setFocus( false );
      currentContext= null;

      this.emitter.call( EditorEvents.Unfocused, this );
    }
  }

  Editor.prototype.focus= function() {
    const wasFocused= this.isFocused();
    if( !wasFocused ) {
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

      this.emitter.call( EditorEvents.Focused, this );
    }

    // Always set the input focus
    if( this._isConstruct ) {
      this.input.setFocus( true );
    }

    return wasFocused;
  }

  Editor.prototype.addEventListener= function( nm, cb ) {
    this.emitter.addListener( nm, cb );
    return cb;
  }

  Editor.prototype.removeEventListener= function( nm, cb ) {
    this.emitter.removeListener(nm, cb);
  }

  Editor.prototype._getTabulator= function() {
    return ''.padStart( this.tabLength );
  }


  /**
  * Token Type enum
  * Allows distinguishing different tokens
  **/
  const TokenType= {
    Word: 0,
    Operator: 1,
    Compound: 2,
    Keyword: 3
  }

  /**
  * Text Token class
  * Text snipped created by the parser containing a logical unit of the document
  * Might be a word, operator keyword or a longer section called a compound token,
  * based on the configuration of the parser. Instead of storing the actual string
  * only the postions are stored.
  **/
  function TextToken( t, b, it, db= -1 ) {
    this.type= t;

    // Initialize with iterator only -> sets the end to -1
    if( b instanceof StringIterator ) {
      this.begin= b.pos;
      this.end= -1;

    // Initialize with numeric begin and iterator as end position
    } else {
      this.begin= b;
      this.end= it.pos;
    }
    this.dataBegin= db;
    this.comp= null;
    this.style= null;
  }

  TextToken.prototype.getData= function( line ) {
    // Empty/Open-ended token
    if( this.end < 0 ) {
      return '';
    }

    // Use 'databegin' if one is defined
    return line.text.substring( this.dataBegin < 0 ? this.begin : this.dataBegin, this.end );
  }


  /**
  * Text Styler class
  * Simple helper class to build a line style array and submit it to a line.
  * If multiple identical style classes are set next to each other, they are
  * combinded to remove the need of DOM-element merging later on. If the line
  * that styles are added to changes, the style array is automatically submitted.
  **/
  function TextStyler() {
    this.arr= [];
    this.line= null;
  }

  TextStyler.prototype.submit= function() {
    if( !this.line || !this.arr.length ) {
      return;
    }

    // Add styling to the line
    this.line.addStyling( this.arr );
    this.arr= [];
    this.line= null;
  }

  TextStyler.prototype.add= function( line, tk, style ) {
    if( this.line !== line ) {
      this.submit();
    }

    // Add or combine
    this.line= line;
    let p= this.arr.length ? this.arr[this.arr.length-1] : null;
    if(  p && p.type.equals( style ) ) {
      p.end= tk.end;
    } else {
      this.arr.push( new StyleEntry( tk.begin, tk.end, style ) );
    }
  }


  /**
  * Simple Text Parser Storage class
  * Provides the basic interface to the parser to store and reset. If the
  * 'getStorageType' method is overridden, the new type has to inherit from this
  * one.
  **/
  function TextParserStorage() {
    this.endsWithCompound= null;    // Line ended with compound, else null
    this.beginsWithCompound= null;  // Line started with compound, else null
  }

  TextParserStorage.prototype.reset= function() {
    // Reset before parse iteration
    this.endsWithCompound= null;
    this.beginsWithCompound= null;
  }


  /**
  * Compound Type class
  * Defines a tpye of compound token. The start and end sequence which describe the
  * begin and end of a token, the name and an escsape character can be set. If no
  * end sequence is set, it will be identical to the start one. If no escape char
  * exists, it should be set to null or ''. If compounds a certain copmound should
  * end with the line, set the end sequence to '\n'.
  **/
  function CompoundType( n, es, b, e= null ) {
    this.name= n;
    this.beginSeq= b;
    this.endSeq= e ? e : b;
    this.escapeChar= es && (es.length > 0) ? es : null;

    if( this.escapeChar && this.escapeChar.length !== 1 ) {
      throw Error('Escape chars need to have a lenght of 1');
    }
  }

  CompoundType.prototype.createToken= function( it ) {
    const t= new TextToken( TokenType.Compound, it );
    t.comp= this;
    return t;
  }

  CompoundType.prototype.tryLoad= function( it, line, cb ) {
    // Check if the compound start seq is found
    if( it.follows( this.beginSeq ) ) {
      let tk= this.createToken( it );

      // Jump over start seq before load
      it.move( this.beginSeq.length );
      let ended= this.load( it, tk );

      cb( line, tk );
      return ended ? null : this;
    }
    return null;
  }

  CompoundType.prototype.load= function( it, tk ) {
    if( this.endSeq === '\n' ) {
      return this.loadWholeLine( it, tk );
    }

    while( !it.isEnd() ) {
      // Jump over escape char
      if( it.get() === this.escapeChar ) {
        it.next();
      } else {
        // Try to find the end sequence
        if( it.follows( this.endSeq ) ) {
          it.move( this.endSeq.length );
          tk.end= it.pos;
          return true;
        }
      }
      it.next();
    }
    tk.end= it.pos;
    return false;
  }

  CompoundType.prototype.loadWholeLine= function( it, tk ) {
    it.setEnd();
    tk.end= it.pos;
    return true;
  }


  /**
  * Abstract Text Parser class
  * Provides a set of functions to split line text data into tokens and iterate
  * over them. Automatically attaches itself to the 'lineaction' event of a
  * provided editor instance. Needs to have the onLineAction method overriden
  **/
  function TextParser( e, operators, compounds, keywords ) {
    // Convert keywords to map if an array is provided
    if( Array.isArray(keywords) ) {
      this.keyMap= new Map();
      keywords.forEach( w => this.keyMap.set(w, true) );
    } else {
      this.keyMap= keywords;
    }

    this.opList= operators.sort( (a,b) => b.length- a.length );
    this.compList= compounds.sort( (a,b) => b.beginSeq.length- a.beginSeq.length );
    this.editor= e;
    this.handle= this.editor.addEventListener('lineaction', ls => this.onLineAction( ls ) );
  }

  TextParser.prototype.unregister= function() {
    this.editor.removeEventListener( 'lineaction', this.handle );
  }

  TextParser.prototype.tagAsMultiCompound= function( line, comp ) {
    const data= line.getStorage( this.getStorageType() );
    data.endsWithCompound= comp ? comp : null;
  }

  TextParser.prototype.loadMultiLineCompund= function( it, line, cb ) {
    // Try to get previous line
    const prev= line.getPreviousSibling();
    if( prev ) {
      // Try to get compound entry from its data
      const prevData= prev.getStorage( this.getStorageType() );
      const comp= prevData.endsWithCompound;

      // Save that the line started with a spilled over compound
      const data= line.getStorage( this.getStorageType() );
      data.beginsWithCompound= comp;

      if( comp ) {
        // Load the compound
        let tk= comp.createToken( it );
        let ended= comp.load( it, tk );
        cb( line, tk );

        if( !ended ) {
          this.tagAsMultiCompound( line, comp );
          return true;
        }
      }
    }
    return false;
  }

  TextParser.prototype.loadCompound= function( it, line, cb ) {
    // Try loading one of the defined compounds
    let comp= null;
    this.compList.some( c => comp= c.tryLoad( it, line, cb ) );

    // Compound spills to next line
    if( comp ) {
      this.tagAsMultiCompound( line, comp );
    }

    return comp ? true : false;
  }

  TextParser.prototype.loadCharType= function( it, tp ) {
    // Move iterator until a different chartype is encountered
    while( !it.isEnd() ) {
      if( it.charType() !== tp ) {
        return true;
      }
      it.next();
    }
    return false;
  }

  TextParser.prototype.loadWord= function( it, line, cb ) {
    const begin= it.pos;

    // Jump over preceding WS (eg. begin of the line)
    this.loadCharType( it, CharType.Whitespace );
    const wbegin= it.pos;

    // Load the word itself
    this.loadCharType( it, CharType.Letter );
    const wend= it.pos;

    // Jump over trailing WS
    this.loadCharType( it, CharType.Whitespace );

    // Check if word is keyword
    if( wbegin !== wend ) {
      if( this.keyMap.has( it.str.substring(wbegin, wend) ) ) {
        return cb( line, new TextToken( TokenType.Keyword, begin, it, wbegin ) );
      }
    }

    cb( line, new TextToken( TokenType.Word, begin, it, wbegin ) );
  }

  TextParser.prototype.loadOperator= function( it, line, cb ) {
    const begin= it.pos;

    // Iterate over possible operators and try to match
    let fnd= this.opList.some( o => {
      if( it.follows(o) ) {
        it.move( o.length );
        cb( line, new TextToken( TokenType.Operator, begin, it ) );
        return true;
      }
      return false;
    });

    // Create a word token, if the symbol cannot be converted to a operator
    if( !fnd ) {
      it.next();
      cb( line, new TextToken( TokenType.Word, begin, it ) );
    }
  }

  TextParser.prototype.parseLine= function( line, cb ) {
    line.getStorage( this.getStorageType() ).reset();
    const it= line.textBegin();

    // Load a multi line compound, that spilled over from the line above
    this.loadMultiLineCompund( it, line, cb );

    while( !it.isEnd() ) {
      if( !this.loadCompound( it, line, cb ) ) {

        switch( it.charType() ) {
          // Whitespace is attached to the word tokens
          case CharType.Whitespace:
          case CharType.Letter:
            this.loadWord( it, line, cb );
            break;

          // Symbols
          case CharType.Symbol:
            this.loadOperator( it, line, cb );
            break;

          // Whitespace
          default:
            it.next();
            break;
        }
      }
    }
  }

  TextParser.prototype.updateFollowingLines= function( ls, cb ) {
    let tp= this.getStorageType();
    let l= ls.lastLine();

    // Go through all following lines, that begin with compound that is different to
    // the one the current line ends with
    while( l && l.getNextSibling() && (l.getStorage(tp).endsWithCompound !== l.getNextSibling().getStorage(tp).beginsWithCompound) ) {
      l= l.getNextSibling();

      this.parseLine( l, cb );
    }
  }

  TextParser.prototype.forEachToken= function( ls, cb ) {
    // Parse all lines in the line action span
    ls.forEach( line => this.parseLine( line, cb ) );

    // Parse all lines affected below
    this.updateFollowingLines( ls, cb );
  }

  // Can be overriden by a parser implementation that needs to store additional data
  // Returned type has to inherit from the default TextParserStorage class
  TextParser.prototype.getStorageType= function() { return TextParserStorage; }

  TextParser.prototype._abstractMethod= function() {
    throw Error('abstract method');
  }

  TextParser.prototype.onLineAction= function() { this._abstractMethod(); }




  /**
  * Text Parser implementation for the C language
  **/
  function TextParserC( e ) {
    // Define all keywords
    this.keywords= [ 'auto', 'double', 'int', 'struct', 'break', 'else', 'long',
                     'switch', 'case', 'enum', 'register', 'typedef', 'char',
                     'extern', 'return', 'union', 'continue', 'for', 'signed',
                     'void', 'do', 'if', 'static', 'while', 'default', 'goto',
                     'sizeof', 'volatile', 'const', 'float', 'short', 'unsigned'];

    const CT= {
      LineComment: 0,
      BlockComment: 1,
      String: 2,
      Character: 3,
      Preprocessor: 4
    };

    this.compTypes= CT;

    // Define all compounds
    this.compounds= [ new CompoundType(CT.LineComment,  null, '//', '\n'),
                      new CompoundType(CT.BlockComment, null, '/*', '*/'),
                      new CompoundType(CT.String,       '\\', '"'       ),
                      new CompoundType(CT.Character,    '\\', '\''      ),
                      new CompoundType(CT.Preprocessor, null, '#',  '\n')
                    ];

    // Define all oprators
    this.operators= ['<<=', '>>=', '+=', '-=', '*=', '/=', '%=', '<=', '>=',
                     '!=', '==', '|=', '&=', '^=', '&&', '||', '<<', '>>', '++',
                     '--', '~', '&', '|', '.', ',', ';', '?', '=', '(', ')', '{',
                     '}', '[', ']', '+', '-', '*', '/', '%', '!', '^', '<', '>',
                     ':'];

    // Call parent constructor
    TextParser.call( this, e, this.operators, this.compounds, this.keywords );
  }
  Object.setPrototypeOf( TextParserC.prototype, TextParser.prototype );

  TextParserC.prototype.onLineAction= function( ls ) {
    let styler= new TextStyler();

    // Get all tokens in the line span
    this.forEachToken( ls, (l, tk) => {
      switch( tk.type ) {
        case TokenType.Word:
        case TokenType.Operator:
          // Number constants are colored differently
          if( isDigit(tk.getData(l).charAt(0)) ) {
            styler.add( l, tk, defStyles.Constant );
          } else {
            styler.add( l, tk, defStyles.Text );
          }
          break;

        case TokenType.Keyword:
          styler.add( l, tk, defStyles.Keyword );
          break;

        case TokenType.Compound:
          this.styleCompound( styler, l, tk );
          break;
      }
    });

    // Submit the last line manually
    styler.submit();
  }

  TextParserC.prototype.styleCompound= function( styler, l, tk ) {
    const CT= this.compTypes;

    switch( tk.comp.name ) {
      case CT.LineComment:
      case CT.BlockComment:
        styler.add( l, tk, defStyles.Comment );
        break;

      case CT.String:
      case CT.Character:
        styler.add( l, tk, defStyles.String );
        break;

      case CT.Preprocessor:
        styler.add( l, tk, defStyles.Special );
        break;

      default:
        styler.add( l, tk, defStyles.Text );
        console.error('Unknown compound type', tk);
        break;
    }
  }

  // Create list of predefined text parser classes
  Editor.defaultTextParser= {
    LangC: function( e ) { return new TextParserC( e ); }
  };

  return Editor;
}
