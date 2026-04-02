const { useState, useCallback, useMemo } = React;

function useListManager(storageKey) {
  const [list, setList] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  });
  const toggle = useCallback(
    (movie, addToast) => {
      setList((prev) => {
        const exists = prev.some((m) => m.id === movie.id);
        const next = exists ? prev.filter((m) => m.id !== movie.id) : [movie, ...prev];
        localStorage.setItem(storageKey, JSON.stringify(next));
        if (addToast) addToast(`${exists ? 'Removed from' : 'Added to'} ${storageKey.includes('fav') ? 'Favorites' : 'Watchlist'}`);
        return next;
      });
    },
    [storageKey]
  );
  const check = useCallback((id) => list.some((m) => m.id === id), [list]);
  return { list, toggle, check };
}

function useHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const d = JSON.parse(localStorage.getItem('cv_history'));
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  });
  const add = useCallback((movie) => {
    setHistory((prev) => {
      const next = [movie, ...prev.filter((m) => m.id !== movie.id)].slice(0, 12);
      localStorage.setItem('cv_history', JSON.stringify(next));
      return next;
    });
  }, []);
  return { history, add };
}

function useRatings() {
  const [ratings, setRatings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_ratings')) || {};
    } catch {
      return {};
    }
  });
  const rate = useCallback((id, score) => {
    setRatings((prev) => {
      const next = { ...prev, [id]: score };
      localStorage.setItem('cv_ratings', JSON.stringify(next));
      return next;
    });
  }, []);
  const get = useCallback((id) => ratings[id] || 0, [ratings]);
  const all = ratings;
  return { rate, get, all };
}

function useCustomLists() {
  const [lists, setLists] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_custom_lists')) || {};
    } catch {
      return {};
    }
  });
  const save = (next) => {
    setLists(next);
    localStorage.setItem('cv_custom_lists', JSON.stringify(next));
  };
  const createList = (name) => {
    const id = 'list_' + Date.now();
    const next = { ...lists, [id]: { name, movies: [] } };
    save(next);
    return id;
  };
  const deleteList = (id) => {
    const next = { ...lists };
    delete next[id];
    save(next);
  };
  const addToList = (listId, movie) => {
    const next = { ...lists };
    if (!next[listId]) return;
    if (!next[listId].movies.some((m) => m.id === movie.id)) next[listId].movies = [movie, ...next[listId].movies];
    save(next);
  };
  const removeFromList = (listId, movieId) => {
    const next = { ...lists };
    if (next[listId]) {
      next[listId].movies = next[listId].movies.filter((m) => m.id !== movieId);
      save(next);
    }
  };
  const inList = (listId, movieId) => !!(lists[listId] && lists[listId].movies.some((m) => m.id === movieId));
  return { lists, createList, deleteList, addToList, removeFromList, inList };
}

function useStreak() {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_streak')) || { days: [], total: 0, longest: 0 };
    } catch {
      return { days: [], total: 0, longest: 0 };
    }
  });
  const calcStreak = (days) => {
    if (!days.length) return 0;
    let streak = 0;
    let d = new Date();
    for (let i = 0; i < 30; i++) {
      if (days.includes(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (i === 0) {
        d.setDate(d.getDate() - 1);
        if (days.includes(d.toDateString())) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else break;
      } else break;
    }
    return streak;
  };
  const logToday = () => {
    const today = new Date().toDateString();
    if (data.days.includes(today)) return;
    const next = { ...data, days: [today, ...data.days].slice(0, 60), total: (data.total || 0) + 1 };
    const streak = calcStreak(next.days);
    next.longest = Math.max(next.longest || 0, streak);
    localStorage.setItem('cv_streak', JSON.stringify(next));
    setData(next);
  };
  return { data, logToday, currentStreak: calcStreak(data.days) };
}

function useBingo() {
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_bingo')) || [10];
    } catch {
      return [10];
    }
  });
  const toggle = (idx) => {
    if (idx === 10) return;
    setChecked((prev) => {
      const next = prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx];
      localStorage.setItem('cv_bingo', JSON.stringify(next));
      return next;
    });
  };
  const checkBingo = () => {
    const lines = [
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20],
    ];
    return lines.some((line) => line.every((i) => checked.includes(i)));
  };
  return { checked, toggle, hasBingo: checkBingo() };
}

function useTierList(ratingManager) {
  const [tiers, setTiers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cv_tiers')) || { S: [], A: [], B: [], C: [], D: [], F: [] };
    } catch {
      return { S: [], A: [], B: [], C: [], D: [], F: [] };
    }
  });
  const save = (next) => {
    setTiers(next);
    localStorage.setItem('cv_tiers', JSON.stringify(next));
  };
  const moveToTier = (movieId, tier) => {
    const next = {};
    Object.keys(tiers).forEach((t) => {
      next[t] = (tiers[t] || []).filter((id) => id !== movieId);
    });
    if (tier && !next[tier].includes(movieId)) next[tier] = [movieId, ...(next[tier] || [])];
    save(next);
  };
  return { tiers, moveToTier };
}

window.CineVaultHooks = {
  useListManager,
  useHistory,
  useRatings,
  useCustomLists,
  useStreak,
  useBingo,
  useTierList,
};
