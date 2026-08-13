let words=[];
let currentFilter='all';
let searchTerm='';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    applyLanguage();
    const dark = localStorage.getItem('vocabTheme') === 'dark';
    document.body.classList.toggle('dark', dark);
    document.getElementById('themeBtn').textContent = dark ? '☀' : '☾';
    bindEvents();
    await refresh();
  } catch (err) {
    console.error('Vocabulary startup error:', err);
  }
});

async function refresh(){
  words = await getAllWords();
  await updateStatistics();
  renderWords();
}
window.renderWords = renderWords;

function bindEvents(){
  document.getElementById('wordForm').addEventListener('submit', async e => {
    e.preventDefault();
    const word = document.getElementById('wordInput').value.trim();
    const translation = document.getElementById('translationInput').value.trim();
    if(!word || !translation) return;
    try{
      await addWord(word, translation);
      document.getElementById('wordInput').value='';
      document.getElementById('translationInput').value='';
      showMessage(t('saved'),'success');
      await refresh();
    }catch(err){
      showMessage(err.message === 'DUPLICATE' ? t('duplicate') : t('saveError'),'error');
    }
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderWords();
  });

  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderWords();
  }));

  document.getElementById('themeBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const dark = document.body.classList.contains('dark');
    localStorage.setItem('vocabTheme', dark ? 'dark' : 'light');
    document.getElementById('themeBtn').textContent = dark ? '☀' : '☾';
  });

  document.getElementById('languageBtn').addEventListener('click', cycleLanguage);
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('cancelEdit').addEventListener('click', closeModal);
  document.getElementById('editModal').addEventListener('click', e => {
    if(e.target.id === 'editModal') closeModal();
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && !document.getElementById('editModal').hidden) closeModal();
  });

  document.getElementById('editForm').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const word = document.getElementById('editWord').value.trim();
    const translation = document.getElementById('editTranslation').value.trim();
    if(!word || !translation) return;
    try{
      await updateWord(id, word, translation);
      closeModal();
      await refresh();
    }catch(err){
      alert(err.message === 'DUPLICATE' ? t('duplicate') : t('updateError'));
    }
  });
}

function renderWords(){
  const list = document.getElementById('wordList');
  const empty = document.getElementById('emptyState');
  const filtered = words.filter(w =>
    (currentFilter === 'all' ||
      (currentFilter === 'learned' && w.learned) ||
      (currentFilter === 'notLearned' && !w.learned)) &&
    (!searchTerm || w.wordLower.includes(searchTerm) || w.translation.toLowerCase().includes(searchTerm))
  );

  list.innerHTML='';
  empty.hidden = filtered.length > 0;

  filtered.forEach(w => {
    const row = document.createElement('div');
    row.className='word-row';
    row.innerHTML = `<div class="word-main"><div><strong>${escapeHTML(w.word)}</strong><span class="translation">— ${escapeHTML(w.translation)}</span></div><div class="word-meta">${escapeHTML(new Date(w.createdAt).toLocaleString())}</div></div><div class="row-actions"><button class="status-btn ${w.learned?'learned':'not-learned'}" data-action="toggle" data-id="${w.id}">${w.learned?'✓ '+escapeHTML(t('learnedBtn')):'○ '+escapeHTML(t('notLearnedBtn'))}</button><button class="small-btn" data-action="edit" data-id="${w.id}" aria-label="Edit">✎</button><button class="small-btn" data-action="delete" data-id="${w.id}" aria-label="Delete">🗑</button></div>`;
    list.appendChild(row);
  });
  list.querySelectorAll('button').forEach(btn => btn.addEventListener('click', handleAction));
}

async function handleAction(e){
  const id=e.currentTarget.dataset.id;
  const action=e.currentTarget.dataset.action;
  try{
    if(action === 'toggle'){
      await toggleLearned(id);
      await refresh();
    } else if(action === 'delete'){
      if(confirm(t('deleteConfirm'))){
        await deleteWord(id);
        await refresh();
      }
    } else if(action === 'edit'){
      const w=words.find(x => x.id === Number(id));
      if(w){
        document.getElementById('editId').value=w.id;
        document.getElementById('editWord').value=w.word;
        document.getElementById('editTranslation').value=w.translation;
        openModal();
      }
    }
  }catch(err){ console.error('Action error:',err); }
}

function openModal(){
  const modal=document.getElementById('editModal');
  modal.hidden=false;
  modal.setAttribute('aria-hidden','false');
  document.getElementById('editWord').focus();
}

function closeModal(){
  const modal=document.getElementById('editModal');
  modal.hidden=true;
  modal.setAttribute('aria-hidden','true');
}

function showMessage(text,type){
  const el=document.getElementById('formMessage');
  el.textContent=text;
  el.className='form-message '+type;
  setTimeout(()=>{el.textContent='';el.className='form-message'},2500);
}

function escapeHTML(s){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
