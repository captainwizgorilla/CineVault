const { useState, useEffect, useRef, useCallback, useMemo } = React;
const {
  API_KEY,
  BASE_URL,
  HF_API_TOKEN,
  HF_MODEL,
  HF_CHAT_URL,
  CURATED_CATEGORIES,
  LATEST_TRAILERS,
  MOOD_FILTERS,
} = window.CineVaultConfig;
const { omdbJson, getGlowColor } = window.CineVaultApi;
const {
  StarIcon,
  HeartIcon,
  BookmarkIcon,
  SearchIcon,
  FilmIcon,
  PlayIcon,
  ExternalIcon,
  EmptyBoxIcon,
  ListIcon,
  ShareIcon,
} = window.CineVaultIcons;
const {
  useListManager,
  useHistory,
  useRatings,
  useCustomLists,
  useStreak,
} = window.CineVaultHooks;
const {
  SkeletonCard,
  MovieCard,
  TrailerCard,
  AIPanel,
  BingoPanel,
  TierListPanel,
  StreakPanel,
  CustomListsPanel,
  AddToListModal,
} = window.CineVaultComponents;

function App() {
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');
const [liveResults, setLiveResults] = useState([]);
const [showDropdown, setShowDropdown] = useState(false);
const [searchMovies, setSearchMovies] = useState([]);
const [categoryData, setCategoryData] = useState([]);
const [searchLoading, setSearchLoading] = useState(false);
const [catLoading, setCatLoading] = useState(true);
const [selectedMovie, setSelectedMovie] = useState(null);
const [modalTab, setModalTab] = useState('overview');
const [similarMovies, setSimilarMovies] = useState([]);
const [directorMovies, setDirectorMovies] = useState([]);
const [activePanel, setActivePanel] = useState(null);
const [scrolled, setScrolled] = useState(false);
const [toasts, setToasts] = useState([]);
const [showAI, setShowAI] = useState(false);
const [activeMood, setActiveMood] = useState(null);
const [sortBy, setSortBy] = useState('default');
const [yearFrom, setYearFrom] = useState('');
const [yearTo, setYearTo] = useState('');
const [showKbd, setShowKbd] = useState(false);
const [addToListMovie, setAddToListMovie] = useState(null);
const [viewingList, setViewingList] = useState(null);
const [theme, setTheme] = useState(() => localStorage.getItem('cv_theme') || 'dark');
const [omdbAuthError, setOmdbAuthError] = useState(false);

// NEW: State for AI Reviews Summarizer
const [reviewSummary, setReviewSummary] = useState(null);
const [reviewLoading, setReviewLoading] = useState(false);

const searchRef = useRef(null);
const heroSearchRef = useRef(null);
const debounceRef = useRef(null);

const favManager = useListManager('cv_favorites');
const watchManager = useListManager('cv_watchlist');
const historyManager = useHistory();
const ratingManager = useRatings();
const customLists = useCustomLists();
const streakManager = useStreak();

const addToast = useCallback((msg) => {
  const id = Date.now();
  setToasts(prev => [...prev, {id, msg}]);
  setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)), 3000);
}, []);

useEffect(() => {
  const onOmdbAuth = () => setOmdbAuthError(true);
  window.addEventListener('omdb-auth-fail', onOmdbAuth);
  return () => window.removeEventListener('omdb-auth-fail', onOmdbAuth);
}, []);

useEffect(() => {
  document.body.className = theme === 'light' ? 'theme-light' : theme === 'amoled' ? 'theme-amoled' : '';
  localStorage.setItem('cv_theme', theme);
}, [theme]);

useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 200);
  window.addEventListener('scroll', onScroll);
  return () => window.removeEventListener('scroll', onScroll);
}, []);

useEffect(() => {
  const handler = (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      (scrolled ? searchRef.current : heroSearchRef.current)?.focus();
    }
    if (e.key === 'Escape') { setSelectedMovie(null); setShowAI(false); setActivePanel(null); setShowDropdown(false); }
  };
  window.addEventListener('keydown', handler);
  setShowKbd(true); setTimeout(()=>setShowKbd(false), 3000);
  return () => window.removeEventListener('keydown', handler);
}, [scrolled]);

