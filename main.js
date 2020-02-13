function Egitor(){

  const createCSSClass= (function() {
    const styleElement= document.createElement('style');
    styleElement.type = 'text/css';
    document.getElementsByTagName('head')[0].appendChild( styleElement );

    return function(name,rules) {
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
    let css= 'color: '+ color+ ';';

    if( bold ) {
      css+= 'font-weight: bold;';
    }
    if( italic ) {
      css+= 'font-style: italic;'
    }
    if( underline ) {
      css+= 'text-decoration: underline';
    }
    createCSSClass( 'editor-class-'+name, css )
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

  function Selection( c ) {
    this.beginLine= c.curLine;
    this.beginChar= c.curChar;
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

  Selection.prototype.set= function( c ) {
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

    let n= this.normalize();

    // Is selection only in a single line
    if( n.topLine === n.bottomLine ) {
      n.topLine.setSelection( n.topChar, n.bottomChar );
    } else {
      // Update selection from top to bottom
      n.topLine.selectLine( n.topChar );

      for( let i= n.topLine.number+1; i< n.bottomLine.number; i++ ) {
        currentContext.lines[i].selectLine();
      }

      n.bottomLine.setSelection( 0, n.bottomChar );
    }
  };

  Selection.prototype.forEach= function( fn ) {
    let n= this.normalize();
    if( n.topLine === n.bottomLine ) {
      fn(n.topLine, n.topChar, n.bottomChar, 0);
      return 1;
    }

    fn( n.topLine, n.topChar, n.topLine.text.length, 0 );

    let c= 1;
    for( let i= n.bottomLine.number- n.topLine.number- 1; i > 0; i--) {
      let l= currentContext.lines[n.topLine.number+1];
      fn( l, -1, l.text.length, c++ );
    }

    fn( n.bottomLine, 0, n.bottomChar, c );
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

  function Cursor() {
  	this.curLine= null;
    this.curChar= 0;
    this.shadowPosition= 0;

    this.selection= null;

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

  Cursor.prototype.getNextChar= function() {
    const lines= currentContext.lines;

    if( this.curLine ) {
      // In the same line
      if( !this.isEOL() ) {
        return this.curLine.text.charAt( this.curChar+ 1 );
      }
      // Jump to the next line
      if( this.curLine.number !== lines.length-1 ) {
        return lines[ this.curLine.number+ 1 ].text.charAt( 0 );
      }
    }
    return '';
  }

  Cursor.prototype.getPrevChar= function() {
    const lines= currentContext.lines;

    if( this.curLine ) {
      // In the same line
      if( this.curChar ) {
        return this.curLine.text.charAt( this.curChar- 1 );
      }
      // Jump to the next line
      if( this.curLine.number ) {
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
    this.move( this.curLine.number, this.curChar+ 1 );
  }

  Cursor.prototype.newLine= function() {
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
  	if( line !== this.curLine.number ) {
    	this.hide();
    	this.curLine= currentContext.lines[line];
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
      this.move( this.curLine.number, 0, select );
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

  Cursor.prototype.removeSelection= function() {
    // Iterate over all selected lines
    let first= null, begin;
    let num= this.selection.forEach( (l, b, e, i) => {
      // Neither the first or last line
      if( b< 0 ) {
        return l.destroy();
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

    this.selection.destroy();
    this.selection= null;
    this.move( first.number, begin );
  }

  Cursor.prototype.removeWord= function( infront ) {
    if( this.selection ) {
      return this.removeSelection();
    }

    //....
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
    this.selection.forEach( (l, b, e) => {
      t += l.getString( b, e );
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

  Cursor.prototype.insertText= function( t ) {
    if( this.selection ) {

    }

    // alte selection löschen -> zeilen objekte behalten
    //
  }


  function Line( pos= 0, content= null ) {
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

    // Attach or insert line elements in their respective layers
    const t= currentContext.textElement;
    const o= currentContext.cursorElement;
    const s= currentContext.selectionElement;

    t.insertBefore( this.textElement, t.children[ pos ]);
    o.insertBefore( this.cursorOverlayElement, o.children[ pos ]);
    s.insertBefore( this.selectionOverlayElement, s.children[pos]);

    // Update all following lines
    for( let i= pos; i< lines.length; i++ ) {
      lines[i].setNumber( i );
    }
  }

  Line.prototype.reset= function( defstyling= true ) {
    this.text= '';
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
    for( let i= 0; i!= this.styling.length; i++ ) {
      let s= this.styling[i];
      if( (s.start <= p) && (s.end > p) ) {
        return i;
      }
    }
    return this.styling.length-1;
  }

  Line.prototype.setNumber= function( n ) {
  	this.number= n;
    this.textElement.children[0].innerHTML= (n+1);
  }

  Line.prototype.getData= function() {
    return {
      text: this.text,
      styling: this.styling,
      elements: Array.from( this.textElement.children[1].children )
    };
  }

  Line.prototype.split= function( pos ) {
    // Return no split if position is at the end of the line
    if( pos === this.text.length ) {
      return null;
    }

    // Split the text string
    let data= { text: '', styling: [], elements: [] };
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
      data.styling.push( Object.assign( {}, s ) );

      // Duplicate the splitted section and split its inner html
      let o= pos- s.start;
      let inner= container.children[idx].innerHTML;
      data.elements.push( s.type.createElement() );
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
        data.elements.push( node );
        let next= node.nextSibling;
        container.removeChild( node );
        node= next;
      }

      // Just split the styling array (keep the first element)
      Array.prototype.push.apply(data.styling, this.styling.splice( idx, this.styling.length- idx) );
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

      // Remove empty elements/stylings from the dom
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
    // Add the elements
    const self= this;
    data.elements.forEach( function(e) {
      self.textElement.children[1].appendChild( e );
    });

    // Add the styling and offset the start and end
    const shift= self.text.length- data.styling[0].start;
    data.styling.forEach( function(s) {
      s.start+= shift;
      s.end  += shift;
      self.styling.push(s);
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

    this.updateSectionPositions( idx, -offset );
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

  Line.prototype.getString= function( b, e ) {
    b= (typeof b === 'undefined') ? 0 : b;
    e= (typeof e === 'undefined') ? this.text.length : e;

    // Get substring of text data, and add a NL if needed
    return this.text.substring(b, e) + ((e >= this.text.length) && this.isLastLine() ? '' : '\n');
  }

  Line.prototype.destroy= function() {
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
    for( let i= pos; i< lines.length; i++ ) {
      lines[i].setNumber( i );
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
    this.addStyling( [{start: 0, end: 0, type: defStyles[0]}] );
  }

  Line.prototype.addStyling= function( a ) {
    if( !a || !a.length || (a[a.length-1].end !== this.text.length) ) {
      throw Error('Invalid styling for line: ', this);
    }

    // Remove all children
    const container= this.textElement.children[1];
    deleteAllChildren( container );

    // Iterate over styling and create elements in the text container
    const self= this;
    this.styling= a;
    this.styling.forEach( function(s) {
      const section= s.type.createElement();
      section.innerHTML= self.text.substring( s.start, s.end );
      container.appendChild( section );
    });
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
      if( !(e instanceof KeyboardEvent) ) {
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
  const _Delete= 46;

  function Editor( anchor ) {
    this.focus();

    this._createDOM( anchor );
    this._setupEvents();

    this.lines= [];

    const cursor= new Cursor();
    this.cursor= cursor;

    this.anim= new CursorAnimator( cursor );

    // TEST
    this.lines[0].text= "Das ist ein langer String.";
    this.lines[0].addStyling( [{start: 0,  end: 4,  type: defStyles[0]},
                               {start: 4,  end: 8,  type: defStyles[0]},
                               {start: 8,  end: 12, type: defStyles[0]},
                               {start: 12, end: 19, type: defStyles[0]},
                               {start: 19, end: 26, type: defStyles[0]}
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
              console.log('Paste: ', v );
              break;

            case 'c':
            case 'C':
              console.log('Copy');
              input.toClipboard( cursor.copyCurrent() );
              break;

            case 'x':
            case 'X':
              console.log('Cut');
              input.toClipboard( cursor.cutCurrent() );
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
            cursor.removeCharacter( false );
            break;

          case _Delete:
            cursor.removeCharacter( true );
            break;
        }
      }
      this.anim.type();
      this._updateWidths();
    });



    // Initially ocus the editor
    this._isConstruct= true;
    this.focus();
  }

  Editor.prototype._createDOM= function( anchor ) {
    this.anchor= anchor;
    deleteAllChildren( anchor );

    anchor.innerHTML= `<div class= "editor">
      <div class="background container">
        <div class="sidebar"><div class="filler"></div></div>
      </div>
      <div class="text-field container" ><div class="filler"></div></div>
      <div class="selection-overlay container"><div class="filler"></div></div>
      <div class= "cursor-overlay container"><div class="cursor-content"><div class="filler"></div></div></div>
      <div class="input-container"></div>
    </div>`;

    this.backElement=      anchor.getElementsByClassName('background')[0];
    this.textElement=      anchor.getElementsByClassName('text-field')[0];
    this.cursorElement=    anchor.getElementsByClassName('cursor-overlay')[0].firstElementChild;
    this.selectionElement= anchor.getElementsByClassName('selection-overlay')[0];
    this.inputContainer=   anchor.getElementsByClassName('input-container')[0];
  }

  Editor.prototype._setupEvents= function() {
    let isMouseOver= false;
    this.anchor.addEventListener('mouseover', () => { isMouseOver= true;  });
    this.anchor.addEventListener('mouseout',  () => { isMouseOver= false; });
    document.addEventListener('click', (e) => { isMouseOver ? this.focus() : this.unfocus(); e.preventDefault(); });

    // set scroll position for all stacked overlays
    const ce= this.cursorElement.parentElement;
    ce.addEventListener('scroll', (e) => {
      //console.log(e);
      copyElementScroll( ce, this.textElement );
      copyElementScroll( ce, this.selectionElement );
      copyElementScroll( ce, this.backElement );
    });
  }

  Editor.prototype._updateWidths= function() {
    const te= this.textElement;
    copyElementWidth( te, this.cursorElement.lastElementChild );
    copyElementWidth( te, this.selectionElement.lastElementChild );
    copyElementWidth( te, this.backElement.lastElementChild.lastElementChild );
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

  return Editor;
}
