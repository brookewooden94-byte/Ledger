document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="css/cute-graphics.css"><link rel="stylesheet" href="css/opt-in-features.css">');

const get = id => document.getElementById(id);
const today = () => new Date();
const currentMonth = () => today().toISOString().slice(0,7);
const text = value => String(value || '');

function element(tag, className, copy) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (copy !== undefined) node.textContent = copy;
  return node;
}

function card(label, title, copy, className) {
  const node = element('article','card feature-card ' + (className || ''));
  node.append(element('p','stat-label',label));
  if (title) node.append(element('h2','',title));
  if (copy) node.append(element('p','muted',copy));
  return node;
}

function paydayInfo(income) {
  const day = Number(income && income.payday || 0);
  if (!day) return ['Add your payday','Set one in setup to get a personal countdown.'];
  const now = today(), start = new Date(now.getFullYear(),now.getMonth(),now.getDate()), next = new Date(now.getFullYear(),now.getMonth(),day);
  if (next < start) next.setMonth(next.getMonth()+1);
  const days = Math.round((next-start)/86400000);
  return [days === 0 ? 'Payday is today ♡' : 'Next payday in ' + days + ' day' + (days === 1 ? '' : 's') + ' ♡','Based on the payday you chose in setup.'];
}

function personalityFor(transactions, income, budgetTotal) {
  const spending = transactions.filter(item => item.type === 'expense' && item.category !== 'Goal Transfer').reduce((sum,item) => sum + Number(item.amount || 0),0);
  if (!transactions.length) return ['The Fresh Start','Your month is a blank canvas. Add a few moments to find your rhythm.'];
  if (!income) return ['The Explorer','You are learning your patterns. Every transaction makes the picture clearer.'];
  if (spending <= income*.5) return ['The Saver','You are keeping lots of breathing room for future-you.'];
  if (budgetTotal && spending <= budgetTotal) return ['The Planner','Your spending has a plan, and you are following through.'];
  return ['Treat Yourself Energy','You made room for joy this month. A quick check-in keeps it intentional.'];
}

function addLabeledInput(form,label,options) {
  const wrap = element('label','',label);
  const input = element(options.tag || 'input');
  Object.entries(options).forEach(([key,value]) => { if (key !== 'tag') input[key] = value; });
  wrap.append(input);
  form.append(wrap);
  return input;
}

function makeModal(id,title,description) {
  const modal = element('div','modal');
  modal.id = id;
  const dialog = element('div','dialog');
  dialog.append(element('h2','',title),element('p','muted',description));
  const form = element('form');
  form.id = id + 'Form';
  dialog.append(form);
  modal.append(dialog);
  modal.addEventListener('click',event => { if (event.target === modal || event.target.matches('[data-close]')) modal.classList.remove('show'); });
  document.body.append(modal);
  return form;
}

function ensureFeatureModals() {
  if (get('eventFundModal')) return;
  const eventForm = makeModal('eventFundModal','New event fund','Save for a concert, trip, birthday, graduation, or anything worth looking forward to.');
  addLabeledInput(eventForm,'What are you saving for?',{name:'name',required:true,placeholder:'Concert tickets'});
  const eventGrid = element('div','form-grid');
  const eventAmount = element('label','','Goal amount'), eventDate = element('label','','Event date');
  eventAmount.append(Object.assign(element('input'),{name:'target',type:'number',min:'1',step:'0.01',required:true,placeholder:'0.00'}));
  eventDate.append(Object.assign(element('input'),{name:'deadline',type:'date'}));
  eventGrid.append(eventAmount,eventDate); eventForm.append(eventGrid);
  const eventFoot = element('div','dialog-foot');
  const eventCancel = element('button','secondary','Cancel'); eventCancel.type = 'button'; eventCancel.dataset.close = '';
  const eventSave = element('button','','Create fund'); eventFoot.append(eventCancel,eventSave); eventForm.append(eventFoot);
  eventForm.addEventListener('submit',event => {
    event.preventDefault();
    Storage.add('goals',{...Object.fromEntries(new FormData(eventForm)),saved:0,type:'event'});
    eventForm.reset(); get('eventFundModal').classList.remove('show'); renderFeaturePanels(); Utils.toast('Event fund created!');
  });

  const subscriptionForm = makeModal('subscriptionModal','Add subscription','Keep each recurring charge visible before it surprises you.');
  addLabeledInput(subscriptionForm,'Subscription name',{name:'name',required:true,placeholder:'Spotify'});
  const subscriptionGrid = element('div','form-grid');
  const subAmount = element('label','','Monthly cost'), subDate = element('label','','Next charge');
  subAmount.append(Object.assign(element('input'),{name:'amount',type:'number',min:'0.01',step:'0.01',required:true,placeholder:'0.00'}));
  subDate.append(Object.assign(element('input'),{name:'dueDate',type:'date',required:true}));
  subscriptionGrid.append(subAmount,subDate); subscriptionForm.append(subscriptionGrid);
  const accountLabel = element('label','','Payment account'), accountPicker = element('select'); accountPicker.name = 'accountId'; accountPicker.id = 'subscriptionAccount';
  accountLabel.append(accountPicker); subscriptionForm.append(accountLabel);
  const subscriptionFoot = element('div','dialog-foot');
  const subscriptionCancel = element('button','secondary','Cancel'); subscriptionCancel.type = 'button'; subscriptionCancel.dataset.close = '';
  const subscriptionSave = element('button','','Save subscription'); subscriptionFoot.append(subscriptionCancel,subscriptionSave); subscriptionForm.append(subscriptionFoot);
  subscriptionForm.addEventListener('submit',event => {
    event.preventDefault();
    Storage.add('subscriptions',Object.fromEntries(new FormData(subscriptionForm)));
    subscriptionForm.reset(); get('subscriptionModal').classList.remove('show'); renderFeaturePanels(); Utils.toast('Subscription saved!');
  });
}

