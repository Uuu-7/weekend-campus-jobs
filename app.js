const KEY_JOBS = 'zhoumo-jobs-v1';
const KEY_APPS = 'zhoumo-applications-v1';
const KEY_AVAIL = 'zhoumo-availability-v1';
const KEY_JOB_STATE = 'zhoumo-job-state-v1';
const KEY_REPORTS = 'zhoumo-reports-v1';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const weekend = () => {
  const now = new Date();
  const sat = new Date(now);
  sat.setDate(now.getDate() + (6 - now.getDay() + 7) % 7);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  return { sat, sun };
};
const dateLabel = day => {
  const d = weekend()[day];
  return (day === 'sat' ? '周六' : '周日') + ' ' + (d.getMonth() + 1) + '/' + d.getDate();
};
const seed = [
  {id:'j1',title:'咖啡店周末店员',merchant:'好杯咖啡 · 大学城店',icon:'☕',category:'餐饮服务',day:'sat',time:'10:00–18:00',pay:28,spots:3,distance:0.8,place:'大学城商业街 2 层',badge:'热门推荐',settlement:'工作结束当日',description:'协助饮品出品、收银和店内整理。提供岗前培训，零经验也能上手。'},
  {id:'j2',title:'周末音乐市集协助',merchant:'拾光市集',icon:'🎪',category:'活动执行',day:'sat',time:'09:30–17:30',pay:32,spots:5,distance:1.5,place:'青年创意广场',badge:'人气岗位',settlement:'工作结束次日',description:'负责摊位引导、现场签到及秩序维护。适合喜欢活动现场、沟通积极的同学。'},
  {id:'j3',title:'书店导购与理货',merchant:'纸间书屋',icon:'📚',category:'零售导购',day:'sun',time:'11:00–19:00',pay:25,spots:2,distance:0.6,place:'学府路书香广场',badge:'离校很近',settlement:'工作结束当日',description:'协助顾客找书、上架整理和简单收银。喜欢阅读、有耐心更合适。'},
  {id:'j4',title:'少儿美术课堂助教',merchant:'小树芽美术',icon:'🎨',category:'教育助教',day:'sun',time:'09:00–16:00',pay:35,spots:2,distance:2.1,place:'学苑社区中心',badge:'高时薪',settlement:'工作结束次日',description:'协助老师准备画材、照看课堂秩序和整理作品。美术相关专业优先，需有耐心。'},
  {id:'j5',title:'甜品店打包协助',merchant:'莓好甜品',icon:'🍰',category:'餐饮服务',day:'sun',time:'13:00–20:00',pay:27,spots:4,distance:1.2,place:'大学城北门商圈',badge:'周日可做',settlement:'工作结束当日',description:'负责订单打包、前台接待和外卖出餐核对。有人带教，工作环境轻松。'},
  {id:'j6',title:'运动品牌周末导购',merchant:'动感运动',icon:'👟',category:'零售导购',day:'sat',time:'12:00–20:00',pay:30,spots:3,distance:1.8,place:'星河购物中心',badge:'薪资不错',settlement:'工作结束次日',description:'协助顾客试穿、陈列整理及活动介绍。喜欢运动、善于沟通的同学欢迎报名。'}
];
let jobs = [...read(KEY_JOBS, []), ...seed];
let applications = read(KEY_APPS, []).map(app => ({ ...app, status: app.status || 'pending' }));
let availability = read(KEY_AVAIL, {
  sat: { enabled:true, start:'09:00', end:'22:00' },
  sun: { enabled:true, start:'09:00', end:'22:00' }
});
let jobState = read(KEY_JOB_STATE, {});
let activeJob = null;
let view = 'jobs';
const statusNames = {
  pending:'待商家确认', accepted:'已录用', rejected:'未录用',
  arrived:'已到岗', completed:'待结算', settled:'已结算'
};
const statusSteps = ['已报名','已录用','已到岗','待结算','已结算'];
const statusIndex = {pending:0,accepted:1,arrived:2,completed:3,settled:4,rejected:0};
const minutes = text => {
  const match = String(text).match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};
