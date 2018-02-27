'use strict';

let DEBUGGING = false;
let DESIGNING = false;

const Q = 100;
const Q75 = Math.floor(Q*0.75);
const Q50 = Math.floor(Q*0.5);
const Q25 = Math.floor(Q*0.25);
const Q20 = Math.floor(Q/5);        const strQ20 = Q20.toString(); 
const Q10 = Q/10;                   const strQ10 = Q10.toString();

const innerRadius = Q50 * 0.86603;

const xCentreDistance = Q + Q50;
const yCentreDistance = Q50;
const xEvenOffset = Q + Q25;
const xOddOffset = Q50;
const yOffset = Q50;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const BACKGROUND_COLOR = 'White';
const INPROGRESS_COLOR = 'LightGray';
const COMPLETED_COLOR = 'Black';

const NORTH     = 0b000001;
const NORTHEAST = 0b000010;
const SOUTHEAST = 0b000100;
const SOUTH     = 0b001000;
const SOUTHWEST = 0b010000;
const NORTHWEST = 0b100000;

const PLACE_COIN_CHANCE = 0.33;

const isOdd = (x) => { return (x&1)==1; };

// distance from centre to midpoint of diagonal edge = Math.sqrt(3)/2*Q50 
const cellData = [
    { bit: NORTH,       oppBit: SOUTH,     link: 'n',      c2eX: 0,        c2eY: -Q/2,  tri:[0,0,-Q/4,-Q/2, Q/4,-Q/2]  },
    { bit: NORTHEAST,   oppBit: SOUTHWEST, link: 'ne',     c2eX: Q*3/8,    c2eY: -Q/4,  tri:[0,0, Q/4,-Q/2, Q/2,0]     },
    { bit: SOUTHEAST,   oppBit: NORTHWEST, link: 'se',     c2eX: Q*3/8,    c2eY: Q/4,   tri:[0,0, Q/2,0, Q/4,Q/4]      },
    { bit: SOUTH,       oppBit: NORTH,     link: 's',      c2eX: 0,        c2eY: Q/2,   tri:[0,0, -Q/4,Q/2, Q/4,Q/2]   },
    { bit: SOUTHWEST,   oppBit: NORTHEAST, link: 'sw',     c2eX: -Q*3/8,   c2eY: Q/4,   tri:[0,0, -Q/4,Q/2, -Q/2,0]      },
    { bit: NORTHWEST,   oppBit: SOUTHEAST, link: 'nw',     c2eX: -Q*3/8,   c2eY: -Q/4,  tri:[0,0, -Q/2,0, -Q/4,-Q/2]     }
];

const prebuilt = [
    '{"type":"6","numX":"7","numY":"7","coins":[8,0,20,20,0,0,16,0,10,42,40,20,10,0,9,0,0,0,10,40,20,0,9,9,9,0,11,40,5,16,0,0,13,17,0,34,5,21,17,34,5,17,0,0,34,34,1,0,34]}',
    '{"type":"6","numX":"7","numY":"7","coins":[8,0,20,20,0,0,20,0,10,42,40,20,10,40,9,0,0,0,14,48,20,0,5,21,17,34,15,57,5,16,34,34,9,0,34,34,0,0,0,0,5,17,0,0,0,0,1,0,34]}',
    '{"type":"6","numX":"5","numY":"10","coins":[12,20,20,28,28,50,34,34,34,56,11,20,0,9,3,10,40,20,20,9,9,0,10,43,36,5,21,0,0,41,9,34,45,17,0,24,0,34,0,25,7,20,21,20,22,35,34,34,34,33]}',
    '{"type":"6","numX":"3","numY":"6","coins":[12,28,28,62,62,56,15,63,63,63,63,57,7,55,55,35,35,33]}',
    '{"type":"6","numX":"3","numY":"6","coins":[12,20,20,34,34,40,9,0,0,0,0,9,5,20,20,34,34,33]}'
];