function openFeatureModal(id) {
  ensureFeatureModals();
  const picker = get('subscriptionAccount'), data = Storage.load();
  if (picker) {
    picker.innerHTML = '';
    data.accounts.forEach(account => { const option = element('option','',account.name); option.value = account.id; picker.append(option); });
    if (!picker.children.length) picker.append(Object.assign(element('option','','No account selected'),{value:''}));
  }
  const date = get('subscriptionModal').querySelector('input[name="dueDate"]');
  if (date && !date.value) date.value = today().toISOString().slice(0,10);
  get(id).classList.add('show');
}

function renderFeaturePanels() {
  get('featureArea')?.remove();
  const data = Storage.load(), month = currentMonth(), util = Utils;
  const transactions = data.transactions.filter(item => item.date && item.date.startsWith(month));
  const monthlyIncome = transactions.filter(item => item.type === 'income').reduce((sum,item) => sum + Number(item.amount || 0),0);
  const budgetTotal = data.budgets.reduce((sum,item) => sum + Number(item.limit || 0),0);
  const person = personalityFor(transactions,monthlyIncome,budgetTotal), payday = paydayInfo(data.settings.income);
  const events = data.goals.filter(goal => goal.type === 'event');
  const grouped = {};
  transactions.filter(item => item.type === 'expense' && item.category !== 'Goal Transfer').forEach(item => grouped[item.category] = (grouped[item.category] || 0) + Number(item.amount || 0));
  const biggest = Object.entries(grouped).sort((a,b) => b[1]-a[1])[0];
  const favorite = transactions.find(item => item.favorite) || transactions.filter(item => item.type === 'expense').sort((a,b) => Number(b.amount)-Number(a.amount))[0];
  const saved = transactions.filter(item => item.category === 'Goal Transfer').reduce((sum,item) => sum + Number(item.amount || 0),0);
  const goal = data.goals.slice().sort((a,b) => Number(b.saved || 0)/Number(b.target || 1)-Number(a.saved || 0)/Number(a.target || 1))[0];
  const monthName = new Intl.DateTimeFormat(undefined,{month:'long'}).format(today());
  const area = element('div','',undefined); area.id = 'featureArea';
  const tip = element('section','card saving-tip');
  tip.append(element('p','tip-label','SAVING TIP OF THE DAY'),element('p','tip-copy',['Try a 24-hour pause before a non-essential purchase.','A no-spend day can be a reset, not a restriction.','Move a little toward a goal right after payday.'][today().getDate()%3]));
  area.append(tip);
  const grid = element('section','grid feature-grid');
  const personality = card('SPENDING PERSONALITY','',person[1],'personality');
  const badge = element('span','personality-badge',person[0]); personality.insertBefore(badge,personality.children[1]);
  const paydayCard = card('PAYDAY COUNTDOWN','',payday[1]);
  paydayCard.insertBefore(element('p','payday-number',payday[0]),paydayCard.children[1]);
  const eventsCard = card('EVENTS & EXPERIENCES','Future plans fund','','');
  if (events.length) events.slice(0,2).forEach(goalItem => eventsCard.append(element('span','event-chip',goalItem.name + ' · ' + util.money(goalItem.saved) + ' / ' + util.money(goalItem.target))));
  else eventsCard.append(element('p','muted','Concerts, trips, birthdays—make space for what is coming up.'));
  const eventActions = element('div','feature-actions'), eventButton = element('button','','New event fund'); eventButton.type = 'button';
  eventButton.addEventListener('click',() => openFeatureModal('eventFundModal')); eventActions.append(eventButton); eventsCard.append(eventActions);
  grid.append(personality,paydayCard,eventsCard); area.append(grid);
  const recap = element('section','card'); recap.id = 'monthlyRecap';
  const recapTop = element('div','topbar'), recapHeading = element('div');
  recapHeading.append(element('p','stat-label','MONTHLY RECAP'),element('h2','',monthName + ' in review'));
  recapTop.append(recapHeading,element('span','personality-badge','Your money story')); recap.append(recapTop);
  const recapGrid = element('div','recap-grid');
  [['Income',util.money(monthlyIncome),'positive'],['Saved',util.money(saved),''],['Biggest category',biggest ? biggest[0] : 'Still unfolding',''],['Favorite purchase',favorite ? (favorite.description || favorite.category) : 'Pick one to remember','']].forEach(item => {
    const cell = element('div','recap-cell'); cell.append(element('span','muted',item[0]),element('b',item[2],item[1])); recapGrid.append(cell);
  });
  recap.append(recapGrid,element('p','mini-win',goal ? goal.name + ' is ' + Math.round(Number(goal.saved || 0)/Number(goal.target || 1)*100) + '% funded.' : 'Create a goal and your progress will appear here.')); area.append(recap);
  const subscriptions = element('section','card'); subscriptions.id = 'subscriptionTracker';
  const subscriptionsTop = element('div','topbar'), subscriptionsHeading = element('div'), subscriptionButton = element('button','','Add subscription');
  subscriptionsHeading.append(element('p','stat-label','SUBSCRIPTION TRACKER'),element('h2','','What is renewing next?'));
  subscriptionButton.type = 'button'; subscriptionButton.addEventListener('click',() => openFeatureModal('subscriptionModal')); subscriptionsTop.append(subscriptionsHeading,subscriptionButton); subscriptions.append(subscriptionsTop);
  const list = data.subscriptions || [];
  if (!list.length) subscriptions.append(element('p','muted','Add Netflix, Spotify, iCloud, or any repeating charge.'));
  else list.slice().sort((a,b) => text(a.dueDate).localeCompare(text(b.dueDate))).forEach(item => {
    const pill = element('span','subscription-pill',item.name + ' · ' + util.money(item.amount) + ' · ' + (item.dueDate ? util.date(item.dueDate) : 'date TBD'));
    const remove = element('button','icon-button','×'); remove.title = 'Remove ' + item.name; remove.type = 'button';
    remove.addEventListener('click',() => { Storage.remove('subscriptions',item.id); renderFeaturePanels(); }); pill.append(remove); subscriptions.append(pill);
  });
  area.append(subscriptions);
  document.querySelector('main').prepend(area);
}

