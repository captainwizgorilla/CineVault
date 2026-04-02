/**
 * OMDb fetch + cache and Hugging Face chat message builder.
 */
(function () {
  const C = window.CineVaultConfig;
  const omdbCache = new Map();
  const omdbInflight = new Map();

  function omdbJson(url, init) {
    if (!init?.signal && omdbCache.has(url)) return Promise.resolve(omdbCache.get(url));
    if (!init?.signal && omdbInflight.has(url)) return omdbInflight.get(url);
    const p = fetch(url, init).then(async (r) => {
      let data;
      try {
        data = await r.json();
      } catch {
        data = { Response: 'False', Error: 'Bad response from OMDb' };
      }
      const errStr = String(data.Error || '');
      const authFail = r.status === 401 || /invalid api|api key|limit reached/i.test(errStr);
      if (authFail) {
        try {
          window.dispatchEvent(new CustomEvent('omdb-auth-fail'));
        } catch (_) {}
      }
      if (!r.ok) {
        return { Response: 'False', Error: errStr || `OMDb error (${r.status})` };
      }
      const cacheable =
        !authFail &&
        (data.Response === 'True' || (data.Response === 'False' && !/invalid api|api key/i.test(errStr)));
      if (!init?.signal && cacheable) omdbCache.set(url, data);
      return data;
    });
    if (!init?.signal) {
      omdbInflight.set(url, p);
      p.finally(() => omdbInflight.delete(url));
    }
    return p;
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

  window.CineVaultApi = { omdbJson, buildHfChatMessages, getGlowColor };
})();
