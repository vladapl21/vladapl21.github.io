// Everything the site says lives here. Edit this file to change the content;
// the board, the side panel and the plain page all read from it.
//
// Each entry sits on one chess piece. About half the pieces carry a section, spread
// over both colours; the rest are just pieces.
//   side / from : which piece, named by colour and the square it starts on
//                 (e.g. white g1 is the king's knight)
//   tag / conf  : the detection label drawn over the piece
//   teaser      : the line shown in the pop-up (falls back to `meta`)
//   media       : screenshots (and one clip) shown in the section; click to enlarge
//   group       : heading it sits under in the index and on the plain page

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
    side: 'white', from: 'e1',
    group: 'About', tag: 'About', conf: 0.99,
    title: 'About me',
    teaser: 'Who I am',
    photo: { src: 'img/vlad.jpg', alt: 'Vlad Plyushchenko', tag: 'vlad', conf: 0.97 },
    body: [
      'I study computer science at UCLA with an economics concentration, and I graduate in June 2028. Before Los Angeles I was at Harrow School in London.',
      'Most of my work so far has been product management close to the engineering: pointing analysis for a 450,000 km laser downlink at Qosmosys, and growth at a VC-backed soccer betting app.',
      'I play blitz chess, and the position on this board is the Italian Game, my opening with White. Away from the board it is poker, Formula 1, skiing, darts and eggs Benedict. I speak English and Russian.',
    ],
  },
  {
    id: 'education',
    side: 'white', from: 'e2',
    group: 'About', tag: 'UCLA', conf: 0.98,
    title: 'Education',
    teaser: 'UCLA, and Harrow before it',
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
    side: 'white', from: 'g1',
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
    side: 'white', from: 'f1',
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
    id: 'integem',
    side: 'white', from: 'c1',
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
    side: 'white', from: 'h1',
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
    side: 'black', from: 'd8',
    group: 'Projects', tag: 'Opening Playbook', conf: 0.99,
    title: 'The Opening Playbook',
    teaser: 'A chess opening course built from your own games',
    meta: 'A chess opening course built from your own games, with every move in plain words',
    stack: 'JavaScript, Python, NumPy, python-chess, Stockfish, Maia, WebAssembly, Supabase, Playwright',
    body: [
      'The app reads a player’s chess.com or Lichess games, works out which openings they play and where they leave the book, and turns that into a course. Units come in the order their games need them. Each line is learned by playing it, drilled from memory, then practised against an opponent who answers the way club players do.',
      'It began as my own course, written by hand from 149 of my blitz games. The same thing is now built for anyone who connects an account.',
    ],
    media: [
      { type: 'video', src: 'img/projects/playbook-demo.mp4', poster: 'img/projects/playbook-demo.webp', w: 960, h: 480, alt: 'Stepping through a lesson: each move is played on the board and explained beside it', caption: 'Stepping through a lesson. Every move is explained in words, with the opening’s real name above it.' },
      { src: 'img/projects/playbook-lesson.webp', w: 1400, h: 875, alt: 'A lesson on the Fried Liver Attack at the knight sacrifice, with the key move marked on the board', caption: 'A lesson at its key move' },
      { src: 'img/projects/playbook-course.webp', w: 1400, h: 941, alt: 'The Course page, showing the current unit and the path of units', caption: 'The course, ordered by your games' },
      { src: 'img/projects/playbook-sandbox.webp', w: 1400, h: 1032, alt: 'A Sandbox game report with the engine’s best moves listed', caption: 'A practice game and its report' },
      { src: 'img/projects/playbook-engine.webp', w: 1400, h: 1006, alt: 'The explore board with the engine’s arrows and its moves described in words', caption: 'Stockfish in the browser, in words' },
      { src: 'img/projects/playbook-findings.webp', w: 1280, h: 1298, alt: 'A summary of what a player’s games say: rating, record, openings and where they leave the book', caption: 'What a new player’s games say' },
      { src: 'img/projects/playbook-phones.webp', w: 1400, h: 984, alt: 'Three phone screens of the app: chapters, a lesson and an at-a-glance grid', caption: 'On a phone' },
    ],
    bullets: [
      'Two repertoire books, eight chapters for White and nine for Black, tied together by a 17-unit course',
      'Every move checked with Stockfish 17.1, and every opponent reply weighted by how often club players choose it, from the Maia 1300 and 1500 networks',
      'Maia runs through my own NumPy implementation of the Leela Chess Zero forward pass, so the build needs no engine binary, TensorFlow or GPU',
      'Stockfish runs in the browser as WebAssembly, describes its best moves in words and plays on when a line ends',
      'Reviews your three newest games, turns missed tactics into puzzles and closes each month with a recap',
      'One HTML file with no framework, an SVG board with its own piece set, and 19 browser test suites',
    ],
    demo: { label: 'Try the app here', src: 'https://vladapl21.github.io/chess-opening-playbook/' },
    links: [
      { label: 'Open the app in a new tab', href: 'https://vladapl21.github.io/chess-opening-playbook/' },
      { label: 'Source on GitHub', href: 'https://github.com/vladapl21/chess-opening-playbook' },
    ],
  },
  {
    id: 'anavue',
    side: 'black', from: 'b8',
    group: 'Projects', tag: 'Anavue', conf: 0.96,
    title: 'Anavue',
    meta: 'Store analytics for high-ticket retail',
    when: 'Jan 2025 to present',
    note: 'VC-backed',
    stack: 'Python, OpenCV, React, SQL',
    body: [
      'Software that lets the manager of a shop like a jewellery boutique see how customers move through the store and where they stop. The gold boxes drawn over the pieces on this board are a nod to it.',
    ],
    bullets: [
      'Extended open-source object detection into a live-feed overlay, tracking customer paths through retail stores.',
      'Interviewed 10+ retail managers to find unmet needs, scoping dwell-time heatmaps into a 10-metric dashboard.',
    ],
    media: [
      { src: 'img/projects/anavue-dashboard.webp', w: 1400, h: 766, wide: true, alt: 'The Anavue dashboard prototype: customer count, average time in store, revenue and alerts above sales charts', caption: 'The dashboard prototype' },
      { src: 'img/projects/anavue-views.webp', w: 1400, h: 786, alt: 'The dashboard’s camera page: a store heatmap, a live video view with tracked people, and dwell time', caption: 'Heatmap and live tracking views' },
      { src: 'img/projects/anavue-dwell.webp', w: 1100, h: 1118, alt: 'A camera view of a shop floor with a rectangle drawn on it and the dwell time for that area', caption: 'Dwell time for an area drawn on the camera view' },
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/anavue' }],
  },
  {
    id: 'odds',
    side: 'black', from: 'e7',
    group: 'Projects', tag: 'Odds calibration', conf: 0.92,
    title: 'Odds calibration',
    meta: 'Are bookmaker odds efficiently priced?',
    stack: 'Python',
    body: [
      'I took twenty years of football closing lines, tested how well the market’s implied probabilities are calibrated, trained models to compete with them, and simulated whether any disagreement survives the bookmaker’s margin under Kelly staking.',
      'On 7,600 Premier League matches from 2005 to 2024, the market’s probabilities are calibrated to within 0.55 percentage points on average. Neither model beats them. The better one recovers 54% of the bookmaker’s margin, which is real predictive signal and still a losing strategy.',
    ],
    bullets: [
      'An Elo-logistic baseline against gradient boosting, on features built with no lookahead',
      'Backtested walk-forward by season, never with random splits',
      'Fractional Kelly staking with an edge threshold',
      '12 tests, including a synthetic league with known true probabilities and a tamper test for lookahead',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/odds-calibration' }],
  },
  {
    id: 'point-ahead',
    side: 'black', from: 'a8',
    group: 'Projects', tag: 'Lunar point-ahead', conf: 0.91,
    title: 'Lunar point-ahead model',
    meta: 'Aiming a laser at where the receiver will be',
    stack: 'Python',
    body: [
      'A model of the point-ahead mechanism for a satellite at the L2 Lagrange point sending a 1550 nm laser to an antenna on Earth. Light takes over a second to cover the distance, so the beam has to lead its target.',
      'I built it from scratch to catch the error-prone segments of the derivation, and tested it for jitter and wobble faults.',
    ],
    media: [
      { src: 'img/projects/point-ahead-model.webp', w: 1400, h: 605, wide: true, alt: 'Two plots: the chief ray traced through two tilted mirrors, and a Monte Carlo scatter of where the beam lands on the ground', caption: 'The ray traced through both mirrors, and a Monte Carlo of where the beam lands' },
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/Lunar_Point_Ahead_Meachanism' }],
  },
  {
    id: 'minigolf',
    side: 'black', from: 'h8',
    group: 'Projects', tag: 'Minigolf', conf: 0.90,
    title: '3D minigolf',
    meta: 'Built for CS 174A, computer graphics at UCLA',
    stack: 'JavaScript, Three.js',
    body: [
      'A 3D minigolf simulator with shadow rendering, several courses, and an AI hint that works out the best angle for your shot.',
    ],
    links: [{ label: 'Source on GitHub', href: 'https://github.com/vladapl21/MiniGolf_CS174A' }],
  },
  {
    id: 'yber',
    side: 'black', from: 'f8',
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
    side: 'white', from: 'g2',
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
    side: 'black', from: 'b7',
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
    side: 'black', from: 'g7',
    group: 'Contact', tag: 'Contact', conf: 0.98,
    title: 'Get in touch',
    teaser: 'Email, LinkedIn, GitHub',
    body: ['Email is the fastest way to reach me.'],
    links: [
      { label: 'vladplyu@gmail.com', href: 'mailto:vladplyu@gmail.com' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vladplyushchenko/' },
      { label: 'GitHub', href: 'https://github.com/vladapl21' },
    ],
  },
];

// The opening played when the page loads: the Italian Game.
// Each move names the square a piece starts on and where it goes.
export const opening = [
  { from: 'e2', to: 'e4' },
  { from: 'e7', to: 'e5' },
  { from: 'g1', to: 'f3', hop: true },
  { from: 'b8', to: 'c6', hop: true },
  { from: 'f1', to: 'c4' },
];