function rowForTransaction(item) {
  const row = element('div','row'), icon = element('div','icon',Utils.emoji[item.category] || '•'), copy = element('div','grow'), amount = element('span','amount ' + (item.type === 'income' ? 'positive' : 'negative'),(item.type === 'income' ? '+' : '−') + Utils.money(item.amount));
  copy.append(element('b','',item.description || item.category),element('p','muted',item.category + ' · ' + Utils.date(item.date))); row.append(icon,copy,amount); return row;
}

function renderPersonalizedFeatures() {
  get('personalizedFeatures')?.remove();
  const data = Storage.load(), features = data.settings.features || {};
  const showGarden = features['Money Garden'], showBadges = features['Achievement badges'], showStory = features['Weekly financial stories'] || features['Monthly financial stories'];
  if (!showGarden && !showBadges && !showStory) return;
  const panel = element('section','grid personalized-grid'); panel.id = 'personalizedFeatures';
  const allTransactions = data.transactions || [], todayKey = today().toISOString().slice(0,10);
  if (showGarden) {
    const deposits = allTransactions.filter(item => item.category === 'Goal Transfer').reduce((sum,item) => sum + Number(item.amount || 0),0);
    const growth = Math.min(100,Math.round((deposits / 250) * 100) + Math.min(35,data.goals.length * 10));
    const watered = data.settings.gardenWateredDate === todayKey;
    const garden = element('article','card garden-card' + (watered ? ' watered' : ''));
    garden.append(element('p','stat-label','MONEY GARDEN'),element('h2','','Your future is growing'),element('p','muted',growth ? 'Every goal deposit adds a little more life to your garden.' : 'Make your first goal deposit to grow a new leaf.'));
    const scene = element('div','garden-scene');
    scene.append(element('i','garden-stem'),element('i','garden-leaf one'),element('i','garden-leaf two'),element('i','garden-leaf three'),element('i','garden-pot'));
    const progress = element('div','garden-progress'), bar = element('div','progress'), fill = element('b'); fill.style.width = growth + '%'; bar.append(fill);
    progress.append(bar,element('p','mini-win',growth + '% grown')); garden.append(progress,scene);
    const water = element('button','secondary',watered ? 'Watered for today' : 'Water your garden'); water.type = 'button'; water.disabled = watered;
    water.addEventListener('click',() => { const current = Storage.load(); Storage.save({...current,settings:{...current.settings,gardenWateredDate:todayKey}}); renderPersonalizedFeatures(); Utils.toast('Your money garden is glowing today.'); });
    garden.append(water); panel.append(garden);
  }
  if (showBadges) {
    const badgeCard = element('article','card');
    badgeCard.append(element('p','stat-label','ACHIEVEMENT BADGES'),element('h2','','Little wins count'));
    const badges = element('div','badge-list');
    const achievements = [
      ['First step',data.accounts.length > 0],
      ['Money aware',allTransactions.length > 0],
      ['Goal setter',data.goals.length > 0],
      ['Plan maker',data.budgets.length > 0 || data.bills.length > 0]
    ];
    achievements.forEach(item => { const badge = element('div','badge' + (item[1] ? ' unlocked' : ''),item[1] ? item[0] : 'Locked'); if (item[1]) badge.append(element('b','',item[0])); badges.append(badge); });
    badgeCard.append(badges,element('p','muted','Keep building your money habits to unlock more.')); panel.append(badgeCard);
  }
  if (showStory) {
    const story = element('article','card story-card'), sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate()-6);
    const weekly = allTransactions.filter(item => item.date && new Date(item.date + 'T00:00:00') >= sevenDaysAgo);
    const income = weekly.filter(item => item.type === 'income').reduce((sum,item) => sum + Number(item.amount || 0),0);
    const spending = weekly.filter(item => item.type === 'expense' && item.category !== 'Goal Transfer').reduce((sum,item) => sum + Number(item.amount || 0),0);
    const saved = weekly.filter(item => item.category === 'Goal Transfer').reduce((sum,item) => sum + Number(item.amount || 0),0);
    story.append(element('p','stat-label','WEEKLY FINANCIAL STORY'),element('h2','','Your last seven days'));
    const storyValue = element('p','story-number',Utils.money(Math.max(0,income-spending)));
    story.append(storyValue,element('p','muted',income ? 'left after this week’s income and everyday spending.' : 'Add income and spending to build your first story.'));
    const insight = element('p','mini-win',(saved ? Utils.money(saved) + ' moved toward your goals. ' : '') + (spending ? 'You spent ' + Utils.money(spending) + ' this week.' : 'Your story will update as you use Ledger.'));
    story.append(insight); panel.append(story);
  }
  document.querySelector('main').append(panel);
}

