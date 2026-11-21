// Everything the site says lives here. Edit this file to change the content;
// the board, the side panel and the plain page all read from it.
//
// Each entry is one white piece.
//   from / square : where the piece starts and where it stands after the opening
//   tag / conf    : the detection label drawn over the piece
//   group         : heading it sits under in the index and on the plain page

export const person = {
  name: 'Vlad Plyushchenko',
  line: 'Computer science at UCLA, class of 2028',
  email: 'vladplyu@gmail.com',
  github: 'https://github.com/vladapl21',
  linkedin: 'https://www.linkedin.com/in/vladplyushchenko/',
};

export const groups = ['About', 'Experience', 'Projects', 'Leadership and ventures', 'Contact'];

export const pieces = [
  {
    id: 'about',
    type: 'king', from: 'e1', square: 'e1',
    group: 'About', tag: 'About', conf: 0.99,
    title: 'About me',
    photo: { src: 'img/vlad.jpg', alt: 'Vlad Plyushchenko', tag: 'vlad', conf: 0.97 },
    body: [
      'I study computer science at UCLA with an economics concentration, and I graduate in June 2028. Before Los Angeles I was at Harrow School in London.',
      'Most of my work so far has been product management close to the engineering: pointing analysis for a 450,000 km laser downlink at Qosmosys, growth at a VC-backed soccer betting app, and data systems at J.P. Morgan.',
      'I play blitz chess, and the position on this board is the Italian Game, my opening with White. Away from the board it is poker, Formula 1, skiing, darts and eggs Benedict. I speak English and Russian.',
    ],
  },
  {
    id: 'education',
    type: 'pawn', from: 'e2', square: 'e4',
    group: 'About', tag: 'UCLA', conf: 0.98,
    title: 'Education',
    sections: [
      {
        title: 'University of California, Los Angeles',
        meta: 'B.S. in Computer Science, Economics concentration',
        when: 'Expected June 2028',
        bullets: [
          'Coursework: Microeconomics, Statistics, Human-Computer Interaction, Machine Learning, Linear Algebra',
          'Involvements: Sigma Nu, ACM in AI, Bruin Strategy Network, UCLA Club Badminton',
        ],
      },
      {
        title: 'Harrow School, London',
        meta: 'A-Levels in Computer Science, Mathematics, Economics, Physics and Russian, all A*',
        when: 'June 2024',
      },
    ],
  },

  {
    id: 'qosmosys',
    type: 'knight', from: 'g1', square: 'f3',
    group: 'Experience', tag: 'Qosmosys', conf: 0.97,
    title: 'Qosmosys',
    meta: 'Product Manager Intern, Optical Systems',
    when: 'Jun to Sep 2026',
    where: 'Falls Church, Virginia',
    note: 'Spacecraft and lunar infrastructure',
    bullets: [
      'Owned pointing analysis on a 450,000 km laser downlink, closing a 2-mirror derivation gap 3 teams deferred.',
      'Modelled 12+ vendor specifications through Monte Carlo, cutting projected miss 3x, from 24 m to 7 m RMS error.',
      'Flagged a 0.3 mm clipping margin as the system’s top design risk, documenting it in a 23-slide deck for the CTO.',
    ],
  },
  {
    id: 'beautiful-game',
    type: 'knight', from: 'b1', square: 'b1',
    group: 'Experience', tag: 'The Beautiful Game', conf: 0.95,
    title: 'The Beautiful Game',
    meta: 'Product Manager',
    when: 'Jan to Apr 2026',
    where: 'Palo Alto, California',
    note: 'VC-backed soccer betting app',
    bullets: [
      'Led a 6-person, cross-functional product and engineering pod to 2x user growth, lifting referral 0.55 to 1.0.',
      'Planned go-to-market for a $10K freeroll tournament on a World Cup timeline, cutting acquisition cost by 35%.',
      'Ran customer interviews across 3 research pods to find unmet needs, projecting a 40% Day-30 retention lift.',
    ],
  },
  {
    id: 'jpmorgan',
    type: 'rook', from: 'a1', square: 'a1',
    group: 'Experience', tag: 'J.P. Morgan', conf: 0.96,
    title: 'J.P. Morgan',
    meta: 'Product Manager, Data Systems (contract)',
    when: 'Sep to Dec 2025',
    where: 'Los Angeles, California',
    bullets: [
      'Scoped and shipped Python and Tableau dashboards surfacing 500+ live pipelines across 10 partner colleges.',
      'Consolidated structured input from 30+ recruiters into SQL models, cutting leadership reporting time by 40%.',
    ],
  },
  {
    id: 'integem',
    type: 'bishop', from: 'c1', square: 'c1',
    group: 'Experience', tag: 'Integem', conf: 0.93,
    title: 'Integem',
    meta: 'Associate Product Manager, Technical Programs',
    when: 'Jun to Aug 2025',
    where: 'Palo Alto, California',
    bullets: [
      'Scoped and automated payment tracking across 4 systems, serving 150+ subscribers with no manual data entry.',
      'Planned and delivered 10+ machine learning and vision modules, tracking the progress of 30+ junior students.',
    ],
  },
  {
    id: 'andurand',
    type: 'rook', from: 'h1', square: 'h1',
    group: 'Experience', tag: 'Andurand Capital', conf: 0.94,
    title: 'Andurand Capital Management',
    meta: 'Analyst, Venture Capital Branch',
    when: 'Jul to Sep 2024',
    where: 'London, England',
    bullets: [
      'Assessed 50+ internal workflows and modelled outsourcing options, mapping which roles were offshore-eligible.',
      'Restructured subsidiary knowledge architecture in Confluence; optimised a commodity algo-trader 5% in Rust.',
    ],
  },

  {
    id: 'playbook',
    type: 'queen', from: 'd1', square: 'd1',
    group: 'Projects', tag: 'Opening Playbook', conf: 0.99,
    title: 'Chess Opening Playbook',
    meta: 'An opening trainer built from my own games',
    stack: 'JavaScript, Python, python-chess, Stockfish, Maia, Playwright',
    body: [
      'A trainer built around the positions I actually reach in my own games. A Python pipeline turns my game exports into two repertoire books, one for White with 1.e4 and one for Black against 1.e4 and 1.d4, with engine verdicts from Stockfish and move odds from Maia.',
      'The app itself is one HTML file with no framework and an SVG board, tested end to end with Playwright.',
    ],
    bullets: [
      'Learn: chapters and lessons ordered by how often each line comes up',
      'Drill: spaced repetition, with the opponent’s moves played for you',
      'Sandbox: play the book against an opponent, with three settings for how it picks replies',
      'Your games: results by opening, game reviews and puzzles from missed shots',
    ],
    demo: { label: 'Try the trainer here', src: 'https://vladapl21.github.io/chess-opening-playbook/' },
    links: [
      { label: 'Open the trainer in a new tab', href: 'https://vladapl21.github.io/chess-opening-playbook/' },
      { label: 'Source on GitHub', href: 'https://github.com/vladapl21/chess-opening-playbook' },
    ],
  },
  {
    id: 'anavue',
    type: 'bishop', from: 'f1', square: 'c4',
    group: 'Projects', tag: 'Anavue', conf: 0.96,
    title: 'Anavue',
    meta: 'Store analytics for high-ticket retail',
    when: 'Jan 2025 to present',
    note: 'VC-backed',
    stack: 'Python, OpenCV, React, SQL',
    body: [
      'Software that lets the manager of a shop like a jewellery boutique see how customers move through the store and where they stop. The boxes drawn over the pieces on this board are a nod to it.',
    ],
    bullets: [
      'Extended open-source object detection into a live-feed overlay, tracking customer paths through retail stores.',
      'Interviewed 10+ retail managers to find unmet needs, scoping dwell-time heatmaps into a 10-metric dashboard.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/anavue' }],
  },
  {
    id: 'odds',
    type: 'pawn', from: 'a2', square: 'a2',
    group: 'Projects', tag: 'Odds calibration', conf: 0.92,
    title: 'Odds calibration',
    meta: 'How efficient is the Premier League betting market?',
    stack: 'Python',
    body: [
      'A market-efficiency study of 7,600 Premier League matches. It checks how well bookmaker odds are calibrated, tests walk-forward Elo and gradient-boosting models against them, and simulates Kelly staking on the results.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/odds-calibration' }],
  },
  {
    id: 'point-ahead',
    type: 'pawn', from: 'b2', square: 'b2',
    group: 'Projects', tag: 'Lunar point-ahead', conf: 0.91,
    title: 'Lunar point-ahead model',
    meta: 'Aiming a laser at where the receiver will be',
    stack: 'Python',
    body: [
      'A model of the point-ahead mechanism for a satellite at the L2 Lagrange point sending a 1550 nm laser down to an antenna. Light takes over a second to cover the distance, so the beam has to lead its target.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/Lunar_Point_Ahead_Meachanism' }],
  },
  {
    id: 'minigolf',
    type: 'pawn', from: 'c2', square: 'c2',
    group: 'Projects', tag: 'Minigolf', conf: 0.90,
    title: '3D minigolf',
    meta: 'Built for CS 174A, computer graphics at UCLA',
    stack: 'JavaScript',
    body: [
      'A 3D minigolf simulator with shadow rendering, several courses, and an AI hint that works out the best angle for your shot.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/MiniGolf_CS174A' }],
  },
  {
    id: 'yber',
    type: 'pawn', from: 'd2', square: 'd2',
    group: 'Projects', tag: 'YBER', conf: 0.90,
    title: 'YBER',
    meta: 'Boat rentals and marina life in one app',
    stack: 'JavaScript, Node.js, Playwright',
    body: [
      'A marina and boat rental platform prototype I am building with friends. Listings work the way car-sharing apps do, on a Node.js backend with a Playwright test suite.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/yber' }],
  },

  {
    id: 'delta-sigma-pi',
    type: 'pawn', from: 'f2', square: 'f2',
    group: 'Leadership and ventures', tag: 'Delta Sigma Pi', conf: 0.93,
    title: 'Delta Sigma Pi',
    meta: 'Senior Vice President',
    when: 'Sep 2025 to present',
    where: 'Los Angeles, California',
    note: 'International business fraternity',
    bullets: [
      'Rebuilt a 4-stage recruitment funnel for 300+ applicants, lifting offer-to-acceptance conversion 85% to 100%.',
      'Launched a 12-week professional development track for 30+ members, placing 18 into finance and tech roles.',
    ],
  },
  {
    id: 'agency',
    type: 'pawn', from: 'g2', square: 'g2',
    group: 'Leadership and ventures', tag: 'Content agency', conf: 0.91,
    title: 'Social media agency',
    meta: 'Founder',
    when: 'Nov 2022 to Aug 2023',
    bullets: [
      'Founded and scaled a content agency to 250K+ followers, earning over $65K from campaigns and partnerships.',
      'Brokered partnerships with creator accounts totalling 20M+ followers and ran music campaigns for artist clients.',
    ],
  },

  {
    id: 'contact',
    type: 'pawn', from: 'h2', square: 'h2',
    group: 'Contact', tag: 'Contact', conf: 0.98,
    title: 'Get in touch',
    body: ['Email is the fastest way to reach me.'],
    links: [
      { label: 'vladplyu@gmail.com', href: 'mailto:vladplyu@gmail.com' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vladplyushchenko/' },
      { label: 'GitHub', href: 'https://github.com/vladapl21' },
    ],
  },
];

// The opening played when the page loads: the Italian Game.
// White moves name a piece by id; Black moves name the square it starts on.
export const opening = [
  { id: 'education', to: 'e4' },
  { black: 'e7', to: 'e5' },
  { id: 'qosmosys', to: 'f3', hop: true },
  { black: 'b8', to: 'c6', hop: true },
  { id: 'anavue', to: 'c4' },
];
