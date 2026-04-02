/**
 * TMDB fetch + cache and Hugging Face chat message builder.
 */
(function () {
  const C = window.CineVaultConfig;
  const cache = new Map();
  const inflight = new Map();

  function buildUrl(path) {
    const base = (C.BASE_URL || '').replace(/\/$/, '');
    const p = String(path || '').replace(/^\//, '');
    if (C.TMDB_READ_TOKEN) return `${base}/${p}`;
    const sep = p.includes('?') ? '&' : '?';
    return `${base}/${p}${sep}api_key=${encodeURIComponent(C.API_KEY || '')}`;
  }

  function authHeaders() {
    if (C.TMDB_READ_TOKEN) return { Authorization: 'Bearer ' + C.TMDB_READ_TOKEN };
    return {};
  }

  function posterUrl(path) {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/w342${path}`;
  }

  function isTmdbError(data, res) {
    if (!res.ok) return true;
    if (!data || typeof data !== 'object') return true;
    if (
      typeof data.status_code === 'number' &&
      data.status_message &&
      data.id == null &&
      data.results == null &&
      data.movie_results == null
    ) {
      return true;
    }
    return false;
  }

  function tmdbJson(path, init) {
    const url = buildUrl(path);
    if (!init?.signal && cache.has(url)) return Promise.resolve(cache.get(url));
    if (!init?.signal && inflight.has(url)) return inflight.get(url);
    const p = fetch(url, { ...init, headers: { ...authHeaders(), ...init?.headers } }).then(async (r) => {
      let data;
      try {
        data = await r.json();
      } catch {
        data = { status_code: -1, status_message: 'Bad response from TMDB' };
      }
      const msg = String(data.status_message || data.Error || '');
      const authFail =
        r.status === 401 ||
        r.status === 403 ||
        /invalid\s*api|api\s*key|authentication/i.test(msg);
      if (authFail) {
        try {
          window.dispatchEvent(new CustomEvent('tmdb-auth-fail'));
        } catch (_) {}
      }
      if (!r.ok || isTmdbError(data, r)) {
        const err = msg || `TMDB error (${r.status})`;
        return { __tmdbError: true, status_message: err, status_code: data.status_code };
      }
      if (!init?.signal && !authFail) cache.set(url, data);
      return data;
    });
    if (!init?.signal) {
      inflight.set(url, p);
      p.finally(() => inflight.delete(url));
    }
    return p;
  }

  function mapTmdbListMovie(m) {
    if (!m) return null;
    const va = m.vote_average;
    return {
      id: String(m.id),
      title: m.title || m.original_title || 'Untitled',
      release_date: (m.release_date || '').slice(0, 4) || '',
      poster_path: posterUrl(m.poster_path),
      imdbRating: va != null && va > 0 ? Number(va).toFixed(1) : null,
    };
  }

  function mapTmdbDetailToCard(d, prev) {
    const director = (d.credits && d.credits.crew && d.credits.crew.find((c) => c.job === 'Director')) || null;
    const castNames = (d.credits && d.credits.cast && d.credits.cast.slice(0, 10).map((c) => c.name).join(', ')) || null;
    let rated = null;
    const us = d.release_dates && d.release_dates.results && d.release_dates.results.find((r) => r.iso_3166_1 === 'US');
    if (us && us.release_dates && us.release_dates.length) {
      const cert = us.release_dates.map((x) => x.certification).filter(Boolean);
      rated = cert[0] || null;
    }
    const revenue =
      d.revenue && d.revenue > 0
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(d.revenue)
        : null;
    const va = d.vote_average;
    return {
      ...prev,
      poster_path: posterUrl(d.poster_path) || prev.poster_path,
      fullDataLoaded: true,
      overview: d.overview || 'No description available.',
      genres: (d.genres || []).map((g) => g.name),
      runtime: d.runtime ? `${d.runtime} min` : null,
      rated,
      director: director ? director.name : null,
      actors: castNames,
      imdbRating: va != null && va > 0 ? Number(va).toFixed(1) : null,
      boxOffice: revenue,
      awards: null,
      language: (d.spoken_languages || []).map((l) => l.name).join(', ') || null,
      country: (d.production_countries || []).map((c) => c.name).join(', ') || null,
      rtRating: null,
      metaRating: null,
      yt: prev.yt,
    };
  }

  function buildHfChatMessages(messagesWithUser) {
    const welcome = messagesWithUser[0]?.role === 'ai' ? messagesWithUser[0].text : '';
    const sys = C.AI_SYSTEM_PROMPT + (welcome ? `\n\nYour opening greeting to the user was: "${welcome}"` : '');
    const msgs = [{ role: 'system', content: sys }];
    for (let i = 0; i < messagesWithUser.length; i++) {
      const m = messagesWithUser[i];
      if (i === 0 && m.role === 'ai') continue;
      msgs.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text });
    }
    return msgs;
  }

  function getGlowColor(t) {
    return C.GLOW_PALETTE[(t || '').length % C.GLOW_PALETTE.length];
  }

  window.CineVaultApi = {
    tmdbJson,
    mapTmdbListMovie,
    mapTmdbDetailToCard,
    posterUrl,
    buildHfChatMessages,
    getGlowColor,
  };
})();