function renderCalendarAndWishlist() {
  get('calendarWishlistPanel')?.remove();
  const data = Storage.load(), month = currentMonth(), marks = {}, days = today().getDate();
  data.transactions.filter(item => item.date && item.date.startsWith(month)).forEach(item => marks[Number(item.date.slice(-2))] = item.type === 'income' ? '#a9d7bd' : '#f1a2bb');
  data.bills.filter(item => item.dueDate && item.dueDate.startsWith(month)).forEach(item => marks[Number(item.dueDate.slice(-2))] = '#b9cfe8');
  const panel = element('section','grid two'); panel.id = 'calendarWishlistPanel'; panel.style.marginTop = '17px';
  const calendar = element('div','card'), calendarTop = element('div','topbar'), cells = element('div');
  calendarTop.style.marginBottom = '10px'; calendarTop.append(element('h2','','Activity calendar'),element('span','muted','This month')); cells.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:6px';
  for (let day=1; day<=days; day++) { const cell = element('div'); cell.style.cssText = 'height:26px;border-radius:6px;background:' + (marks[day] || '#f5eef1'); cells.append(cell); }
  calendar.append(calendarTop,cells,element('p','muted','Expenses  •  Income  •  Bills'));
  const wishlist = element('div','card wishlist-card'), wishlistTop = element('div','topbar'); wishlistTop.style.marginBottom = '10px';
  const all = element('a','button secondary','View all'); all.href = 'wishlist.html'; wishlistTop.append(element('h2','','Wishlist'),all); wishlist.append(wishlistTop);
  if (!data.wishlist.length) wishlist.append(element('div','empty','Save items you are working toward.'));
  else data.wishlist.slice(0,3).forEach(item => { const row = element('div','row'), copy = element('div','grow'); copy.append(element('b','',item.name),element('p','muted',Utils.money(item.price))); row.append(element('div','icon','W'),copy); wishlist.append(row); });
  panel.append(calendar,wishlist); document.querySelector('main').append(panel);
}

