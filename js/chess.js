// The starting position, so a section can name its piece by colour and square.

export const FILES = 'abcdefgh';

const BACK_RANK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

// { a1: { side: 'white', type: 'rook' }, ... } for all 32 pieces.
export const startPosition = {};
for (let f = 0; f < 8; f++) {
  startPosition[`${FILES[f]}1`] = { side: 'white', type: BACK_RANK[f] };
  startPosition[`${FILES[f]}2`] = { side: 'white', type: 'pawn' };
  startPosition[`${FILES[f]}7`] = { side: 'black', type: 'pawn' };
  startPosition[`${FILES[f]}8`] = { side: 'black', type: BACK_RANK[f] };
}
