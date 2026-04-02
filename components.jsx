const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { HF_API_TOKEN, HF_MODEL, HF_CHAT_URL, BINGO_CELLS } = window.CineVaultConfig;
const { tmdbJson, mapTmdbListMovie, buildHfChatMessages } = window.CineVaultApi;
const { StarIcon, HeartIcon, BookmarkIcon, SearchIcon, FilmIcon, PlayIcon, ExternalIcon, EmptyBoxIcon, ListIcon } = window.CineVaultIcons;
const { useBingo } = window.CineVaultHooks;

function SkeletonCard({isTrailer=false}) { return <div className={`skeleton${isTrailer?' skeleton-landscape':''}`}></div>; }

function MovieCard({movie, onClick, favManager, watchManager, ratingManager, addToast, customListsManager, onAddToList}) {
const [imgErr, setImgErr] = useState(false);
const poster = movie.poster_path && movie.poster_path !== 'N/A' && !imgErr ? movie.poster_path : null;
const isFav = favManager.check(movie.id), isWatch = watchManager.check(movie.id);
const score = ratingManager ? ratingManager.get(movie.id) : 0;
return (
  <div className="movie-card" onClick={() => onClick(movie)}>
    <div className="card-actions">
      <button className={`action-btn fav${isFav?' active':''}`} onClick={e=>{e.stopPropagation();favManager.toggle(movie,addToast);}} title="Favorite"><HeartIcon filled={isFav} size={14}/></button>
      <button className={`action-btn watch${isWatch?' active':''}`} onClick={e=>{e.stopPropagation();watchManager.toggle(movie,addToast);}} title="Watchlist"><BookmarkIcon filled={isWatch} size={14}/></button>
      {onAddToList && <button className="action-btn custom" onClick={e=>{e.stopPropagation();onAddToList(movie);}} title="Add to List"><ListIcon size={13}/></button>}
    </div>
    {score > 0 && <div className="user-star-badge"><StarIcon size={9}/> {score}</div>}
    <div className="movie-card__poster-wrapper">
      {poster ? <img className="movie-card__poster" src={poster} alt={movie.title} onError={()=>setImgErr(true)}/> : <div className="movie-card__poster-placeholder"><FilmIcon size={24}/></div>}
    </div>
    <div className="movie-card__body">
      <p className="movie-card__title">{movie.title}</p>
      <div className="movie-card__meta">
        <span className="movie-card__year">{movie.release_date||'N/A'}</span>
        {movie.imdbRating && movie.imdbRating !== 'N/A' && <span className="movie-card__rating"><StarIcon size={10}/>{movie.imdbRating}</span>}
      </div>
    </div>
  </div>
);
}

function TrailerCard({movie, favManager, watchManager, addToast}) {
const qualities = ['maxresdefault.jpg','hqdefault.jpg','mqdefault.jpg','default.jpg'];
const [qi, setQi] = useState(0);
const isFav = favManager.check(movie.id), isWatch = watchManager.check(movie.id);
return (
  <div className="trailer-card" onClick={()=>window.open(`https://www.youtube.com/watch?v=${movie.yt}`,'_blank')}>
    <div className="card-actions">
      <button className={`action-btn fav${isFav?' active':''}`} onClick={e=>{e.stopPropagation();favManager.toggle(movie,addToast);}}><HeartIcon filled={isFav} size={14}/></button>
      <button className={`action-btn watch${isWatch?' active':''}`} onClick={e=>{e.stopPropagation();watchManager.toggle(movie,addToast);}}><BookmarkIcon filled={isWatch} size={14}/></button>
    </div>
    <div className="trailer-card__thumb-wrapper">
      <img className="trailer-card__thumb" src={`https://img.youtube.com/vi/${movie.yt}/${qualities[qi]}`} alt={movie.title} onError={()=>qi<qualities.length-1&&setQi(q=>q+1)}/>
      <div className="play-overlay"><PlayIcon size={18}/></div>
    </div>
    <div className="trailer-card__body">
      <p className="trailer-card__title">{movie.title}</p>
      <p className="trailer-card__sub">Watch on YouTube <ExternalIcon size={11}/></p>
    </div>
  </div>
);
}

