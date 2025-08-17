document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('news-list');
  const filterEls = document.querySelectorAll('[data-category]');
  const slugMap = {
    'OpenAI': 'openai-news',
    'ChatGPT': 'chatgpt-updates',
    'Research': 'research-innovation',
    'Policy': 'policy'
  };
  const nameMap = {
    'openai-news': 'OpenAI',
    'chatgpt-updates': 'ChatGPT',
    'ai-industry': 'AI Industry',
    'research-innovation': 'Research',
    'policy': 'Policy'
  };
  let posts = [];
  try {
    const res = await fetch('/data/posts.json');
    posts = await res.json();
  } catch (e) {
    console.error('Failed to load posts', e);
  }
  const render = (cat) => {
    const sorted = posts.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    const slug = slugMap[cat];
    const filtered = slug ? sorted.filter(p => (p.tags||[]).map(t=>t.toLowerCase()).includes(slug)) : sorted;
    listEl.innerHTML = filtered.map(p => {
      const primary = (p.tags||[])[0] || '';
      const label = nameMap[primary] || primary;
      return `
      <article class="p-4 rounded-lg bg-white dark:bg-slate-800 shadow mb-4">
        <a href="/posts/${p.slug}.html" class="block font-semibold text-lg mb-1">${p.title}</a>
        <div class="text-sm text-slate-500 mb-2 flex items-center gap-2">
          <span>${new Date(p.date).toLocaleDateString()}</span>
          <span class="px-2 py-0.5 rounded-full bg-primary text-white text-xs">${label}</span>
        </div>
        <p class="text-slate-600 dark:text-slate-300 text-sm">${p.excerpt}</p>
      </article>`;
    }).join('') || '<p class="text-slate-500">No posts found.</p>';
  };
  filterEls.forEach(btn => btn.addEventListener('click', () => {
    filterEls.forEach(b => b.classList.remove('bg-primary','text-white'));
    btn.classList.add('bg-primary','text-white');
    render(btn.dataset.category);
  }));
  const first = filterEls[0];
  if (first) first.classList.add('bg-primary','text-white');
  render(first ? first.dataset.category : 'All');
});