function fillTransactionForm() {
  const data = Storage.load();
  get('categorySelect').innerHTML = Utils.categories.map(category => '<option value="' + category + '">' + Utils.emoji[category] + ' ' + category + '</option>').join('');
  get('accountSelect').innerHTML = data.accounts.map(account => '<option value="' + account.id + '">' + account.name + '</option>').join('') || '<option value="">Create an account first</option>';
  get('transactionForm').date.value = today().toISOString().slice(0,10);
  document.querySelector('main > .topbar').classList.add('cute-hero');
}

function renderDashboard() {
  const data = Storage.load(), stats = Storage.stats(), month = currentMonth(), ratio = stats.income ? stats.expenses/stats.income : 1;
  get('name').textContent = data.settings.name || 'Friend';
  get('netWorth').textContent = Utils.money(stats.netWorth); get('income').textContent = Utils.money(stats.income); get('expenses').textContent = Utils.money(stats.expenses);
  get('mood').textContent = ratio < .55 ? 'On track' : ratio < .85 ? 'Within range' : 'Review spending';
  const recent = get('recent'); recent.innerHTML = '';
  const recentItems = data.transactions.slice().sort((a,b) => text(b.date).localeCompare(text(a.date))).slice(0,5);
  if (!recentItems.length) recent.append(element('div','empty','No transactions yet. Add your first one.')); else recentItems.forEach(item => recent.append(rowForTransaction(item)));
  const upcoming = get('upcoming'); upcoming.innerHTML = '';
  const bills = data.bills.filter(item => !item.paid).sort((a,b) => text(a.dueDate).localeCompare(text(b.dueDate))).slice(0,5);
  if (!bills.length) upcoming.append(element('div','empty','No upcoming bills.')); else bills.forEach(item => { const row = element('div','row'), copy = element('div','grow'); copy.append(element('b','',item.name),element('p','muted','Due ' + Utils.date(item.dueDate))); row.append(element('div','icon','B'),copy,element('b','',Utils.money(item.amount))); upcoming.append(row); });
  const budgets = get('budgetProgress'); budgets.innerHTML = '';
  if (!data.budgets.length) budgets.append(element('div','empty','Set a budget to watch your progress.')); else data.budgets.forEach(budget => { const spent = data.transactions.filter(item => item.type === 'expense' && item.category === budget.category && item.date && item.date.startsWith(month)).reduce((sum,item) => sum + Number(item.amount || 0),0), percent = Math.min(100,spent/Number(budget.limit || 1)*100), wrap = element('div'), row = element('div','row'), progress = element('div','progress'), bar = element('b'); row.append(element('span','',budget.category),element('span','',Utils.money(spent) + ' / ' + Utils.money(budget.limit))); bar.style.width = percent + '%'; progress.append(bar); wrap.append(row,progress); budgets.append(wrap); });
  const goals = get('goalProgress'); goals.innerHTML = '';
  if (!data.goals.length) goals.append(element('div','empty','Create a goal to begin saving.')); else data.goals.forEach(goal => { const percent = Math.min(100,Number(goal.saved || 0)/Number(goal.target || 1)*100), row = element('div','row'), ring = element('div','ring'), copy = element('div','grow'); ring.style.setProperty('--p',percent); ring.append(element('span','',Math.round(percent) + '%')); copy.append(element('b','',goal.name),element('p','muted',Utils.money(goal.saved) + ' of ' + Utils.money(goal.target))); row.append(ring,copy); goals.append(row); });
  fillTransactionForm(); renderFeaturePanels(); renderCalendarAndWishlist(); renderPersonalizedFeatures();
}

window.render = renderDashboard;
document.addEventListener('DOMContentLoaded',() => {
  get('transactionForm').addEventListener('submit',event => {
    event.preventDefault();
    const item = Object.fromEntries(new FormData(get('transactionForm')));
    if (!item.accountId) return Utils.toast('Please add an account first.');
    Storage.add('transactions',item); get('transactionModal').classList.remove('show'); get('transactionForm').reset(); window.render(); Utils.toast('Transaction saved!');
  });
});