function AIPanel({onClose, onMovieClick, favManager, watchManager, addToast}) {
const SUGGESTIONS = ['Recommend something like Inception','Best movies of 2024','Hidden gems on Netflix','Great sci-fi from the 90s','Cozy movies for a rainy day'];
const [messages, setMessages] = useState([{role:'ai', text:"Hi! I'm your AI movie guide. Tell me what you're in the mood for, or what movies you've loved, and I'll find the perfect recommendations for you! 🎬"}]);
const [input, setInput] = useState('');
const [loading, setLoading] = useState(false);
const [recMovies, setRecMovies] = useState({});
const scrollRef = useRef(null);
useEffect(()=>{if(scrollRef.current) scrollRef.current.scrollTop=scrollRef.current.scrollHeight;},[messages,loading]);

const send = async (text) => {
  const q = text || input.trim(); if (!q) return;
  setInput(''); setLoading(true);
  setMessages(prev => [...prev, {role:'user',text:q}]);
  try {
    const fullThread = [...messages, {role:'user', text:q}];
    const res = await fetch(HF_CHAT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${HF_API_TOKEN}`},
      body: JSON.stringify({
        model: HF_MODEL,
        messages: buildHfChatMessages(fullThread),
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    const data = await res.json();
    let reply = (data?.choices?.[0]?.message?.content || '').trim();
    if (!reply && data?.error) {
      const err = data.error;
      reply = `The AI service returned an error: ${typeof err === 'string' ? err : (err.message || JSON.stringify(err))}`;
    }
    if (!reply && !res.ok) reply = "The AI service is unavailable. Try again in a moment.";
    if (!reply) reply = "I couldn't find recommendations right now. Try again!";
    setMessages(prev => [...prev, {role:'ai', text:reply}]);
    const titles = [...reply.matchAll(/\*\*([^*]+)\*\*/g)].map(m=>m[1]).filter(t=>!t.includes('Note')&&t.length<60);
    const newRecs = {};
    await Promise.all(titles.slice(0,4).map(async title => {
      try {
        const d = await tmdbJson(`search/movie?query=${encodeURIComponent(title)}`);
        const first = d.results && d.results[0];
        if (first) newRecs[title.toLowerCase()] = mapTmdbListMovie(first);
      } catch(e){}
    }));
    if (Object.keys(newRecs).length > 0) setRecMovies(prev=>({...prev,...newRecs}));
  } catch(e) { setMessages(prev => [...prev, {role:'ai',text:"Oops, something went wrong. Please check your connection."}]); }
  setLoading(false);
};

const renderMsg = (msg, idx) => {
  if (msg.role === 'user') return <div key={idx} className="ai-msg ai-msg--user">{msg.text}</div>;
  const parts = msg.text.split(/(\*\*[^*]+\*\*)/g);
  const rendered = parts.map((p,i) => {
    if (p.startsWith('**')&&p.endsWith('**')) {
      const title = p.slice(2,-2);
      const movie = recMovies[title.toLowerCase()];
      return movie
        ? <span key={i}><strong style={{color:'#c084fc',cursor:'pointer'}} onClick={()=>{onMovieClick(movie);}} title="Click to view">{title} 🎬</strong></span>
        : <strong key={i} style={{color:'#c084fc'}}>{title}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
  const titles = [...msg.text.matchAll(/\*\*([^*]+)\*\*/g)].map(m=>m[1]).filter(t=>t.length<60);
  const cards = titles.map(t=>recMovies[t.toLowerCase()]).filter(Boolean);
  return (
    <div key={idx} className="ai-msg ai-msg--ai">
      <div style={{lineHeight:1.7}}>{rendered}</div>
      {idx === messages.length-1 && cards.length > 0 && <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:10}}>
        {cards.slice(0,3).map(m=>(
          <div key={m.id} className="ai-rec-card" onClick={()=>onMovieClick(m)}>
            {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path} alt={m.title}/>:<div style={{width:44,height:66,background:'#1a1e28',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><FilmIcon size={16}/></div>}
            <div><p className="ai-rec-card__title">{m.title} <span style={{color:'var(--text-muted)',fontSize:11}}>({m.release_date})</span></p><p className="ai-rec-card__why">Click to see full details →</p></div>
          </div>
        ))}
      </div>}
    </div>
  );
};

return (
  <div className="ai-panel" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="ai-box">
      <div className="ai-box__header">
        <div className="ai-box__title"><div className="ai-box__title-icon">✨</div>AI Movie Guide</div>
        <button className="side-panel__close" onClick={onClose}>✕</button>
      </div>
      <div ref={scrollRef} className="ai-messages">
        {messages.map((m,i) => renderMsg(m,i))}
        {loading && <div className="ai-msg ai-msg--ai"><div className="ai-typing"><span/><span/><span/></div></div>}
      </div>
      <div className="ai-suggestions">
        {SUGGESTIONS.slice(0,3).map((s,i) => <button key={i} className="ai-suggestion" onClick={()=>send(s)}>{s}</button>)}
      </div>
      <div className="ai-input-row">
        <input className="ai-input" placeholder="What are you in the mood for?" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!loading&&send()} disabled={loading}/>
        <button className="ai-send" onClick={()=>send()} disabled={loading||!input.trim()}>{loading?'..':'Send'}</button>
      </div>
    </div>
  </div>
);
}

function BingoPanel({onClose}) {
const {checked, toggle, hasBingo} = useBingo();
return (
  <div className="side-panel-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside className="side-panel" style={{width:'min(480px,100vw)'}}>
      <div className="side-panel__header">
        <div className="side-panel__title">🎯 Movie Bingo</div>
        <button className="side-panel__close" onClick={onClose}>✕</button>
      </div>
      {hasBingo && <div style={{padding:'10px 16px',background:'rgba(76,175,130,0.15)',borderBottom:'1px solid rgba(76,175,130,0.3)',textAlign:'center',color:'#4caf82',fontWeight:600,fontSize:14}}>🎉 BINGO! Congratulations!</div>}
      <div className="bingo-grid">
        {BINGO_CELLS.map((cell,i) => (
          <div key={i} className={`bingo-cell${cell.isFree?' bingo-free':''}${checked.includes(i)?' checked':''}`} onClick={()=>toggle(i)}>
            <div className="bingo-cell__icon">{cell.icon}</div>
            <div className="bingo-cell__text">{cell.text}</div>
            {checked.includes(i) && <div className="bingo-cell__check">✅</div>}
          </div>
        ))}
      </div>
      <div className="bingo-score">{checked.length - 1} / 24 completed • Click cells to mark them</div>
    </aside>
  </div>
);
}

function TierListPanel({onClose, favManager, watchManager, ratingManager, historyManager}) {
const TIER_NAMES = ['S','A','B','C','D','F'];
const TIER_COLORS = {S:'#ff7675',A:'#fd9644',B:'#ffd32a',C:'#05c46b',D:'#4bcffa',F:'#7d5fff'};
const [tiers, setTiers] = useState(() => { try { return JSON.parse(localStorage.getItem('cv_tiers')) || {S:[],A:[],B:[],C:[],D:[],F:[],unranked:[]}; } catch { return {S:[],A:[],B:[],C:[],D:[],F:[],unranked:[]}; }});
const allMovies = useMemo(() => {
  const seen = new Set(); const movies = [];
  [...favManager.list, ...watchManager.list, ...historyManager.history].forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); movies.push(m); }});
  return movies;
}, [favManager.list, watchManager.list, historyManager.history]);
const rankedIds = Object.values(tiers).flat();
const unranked = allMovies.filter(m => !rankedIds.includes(m.id));

const [dragging, setDragging] = useState(null);
const [dragOver, setDragOver] = useState(null);

const drop = (tier) => {
  if (!dragging) return;
  setTiers(prev => {
    const next = {};
    TIER_NAMES.forEach(t => { next[t] = (prev[t]||[]).filter(id=>id!==dragging.id); });
    next[tier] = [dragging.id, ...(next[tier]||[])];
    localStorage.setItem('cv_tiers', JSON.stringify(next));
    return next;
  });
  setDragging(null); setDragOver(null);
};

const getMovie = (id) => allMovies.find(m=>m.id===id);

return (
  <div className="side-panel-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside className="side-panel" style={{width:'min(520px,100vw)'}}>
      <div className="side-panel__header">
        <div className="side-panel__title">🏆 Tier List</div>
        <button className="side-panel__close" onClick={onClose}>✕</button>
      </div>
      <div className="tier-container">
        {TIER_NAMES.map(tier => (
          <div key={tier} className="tier-row">
            <div className="tier-label" style={{background:TIER_COLORS[tier]}}>{tier}</div>
            <div className={`tier-movies${dragOver===tier?' drag-over':''}`} onDragOver={e=>{e.preventDefault();setDragOver(tier);}} onDrop={()=>drop(tier)} onDragLeave={()=>setDragOver(null)}>
              {(tiers[tier]||[]).map(id => { const m = getMovie(id); if (!m) return null; return (
                <div key={id} className="tier-movie-chip" draggable onDragStart={()=>setDragging(m)} title={m.title}>
                  {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path} alt={m.title}/>:null}
                  <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</span>
                </div>
              );})}
            </div>
          </div>
        ))}
        <div style={{marginTop:12}}>
          <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8,fontWeight:600}}>UNRANKED — drag to a tier above</div>
          <div className="tier-movies" style={{flexWrap:'wrap'}}>
            {unranked.map(m => (
              <div key={m.id} className="tier-movie-chip" draggable onDragStart={()=>setDragging(m)} title={m.title}>
                {m.poster_path&&m.poster_path!=='N/A'?<img src={m.poster_path} alt={m.title}/>:null}
                <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.title}</span>
              </div>
            ))}
            {unranked.length===0&&<span style={{fontSize:12,color:'var(--text-muted)',padding:'8px'}}>All movies ranked! 🎉</span>}
          </div>
        </div>
      </div>
    </aside>
  </div>
);
}

function StreakPanel({onClose, streakManager}) {
const {data, logToday, currentStreak} = streakManager;
const days = ['S','M','T','W','T','F','S'];
const week = Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d;});
const today = new Date().toDateString();
return (
  <div className="side-panel-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside className="side-panel" style={{width:'min(340px,100vw)'}}>
      <div className="side-panel__header"><div className="side-panel__title">🔥 Watch Streak</div><button className="side-panel__close" onClick={onClose}>✕</button></div>
      <div className="streak-bar">
        <div className="streak-count">{currentStreak}</div>
        <div className="streak-label">day streak 🔥</div>
        <div className="streak-week">
          {week.map((d,i) => {
            const ds = d.toDateString();
            const isToday = ds === today;
            const watched = data.days?.includes(ds);
            return <div key={i} className={`streak-day${watched?' watched':''}${isToday&&!watched?' today':''}${!watched&&!isToday?' missed':''}`}>{days[d.getDay()]}</div>;
          })}
        </div>
        <button onClick={logToday} style={{width:'100%',padding:'11px',background:'var(--gold)',color:'#000',border:'none',borderRadius:'var(--radius-pill)',fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,cursor:'pointer',marginBottom:16}}>
          ✅ Log Movie Watched Today
        </button>
        <div className="streak-total">
          <div className="streak-stat"><div className="streak-stat__num">{data.total||0}</div><div className="streak-stat__label">Total Movies</div></div>
          <div className="streak-stat"><div className="streak-stat__num">{data.longest||0}</div><div className="streak-stat__label">Best Streak</div></div>
          <div className="streak-stat"><div className="streak-stat__num">{currentStreak}</div><div className="streak-stat__label">Current</div></div>
        </div>
      </div>
    </aside>
  </div>
);
}

function CustomListsPanel({onClose, customLists, onViewList}) {
const [creating, setCreating] = useState(false);
const [name, setName] = useState('');
const submit = () => { if (!name.trim()) return; customLists.createList(name.trim()); setName(''); setCreating(false); };
return (
  <div className="side-panel-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <aside className="side-panel" style={{width:'min(360px,100vw)'}}>
      <div className="side-panel__header"><div className="side-panel__title"><ListIcon size={20}/> My Lists</div><button className="side-panel__close" onClick={onClose}>✕</button></div>
      <div className="side-panel__list">
        <button className="list-create-btn" onClick={()=>setCreating(true)}>+ Create New List</button>
        {creating && <div style={{display:'flex',gap:6}}>
          <input className="list-name-input" placeholder="List name..." value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} autoFocus/>
          <button onClick={submit} style={{background:'var(--green-accent)',border:'none',borderRadius:8,padding:'0 14px',color:'#fff',cursor:'pointer',fontWeight:600,fontSize:13}}>Add</button>
          <button onClick={()=>setCreating(false)} style={{background:'rgba(255,255,255,0.06)',border:'1px solid var(--border-subtle)',borderRadius:8,padding:'0 10px',color:'var(--text-muted)',cursor:'pointer',fontSize:13}}>✕</button>
        </div>}
        {Object.keys(customLists.lists).length === 0 && !creating && <div className="panel-empty"><EmptyBoxIcon/><br/>No lists yet.<br/>Create one to organize your movies!</div>}
        {Object.entries(customLists.lists).map(([id,list]) => (
          <div key={id} className="custom-list-row" onClick={()=>onViewList(id,list)}>
            <div><div className="custom-list-row__name">📋 {list.name}</div><div className="custom-list-row__count">{list.movies.length} movies</div></div>
            <button className="custom-list-row__delete" onClick={e=>{e.stopPropagation();customLists.deleteList(id);}}>🗑</button>
          </div>
        ))}
      </div>
    </aside>
  </div>
);
}

function AddToListModal({movie, customLists, onClose, addToast}) {
return (
  <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal" style={{maxWidth:360}}>
      <div style={{padding:'20px 24px',borderBottom:'1px solid var(--border-subtle)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:700,fontSize:15}}>Add to List</span>
        <button className="modal__close" style={{position:'static'}} onClick={onClose}>✕</button>
      </div>
      <div style={{padding:16,display:'flex',flexDirection:'column',gap:8}}>
        <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:4}}>Adding: <strong style={{color:'var(--text-primary)'}}>{movie.title}</strong></p>
        {Object.keys(customLists.lists).length === 0 && <p style={{fontSize:13,color:'var(--text-muted)',textAlign:'center',padding:'20px 0'}}>No lists yet. Create one first!</p>}
        {Object.entries(customLists.lists).map(([id,list]) => (
          <button key={id} onClick={()=>{customLists.addToList(id,movie);addToast(`Added to "${list.name}"`);onClose();}} style={{padding:'11px 14px',background:customLists.inList(id,movie.id)?'rgba(76,175,130,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${customLists.inList(id,movie.id)?'rgba(76,175,130,0.4)':'var(--border-subtle)'}`,borderRadius:10,color:customLists.inList(id,movie.id)?'var(--green-accent)':'var(--text-primary)',fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,cursor:'pointer',textAlign:'left',transition:'all 0.2s'}}>
            {customLists.inList(id,movie.id)?'✅':'📋'} {list.name} <span style={{color:'var(--text-muted)',fontWeight:400}}>({list.movies.length})</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);
}

window.CineVaultComponents = { SkeletonCard, MovieCard, TrailerCard, AIPanel, BingoPanel, TierListPanel, StreakPanel, CustomListsPanel, AddToListModal };