const interval = job => {
  const match = String(job.time).match(/(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})/);
  return match ? [minutes(match[1]), minutes(match[2])] : null;
};
const duration = job => {
  const range = interval(job);
  return range ? Math.max(0, (range[1] - range[0]) / 60) : 0;
};
const estimate = job => Math.round(duration(job) * Number(job.pay));
const acceptedCount = id => applications.filter(app => app.id === id && ['accepted','arrived','completed','settled'].includes(app.status)).length;
const isClosed = job => Boolean(jobState[job.id]?.closed) || acceptedCount(job.id) >= Number(job.spots);
const fitsAvailability = job => {
  const slot = availability[job.day];
  const range = interval(job);
  return Boolean(slot?.enabled && range && range[0] >= minutes(slot.start) && range[1] <= minutes(slot.end));
};
const overlaps = (a, b) => {
  if (a.day !== b.day) return false;
  const x = interval(a), y = interval(b);
  return Boolean(x && y && x[0] < y[1] && y[0] < x[1]);
};
const matchScore = job => (fitsAvailability(job) ? 60 : 0) + (Number(job.distance) <= 1 ? 25 : Number(job.distance) <= 2 ? 15 : 5) + (Number(job.pay) >= 30 ? 15 : 10);
const matchReasons = job => [
  fitsAvailability(job) ? '✓ 时间符合' : '需调整空闲时间',
  '距学校 ' + Number(job.distance).toFixed(1) + ' km',
  '预计收入 ¥' + estimate(job)
];
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
function setView(next) {
  view = next;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === next + 'View'));
  $$('[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === next));
  if (next === 'jobs') renderJobs();
  if (next === 'applications') renderApplications();
  if (next === 'merchant') renderMerchantJobs();
  $('#contentArea').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderAvailability() {
  ['sat','sun'].forEach(day => {
    const slot = availability[day] || {enabled:true,start:'09:00',end:'22:00'};
    $('#' + day + 'Enabled').checked = Boolean(slot.enabled);
    $('#' + day + 'Start').value = slot.start;
    $('#' + day + 'End').value = slot.end;
    $('#' + day + 'Date').textContent = dateLabel(day);
  });
}
function saveAvailability() {
  const next = {};
  for (const day of ['sat','sun']) {
    next[day] = {
      enabled: $('#' + day + 'Enabled').checked,
      start: $('#' + day + 'Start').value,
      end: $('#' + day + 'End').value
    };
    if (next[day].enabled && (!next[day].start || !next[day].end || minutes(next[day].start) >= minutes(next[day].end))) {
      toast((day === 'sat' ? '周六' : '周日') + '的结束时间需要晚于开始时间');
      return;
    }
  }
  availability = next;
  save(KEY_AVAIL, availability);
  renderJobs();
  toast('空闲时间已保存，匹配理由已更新');
}
function jobCard(job) {
  const closed = isClosed(job);
  return '<article class="job-card' + (closed ? ' job-closed' : '') + '" tabindex="0" role="button" aria-label="查看' + safe(job.title) + '详情" data-job="' + safe(job.id) + '">' +
    '<div class="card-top"><div class="merchant-icon">' + safe(job.icon) + '</div><span class="badge ' + (closed ? 'closed-badge' : job.badge === '热门推荐' ? 'hot' : '') + '">' + (closed ? '已招满 / 已关闭' : safe(job.badge || '周末岗位')) + '</span></div>' +
    '<h3>' + safe(job.title) + '</h3><div class="merchant-name">' + safe(job.merchant) + ' · ' + safe(job.category) + '</div>' +
    '<div class="tagline"><span>🗓 ' + dateLabel(job.day) + ' · ' + safe(job.time) + '</span><span>📍 ' + safe(job.distance) + ' km</span></div>' +
    '<div class="match-reasons">' + matchReasons(job).map(reason => '<span>' + safe(reason) + '</span>').join('') + '</div>' +
    '<div class="card-bottom"><div class="pay"><strong>¥' + safe(job.pay) + '</strong><small> / 小时</small></div><button type="button" data-job="' + safe(job.id) + '">查看详情 →</button></div></article>';
}
function renderJobs() {
  const q = $('#searchInput').value.trim().toLowerCase();
  const day = $('#dayFilters .selected').dataset.day;
  const cat = $('#categorySelect').value;
  const sort = $('#sortSelect').value;
  const list = jobs.filter(job =>
    (day === 'all' || job.day === day) &&
    (cat === 'all' || job.category === cat) &&
    (!q || [job.title,job.merchant,job.place,job.category].some(value => String(value).toLowerCase().includes(q)))
  );
  if (sort === 'recommended') list.sort((a,b) => Number(isClosed(a)) - Number(isClosed(b)) || matchScore(b) - matchScore(a));
  if (sort === 'pay') list.sort((a,b) => Number(b.pay) - Number(a.pay));
  if (sort === 'distance') list.sort((a,b) => Number(a.distance) - Number(b.distance));
  $('#resultCount').textContent = list.length;
  $('#jobTotal').textContent = jobs.filter(job => !isClosed(job)).length;
  $('#jobGrid').innerHTML = list.map(jobCard).join('');
  $('#emptyJobs').hidden = Boolean(list.length);
}
function applicationCard(app, job) {
  const rejected = app.status === 'rejected';
  const index = statusIndex[app.status] ?? 0;
  const steps = statusSteps.map((step,i) => '<div class="timeline-step ' + (i <= index && !rejected ? 'done' : '') + (i === index && !rejected ? ' current' : '') + '"><span class="timeline-dot">' + (i <= index && !rejected ? '✓' : i + 1) + '</span><small>' + step + '</small></div>').join('');
  return '<article class="application-card application-full"><div class="application-main"><div class="merchant-icon">' + safe(job.icon) + '</div><div class="application-copy"><strong>' + safe(job.title) + '</strong><small>' + dateLabel(job.day) + ' · ' + safe(job.time) + ' · ' + safe(job.merchant) + '</small></div><span class="status ' + (rejected ? 'status-rejected' : '') + '">' + safe(statusNames[app.status] || '待商家确认') + '</span></div>' +
    (rejected ? '<p class="application-note">商家暂未录用你，可继续浏览其他岗位。</p>' : '<div class="status-timeline">' + steps + '</div><p class="application-note">预计收入 ¥' + estimate(job) + ' · 约定结算：' + safe(job.settlement || '工作结束当日') + (app.status === 'completed' ? ' · 等待商家确认结算' : '') + '</p>') + '</article>';
}
function renderApplications() {
  const list = applications.map(app => ({app, job:jobs.find(job => job.id === app.id)})).filter(item => item.job);
  $('#applicationList').innerHTML = list.map(item => applicationCard(item.app,item.job)).join('');
  $('#emptyApplications').hidden = Boolean(list.length);
}
function merchantActions(app) {
  const id = safe(app.id);
  if (app.status === 'pending') return '<button data-app="' + id + '" data-next="accepted" class="action-primary">录用</button><button data-app="' + id + '" data-next="rejected">婉拒</button>';
  if (app.status === 'accepted') return '<button data-app="' + id + '" data-next="arrived" class="action-primary">标记到岗</button>';
  if (app.status === 'arrived') return '<button data-app="' + id + '" data-next="completed" class="action-primary">完成工作</button>';
  if (app.status === 'completed') return '<button data-app="' + id + '" data-next="settled" class="action-primary">标记已结算</button>';
  return '';
}
function renderMerchantJobs() {
  const pending = applications.filter(app => app.status === 'pending').length;
  $('#pendingCount').textContent = pending + ' 条待处理';
  $('#merchantJobs').innerHTML = jobs.map(job => {
    const applicants = applications.filter(app => app.id === job.id);
    const closed = isClosed(job);
    const full = acceptedCount(job.id) >= Number(job.spots);
    const items = applicants.length ? applicants.map((app,index) =>
      '<div class="applicant-row"><div><strong>体验学生 ' + (index + 1) + '</strong><small>' + safe(statusNames[app.status] || '待商家确认') + ' · 报名于 ' + new Date(app.createdAt || Date.now()).toLocaleDateString('zh-CN') + '</small></div><div class="applicant-actions">' + merchantActions(app) + '</div></div>'
    ).join('') : '<p class="no-applicants">暂无报名，岗位正在等待合适的同学。</p>';
    return '<article class="merchant-job"><div class="merchant-job-head"><div><strong>' + safe(job.icon) + ' ' + safe(job.title) + '</strong><small>' + dateLabel(job.day) + ' · ' + safe(job.time) + ' · ' + safe(job.merchant) + '</small></div><div class="merchant-job-tools"><span class="status">' + acceptedCount(job.id) + '/' + safe(job.spots) + ' 已录用</span><button type="button" data-toggle-job="' + safe(job.id) + '" ' + (full ? 'disabled' : '') + '>' + (full ? '已招满' : closed ? '重新开放' : '关闭岗位') + '</button></div></div><div class="applicants">' + items + '</div></article>';
  }).join('');
}
function openJob(id) {
  const job = jobs.find(item => item.id === id);
  if (!job) return;
  activeJob = job;
  const applied = applications.find(app => app.id === id);
  const closed = isClosed(job);
  const reasons = matchReasons(job).map(reason => '<span>' + safe(reason) + '</span>').join('');
  const trust = job.id.startsWith('custom-') ? '商家资料待核验（演示）' : '示例商家档案 · 未接入真实核验';
  $('#dialogBody').innerHTML =
    '<div class="dialog-head"><div class="merchant-icon">' + safe(job.icon) + '</div><div><h2>' + safe(job.title) + '</h2><small>' + safe(job.merchant) + ' · ' + safe(job.category) + '</small></div></div>' +
    '<div class="dialog-pay"><strong>¥' + safe(job.pay) + '<small> / 小时</small></strong><small>预计收入约 ¥' + estimate(job) + '</small></div>' +
    '<div class="detail-grid"><div class="detail-item"><small>工作日期</small><strong>' + dateLabel(job.day) + '</strong></div><div class="detail-item"><small>工作时间</small><strong>' + safe(job.time) + '</strong></div><div class="detail-item"><small>工作地点</small><strong>' + safe(job.place) + '</strong></div><div class="detail-item"><small>距离 / 招聘人数</small><strong>' + safe(job.distance) + ' km · ' + safe(job.spots) + ' 人</strong></div></div>' +
    '<h3 class="detail-heading">为什么与你匹配</h3><div class="match-reasons dialog-reasons">' + reasons + '</div>' +
    '<h3 class="detail-heading">工作内容</h3><p class="detail-copy">' + safe(job.description) + '</p>' +
    '<div class="trust-box"><strong>🛡️ 岗位信息与安全</strong><p>商家：' + safe(job.merchant) + ' · ' + safe(trust) + '</p><p>约定结算：' + safe(job.settlement || '工作结束当日') + '</p><p>费用说明：不得要求报名者缴纳押金、培训费或报名费。不要在核实岗位前提供敏感个人信息。</p><button type="button" id="reportButton">举报这个岗位 ↗</button></div>' +
    '<button class="primary-btn dialog-apply" id="applyButton" ' + (applied || closed ? 'disabled' : '') + '>' + (applied ? '已报名 · ' + safe(statusNames[applied.status] || '待商家确认') : closed ? '岗位已招满 / 已关闭' : !fitsAvailability(job) ? '报名（需调整空闲时间）' : '立即报名 →') + '</button>';
  $('#jobDialog').showModal();
}
function applyJob() {
  const job = activeJob;
  if (!job) return;
  if (applications.some(app => app.id === job.id)) return toast('你已经报名过这个岗位');
  if (isClosed(job)) return toast('这个岗位已招满或已关闭');
  if (!fitsAvailability(job)) return toast('岗位时间不在你的空闲时段内，请先调整空闲时间');
  const conflicting = applications.find(app => {
    const other = jobs.find(item => item.id === app.id);
    return other && ['pending','accepted','arrived','completed'].includes(app.status) && overlaps(job,other);
  });
  if (conflicting) return toast('时间与已报名的「' + jobs.find(item => item.id === conflicting.id).title + '」重叠');
  applications.unshift({id:job.id,status:'pending',createdAt:Date.now(),history:[{status:'pending',at:Date.now()}]});
  save(KEY_APPS, applications);
  $('#jobDialog').close();
  renderJobs();
  toast('报名成功！可在「我的报名」查看进度');
}
function updateApplication(id, next) {
  const app = applications.find(item => item.id === id);
  if (!app) return;
  const job = jobs.find(item => item.id === id);
  if (next === 'accepted' && acceptedCount(id) >= Number(job.spots)) return toast('这个岗位已经招满');
  const allowed = {pending:['accepted','rejected'],accepted:['arrived'],arrived:['completed'],completed:['settled']};
  if (!allowed[app.status]?.includes(next)) return;
  app.status = next;
  app.history = [...(app.history || []),{status:next,at:Date.now()}];
  save(KEY_APPS, applications);
  renderMerchantJobs();
  renderJobs();
  toast('状态已更新：' + statusNames[next]);
}
function toggleJob(id) {
  const job = jobs.find(item => item.id === id);
  if (!job || acceptedCount(id) >= Number(job.spots)) return;
  jobState[id] = {closed:!jobState[id]?.closed};
  save(KEY_JOB_STATE,jobState);
  renderMerchantJobs();
  renderJobs();
  toast(jobState[id].closed ? '岗位已关闭，学生暂不可报名' : '岗位已重新开放');
}
$$('[data-view]').forEach(el => el.addEventListener('click', () => setView(el.dataset.view)));
$('#exploreButton').addEventListener('click', () => $('#contentArea').scrollIntoView({behavior:'smooth'}));
$('#locationButton').addEventListener('click', () => toast('演示区域：大学城周边 3 公里内'));
$('#saveAvailability').addEventListener('click', saveAvailability);
$('#searchInput').addEventListener('input', renderJobs);
$('#categorySelect').addEventListener('change', renderJobs);
$('#sortSelect').addEventListener('change', renderJobs);
$('#dayFilters').addEventListener('click', event => {
  const button = event.target.closest('[data-day]');
  if (!button) return;
  $$('#dayFilters .chip').forEach(el => el.classList.remove('selected'));
  button.classList.add('selected');
  renderJobs();
});
$('#resetFilters').addEventListener('click', () => {
  $('#searchInput').value = '';
  $('#categorySelect').value = 'all';
  $('#sortSelect').value = 'recommended';
  $$('#dayFilters .chip').forEach(el => el.classList.toggle('selected',el.dataset.day === 'all'));
  renderJobs();
});
$('#jobGrid').addEventListener('click', event => {
  const card = event.target.closest('[data-job]');
  if (card) openJob(card.dataset.job);
});
$('#jobGrid').addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    const card = event.target.closest('article[data-job]');
    if (card) { event.preventDefault(); openJob(card.dataset.job); }
  }
});
$('#closeDialog').addEventListener('click', () => $('#jobDialog').close());
$('#jobDialog').addEventListener('click', event => { if (event.target === $('#jobDialog')) $('#jobDialog').close(); });
$('#dialogBody').addEventListener('click', event => {
  if (event.target.closest('#applyButton')) applyJob();
  if (event.target.closest('#reportButton')) {
    $('#jobDialog').close();
    $('#reportDialog').showModal();
  }
});
$('#closeReport').addEventListener('click', () => $('#reportDialog').close());
$('#reportDialog').addEventListener('click', event => { if (event.target === $('#reportDialog')) $('#reportDialog').close(); });
$('#reportForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const reports = read(KEY_REPORTS, []);
  reports.unshift({jobId:activeJob?.id,reason:String(form.get('reason')),note:String(form.get('note') || '').trim(),createdAt:Date.now()});
  save(KEY_REPORTS,reports);
  event.currentTarget.reset();
  $('#reportDialog').close();
  toast('举报已记录在当前浏览器（演示）');
});
$('#merchantJobs').addEventListener('click', event => {
  const action = event.target.closest('[data-app]');
  const toggle = event.target.closest('[data-toggle-job]');
  if (action) updateApplication(action.dataset.app,action.dataset.next);
  if (toggle) toggleJob(toggle.dataset.toggleJob);
});
$('#merchantForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get('title') || '').trim();
  const merchant = String(form.get('merchant') || '').trim();
  const place = String(form.get('place') || '').trim();
  const description = String(form.get('description') || '').trim();
  const start = String(form.get('startTime') || '');
  const end = String(form.get('endTime') || '');
  if (!title || !merchant || !place || !description || !form.get('noFees')) return toast('请填写完整信息并确认无收费承诺');
  if (minutes(start) >= minutes(end)) return toast('结束时间需要晚于开始时间');
  const icons = {'餐饮服务':'☕','活动执行':'🎪','零售导购':'🛍️','教育助教':'📚'};
  const job = {
    id:'custom-' + Date.now(),title,merchant,icon:icons[form.get('category')] || '💼',
    category:String(form.get('category')),day:String(form.get('day')),
    time:start + '–' + end,pay:Number(form.get('pay')),spots:Number(form.get('spots')),
    distance:1,place,badge:'新发布',description,settlement:String(form.get('settlement'))
  };
  const custom = read(KEY_JOBS,[]);
  custom.unshift(job);
  save(KEY_JOBS,custom);
  jobs.unshift(job);
  event.currentTarget.reset();
  toast('岗位发布成功，已进入学生端列表');
  setView('merchant');
  renderMerchantJobs();
});
renderAvailability();
renderJobs();

