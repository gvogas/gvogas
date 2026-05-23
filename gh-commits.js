// Tiny helper for resolving a repository's total commit count from the GitHub
// REST API without a separate /stats request. We ask for the first commit
// page with per_page=1 and read the `last` page number out of the Link
// header — that page number IS the total commit count.
//
// Callers usually want to coalesce concurrent requests for the same repo and
// avoid refetching, so we wrap that in a small per-user factory.
//
// `value === undefined` = pending; `null` = failed; number = resolved.
export function makeCommitCounter(user) {
  const cache = new Map();

  async function fetchOne(name) {
    const res = await fetch(`https://api.github.com/repos/${user}/${name}/commits?per_page=1`);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const link = res.headers.get('Link') || '';
    const m = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
    return m ? parseInt(m[1], 10) : 1;
  }

  function ensure(name) {
    let rec = cache.get(name);
    if (rec) return rec.value === undefined ? rec.promise : Promise.resolve(rec.value);
    rec = { value: undefined, promise: null };
    rec.promise = fetchOne(name)
      .then(n => { rec.value = n; return n; })
      .catch(err => {
        // Surface 403/rate-limit so callers can stop early; otherwise resolve null.
        if (err && err.status === 403) {
          rec.value = null;
          throw err;
        }
        rec.value = null;
        return null;
      });
    cache.set(name, rec);
    return rec.promise;
  }

  return { ensure, cache };
}
