const localSecrets = window.CineVaultSecrets || {};

window.CineVaultConfig = {
  API_KEY: localSecrets.API_KEY || '',
  TMDB_READ_TOKEN: localSecrets.TMDB_READ_TOKEN || '',
  BASE_URL: 'https://api.themoviedb.org/3',
  HF_API_TOKEN: localSecrets.HF_API_TOKEN || '',
  HF_MODEL: 'katanemo/Arch-Router-1.5B',
  HF_CHAT_URL: 'https://router.huggingface.co/hf-inference/models/katanemo/Arch-Router-1.5B/v1/chat/completions',
  AI_SYSTEM_PROMPT:
    'You are CineVault\'s AI movie guide. When recommending movies, respond in a warm, enthusiastic tone. Always include specific movie titles in **bold** (like **The Dark Knight**). Give 3-5 recommendations with a brief reason for each. Keep responses concise and conversational. If asked for genres, moods, or similar films, give tailored recs. End with a question to refine further.',

  CURATED_CATEGORIES: [
    { title: 'Trending Blockbusters', pill: 'Hot', ids: ['tt15239678', 'tt15398776', 'tt1630029', 'tt1745960', 'tt1877830', 'tt10872600'] },
    { title: 'Sci-Fi & Space', pill: 'Sci-Fi', ids: ['tt0816692', 'tt1375666', 'tt0133093', 'tt1856101', 'tt2543164', 'tt1454468'] },
    { title: 'Action Universe', pill: 'Action', ids: ['tt0468569', 'tt1392190', 'tt2911666', 'tt0172495', 'tt0095016', 'tt4154796'] },
    { title: 'Magic & Fantasy', pill: 'Fantasy', ids: ['tt0120737', 'tt0241527', 'tt0457430', 'tt0093779', 'tt0325980', 'tt0113277'] },
    { title: 'Animated Hits', pill: 'Family', ids: ['tt4633694', 'tt0114709', 'tt0110357', 'tt2380307', 'tt0126029', 'tt0245429'] },
    { title: 'Thrills & Chills', pill: 'Horror', ids: ['tt5052448', 'tt0081505', 'tt0078748', 'tt7784604', 'tt0083944', 'tt6644200'] },
  ],

  LATEST_TRAILERS: [
    { id: 'mock-mi8', title: 'Mission: Impossible - The Final Reckoning', release_date: '2025', yt: 'NOhDyUmT9z0', poster_path: 'https://m.media-amazon.com/images/M/MV5BMzcwYWFkNmYtZjBlNC00OGNmLWExNTEtNTI0YjFjOWJhM2I0XkEyXkFqcGc@._V1_SX300.jpg', overview: 'Our lives are the sum of our choices. Tom Cruise is Ethan Hunt in the final chapter.', genres: ['Action', 'Thriller'], rated: 'PG-13', director: 'Christopher McQuarrie', actors: 'Tom Cruise, Hayley Atwell, Ving Rhames', imdbRating: 'N/A', fullDataLoaded: true, isHardcoded: true },
    { id: 'mock-cap', title: 'Captain America: Brave New World', release_date: '2025', yt: '1pHDWnXmK7Y', poster_path: 'https://m.media-amazon.com/images/M/MV5BNGVjZWM2NGEtOWRhYi00ODQwLTlkOTktOGQ1NWNmNDYxN2UyXkEyXkFqcGc@._V1_SX300.jpg', overview: 'Sam Wilson steps up as Captain America in a new global incident.', genres: ['Action', 'Sci-Fi'], rated: 'PG-13', director: 'Julius Onah', actors: 'Anthony Mackie, Harrison Ford', imdbRating: 'N/A', fullDataLoaded: true, isHardcoded: true },
    { id: 'mock-superman', title: 'Superman', release_date: '2025', yt: 'Ox8ZLF6cGM0', poster_path: 'https://m.media-amazon.com/images/M/MV5BYzA2NTY4NTUtNWJlMS00MzgyLWE4ZmMtZGJkNDU2YzQ4ZTkyXkEyXkFqcGc@._V1_SX300.jpg', overview: "Clark Kent's journey to reconcile his Kryptonian heritage with his life in Smallville.", genres: ['Action', 'Fantasy'], rated: 'PG-13', director: 'James Gunn', actors: 'David Corenswet, Rachel Brosnahan', imdbRating: 'N/A', fullDataLoaded: true, isHardcoded: true },
    { id: 'mock-thunder', title: 'Thunderbolts*', release_date: '2025', yt: '-sAOWhvheK8', poster_path: 'https://m.media-amazon.com/images/M/MV5BNGFmNGEzMDctOTdlZC00NWY2LTkzMWMtZmZiNjFmMGEwMjZmXkEyXkFqcGc@._V1_SX300.jpg', overview: 'A group of supervillains are recruited for government black ops missions.', genres: ['Action', 'Crime'], rated: 'PG-13', director: 'Jake Schreier', actors: 'Florence Pugh, Harrison Ford', imdbRating: 'N/A', fullDataLoaded: true, isHardcoded: true },
    { id: 'mock-minecraft', title: 'A Minecraft Movie', release_date: '2025', yt: '8B1EtVPBSMw', poster_path: 'https://m.media-amazon.com/images/M/MV5BNDIzMjNmMzUtNjBmMi00MmJkLTkwODktOGMzMzhiZWVjYjRlXkEyXkFqcGc@._V1_SX300.jpg', overview: 'Four misfits are pulled into the Overworld: a cubic wonderland that thrives on imagination.', genres: ['Adventure', 'Family'], rated: 'PG', director: 'Jared Hess', actors: 'Jason Momoa, Jack Black', imdbRating: 'N/A', fullDataLoaded: true, isHardcoded: true },
  ],

  MOOD_FILTERS: [
    { label: '😂 Feel-Good', genre: 'Comedy' },
    { label: '🧠 Mind-Bending', genre: 'Sci-Fi' },
    { label: '😰 Edge of Seat', genre: 'Thriller' },
    { label: '😢 Emotional', genre: 'Drama' },
    { label: '🌟 Inspiring', genre: 'Biography' },
    { label: '👻 Scary Night', genre: 'Horror' },
    { label: '🚀 Epic Adventure', genre: 'Adventure' },
    { label: '❤️ Date Night', genre: 'Romance' },
  ],

  BINGO_CELLS: [
    { icon: '🎭', text: 'Watch a drama' },
    { icon: '🌍', text: 'Foreign film' },
    { icon: '👴', text: 'Film before 1980' },
    { icon: '🏆', text: 'Oscar Best Picture' },
    { icon: '🚀', text: 'Sci-Fi movie' },
    { icon: '😂', text: 'A comedy' },
    { icon: '👻', text: 'Horror film' },
    { icon: '📚', text: 'Based on a book' },
    { icon: '🎬', text: 'Watch a sequel' },
    { icon: '🌟', text: 'Director debut' },
    { icon: '⭐', text: 'FREE SPACE', isFree: true },
    { icon: '🎶', text: 'Musical' },
    { icon: '🦸', text: 'Superhero movie' },
    { icon: '🌙', text: 'Watch after 11pm' },
    { icon: '👨‍👩‍👧', text: 'Watch with family' },
    { icon: '🏅', text: 'IMDb Top 250' },
    { icon: '🎃', text: 'Animated film' },
    { icon: '🌎', text: 'Set in another era' },
    { icon: '🔍', text: 'Mystery film' },
    { icon: '💥', text: 'Action blockbuster' },
    { icon: '🌿', text: 'Nature/wildlife' },
    { icon: '🔮', text: 'Fantasy world' },
    { icon: '💔', text: 'Sad ending' },
    { icon: '📺', text: 'Based on TV show' },
    { icon: '🎥', text: 'Black & white film' },
  ],

  GLOW_PALETTE: [
    'rgba(224,60,60,0.18)', 'rgba(60,140,224,0.18)', 'rgba(230,173,40,0.18)',
    'rgba(102,204,51,0.18)', 'rgba(153,51,204,0.18)', 'rgba(255,102,0,0.18)',
  ],
};