class Cell
{
    constructor(svg, x, y, centre)
    {
        this.svg = svg;
        this.x = x;
        this.y = y;
        this.centre = centre;
        this.n  = this.ne = this.se = this.s = this.sw = this.nw = null;        
        this.coins = this.originalCoins = 0;
        this.g = null;
    }

    hammingWeight()
    {
        /*        
        return this.coins.toString(2).split('1').length-1;
        return this.coins.toString(2).match(/1/g).length;
        https://stackoverflow.com/questions/109023/how-to-count-the-number-of-set-bits-in-a-32-bit-integer
        */
        let v = this.coins;
        v = v - ((v >> 1) & 0x55555555);                // put count of each 2 bits into those 2 bits
        v = (v & 0x33333333) + ((v >> 2) & 0x33333333); // put count of each 4 bits into those 4 bits  
        return ((v + (v >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;
    }

    rotate5()
    {
        const thisCell = this;

        return new Promise(function(resolve, reject)
        {
            let angle = 10;

            const spinSVG = () => {
                thisCell.g.setAttributeNS(null, 'transform', `rotate(${angle} ${thisCell.centre.x},${thisCell.centre.y})`);
                angle += 10;
                if ( angle < 60 )
                    window.requestAnimationFrame(spinSVG);
                else
                    resolve();
            };
            window.requestAnimationFrame(spinSVG);
        });
    }

    shiftBits(num = 1)
    {
        while ( num-- )
        {
            if ( this.coins & 0b100000 )
                this.coins = ((this.coins << 1) & 0b111111) | 0b000001;
            else
                this.coins = (this.coins << 1) & 0b111111;
        }
    }

    unshiftBits(num = 1)
    {
        while ( num-- )
        {
            if ( this.coins & 0b000001 )
                this.coins = (this.coins >> 1) | 0b100000;
            else
                this.coins = this.coins >> 1;
        }
    }

    isComplete()
    {
        for ( let chkLink of cellData.filter(chk => this.coins & chk.bit) )
        {
            if ( this[chkLink.link] === null )
                return false;
            if ( !(this[chkLink.link].coins & chkLink.oppBit) )
                return false;
        }
        return true;
    }

    toggleCoin(cd)
    {
        if ( null == cd || null == this[cd.link] )
            return;

        if ( this.coins & cd.bit )
        {
            this.coins &= ~cd.bit;
            this[cd.link].coins &= ~cd.oppBit;
        }
        else
        {
            this.coins |= cd.bit;
            this[cd.link].coins |= cd.oppBit;
        }

        this.setGraphic();
        this[cd.link].setGraphic();
    }

    placeCoin()
    {
        if ( this.s )
        {
            if ( Math.random() < PLACE_COIN_CHANCE )
            {
                this.coins = this.coins | SOUTH;
                this.s.coins = this.s.coins | NORTH;
            }
        }
        if ( this.ne )
        {
            if ( Math.random() < PLACE_COIN_CHANCE )
            {
                this.coins = this.coins | NORTHEAST;
                this.ne.coins = this.ne.coins | SOUTHWEST;
            }
        }
        if ( this.se )
        {
            if ( Math.random() < PLACE_COIN_CHANCE )
            {
                this.coins = this.coins | SOUTHEAST;
                this.se.coins = this.se.coins | NORTHWEST;
            }
        }
    }

    jumbleCoin()
    {
        if ( Math.random() > 0.5 )
        {
            if ( DEBUGGING )
            {
                if ( Math.random() > 0.75 )
                    this.unshiftBits();
            }
            else
            {
                if ( Math.random() > 0.75 )
                    this.shiftBits();
                else
                    this.unshiftBits();
            }
        }
    }

    setGraphic()
    {
        if ( this.g )
        {
            this.g.removeAttributeNS(null, 'transform');
            while ( this.g.firstChild )
                this.g.removeChild(this.g.firstChild);
        }
        else
        {
            this.g = document.createElementNS(SVG_NAMESPACE, 'g');
            this.svg.appendChild(this.g);
        }
        // document > svg > g|path > path|circle|line
        /***        
        const gNew = document.createElementNS(SVG_NAMESPACE, 'g');
        if ( this.g )
            this.svg.replaceChild(gNew, this.g);
        else
            this.svg.appendChild(gNew);
        this.g = gNew;
        ***/
        if ( DEBUGGING )
        {
            const eleSvgText = document.createElementNS(SVG_NAMESPACE, 'text');
            eleSvgText.setAttributeNS(null, 'x', this.centre.x.toString());
            eleSvgText.setAttributeNS(null, 'y', this.centre.y.toString());
            eleSvgText.setAttributeNS(null, 'stroke-width', '1');
            eleSvgText.innerHTML = `${this.x},${this.y}`;
            this.g.appendChild(eleSvgText);
        }

        if ( 0 == this.coins )
            return;

        const bitCount = this.hammingWeight();
        if ( 1 == bitCount )
        {
            const eleLine = document.createElementNS(SVG_NAMESPACE, 'line');
            const b2p = cellData.find( ele => this.coins == ele.bit );
            eleLine.setAttributeNS(null, 'x1', this.centre.x);
            eleLine.setAttributeNS(null, 'y1', this.centre.y);
            eleLine.setAttributeNS(null, 'x2', this.centre.x + b2p.c2eX);
            eleLine.setAttributeNS(null, 'y2', this.centre.y + b2p.c2eY);
            this.g.appendChild(eleLine);

            const eleSvgCircle = document.createElementNS(SVG_NAMESPACE, 'circle');
            eleSvgCircle.setAttributeNS(null, 'cx', this.centre.x.toString());
            eleSvgCircle.setAttributeNS(null, 'cy', this.centre.y.toString());
            eleSvgCircle.setAttributeNS(null, 'r', strQ20);
            eleSvgCircle.setAttributeNS(null, 'fill', BACKGROUND_COLOR);
            this.g.appendChild(eleSvgCircle);
        }
        else
        {
            /*
                The initial M directive moves the pen to the first point (100,100).
                Two co-ordinates follow the ‘Q’; the single control point (50,50) and the final point we’re drawing to (0,0).
                It draws perfectly good straight lines, too, so no need for separate 'line' element.
            */
            let path = undefined;
            let cdFirst = undefined;
            for ( let cd of cellData )
            {
                if ( this.coins & cd.bit )
                {
                    if ( !path )
                    {
                        cdFirst = cd;
                        path = `M${this.centre.x + cd.c2eX},${this.centre.y + cd.c2eY}`;
                    }
                    else
                    {
                        path = path.concat(` Q${this.centre.x},${this.centre.y} ${this.centre.x + cd.c2eX},${this.centre.y + cd.c2eY}`);
                    }
                }
            }
            if ( bitCount > 2 )  // close the path for better aesthetics
                path = path.concat(` Q${this.centre.x},${this.centre.y} ${this.centre.x + cdFirst.c2eX},${this.centre.y + cdFirst.c2eY}`);
    
            const ele = document.createElementNS(SVG_NAMESPACE, 'path');
            ele.setAttributeNS(null, 'd', path);
            this.g.appendChild(ele);
        }
    }
}

class Honeycomb
{
    constructor(numX=7, numY=5)
    {
        this.numX = numX;
        this.numY = numY;
        this.cells = new Array();  // array of cells
    
        const eleWrapper = document.createElement('div');
        eleWrapper.style.backgroundColor = BACKGROUND_COLOR;

        // create an SVG element
        this.svg = document.createElementNS(SVG_NAMESPACE, 'svg');
        this.svg.setAttributeNS(null, 'width', ((numX+1)*xCentreDistance).toString());
        this.svg.setAttributeNS(null, 'height', ((numY+1)*yCentreDistance).toString());
        this.svg.setAttributeNS(null, 'stroke', INPROGRESS_COLOR);
        this.svg.setAttributeNS(null, 'stroke-width', strQ10);
        this.svg.setAttributeNS(null, 'fill', 'none');
    
        for ( let y=0; y<numY; y++ )
        {
            for ( let x=0; x<numX; x++)
            {
                let centre = isOdd(y)
                ? { x:xEvenOffset+(x*xCentreDistance), y:yOffset+(y*yCentreDistance) }
                : { x:xOddOffset+(x*xCentreDistance), y:yOffset+(y*yCentreDistance) };
    
                const c = new Cell(this.svg, x, y, centre);
                this.cells.push(c);

                if ( DESIGNING || DEBUGGING )
                {
                    const eleSvgPath = document.createElementNS(SVG_NAMESPACE, 'path');
                    eleSvgPath.setAttributeNS(null, 'd', this.createOutlinePath(centre));
                    eleSvgPath.setAttributeNS(null, 'stroke-width', '1');
                    eleSvgPath.setAttributeNS(null, 'stroke', '#F0F0F0');
                    this.svg.appendChild(eleSvgPath);
                }
            }
        }
        
        this.svg.addEventListener('click', this);     // <g> and <path> &c don't accept listeners

        eleWrapper.appendChild(this.svg);
        document.body.appendChild(eleWrapper);

        document.body.onkeydown = this.handleEventKeyDown.bind(this);
    }

    createOutlinePath(c)
    {
        return `M${c.x-Q25} ${c.y-Q50} L${c.x+Q25} ${c.y-Q50} L${c.x+Q50} ${c.y} L${c.x+Q25} ${c.y+Q50} L${c.x-Q25} ${c.y+Q50} L${c.x-Q50} ${c.y} Z`;
    }

    linkCells()
    {
        this.cells.forEach(c => {
            let t = undefined;  // the target we are looking for
            t = this.cells.find( d => (c.centre.x == d.centre.x) && (c.centre.y == d.centre.y-Q) );
            if ( t )
            {
                c.s = t;
                t.n = c;
            }
            t = this.cells.find( d => (c.centre.x == d.centre.x-Q75) && (c.centre.y == d.centre.y+Q50) );
            if ( t )
            {
                c.ne = t;
                t.sw = c;
            }
            t = this.cells.find( d => (c.centre.x == d.centre.x-Q75) && (c.centre.y == d.centre.y-Q50) );
            if ( t )
            {
                c.se = t;
                t.nw = c;
            }
        });
        return this;
    }

    placeCoins(arrCoins)
    {
        if ( arrCoins )
        {
            let i = 0;
            for ( const c of this.cells )
                c.coins = arrCoins[i++];
        }
        else
        {
            for ( const c of this.cells )
                c.placeCoin();
        }
        for ( const c of this.cells )
            c.originalCoins = c.coins;
        return this;
    }

    isComplete()
    {
        for ( const c of this.cells )
            if ( !c.isComplete() )
                return false;
        return true;
    }

    jumbleCoins()
    {
        if ( DESIGNING )
            return this;

        while ( this.isComplete() )
            for ( const c of this.cells )
                c.jumbleCoin();
        return this;
    }

    setGraphics()
    {
        this.cells.forEach(c => {
            c.setGraphic();
        });
        return this;
    }

    // x,y is the point to test
    // cx, cy is circle center, and radius is circle radius
    pointInCircle(x, y, cx, cy, radius)
    {
        const distanceSquared = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        return distanceSquared <= radius * radius;
    }

    pointInTriangle(px,py,ax,ay,bx,by,cx,cy)
    {   // http://www.blackpawn.com/texts/pointinpoly/default.html and https://koozdra.wordpress.com/2012/06/27/javascript-is-point-in-triangle/
        
        const v0 = [cx-ax,cy-ay];
        const v1 = [bx-ax,by-ay];
        const v2 = [px-ax,py-ay];
        
        const dot00 = (v0[0]*v0[0]) + (v0[1]*v0[1]);
        const dot01 = (v0[0]*v1[0]) + (v0[1]*v1[1]);
        const dot02 = (v0[0]*v2[0]) + (v0[1]*v2[1]);
        const dot11 = (v1[0]*v1[0]) + (v1[1]*v1[1]);
        const dot12 = (v1[0]*v2[0]) + (v1[1]*v2[1]);
        
        const invDenom = 1/ (dot00 * dot11 - dot01 * dot01);
        
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        
        return ((u >= 0) && (v >= 0) && (u + v < 1));
    }

    toggle(x, y)
    {
        for ( const c of this.cells )
            if ( this.pointInCircle(x, y, c.centre.x, c.centre.y, innerRadius) )
            {
                for ( let cd of cellData )
                {
                    // cellData.tri is array of [x,y, x,y, x,y] x=even y=odd
                    const arrAdjusted = cd.tri.map((ele,idx) => ele + (isOdd(idx) ? c.centre.y : c.centre.x));
                    if ( this.pointInTriangle(x, y, ...arrAdjusted) )
                    {
                        c.toggleCoin.call(c, cd);
                        return;
                    }
                }
                return;
            }
        return;
    }

    handleEvent(event)
    {
        if ( DESIGNING )
        {
            this.toggle(event.offsetX, event.offsetY);
            return;
        }

        if ( this.isComplete() )
        {
            window.location.reload(false);
            return;
        }
        
        for ( const c of this.cells )
            if ( this.pointInCircle(event.offsetX, event.offsetY, c.centre.x, c.centre.y, innerRadius) )
            {
                c.rotate5()
                .then( () => { 
                    c.shiftBits();
                    c.setGraphic(); 
                    if ( this.isComplete() )
                        this.svg.setAttributeNS(null, 'stroke', COMPLETED_COLOR);
                });
                break;
            }
    }

    handleEventKeyDown(event)
    {   // 'event' is a KeyboardEvent object, event.type == "keydown"
        if ( event.code == 'KeyB' )
        {
            for ( const c of this.cells )
                c.coins = c.originalCoins = 0;
            this.setGraphics();            
        }

        if ( event.code == 'KeyJ' )
        {
            for ( const c of this.cells )
                c.jumbleCoin();
            this.setGraphics();
        }

        if ( event.code == 'KeyS' )
        {
            var obj = {
                type: '6',
                numX: this.numX,
                numY: this.numY,
                coins: Array.from(this.cells, c => c.coins)
            };
            console.log(JSON.stringify(obj));
        }

        if ( event.code == 'KeyU')
        {
            for ( const c of this.cells )
                c.coins = c.originalCoins;
            this.setGraphics();            
        }
    }

}

function main() 
{
    var urlParams = {},
        match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = (s) => decodeURIComponent(s.replace(pl, ' ')),
        query  = window.location.search.substring(1);

    while (match = search.exec(query))
        urlParams[decode(match[1])] = decode(match[2]);

    DEBUGGING = urlParams.debug ? urlParams.debug : false;
    DESIGNING = urlParams.design ? urlParams.design : false;
    let numX = urlParams.x ? urlParams.x : Math.max(Math.floor(window.innerWidth / Q * 0.66), 3);
    let numY = urlParams.y ? urlParams.y : Math.max(Math.floor(window.innerHeight / Q * 1.75), 3);

    if ( urlParams.load && prebuilt[urlParams.load] )
    {
        const objLoad = JSON.parse(prebuilt[urlParams.load]);
        const h = new Honeycomb(objLoad.numX, objLoad.numY);
        h.linkCells().placeCoins(objLoad.coins).jumbleCoins().setGraphics();
    }
    else
    {
        const h = new Honeycomb(numX, numY);
        h.linkCells().placeCoins().jumbleCoins().setGraphics();
    }
}

main();