useEffect(() => {
  clearTimeout(debounceRef.current);
  if (!query.trim()) { setShowDropdown(false); setLiveResults([]); return; }
  const ac = new AbortController();
  debounceRef.current = setTimeout(async () => {
    try {
      const data = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&type=movie`, { signal: ac.signal });
      if (data.Response==='True') { setLiveResults(data.Search.slice(0,5).map(m=>({id:m.imdbID,title:m.Title,release_date:m.Year,poster_path:m.Poster}))); setShowDropdown(true); }
    } catch(e) { if (e.name !== 'AbortError') {} }
  }, 280);
  return () => { clearTimeout(debounceRef.current); ac.abort(); };
}, [query]);

const executeSearch = () => { setShowDropdown(false); setDebouncedQuery(query.trim()); };

const handleSurprise = async () => {
  const allIds = CURATED_CATEGORIES.flatMap(c=>c.ids);
  const id = allIds[Math.floor(Math.random()*allIds.length)];
  try { const d = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&i=${id}`); if(d.Response==='True') handleCardClick({id:d.imdbID,title:d.Title,release_date:d.Year,poster_path:d.Poster}); } catch(e){}
};

useEffect(() => {
  if (!activeMood) return;
  const ac = new AbortController();
  const fetchMood = async () => {
    setSearchLoading(true);
    try {
      const data = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(activeMood)}&type=movie`, { signal: ac.signal });
      if (data.Response==='True') setSearchMovies(data.Search.map(m=>({id:m.imdbID,title:m.Title,release_date:m.Year,poster_path:m.Poster})));
      else setSearchMovies([]);
    } catch(e){} finally { if (!ac.signal.aborted) setSearchLoading(false); }
  };
  fetchMood();
  return () => ac.abort();
}, [activeMood]);

useEffect(() => {
  if (!debouncedQuery) { setSearchMovies([]); return; }
  setActiveMood(null);
  const ac = new AbortController();
  const fetch_ = async () => {
    setSearchLoading(true);
    try {
      const data = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(debouncedQuery)}&type=movie`, { signal: ac.signal });
      if (data.Response==='True') setSearchMovies(data.Search.map(m=>({id:m.imdbID,title:m.Title,release_date:m.Year,poster_path:m.Poster})));
      else setSearchMovies([]);
    } catch(e){} finally { if (!ac.signal.aborted) setSearchLoading(false); }
  };
  fetch_();
  return () => ac.abort();
}, [debouncedQuery]);

