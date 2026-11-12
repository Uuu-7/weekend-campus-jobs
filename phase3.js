/* Additional demo journeys. All state is local to this browser. */
(() => {
  const PROFILE = 'zhoumo-profile-v1';
  const RATINGS = 'zhoumo-ratings-v1';
  const RECEIPTS = 'zhoumo-receipts-v1';
  const NOTICES = 'zhoumo-notices-v1';
  const REVIEWS = 'zhoumo-review-state-v1';
  const exampleRatings = [
    {jobId:'j1',stars:5,tags:['结算及时','带教清楚'],note:'任务清晰，结束后很快结算。',demo:true},
    {jobId:'j1',stars:4,tags:['描述相符'],note:'忙时节奏快，但工作内容和描述一致。',demo:true},
    {jobId:'j3',stars:5,tags:['工作强度适中'],note:'书店氛围好，工作安排合理。',demo:true},
    {jobId:'j8',stars:3,tags:['高强度'],note:'晚班出单密集，建议提前问清休息时间。',demo:true},
    {jobId:'j10',stars:2,tags:['临时加活','高强度'],note:'示例反馈：现场安排与预期有出入。',demo:true}
  ];
  const demoPeers = [
    {name:'橙子同学',income:960}, {name:'小鱼同学',income:736},
    {name:'阿蓝同学',income:528}, {name:'栗子同学',income:320}
  ];
  const campuses = {
    lihu:'江南大学蠡湖校区', xiake:'江南大学霞客湾校区'
  };
  let profile = read(PROFILE,{nickname:'',campus:'lihu',skills:[],minPay:0,leaderboard:false});
  let ratings = read(RATINGS,[]);
  let receipts = read(RECEIPTS,{});
  let notices = read(NOTICES,[]);
  let reviewState = read(REVIEWS,{});
  const allRatings = () => [...exampleRatings,...ratings];
  const forMerchant = merchant => allRatings().filter(item => jobs.find(job => job.id === item.jobId)?.merchant === merchant);
  const avg = list => list.length ? (list.reduce((sum,item) => sum + Number(item.stars),0) / list.length).toFixed(1) : null;
  const notify = message => { notices.unshift({message,at:Date.now()}); notices = notices.slice(0,30); save(NOTICES,notices); renderNotices(); };
  const actionButton = (label,id,kind) => '<button type="button" class="small-btn" data-extra="' + kind + '" data-id="' + safe(id) + '">' + label + '</button>';

  const tools = document.createElement('section');
  tools.className = 'shell phase-tools';
  tools.innerHTML = '<div class="phase-tool-head"><div><div class="section-kicker">MY DEMO PROFILE</div><h2>我的体验档案</h2><p>设置技能与偏好，体验更贴合自己的周末岗位。资料只保存在当前浏览器。</p></div><button type="button" class="small-btn" id="noticeButton">🔔 提醒 <span id="noticeCount">0</span></button></div>' +
    '<div class="profile-grid"><label>体验昵称<input id="profileName" maxlength="12" placeholder="例如：小江同学"></label><label>所在校区<select id="profileCampus"><option value="lihu">江南大学蠡湖校区</option><option value="xiake">江南大学霞客湾校区</option></select></label><label>期望最低时薪<input id="profilePay" type="number" min="0" max="999" value="0"></label></div>' +
    '<fieldset class="skill-field"><legend>感兴趣 / 擅长的类型</legend><label><input type="checkbox" value="餐饮服务"> 餐饮服务</label><label><input type="checkbox" value="活动执行"> 活动执行</label><label><input type="checkbox" value="零售导购"> 零售导购</label><label><input type="checkbox" value="教育助教"> 教育助教</label></fieldset>' +
    '<div class="profile-actions"><label class="opt-in"><input type="checkbox" id="leaderOpt"> 用昵称自愿加入本机体验榜</label><button type="button" class="small-btn" id="saveProfile">保存偏好</button><button type="button" class="small-btn" id="exportDemo">导出体验档案</button><label class="import-label">导入体验档案<input type="file" id="importDemo" accept="application/json,.json"></label></div><small>导出文件可在另一台设备手动导入，以演示数据迁移；没有账号或实时同步。请勿填写真实敏感信息。</small>';
  $('#contentArea').before(tools);
  const board = document.createElement('section');
  board.className = 'leaderboard-panel';
  board.innerHTML = '<div class="leaderboard-head"><div><div class="section-kicker">WEEKEND LEADERBOARD</div><h3>兼职同学榜</h3><p>看看周末努力的同学们。只按演示已结算记录估算收入，不代表真实收入。</p></div><span>🏆 自愿上榜</span></div><div id="leaderboardRows"></div>';
  $('#emptyJobs').after(board);
  const noticePanel = document.createElement('dialog');
  noticePanel.className = 'job-dialog extra-dialog';
  noticePanel.id = 'noticeDialog';
  noticePanel.innerHTML = '<button type="button" class="dialog-close" data-close-extra>×</button><h2>我的提醒</h2><p>录用、到岗、结算等动态只在打开本网页时展示。</p><div id="noticeList"></div>';
  document.body.append(noticePanel);
  const formDialog = document.createElement('dialog');
  formDialog.className = 'job-dialog extra-dialog';
  formDialog.id = 'extraDialog';
  document.body.append(formDialog);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-close-extra]')) event.target.closest('dialog').close();
  });
  function renderProfile() {
    $('#profileName').value = profile.nickname || '';
    $('#profileCampus').value = profile.campus || 'lihu';
    $('#profilePay').value = profile.minPay || 0;
    $('#leaderOpt').checked = Boolean(profile.leaderboard);
    $$('.skill-field input').forEach(el => { el.checked = (profile.skills || []).includes(el.value); });
    $('#locationButton span').textContent = (campuses[profile.campus] || campuses.lihu) + '周边';
  }
  function renderBoard() {
    const own = applications.filter(app => app.status === 'settled').reduce((sum,app) => sum + estimate(jobs.find(job => job.id === app.id) || {time:'00:00–00:00',pay:0}),0);
    const rows = [...demoPeers.map(peer => ({...peer,demo:true})),...(profile.leaderboard && profile.nickname ? [{name:profile.nickname,income:own,own:true}] : [])].sort((a,b) => b.income-a.income);
    $('#leaderboardRows').innerHTML = rows.map((person,index) => '<div class="rank-row"><span class="rank-number">' + (index+1) + '</span><strong>' + safe(person.name) + (person.own ? '（我）' : '') + '</strong><span>¥' + person.income + ' <small>估算</small></span></div>').join('') + '<p class="leaderboard-note">前 4 位为虚构示例；我的金额来自当前浏览器已结算岗位的时薪 × 工时。未自愿上榜时不展示昵称。</p>';
  }
  function renderNotices() {
    $('#noticeCount').textContent = notices.length;
    $('#noticeList').innerHTML = notices.length ? notices.map(item => '<div class="notice-row"><strong>' + safe(item.message) + '</strong><small>' + new Date(item.at).toLocaleString('zh-CN') + '</small></div>').join('') : '<p>还没有提醒。报名并体验商家处理后会出现在这里。</p>';
  }
  function ratingSummary(merchant) {
    const list = forMerchant(merchant);
    if (!list.length) return '<span class="rating-neutral">暂无同学评价</span>';
    const score = Number(avg(list));
    const label = score >= 4.2 ? '同学推荐' : score <= 3.2 || list.some(item => item.tags?.includes('高强度')) ? '强度提醒' : '评价可参考';
    return '<span class="rating-score">★ ' + score.toFixed(1) + '</span><span class="rating-label">' + label + ' · ' + list.length + ' 条' + (list.every(item => item.demo) ? '示例' : '') + '</span>';
  }
  const oldCard = jobCard;
  jobCard = function(job) {
    const card = oldCard(job);
    const fit = (profile.skills || []).includes(job.category);
    const pay = Number(profile.minPay || 0);
    const note = fit ? '<span class="personal-match">✨ 技能偏好符合</span>' : pay && Number(job.pay) < pay ? '<span class="personal-low">低于期望时薪</span>' : '';
    return card.replace('<div class="card-bottom">','<div class="rating-inline">' + ratingSummary(job.merchant) + note + '</div><div class="card-bottom">').replace('📍 ' + safe(job.distance) + ' km','📍 示例 ' + safe(job.distance) + ' km');
  };
  const oldRenderJobs = renderJobs;
  renderJobs = function() {
    oldRenderJobs();
    if ($('#sortSelect').value === 'recommended') {
      const grid = $('#jobGrid');
      [...grid.children].sort((a,b) => {
        const score = id => { const job=jobs.find(item => item.id === id); return matchScore(job) + ((profile.skills||[]).includes(job.category) ? 16 : 0) + (Number(job.pay)>=Number(profile.minPay||0) ? 8 : -8); };
        return Number(a.classList.contains('job-closed'))-Number(b.classList.contains('job-closed')) || score(b.dataset.job)-score(a.dataset.job);
      }).forEach(card => grid.append(card));
    }
    renderBoard();
  };
  const oldOpenJob = openJob;
  openJob = function(id) {
    oldOpenJob(id);
    const job = jobs.find(item => item.id === id);
    if (!job) return;
    const list = forMerchant(job.merchant);
    const comments = list.slice(0,3).map(item => '<div class="review-item"><strong>★ ' + safe(item.stars) + ' · ' + (item.demo ? '示例评价' : '本机体验评价') + '</strong><span>' + safe((item.tags||[]).join(' · ')) + '</span><p>' + safe(item.note || '未填写评价文字') + '</p></div>').join('');
    const map = 'https://uri.amap.com/search?keyword=' + encodeURIComponent(job.place) + '&city=' + encodeURIComponent('无锡');
    $('#dialogBody .dialog-apply').insertAdjacentHTML('beforebegin','<section class="detail-extra"><h3>同学怎么看这家商户</h3><div class="rating-inline">' + ratingSummary(job.merchant) + '</div>' + (comments || '<p>暂无评价，工作完成后可留下体验。</p>') + '<h3>到岗路线</h3><p>地点与距离为演示数据。请在地图中核实实际地点和通勤时间。</p><a class="map-link" href="' + map + '" target="_blank" rel="noopener noreferrer">在高德地图搜索地点 ↗</a></section>');
    const distance = $('#dialogBody .detail-item:nth-child(4) strong');
    if (distance) distance.textContent = '示例约 ' + job.distance + ' km · ' + job.spots + ' 人';
  };
  statusNames.checkin_pending = '待商家确认签到';
  statusIndex.checkin_pending = 1;
  const oldAppCard = applicationCard;
  applicationCard = function(app,job) {
    let card = oldAppCard(app,job);
    let extra = '';
    if (app.status === 'accepted') extra += actionButton('我已到岗 · 请求确认',app.id,'checkin');
    if (app.status === 'checkin_pending') extra += '<p class="application-note">已提交到岗请求，等待商家确认（演示签到）。</p>';
    if (['completed','settled'].includes(app.status) && !ratings.some(item => item.jobId === app.id)) extra += actionButton('评价这份工作',app.id,'rating');
    if (ratings.some(item => item.jobId === app.id)) extra += '<span class="reviewed-note">✓ 已评价商家</span>';
    if (app.status === 'settled') extra += '<div class="receipt-note">🧾 结算记录：' + (receipts[app.id] ? '¥' + safe(receipts[app.id].amount) + ' · 凭证编号 ' + safe(receipts[app.id].reference) : '旧记录无凭证') + '<small>演示记录，不代表真实支付</small></div>';
    return card.replace('</article>', '<div class="application-extra">' + extra + '</div></article>');
  };
  const oldMerchantActions = merchantActions;
  merchantActions = function(app) {
    if (app.status === 'checkin_pending') return '<button data-app="' + safe(app.id) + '" data-next="arrived" class="action-primary">确认到岗</button>';
    return oldMerchantActions(app);
  };
  const oldUpdate = updateApplication;
  updateApplication = function(id,next) {
    const app = applications.find(item => item.id === id);
    if (!app) return;
    if (next === 'settled' && app.status === 'completed') { openReceipt(id); return; }
    const before = app.status;
    if (before === 'checkin_pending' && next === 'arrived') {
      app.status = 'arrived'; app.history = [...(app.history||[]),{status:'arrived',at:Date.now()}];
      save(KEY_APPS,applications); renderMerchantJobs(); renderApplications(); renderJobs(); notify('商家已确认到岗：' + jobs.find(job=>job.id===id)?.title); toast('已确认到岗'); return;
    }
    oldUpdate(id,next);
    if (app.status !== before) { renderApplications(); notify('报名状态更新：' + (jobs.find(job=>job.id===id)?.title||'岗位') + ' · ' + statusNames[next]); }
  };
  const oldRenderMerchant = renderMerchantJobs;
  renderMerchantJobs = function() {
    oldRenderMerchant();
    let panel = $('#moderationPanel');
    if (!panel) { panel = document.createElement('section'); panel.id='moderationPanel'; panel.className='moderation-panel'; $('#merchantJobs').after(panel); }
    const reports = read(KEY_REPORTS,[]);
    const pending = reports.filter((item,index) => !reviewState['report-'+(item.createdAt||index)]).length;
    panel.innerHTML = '<h3>平台审核台 <small>仅演示</small></h3><p>商家资质、岗位审核和举报处理在此体验流程；没有人工审核或真实身份核验。</p><div class="review-stats">' + jobs.filter(job=>job.id.startsWith('custom-')).length + ' 个自发布岗位 · ' + pending + ' 条待处理举报</div>' +
      jobs.filter(job=>job.id.startsWith('custom-')).map(job => '<div class="review-row"><span>' + safe(job.merchant) + ' · ' + safe(job.title) + '</span><strong>' + (reviewState['job-'+job.id] ? '资料声明已登记（演示）' : '待资料声明') + '</strong>' + (!reviewState['job-'+job.id] ? actionButton('登记资料声明',job.id,'verify') : '') + '</div>').join('') +
      reports.map((item,index) => '<div class="review-row"><span>举报：' + safe(item.reason) + ' · ' + safe(jobs.find(job=>job.id===item.jobId)?.title||'岗位') + '</span><strong>' + (reviewState['report-'+(item.createdAt||index)] ? '已标记处理（演示）' : '待处理') + '</strong>' + (!reviewState['report-'+(item.createdAt||index)] ? actionButton('标记已查看',item.createdAt||index,'report') : '') + '</div>').join('');
  };
  function openReceipt(id) {
    const job=jobs.find(item=>item.id===id);
    $('#extraDialog').innerHTML = '<button type="button" class="dialog-close" data-close-extra>×</button><h2>登记结算凭证</h2><p>' + safe(job.title) + ' · 请填演示编号，不要填写真实银行卡或交易隐私。</p><form id="receiptForm" data-id="' + safe(id) + '"><label>结算金额（元）<input name="amount" type="number" min="1" max="99999" value="' + estimate(job) + '" required></label><label>演示凭证编号<input name="reference" maxlength="30" placeholder="例如 DEMO-2026-001" required></label><button class="primary-btn">登记并标记已结算</button></form><small>仅保存在当前浏览器，不执行真实付款。</small>';
    $('#extraDialog').showModal();
  }
  function openRating(id) {
    const job=jobs.find(item=>item.id===id);
    $('#extraDialog').innerHTML = '<button type="button" class="dialog-close" data-close-extra>×</button><h2>评价这份工作</h2><p>' + safe(job.merchant) + ' · 仅完成工作后可评价，每个报名一次。评价保存在本机。</p><form id="ratingForm" data-id="' + safe(id) + '"><label>总体评分<select name="stars"><option value="5">★★★★★ 5 分</option><option value="4">★★★★☆ 4 分</option><option value="3">★★★☆☆ 3 分</option><option value="2">★★☆☆☆ 2 分</option><option value="1">★☆☆☆☆ 1 分</option></select></label><fieldset class="tag-field"><legend>工作体验（可多选）</legend>' + ['结算及时','描述相符','带教清楚','工作强度适中','高强度','临时加活','结算较慢'].map(tag => '<label><input type="checkbox" name="tag" value="' + tag + '"> ' + tag + '</label>').join('') + '</fieldset><label>评价补充<textarea name="note" rows="3" maxlength="180" placeholder="实际工作内容、休息安排、结算体验……"></textarea></label><button class="primary-btn">提交评价</button></form><small>评价和标签为演示内容，不能用于判断真实商家信誉。</small>';
    $('#extraDialog').showModal();
  }
  $('#applicationList').addEventListener('click',event => {
    const button=event.target.closest('[data-extra]'); if (!button) return;
    const id=button.dataset.id, app=applications.find(item=>item.id===id);
    if (button.dataset.extra === 'rating') openRating(id);
    if (button.dataset.extra === 'checkin' && app?.status === 'accepted') {
      app.status='checkin_pending'; app.history=[...(app.history||[]),{status:'checkin_pending',at:Date.now()}];
      save(KEY_APPS,applications); renderApplications(); renderMerchantJobs(); notify('已提交到岗确认请求'); toast('签到请求已提交，等待商家确认');
    }
  });
  document.addEventListener('click',event => {
    const button=event.target.closest('#moderationPanel [data-extra]'); if (!button) return;
    reviewState[(button.dataset.extra==='verify'?'job-':'report-')+button.dataset.id]=true;
    save(REVIEWS,reviewState); renderMerchantJobs(); toast('已登记演示处理状态');
  });
  $('#extraDialog').addEventListener('submit',event => {
    event.preventDefault(); const form=event.target, id=form.dataset.id, data=new FormData(form);
    if (form.id==='ratingForm') {
      if (ratings.some(item=>item.jobId===id)) return toast('这份工作已经评价过');
      ratings.unshift({jobId:id,stars:Number(data.get('stars')),tags:data.getAll('tag').map(String),note:String(data.get('note')||'').trim(),demo:false});
      save(RATINGS,ratings); notify('你已评价：'+jobs.find(job=>job.id===id)?.merchant); renderApplications(); renderJobs(); toast('评价已提交到本机体验数据');
    }
    if (form.id==='receiptForm') {
      receipts[id]={amount:Number(data.get('amount')),reference:String(data.get('reference')).trim(),at:Date.now()};
      save(RECEIPTS,receipts); oldUpdate(id,'settled'); renderApplications(); renderBoard(); notify('结算记录已登记：'+jobs.find(job=>job.id===id)?.title); toast('结算凭证已登记（演示）');
    }
    $('#extraDialog').close();
  });
  $('#saveProfile').addEventListener('click',() => {
    profile={nickname:$('#profileName').value.trim(),campus:$('#profileCampus').value,skills:$$('.skill-field input:checked').map(el=>el.value),minPay:Number($('#profilePay').value)||0,leaderboard:$('#leaderOpt').checked};
    if (profile.leaderboard && !profile.nickname) return toast('请先填写昵称，再选择自愿上榜');
    save(PROFILE,profile); renderProfile(); renderJobs(); toast('体验偏好已保存');
  });
  $('#noticeButton').addEventListener('click',() => {renderNotices();$('#noticeDialog').showModal();});
  $('#locationButton').addEventListener('click',() => tools.scrollIntoView({behavior:'smooth',block:'center'}));
  $('#exportDemo').addEventListener('click',() => {
    const keys=[KEY_JOBS,KEY_APPS,KEY_AVAIL,KEY_JOB_STATE,KEY_REPORTS,PROFILE,RATINGS,RECEIPTS,NOTICES,REVIEWS];
    const payload={format:'zhoumo-demo-v1',exportedAt:new Date().toISOString(),data:Object.fromEntries(keys.map(key=>[key,read(key,null)]))};
    const link=document.createElement('a'); link.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})); link.download='zhoumo-demo-profile.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  });
  $('#importDemo').addEventListener('change',async event => {
    const file=event.target.files?.[0]; if (!file) return;
    try {
      if (file.size>300000) throw Error('文件超过 300 KB');
      const payload=JSON.parse(await file.text());
      if (payload.format!=='zhoumo-demo-v1' || !payload.data || typeof payload.data!=='object') throw Error('不是有效的体验档案');
      if (!confirm('导入会覆盖此浏览器当前的体验记录，确定继续吗？')) return;
      const keys=[KEY_JOBS,KEY_APPS,KEY_AVAIL,KEY_JOB_STATE,KEY_REPORTS,PROFILE,RATINGS,RECEIPTS,NOTICES,REVIEWS];
      keys.forEach(key => { if (Object.hasOwn(payload.data,key)) { const value=payload.data[key]; if (value===null) localStorage.removeItem(key); else save(key,value); } });
      location.reload();
    } catch(error) { toast('导入失败：'+error.message); }
  });
  const nextShift=applications.find(app => app.status==='accepted' && jobs.some(job => job.id===app.id));
  if (nextShift && !notices.some(item=>item.message.includes('到岗提醒'))) notify('到岗提醒：请提前与商家确认本周末的工作时间和具体地点');
  renderProfile(); renderBoard(); renderNotices(); renderJobs(); renderApplications();
})();

