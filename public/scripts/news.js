document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('news-list');
  const filterEls = document.querySelectorAll('[data-category]');
  let posts = [];
  try {
    const res = await fetch('/data/posts.json');
    posts = await res.json();
  } catch (e) {
    console.error('Failed to load posts', e);
  }
  const render = (cat) => {
    const sorted = posts.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
    const filtered = cat && cat !== 'All' ? sorted.filter(p => p.category === cat) : sorted;
    listEl.innerHTML = filtered.map(p => `
      <article class="p-4 rounded-lg bg-white dark:bg-slate-800 shadow mb-4">
        <a href="${p.href}" class="block font-semibold text-lg mb-1">${p.title}</a>
        <div class="text-sm text-slate-500 mb-2 flex items-center gap-2">
          <span>${new Date(p.date).toLocaleDateString()}</span>
          <span class="px-2 py-0.5 rounded-full bg-primary text-white text-xs">${p.category}</span>
        </div>
        <p class="text-slate-600 dark:text-slate-300 text-sm">${p.excerpt}</p>
      </article>
    `).join('') || '<p class="text-slate-500">No posts found.</p>';
  };
  filterEls.forEach(btn => btn.addEventListener('click', () => {
    filterEls.forEach(b => b.classList.remove('bg-primary','text-white'));
    btn.classList.add('bg-primary','text-white');
    render(btn.dataset.category);
  }));
  // default select first (All)
  const first = document.querySelector('[data-category].active') || filterEls[0];
  if (first) first.classList.add('bg-primary','text-white');
  render(first ? first.dataset.category : 'All');
});