useEffect(() => {
  const init = async () => {
    setCatLoading(true);
    try {
      const results = await Promise.all(CURATED_CATEGORIES.map(async cat => {
        const movies = (await Promise.all(cat.ids.map(async id => {
          const d = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&i=${id}`);
          return d.Response==='True' ? {id:d.imdbID,title:d.Title,release_date:d.Year,poster_path:d.Poster,imdbRating:d.imdbRating} : null;
        }))).filter(Boolean);
        return {...cat, movies};
      }));
      setCategoryData(results.filter(c=>c.movies.length>0));
    } catch(e){} finally { setCatLoading(false); }
  };
  init();
}, []);

useEffect(() => {
  if (!selectedMovie || !selectedMovie.fullDataLoaded) return;
  setSimilarMovies([]); setDirectorMovies([]);
  const ac = new AbortController();
  const fetchSimilar = async () => {
    if (!selectedMovie.genres?.length) return;
    try {
      const genre = selectedMovie.genres[0];
      const d = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(genre)}&type=movie&y=${selectedMovie.release_date||''}`, { signal: ac.signal });
      if (d.Response==='True') setSimilarMovies(d.Search.filter(m=>m.imdbID!==selectedMovie.id).slice(0,8).map(m=>({id:m.imdbID,title:m.Title,release_date:m.Year,poster_path:m.Poster})));
    } catch(e){}
  };
  const fetchDirector = async () => {
    if (!selectedMovie.director || selectedMovie.director.includes(',')) return;
    const dirName = selectedMovie.director.split(',')[0].trim();
    try {
      const d = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&s=${encodeURIComponent(dirName)}&type=movie`, { signal: ac.signal });
      if (d.Response==='True') setDirectorMovies(d.Search.filter(m=>m.imdbID!==selectedMovie.id).slice(0,6).map(m=>({id:m.imdbID,title:m.Title,release_date:m.Year,poster_path:m.Poster})));
    } catch(e){}
  };
  Promise.all([fetchSimilar(), fetchDirector()]);
  return () => ac.abort();
}, [selectedMovie?.id, selectedMovie?.fullDataLoaded]);

// NEW: AI Review Summarizer Effect
useEffect(() => {
  if (modalTab === 'reviews' && selectedMovie && !reviewSummary && !reviewLoading) {
    setReviewLoading(true);
    const sysPrompt = "You are an expert movie critic analyst. Provide a balanced, concise 3-4 sentence summary comparing critical reception versus general audience sentiment for the given movie. Format it nicely, highlighting 'Critics:' and 'Audience:'.";

    fetch(HF_CHAT_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json', Authorization:`Bearer ${HF_API_TOKEN}`},
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: `Summarize the critic vs audience sentiment for the movie: ${selectedMovie.title}` }
        ],
        max_tokens: 350,
        temperature: 0.6
      })
    }).then(res => res.json()).then(data => {
      let reply = data?.choices?.[0]?.message?.content;
      setReviewSummary(reply || "No summary available right now.");
      setReviewLoading(false);
    }).catch(() => {
      setReviewSummary("Failed to analyze reviews. Please try again later.");
      setReviewLoading(false);
    });
  }
}, [modalTab, selectedMovie, reviewSummary, reviewLoading]);

const handleCardClick = useCallback(async (movie) => {
  setShowDropdown(false); 
  setModalTab('overview');
  setReviewSummary(null); // Reset AI summary when opening a new movie
  setSelectedMovie(movie);
  historyManager.add(movie);
  streakManager.logToday();
  if (movie.isHardcoded || movie.fullDataLoaded) return;
  try {
    const data = await omdbJson(`${BASE_URL}?apikey=${API_KEY}&i=${movie.id}&plot=short`);
    if (data.Response==='True') {
      let rtScore=null, metaScore=null;
      if (data.Ratings) { const rt=data.Ratings.find(r=>r.Source==="Rotten Tomatoes"); if(rt) rtScore=rt.Value; const meta=data.Ratings.find(r=>r.Source==="Metacritic"); if(meta) metaScore=meta.Value; }
      setSelectedMovie(prev => prev&&prev.id===data.imdbID ? {
        ...prev, fullDataLoaded:true,
        overview: data.Plot!=='N/A'?data.Plot:'No description available.',
        genres: data.Genre!=='N/A'?data.Genre.split(', '):[],
        runtime: data.Runtime!=='N/A'?data.Runtime:null,
        rated: data.Rated!=='N/A'?data.Rated:null,
        director: data.Director!=='N/A'?data.Director:null,
        actors: data.Actors!=='N/A'?data.Actors:null,
        imdbRating: data.imdbRating!=='N/A'?data.imdbRating:null,
        boxOffice: data.BoxOffice!=='N/A'?data.BoxOffice:null,
        awards: data.Awards!=='N/A'?data.Awards:null,
        language: data.Language!=='N/A'?data.Language:null,
        country: data.Country!=='N/A'?data.Country:null,
        rtRating: rtScore, metaRating: metaScore,
        yt: movie.yt
      } : prev);
      const fullUrl = `${BASE_URL}?apikey=${API_KEY}&i=${movie.id}&plot=full`;
      omdbJson(fullUrl).then(full => {
        if (full.Response!=='True'||!full.Plot||full.Plot==='N/A') return;
        setSelectedMovie(prev => prev&&prev.id===full.imdbID ? {...prev, overview: full.Plot} : prev);
      }).catch(()=>{});
    } else {
      setSelectedMovie(prev => prev && prev.id === movie.id ? {
        ...prev, fullDataLoaded: true,
        overview: data.Error || 'Could not load details from OMDb.',
        director: null, actors: null, imdbRating: null, rtRating: null, metaRating: null
      } : prev);
    }
  } catch(e){}
}, [historyManager, streakManager]);

const filteredMovies = useMemo(() => {
  let movies = [...searchMovies];
  if (yearFrom) movies = movies.filter(m => parseInt(m.release_date) >= parseInt(yearFrom));
  if (yearTo) movies = movies.filter(m => parseInt(m.release_date) <= parseInt(yearTo));
  if (sortBy === 'year_desc') movies.sort((a,b) => parseInt(b.release_date||0)-parseInt(a.release_date||0));
  if (sortBy === 'year_asc') movies.sort((a,b) => parseInt(a.release_date||0)-parseInt(b.release_date||0));
  if (sortBy === 'title') movies.sort((a,b) => a.title.localeCompare(b.title));
  return movies;
}, [searchMovies, sortBy, yearFrom, yearTo]);

const isSearching = debouncedQuery.length > 0 || activeMood;

const shareWatchlist = () => {
  const titles = watchManager.list.map(m=>m.title).join(', ');
  const text = `My CineVault Watchlist: ${titles}`;
  if (navigator.share) navigator.share({title:'My Watchlist', text});
  else { navigator.clipboard.writeText(text); addToast('Watchlist copied to clipboard!'); }
};

const ReadMoreText = ({text}) => {
  const [exp, setExp] = useState(false);
  if (!text) return null;
  const isLong = text.length > 220;
  return <p className="modal__overview">{isLong&&!exp?text.slice(0,220)+'...':text}{isLong&&<button className="read-more-btn" onClick={()=>setExp(!exp)}>{exp?'Read Less':'Read More'}</button>}</p>;
};

return (
  <>
    <div className="toast-container">{toasts.map(t=><div key={t.id} className="toast">✅ {t.msg}</div>)}</div>
    <div className={`kbd-hint${showKbd?' visible':''}`}><kbd>/</kbd> to search &nbsp; <kbd>Esc</kbd> to close</div>

    {omdbAuthError && (
      <div style={{position:'sticky',top:0,zIndex:200,background:'linear-gradient(90deg,rgba(180,40,40,0.95),rgba(120,30,30,0.95))',borderBottom:'1px solid rgba(255,255,255,0.12)',padding:'10px 16px',fontSize:13,color:'#fff',textAlign:'center',lineHeight:1.5}}>
        <strong>OMDb API key rejected (401).</strong> Movie data will not load until you set a valid key. Get a free key at{' '}
        <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer" style={{color:'#ffd4a8',textDecoration:'underline'}}>omdbapi.com/apikey.aspx</a>
        , then replace <code style={{background:'rgba(0,0,0,0.25)',padding:'2px 6px',borderRadius:4}}>API_KEY</code> in <code style={{background:'rgba(0,0,0,0.25)',padding:'2px 6px',borderRadius:4}}>constants.js</code>.
      </div>
    )}

    {/* NAVBAR */}
    <nav className="navbar">
      <div className="navbar__logo" onClick={()=>{setQuery('');setDebouncedQuery('');setShowDropdown(false);setActiveMood(null);window.scrollTo(0,0);}}>Cine<span>Vault</span></div>
      <div className={`navbar__center${scrolled&&!isSearching?' visible':''}`}>
        <div className="nav-search">
          <SearchIcon/>
          <input ref={searchRef} type="text" placeholder="Search..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&executeSearch()} onBlur={()=>setTimeout(()=>setShowDropdown(false),200)}/>
          {showDropdown&&liveResults.length>0&&scrolled&&(
            <div className="live-dropdown">{liveResults.map(m=>(
              <div className="live-item" key={m.id} onClick={()=>handleCardClick(m)}>
                {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path}/>:<div style={{width:30,height:44,background:'#111',borderRadius:4}}/>}
                <div><p className="live-item__title">{m.title}</p><p className="live-item__year">{m.release_date}</p></div>
              </div>
            ))}</div>
          )}
        </div>
      </div>
      <div className="navbar__actions">
        <button className="btn-nav btn-nav--ai" onClick={()=>setShowAI(true)}>✨ <span className="desktop-only">AI Guide</span></button>
        <button className="btn-nav btn-nav--lists" onClick={()=>setActivePanel('lists')}><ListIcon size={13}/><span className="desktop-only">Lists</span></button>
        <button className="btn-nav btn-nav--watch" onClick={()=>setActivePanel('watch')}><BookmarkIcon filled={watchManager.list.length>0} size={13}/><span className="desktop-only">Watchlist</span>{watchManager.list.length>0&&<span className="badge">{watchManager.list.length}</span>}</button>
        <button className="btn-nav btn-nav--fav" onClick={()=>setActivePanel('fav')}><HeartIcon filled={favManager.list.length>0} size={13}/><span className="desktop-only">Favorites</span></button>
        <button className="btn-nav" onClick={()=>setActivePanel('streak')} title="Streak">🔥</button>
        <button className="btn-nav" onClick={()=>setActivePanel('bingo')} title="Movie Bingo">🎯</button>
        <button className="btn-nav" onClick={()=>setActivePanel('tier')} title="Tier List">🏆</button>
      </div>
    </nav>

    {/* HERO */}
    <header className={`hero${isSearching?' collapsed':''}`}>
      {!isSearching && <><h1 className="hero__title">Welcome.</h1><p className="hero__sub">Millions of movies to discover. Explore now.</p></>}
      <div className="hero__search-container">
        <div className="search-input-wrapper">
          <input ref={heroSearchRef} className="hero__search-input" type="text" placeholder="Search for a movie, franchise, or character..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&executeSearch()} onBlur={()=>setTimeout(()=>setShowDropdown(false),200)}/>
          <button className="hero__search-btn" onClick={executeSearch}>Search</button>
          {showDropdown&&liveResults.length>0&&!scrolled&&(
            <div className="live-dropdown">{liveResults.map(m=>(
              <div className="live-item" key={m.id} onClick={()=>handleCardClick(m)}>
                {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path}/>:<div style={{width:30,height:44,background:'#111',borderRadius:4}}/>}
                <div><p className="live-item__title">{m.title}</p><p className="live-item__year">{m.release_date}</p></div>
              </div>
            ))}</div>
          )}
        </div>
        <button className="btn-surprise" title="Surprise Me!" onClick={handleSurprise}>🎲</button>
      </div>
    </header>

    {/* MOOD FILTERS */}
    {!isSearching && (
      <div className="filters-bar">
        {MOOD_FILTERS.map((m,i) => (
          <button key={i} className={`filter-chip mood${activeMood===m.genre?' active':''}`} onClick={()=>setActiveMood(activeMood===m.genre?null:m.genre)}>{m.label}</button>
        ))}
      </div>
    )}

    {/* SEARCH RESULTS */}
    {isSearching && (
      <section className="section">
        <div className="section__header">
          <h2 className="section__title">{activeMood ? `${activeMood} Movies` : 'Search Results'}</h2>
          {!activeMood && <span className="section__sub">{filteredMovies.length} results</span>}
        </div>
        {!activeMood && (
          <div className="search-filter-row">
            <select className="sort-select" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
              <option value="default">Default Order</option>
              <option value="year_desc">Newest First</option>
              <option value="year_asc">Oldest First</option>
              <option value="title">A–Z</option>
            </select>
            <div className="year-filter">
              <input type="number" placeholder="From" value={yearFrom} onChange={e=>setYearFrom(e.target.value)} min="1900" max="2025"/>
              <span>—</span>
              <input type="number" placeholder="To" value={yearTo} onChange={e=>setYearTo(e.target.value)} min="1900" max="2025"/>
            </div>
          </div>
        )}
        {searchLoading ? <div className="movie-grid">{Array.from({length:10}).map((_,i)=><SkeletonCard key={i}/>)}</div>
          : filteredMovies.length===0 ? <div className="panel-empty"><EmptyBoxIcon/><br/>No titles found</div>
          : <div className="movie-grid">{filteredMovies.map(m=><MovieCard key={m.id} movie={m} onClick={handleCardClick} favManager={favManager} watchManager={watchManager} ratingManager={ratingManager} addToast={addToast} onAddToList={setAddToListMovie}/>)}</div>}
      </section>
    )}

    {/* HOME */}
    {!isSearching && (<>
      {historyManager.history.length>0&&(
        <section className="section">
          <div className="section__header"><h2 className="section__title">Recently Viewed</h2><span className="section__pill">History</span></div>
          <div className="rec-scroll">{historyManager.history.map(m=><MovieCard key={m.id} movie={m} onClick={handleCardClick} favManager={favManager} watchManager={watchManager} ratingManager={ratingManager} addToast={addToast} onAddToList={setAddToListMovie}/>)}</div>
        </section>
      )}
      <section className="section">
        <div className="section__header"><h2 className="section__title">Latest Trailers</h2><span className="section__pill">Watch</span></div>
        <div className="rec-scroll">{LATEST_TRAILERS.map(m=><TrailerCard key={m.id} movie={m} favManager={favManager} watchManager={watchManager} addToast={addToast}/>)}</div>
      </section>
      {catLoading ? <section className="section"><div className="rec-scroll">{Array.from({length:6}).map((_,i)=><div key={i} style={{flex:'0 0 150px'}}><SkeletonCard/></div>)}</div></section>
        : categoryData.map((cat,idx)=>(
          <section className="section" key={idx}>
            <div className="section__header"><h2 className="section__title">{cat.title}</h2><span className="section__pill">{cat.pill}</span></div>
            <div className="rec-scroll">{cat.movies.map(m=><MovieCard key={m.id} movie={m} onClick={handleCardClick} favManager={favManager} watchManager={watchManager} ratingManager={ratingManager} addToast={addToast} onAddToList={setAddToListMovie}/>)}</div>
          </section>
        ))}
    </>)}

    {/* MOVIE MODAL */}
    {selectedMovie && (
      <div className="modal-overlay" style={{background:`radial-gradient(circle at center,${getGlowColor(selectedMovie.title)} 0%,rgba(0,0,0,0.85) 70%)`}} onClick={e=>{if(e.target===e.currentTarget)setSelectedMovie(null);}}>
        <div className="modal">
          <button className="modal__close" onClick={()=>setSelectedMovie(null)}>✕</button>
          <div className="modal__backdrop-placeholder"/>
          <div className="modal__body">
            {selectedMovie.poster_path&&selectedMovie.poster_path!=='N/A'
              ? <img className="modal__poster" src={selectedMovie.poster_path} alt={selectedMovie.title} onError={e=>e.target.style.display='none'}/>
              : <div className="modal__poster" style={{display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1e28'}}><FilmIcon size={32}/></div>}
            <div className="modal__info">
              <h2 className="modal__title">{selectedMovie.title}</h2>
              <div className="modal__chips">
                <span className="chip">{selectedMovie.release_date||'N/A'}</span>
                {selectedMovie.rated&&<span className={`chip${['R','TV-MA','NC-17'].includes(selectedMovie.rated)?' chip--red':''}`}>{selectedMovie.rated}</span>}
                {selectedMovie.runtime&&<span className="chip">{selectedMovie.runtime}</span>}
                {selectedMovie.language&&<span className="chip">{selectedMovie.language.split(',')[0]}</span>}
                {selectedMovie.genres&&selectedMovie.genres.map(g=><span key={g} className="chip">{g}</span>)}
              </div>
              {selectedMovie.awards&&selectedMovie.awards!=='N/A'&&<div className="awards-badge">🏆 {selectedMovie.awards}</div>}
              <div className="modal__tabs">
                {/* UPDATED MODAL TABS WITH 'REVIEWS' */}
                {['overview', 'reviews', 'similar', 'director'].map(t=><button key={t} className={`modal-tab${modalTab===t?' active':''}`} onClick={()=>setModalTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
              </div>

              {modalTab==='overview'&&(<>
                <div className="modal__ratings">
                  <div className="rating-item color-imdb"><StarIcon size={16}/> {selectedMovie.imdbRating||'—'} <span>IMDb</span></div>
                  {selectedMovie.rtRating&&<div className="rating-item color-rt">🍅 {selectedMovie.rtRating} <span>RT</span></div>}
                  {selectedMovie.metaRating&&<div className="rating-item color-meta">Ⓜ️ {selectedMovie.metaRating} <span>Meta</span></div>}
                  <div className="personal-rating">
                    <span style={{fontSize:'10px',color:'var(--text-muted)',marginRight:3}}>Rate:</span>
                    {[1,2,3,4,5].map(s=>(
                      <button key={s} className={`star-btn${ratingManager.get(selectedMovie.id)>=s?' active':''}`} onClick={()=>{ratingManager.rate(selectedMovie.id,s);addToast(`Rated ${s} Stars`);}}>
                        <StarIcon size={15}/>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="modal__meta-grid">
                  <div className="meta-label">Director</div><div className="meta-value">{selectedMovie.director||'...'}</div>
                  <div className="meta-label">Cast</div><div className="meta-value">{selectedMovie.actors||'...'}</div>
                  {selectedMovie.country&&<><div className="meta-label">Country</div><div className="meta-value">{selectedMovie.country}</div></>}
                  {selectedMovie.boxOffice&&<><div className="meta-label">Box Office</div><div className="meta-value meta-value--gold" style={{color:'var(--gold)'}}>{selectedMovie.boxOffice}</div></>}
                </div>
                <ReadMoreText text={selectedMovie.overview}/>
                <div className="modal__actions">
                  <button className="btn-action btn-action--primary" onClick={()=>watchManager.toggle(selectedMovie,addToast)}>
                    <BookmarkIcon filled={watchManager.check(selectedMovie.id)} size={16}/>
                    {watchManager.check(selectedMovie.id)?'On Watchlist':'Add to Watchlist'}
                  </button>
                  <button className="btn-action btn-action--secondary" onClick={()=>favManager.toggle(selectedMovie,addToast)}>
                    <HeartIcon filled={favManager.check(selectedMovie.id)} size={16}/>
                    {favManager.check(selectedMovie.id)?'Favorited':'Favorite'}
                  </button>
                  <button className="btn-action btn-action--secondary" onClick={()=>setAddToListMovie(selectedMovie)}>
                    <ListIcon size={14}/> Add to List
                  </button>
                  <button className="btn-action btn-action--purple" onClick={()=>{
                    if (selectedMovie.yt) window.open(`https://www.youtube.com/watch?v=${selectedMovie.yt}`,'_blank');
                    else window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedMovie.title+' official trailer')}`,'_blank');
                  }}><ExternalIcon size={14}/> Trailer</button>
                  <button className="share-btn" onClick={()=>{navigator.clipboard.writeText(`Check out ${selectedMovie.title} on CineVault!`);addToast('Link copied!');}}>
                    <ShareIcon/> Share
                  </button>
                </div>
              </>)}

              {/* NEW: REVIEWS TAB CONTENT */}
              {modalTab === 'reviews' && (
                <div>
                  <p style={{fontSize:12, color:'var(--text-muted)', marginBottom:12}}>AI Sentiment Analysis</p>
                  <div style={{background: 'rgba(155,93,229,0.08)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: 12, padding: '16px 20px'}}>
                    <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 14}}>
                      <div style={{background:'linear-gradient(135deg,#9b5de5,#3c8ce0)', borderRadius:6, width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12}}>✨</div>
                      <strong style={{color:'#c084fc', fontSize:14, letterSpacing: '0.5px'}}>Critic vs. Audience Consensus</strong>
                    </div>
                    {reviewLoading ? (
                      <div className="ai-typing" style={{padding: '10px 0'}}><span/><span/><span/></div>
                    ) : (
                      <div style={{fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap'}}>
                        {reviewSummary}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalTab==='similar'&&(
                <div>
                  <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>Movies similar to {selectedMovie.title}</p>
                  {similarMovies.length===0?<p style={{fontSize:13,color:'var(--text-muted)'}}>Loading suggestions...</p>:(
                    <div className="similar-grid">
                      {similarMovies.map(m=>(
                        <div className="similar-thumb" key={m.id} onClick={()=>handleCardClick(m)}>
                          {m.poster_path && m.poster_path !== 'N/A' ? (
                            <img 
                              src={m.poster_path} 
                              alt={m.title} 
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/90x135/1a1e28/4a4f5e?text=No+Image'; }}
                            />
                          ) : (
                            <div style={{width:90,height:135,background:'#1a1e28',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><FilmIcon size={20}/></div>
                          )}
                          <p title={m.title}>{m.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalTab==='director'&&(
                <div>
                  <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:12}}>More from {selectedMovie.director||'this director'}</p>
                  {directorMovies.length===0?<p style={{fontSize:13,color:'var(--text-muted)'}}>Loading filmography...</p>:(
                    <div className="similar-grid">
                      {directorMovies.map(m=>(
                        <div className="similar-thumb" key={m.id} onClick={()=>handleCardClick(m)}>
                          {m.poster_path && m.poster_path !== 'N/A' ? (
                            <img 
                              src={m.poster_path} 
                              alt={m.title} 
                              onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/90x135/1a1e28/4a4f5e?text=No+Image'; }}
                            />
                          ) : (
                            <div style={{width:90,height:135,background:'#1a1e28',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><FilmIcon size={20}/></div>
                          )}
                          <p title={m.title}>{m.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* PANELS */}
    {activePanel==='fav'&&(
      <>
        <div className="side-panel-overlay" onClick={()=>setActivePanel(null)}/>
        <aside className="side-panel">
          <div className="side-panel__header"><h3 className="side-panel__title">❤️ Favorites</h3><button className="side-panel__close" onClick={()=>setActivePanel(null)}>✕</button></div>
          <div className="side-panel__list">
            {favManager.list.length===0?<div className="panel-empty"><EmptyBoxIcon/><br/>No favorites yet.</div>:favManager.list.map(m=>(
              <div className="panel-item" key={m.id} onClick={()=>{handleCardClick(m);setActivePanel(null);}}>
                {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path} alt={m.title}/>:<div style={{width:44,height:66,background:'#1a1e28',borderRadius:5,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><FilmIcon size={14}/></div>}
                <div className="panel-item__info"><p className="panel-item__title">{m.title}</p><p className="panel-item__year">{m.release_date}</p></div>
                <button className="panel-item__remove" onClick={e=>{e.stopPropagation();favManager.toggle(m,addToast);}}>✕</button>
              </div>
            ))}
          </div>
          {favManager.list.length>0&&<div className="panel-stats"><div className="panel-stat"><div className="panel-stat__num">{favManager.list.length}</div><div className="panel-stat__label">Favorites</div></div><div className="panel-stat"><div className="panel-stat__num">{[...new Set(favManager.list.map(m=>m.release_date?.slice(0,3)+'0s'))].length}</div><div className="panel-stat__label">Decades</div></div></div>}
        </aside>
      </>
    )}

    {activePanel==='watch'&&(
      <>
        <div className="side-panel-overlay" onClick={()=>setActivePanel(null)}/>
        <aside className="side-panel">
          <div className="side-panel__header">
            <h3 className="side-panel__title">🔖 Watchlist</h3>
            <div style={{display:'flex',gap:6,alignItems:'center'}}>
              {watchManager.list.length>0&&<button className="share-btn" onClick={shareWatchlist}><ShareIcon/> Share</button>}
              <button className="side-panel__close" onClick={()=>setActivePanel(null)}>✕</button>
            </div>
          </div>
          <div className="side-panel__list">
            {watchManager.list.length===0?<div className="panel-empty"><EmptyBoxIcon/><br/>Your watchlist is empty.</div>:watchManager.list.map(m=>(
              <div className="panel-item" key={m.id} onClick={()=>{handleCardClick(m);setActivePanel(null);}}>
                {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path} alt={m.title}/>:<div style={{width:44,height:66,background:'#1a1e28',borderRadius:5,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><FilmIcon size={14}/></div>}
                <div className="panel-item__info"><p className="panel-item__title">{m.title}</p><p className="panel-item__year">{m.release_date}</p></div>
                <button className="panel-item__remove" onClick={e=>{e.stopPropagation();watchManager.toggle(m,addToast);}}>✕</button>
              </div>
            ))}
          </div>
          {watchManager.list.length>0&&<div className="panel-stats"><div className="panel-stat"><div className="panel-stat__num">{watchManager.list.length}</div><div className="panel-stat__label">To Watch</div></div><div className="panel-stat"><div className="panel-stat__num">{ratingManager.all?Object.keys(ratingManager.all).length:0}</div><div className="panel-stat__label">Rated</div></div></div>}
          <div className="theme-row">
            <span className="theme-row-label">Theme:</span>
            <button className="theme-btn" style={{background:'#080a0f',border:theme==='dark'?'2px solid var(--gold)':'2px solid var(--border-subtle)'}} onClick={()=>setTheme('dark')} title="Dark"/>
            <button className="theme-btn" style={{background:'#f5f5f0',border:theme==='light'?'2px solid #c4911a':'2px solid rgba(0,0,0,0.15)'}} onClick={()=>setTheme('light')} title="Light"/>
            <button className="theme-btn" style={{background:'#000',border:theme==='amoled'?'2px solid var(--gold)':'2px solid #222'}} onClick={()=>setTheme('amoled')} title="AMOLED"/>
          </div>
        </aside>
      </>
    )}

    {activePanel==='lists'&&<CustomListsPanel onClose={()=>setActivePanel(null)} customLists={customLists} onViewList={(id,list)=>{setViewingList({id,list});setActivePanel(null);}}/>}
    {activePanel==='bingo'&&<BingoPanel onClose={()=>setActivePanel(null)}/>}
    {activePanel==='tier'&&<TierListPanel onClose={()=>setActivePanel(null)} favManager={favManager} watchManager={watchManager} ratingManager={ratingManager} historyManager={historyManager}/>}
    {activePanel==='streak'&&<StreakPanel onClose={()=>setActivePanel(null)} streakManager={streakManager}/>}

    {/* VIEWING CUSTOM LIST */}
    {viewingList&&(
      <>
        <div className="side-panel-overlay" onClick={()=>setViewingList(null)}/>
        <aside className="side-panel">
          <div className="side-panel__header"><h3 className="side-panel__title">📋 {viewingList.list.name}</h3><button className="side-panel__close" onClick={()=>setViewingList(null)}>✕</button></div>
          <div className="side-panel__list">
            {viewingList.list.movies.length===0?<div className="panel-empty"><EmptyBoxIcon/><br/>No movies in this list yet.</div>:viewingList.list.movies.map(m=>(
              <div className="panel-item" key={m.id} onClick={()=>{handleCardClick(m);setViewingList(null);}}>
                {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path} alt={m.title}/>:<div style={{width:44,height:66,background:'#1a1e28',borderRadius:5,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}><FilmIcon size={14}/></div>}
                <div className="panel-item__info"><p className="panel-item__title">{m.title}</p><p className="panel-item__year">{m.release_date}</p></div>
                <button className="panel-item__remove" onClick={e=>{e.stopPropagation();customLists.removeFromList(viewingList.id,m.id);setViewingList(v=>({...v,list:{...v.list,movies:v.list.movies.filter(x=>x.id!==m.id)}}))}}>✕</button>
              </div>
            ))}
          </div>
        </aside>
      </>
    )}

    {showAI&&<AIPanel onClose={()=>setShowAI(false)} onMovieClick={(m)=>{setShowAI(false);handleCardClick(m);}} favManager={favManager} watchManager={watchManager} addToast={addToast}/>}
    {addToListMovie&&<AddToListModal movie={addToListMovie} customLists={customLists} onClose={()=>setAddToListMovie(null)} addToast={addToast}/>}
  </>
);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);