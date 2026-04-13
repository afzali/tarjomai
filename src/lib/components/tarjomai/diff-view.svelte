<script>
  /** @type {{ source: string, output: string, side?: 'source'|'output' }} */
  let { source, output, side = 'output' } = $props();

  const ZWNJ = '\u200c';

  /**
   * Classify the semantic type of an add/remove token pair.
   * Returns 'space'|'halfspace'|'punct'|'word'
   * @param {string|null} removed - token removed from source (null if pure add)
   * @param {string|null} added   - token added in output (null if pure remove)
   * @returns {'space'|'halfspace'|'punct'|'word'}
   */
  function classifyChange(removed, added) {
    const val = removed || added || '';
    if (/^\s+$/.test(val)) return 'space';
    if (val.includes(ZWNJ)) return 'halfspace';
    if (/^[\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E\u060C\u061B\u061F\u0640،؟!؛«»]+$/.test(val)) return 'punct';
    return 'word';
  }

  /**
   * Myers LCS diff on token arrays.
   * @param {string[]} a
   * @param {string[]} b
   * @returns {{ type: 'equal'|'remove'|'add', value: string }[]}
   */
  function lcsDiff(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--)
      for (let j = n - 1; j >= 0; j--)
        dp[i][j] = a[i] === b[j] ? 1 + dp[i+1][j+1] : Math.max(dp[i+1][j], dp[i][j+1]);

    /** @type {{ type: 'equal'|'remove'|'add', value: string }[]} */
    const out = [];
    let i = 0, j = 0;
    while (i < m || j < n) {
      if (i < m && j < n && a[i] === b[j]) { out.push({ type: 'equal', value: a[i] }); i++; j++; }
      else if (j < n && (i >= m || dp[i][j+1] >= dp[i+1][j])) { out.push({ type: 'add', value: b[j] }); j++; }
      else { out.push({ type: 'remove', value: a[i] }); i++; }
    }
    return out;
  }

  /**
   * Tokenise: split on whitespace & ZWNJ boundaries, preserving each as a token.
   * @param {string} text
   * @returns {string[]}
   */
  function tokenise(text) {
    return text.split(/([\s\u200c]+)/).filter(t => t.length > 0);
  }

  /**
   * Enrich diff tokens with semantic change kind.
   * Adjacent remove+add pairs are matched to detect substitution type.
   * @param {{ type: 'equal'|'remove'|'add', value: string }[]} diff
   * @returns {{ type: 'equal'|'remove'|'add', kind: 'space'|'halfspace'|'punct'|'word'|null, value: string }[]}
   */
  function enrichDiff(diff) {
    const result = [];
    for (let i = 0; i < diff.length; i++) {
      const cur = diff[i];
      if (cur.type === 'remove') {
        const next = diff[i + 1];
        if (next && next.type === 'add') {
          const kind = classifyChange(cur.value, next.value);
          result.push({ ...cur, kind });
          result.push({ ...next, kind });
          i++;
        } else {
          result.push({ ...cur, kind: classifyChange(cur.value, null) });
        }
      } else if (cur.type === 'add') {
        result.push({ ...cur, kind: classifyChange(null, cur.value) });
      } else {
        result.push({ ...cur, kind: null });
      }
    }
    return result;
  }

  const _diff = $derived.by(() => {
    if (!source || !output) return [];
    return enrichDiff(lcsDiff(tokenise(source), tokenise(output)));
  });

  const tokens = $derived.by(() => {
    if (!source && !output) return [];
    if (!source) return [{ type: 'equal', kind: null, value: output }];
    if (!output) return [{ type: 'equal', kind: null, value: source }];
    return side === 'source'
      ? _diff.filter(d => d.type !== 'add')
      : _diff.filter(d => d.type !== 'remove');
  });

  /**
   * CSS classes for a changed token mark based on side + kind.
   * @param {'remove'|'add'} type
   * @param {'space'|'halfspace'|'punct'|'word'|null} kind
   */
  function markClass(type, kind) {
    if (type === 'remove') {
      // source column — what was deleted
      if (kind === 'space')     return 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 rounded line-through';
      if (kind === 'halfspace') return 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded line-through';
      if (kind === 'punct')     return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 rounded line-through';
      return                           'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded line-through opacity-80';
    } else {
      // output column — what was added/changed
      if (kind === 'space')     return 'bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200 rounded outline outline-1 outline-orange-300';
      if (kind === 'halfspace') return 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 rounded outline outline-1 outline-purple-300';
      if (kind === 'punct')     return 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-200 rounded';
      return                           'bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-200 rounded';
    }
  }
</script>

<span class="text-sm leading-relaxed whitespace-pre-wrap break-words" dir="auto">
  {#each tokens as token (token)}
    {#if token.type === 'equal'}<!--
      --><span>{token.value}</span><!--
    -->{:else}<!--
      --><mark class="{markClass(/** @type {'remove'|'add'} */ (token.type), token.kind)}">{token.value}</mark><!--
    -->{/if}
  {/each}
</span>
