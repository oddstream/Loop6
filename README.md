# Loop6

Six-way (hexagon) version of the Android Infinity Loop game in vanilla ES6 Javascript

Original concept by Infinity Games (Prof Dr Augusti Abreu from Portual).

## Gameplay

The puzzle fills the available browser window. Click on a piece to rotate it 60&deg; clockwise. When the puzzle is completed,
the loops change colour and won't rotate any more. Click again to create a new puzzle. Resize the browser window to make the puzzle easier or harder.
The idea is to make the game as simple and frictionless as possible; I've taken everything out that you don't really need.
It's endless, so there's no concept of scores. 
Just relax and click.

## Implementation

It's implemented using a calculated lattice of flat-topped hexagon-shaped linked nodes, which are called cells. Each cell is an object which contains links to it's six neighbours.
So much more fun than using a two dimensional array.

The loops are implemented not as loops, but by the notion of placing 'coins' at each edge of a cell that contains a link to it's neighbour. Each cell contains zero to
six coins. The coins are referred to by compass points. The coins are reciprocal, so, for example, if a tile has a 'north' coin, then it's neighbour to the 'north'
will have a 'south' coin.

The Javascript uses no imports or libraries or dependancies, so there are no version issues. The graphics are implemented using SVG.

The puzzle is complete when, for each cell, every coin has a matching reciprocal coin in it's neighbour.

The coins for each cell are held as bits in a number. Cell rotation clockwise is done by rotating the bits in the number to the left.

The game is implemented in two files, a minimal wrapper .html file and a script .js file. All the exciting HTML is created on the fly by the script.

The .html wrapper can take "command line" style arguments to set the size of the puzzle, or put the game into debug or design mode, for example

    /somepath/Loop6.html?x=7&y=5&debug=1

