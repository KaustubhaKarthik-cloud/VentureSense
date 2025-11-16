(function(){
  const form = document.getElementById('idea-form');
  const results = document.getElementById('results');
  const scoreEl = document.getElementById('viability-score');
  const demandEl = document.getElementById('score-demand');
  const compEl = document.getElementById('score-competition');
  const monetEl = document.getElementById('score-monetization');
  const techEl = document.getElementById('score-tech');
  const compsList = document.getElementById('competitors');
  const gapEl = document.getElementById('gap-highlight');
  const personasWrap = document.getElementById('personas');
  const monetList = document.getElementById('monetization');
  const mapCanvas = document.getElementById('position-map');
  const risksList = document.getElementById('risks');
  const resetBtn = document.getElementById('reset-btn');
  const exportBtn = document.getElementById('export-btn');

  const ctx = mapCanvas ? mapCanvas.getContext('2d') : null;

  const domainLex = [
    { tag:'pets', keywords:['pet','vet','canine','feline','dog','cat','animal','petcare'] },
    { tag:'fitness', keywords:['fitness','workout','gym','health tracking','steps','diet','coach'] },
    { tag:'fintech', keywords:['fintech','payment','bank','wallet','lending','loan','trading','crypto','stocks'] },
    { tag:'edtech', keywords:['education','learning','course','class','study','tutor','edtech','student'] },
    { tag:'saas', keywords:['saas','b2b','crm','erp','tickets','dashboard','analytics','workflow','automation'] },
    { tag:'marketplace', keywords:['marketplace','buyers','sellers','listing','bookings','rides','delivery'] },
    { tag:'health', keywords:['health','medical','doctor','patient','clinic','ehr','wellness','mental'] },
    { tag:'creator', keywords:['creator','influencer','content','video','podcast','newsletter','community'] },
    { tag:'travel', keywords:['travel','tour','flight','hotel','booking','itinerary','trip'] },
    { tag:'realestate', keywords:['real estate','property','rent','mortgage','realtor','zillow'] },
  ];

  const competitorCatalog = {
    pets:['Rover','Wag!','Whistle','Tractive','Chewy'],
    fitness:['MyFitnessPal','Strava','Fitbit','Nike Training Club','Peloton'],
    fintech:['PayPal','Stripe','Square','Chime','Robinhood'],
    edtech:['Coursera','Udemy','Khan Academy','Duolingo'],
    saas:['HubSpot','Salesforce','Asana','Notion','Monday.com'],
    marketplace:['Airbnb','Uber','DoorDash','Etsy'],
    health:['Headspace','Calm','Zocdoc','Teladoc','MyChart'],
    creator:['Substack','Patreon','Kajabi','Canva','YouTube'],
    travel:['Expedia','Booking.com','Hopper','Skyscanner'],
    realestate:['Zillow','Redfin','Realtor.com','Opendoor']
  };

  const gapsByDomain = {
    pets:[
      'Most pet apps don’t track nutritional deficiencies over time—add proactive nutrition insights.',
      'Few solutions integrate with affordable at‑home tests—offer low-cost diagnostics integrations.'
    ],
    fitness:[
      'Most apps ignore recovery adherence—track sleep and mobility with gentle nudges.',
      'Add context-aware coaching (injury, equipment, time available).'
    ],
    fintech:[
      'Offer compliance-by-default templates for SMBs—most tools skip guided setup.',
      'Most personal finance tools lack scenario planning—add “what-if” cashflow sims.'
    ],
    edtech:[
      'Few platforms adapt pace to attention spans—micro-blocks with retention checks.',
      'Offer plug-and-play LMS integrations to reduce IT lift.'
    ],
    saas:[
      'Competitors rarely expose simple automations—ship opinionated 1-click workflows.',
      'Provide native ROI tracker tied to business KPIs.'
    ],
    marketplace:[
      'Trust is thin—add verifiable credentials and insured transactions by default.',
      'Offer dynamic pricing tools for small sellers.'
    ],
    health:[
      'Bring longitudinal trends + explainability to the patient, not just providers.',
      'Privacy-first local models for sensitive journaling.'
    ],
    creator:[
      'Most tools skip audience quality scoring—ship “true fan” segmentation.',
      'Offer cross-platform content Briefs with brand-safe guardrails.'
    ],
    travel:[
      'Add carbon-aware routing and offsets as defaults.',
      'Itineraries rarely adapt to weather or delays—build resilient plans.'
    ],
    realestate:[
      'Few buyers get renovation ROI sims—add scenario calculators.',
      'Offer neighborhood “lived experience” signals beyond crime/schools.'
    ],
    generic:[
      'Competitors rarely personalize onboarding by job-to-be-done—ship role-based activation.',
      'Add first-class integrations and migration wizard to lower switching friction.'
    ]
  };

  const monetModels = [
    'Subscription','Freemium','Pay‑per‑use','B2B licensing','Ads','Usage‑based pricing','Marketplace fees','Premium add‑ons'
  ];
  const monetHints = {
    saas:['Subscription','Usage‑based pricing','Premium add‑ons'],
    fintech:['B2B licensing','Pay‑per‑use','Subscription'],
    creator:['Freemium','Subscription','Premium add‑ons'],
    marketplace:['Marketplace fees','Ads','Premium add‑ons'],
    edtech:['Subscription','B2B licensing','Freemium'],
    fitness:['Subscription','Freemium','Premium add‑ons'],
    pets:['Subscription','Premium add‑ons','B2B licensing']
  };

  function detectDomain(text, explicitCategory){
    const t = (explicitCategory? explicitCategory+' ' : '') + text;
    const s = t.toLowerCase();
    let best = {tag:'generic', hits:0};
    for(const d of domainLex){
      const hits = d.keywords.reduce((acc,k)=> acc + (s.includes(k)?1:0),0);
      if(hits > best.hits) best = {tag:d.tag, hits};
    }
    return best.tag;
  }

  function scoreIdea(text){
    const s = text.toLowerCase();

    const demandSignals = ['growing','trend','increasing','need','pain','churn','retention','save time','save money','ai','automation','pet','health','education','b2b','compliance','security','privacy','mobile','cloud','api','platform'];
    const competitionSignals = ['many apps','crowded','competitive','incumbent','big tech','saturated','already','existing'];
    const blueOcean = ['niche','underserved','gap','unmet','unique','differentiated'];
    const monetSignals = ['subscription','saas','enterprise','b2b','license','licensing','ads','freemium','pay per use','usage','marketplace','take rate','commission','premium'];
    const complexitySignals = ['hardware','computer vision','cv','nlp','realtime','blockchain','crypto','ml','ai model','hipaa','gdpr','medical','device','ar','vr','iot','edge','payments','fintech','encryption','multi-tenant','compliance'];

    const demand = clamp(10 + countHits(s, demandSignals)*3 + (s.includes('b2b')?4:0), 0, 25);
    const comp =  clamp(20 - countHits(s, competitionSignals)*4 + countHits(s, blueOcean)*3, 0, 25); // higher is better (less competition)
    const monet = clamp(8 + countHits(s, monetSignals)*3 + (s.includes('enterprise')?4:0), 0, 25);
    const techRaw = clamp(12 + countHits(s, complexitySignals)*3, 0, 25);
    const tech = 25 - Math.min(techRaw, 25); // lower complexity → higher score

    const total = clamp(Math.round((demand+comp+monet+tech) * 1.0), 0, 100);
    return { demand, comp, monet, tech, total };
  }
  function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }
  function countHits(s, arr){ return arr.reduce((a,k)=> a + (s.includes(k)?1:0), 0); }

  function listCompetitors(domain){
    const base = competitorCatalog[domain] || [];
    if(base.length) return base.slice(0, 5);
    // generic guess
    return ['Incumbent 1','Incumbent 2','Well-known App','Niche Player'];
  }

  function findGap(domain, text){
    const domainGaps = gapsByDomain[domain] || [];
    if(domainGaps.length) return pick(domainGaps);
    // heuristic: nutrition example if pets present
    if(text.toLowerCase().includes('pet')) return 'Most pet apps don’t track nutritional deficiencies. Add proactive nutrition to stand out.';
    return pick(gapsByDomain.generic);
  }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function genPersonas(domain, audience, text){
    const base = [
      { name:'Busy Professional', meta:'Time-poor, outcome-focused', needs:['Saves time','Clear ROI','Automations'] },
      { name:'Ops Manager', meta:'Process + accountability', needs:['Integrations','Audit trail','Dashboards'] },
      { name:'Early Adopter', meta:'Tech-forward explorer', needs:['API access','Customization','Transparency'] }
    ];
    const domainExtras = {
      pets: [
        { name:'Pet Parent', meta:'Health-conscious owner', needs:['Reminders','Vet insights','Wearable sync'] }
      ],
      fitness: [
        { name:'Casual Athlete', meta:'Routine seeking', needs:['Beginner plans','Recovery tips','Streaks'] }
      ],
      fintech: [
        { name:'SMB Owner', meta:'Cashflow-sensitive', needs:['Invoices','Reconciliations','Compliance'] }
      ],
      edtech: [
        { name:'Student', meta:'Motivation support', needs:['Bite-size lessons','Quizzes','Progress'] }
      ],
      saas: [
        { name:'Team Lead', meta:'Onboarding others', needs:['SSO','Roles','Templates'] }
      ]
    };
    let pool = base.slice();
    if(domainExtras[domain]) pool = pool.concat(domainExtras[domain]);
    if(audience) pool.unshift({name: titleCase(audience), meta:'User-specified segment', needs:['Tailored onboarding','Relevant templates','Pricing fit']});
    const uniq = [];
    for(const p of pool){
      if(!uniq.find(u=>u.name===p.name)) uniq.push(p);
      if(uniq.length>=3) break;
    }
    return uniq;
  }
  function titleCase(s){ return s.split(' ').map(w=> w? w[0].toUpperCase()+w.slice(1).toLowerCase():'' ).join(' '); }

  function suggestMonetization(domain){
    const hints = monetHints[domain] || [];
    const pool = [...new Set([...hints, ...monetModels])];
    return pool.slice(0,3);
  }

  function fitCanvas(){
    if(!mapCanvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    const cssWidth = mapCanvas.clientWidth || 560;
    const cssHeight = mapCanvas.clientHeight || 280;
    mapCanvas.width = Math.floor(cssWidth * ratio);
    mapCanvas.height = Math.floor(cssHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawMap(demandScore, compScore){
    if(!mapCanvas || !ctx) return;
    fitCanvas();
    const w = mapCanvas.clientWidth;
    const h = mapCanvas.clientHeight;
    ctx.clearRect(0,0,w,h);

    // background grid
    ctx.fillStyle = '#EFE6CF';
    ctx.fillRect(0,0,w,h);

    // axes
    ctx.strokeStyle = 'rgba(58,63,75,0.35)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(40, 20);
    ctx.lineTo(40, h-40);
    ctx.lineTo(w-20, h-40);
    ctx.stroke();

    // quadrant shading (brighter)
    ctx.fillStyle = 'rgba(166,139,106,0.18)'; // tan
    ctx.fillRect(40, 20, (w-60)/2, (h-60)/2); // top-left
    ctx.fillStyle = 'rgba(139,161,123,0.22)'; // olive
    ctx.fillRect(40+(w-60)/2, 20, (w-60)/2, (h-60)/2); // top-right
    ctx.fillStyle = 'rgba(139,161,123,0.16)'; // olive light
    ctx.fillRect(40, 20+(h-60)/2, (w-60)/2, (h-60)/2); // bottom-left
    ctx.fillStyle = 'rgba(166,139,106,0.16)'; // tan light
    ctx.fillRect(40+(w-60)/2, 20+(h-60)/2, (w-60)/2, (h-60)/2); // bottom-right

    // tick marks
    ctx.strokeStyle = 'rgba(58,63,75,0.35)';
    for(let i=1;i<=4;i++){
      const x = 40 + i*((w-60)/5);
      const y = 20 + i*((h-60)/5);
      ctx.beginPath();
      ctx.moveTo(x, h-44); ctx.lineTo(x, h-36);
      ctx.moveTo(36, y); ctx.lineTo(44, y);
      ctx.stroke();
    }

    // point with subtle glow
    const x = 40 + (demandScore/25) * (w-60);
    const y = (h-40) - (compScore/25) * (h-60); // higher compScore = lower competition
    ctx.save();
    ctx.fillStyle = '#39404F';
    ctx.strokeStyle = 'rgba(58,63,75,0.35)';
    ctx.shadowColor = 'rgba(57,64,79,0.35)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // label
    ctx.font = '600 12px Inter, system-ui';
    ctx.fillStyle = '#3A3F4B';
    ctx.fillText('Your Idea', x+10, y-10);
  }

  function calcRisks(scores, domain, text){
    const risks = [];
    const s = text.toLowerCase();
    if(scores.comp < 10) risks.push('Competitive category');
    if(scores.tech < 8) risks.push('High technical complexity risk');
    if(scores.demand < 10) risks.push('Unclear market demand');
    if(s.includes('ads')) risks.push('Ad-driven model requires heavy marketing');
    if(s.includes('hardware') || s.includes('device')) risks.push('High initial cost risk (hardware)');
    if(['fintech','health','edtech'].includes(domain)) risks.push('Regulatory/compliance burden');
    return risks.slice(0,3).length ? risks.slice(0,3) : ['Requires strong go-to-market','Differentiation must be clear','Resource constraints risk'];
  }

  function renderList(ul, items){
    ul.innerHTML = '';
    items.forEach(txt=>{
      const li = document.createElement('li');
      li.textContent = txt;
      ul.appendChild(li);
    });
  }

  let lastScores = null;
  form?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const idea = (document.getElementById('idea').value || '').trim();
    const category = (document.getElementById('category').value || '').trim();
    const audience = (document.getElementById('audience').value || '').trim();
    if(!idea){
      alert('Please paste your idea.');
      return;
    }

    const domain = detectDomain(idea, category);
    const scores = scoreIdea(idea);
    lastScores = scores;

    scoreEl.textContent = String(scores.total);
    demandEl.textContent = String(scores.demand) + '/25';
    compEl.textContent = String(scores.comp) + '/25';
    monetEl.textContent = String(scores.monet) + '/25';
    techEl.textContent = String(scores.tech) + '/25';

    renderList(compsList, listCompetitors(domain));
    gapEl.textContent = findGap(domain, idea);

    const people = genPersonas(domain, audience, idea);
    personasWrap.innerHTML = '';
    people.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'persona';
      card.innerHTML = `
        <h3>${p.name}</h3>
        <div class="meta">${p.meta}</div>
        <strong>Needs</strong>
        <ul>${p.needs.map(n=> `<li>${n}</li>`).join('')}</ul>
      `;
      personasWrap.appendChild(card);
    });

    renderList(monetList, suggestMonetization(domain));

    results.classList.remove('hidden');
    drawMap(scores.demand, scores.comp);

    renderList(risksList, calcRisks(scores, domain, idea));

    window.scrollTo({top: results.offsetTop - 12, behavior: 'smooth'});
  });

  resetBtn?.addEventListener('click', ()=>{
    form.reset();
    results.classList.add('hidden');
    compsList.innerHTML = '';
    personasWrap.innerHTML = '';
    monetList.innerHTML = '';
    risksList.innerHTML = '';
    if(ctx && mapCanvas){
      ctx.clearRect(0,0,mapCanvas.width, mapCanvas.height);
    }
    scoreEl.textContent = '—';
    demandEl.textContent = '—';
    compEl.textContent = '—';
    monetEl.textContent = '—';
    techEl.textContent = '—';
    gapEl.textContent = '—';
  });

  exportBtn?.addEventListener('click', ()=>{
    const report = buildReport();
    const blob = new Blob([report], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'venture_report.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  window.addEventListener('resize', ()=>{
    if(!results.classList.contains('hidden') && lastScores){
      drawMap(lastScores.demand, lastScores.comp);
    }
  });

  function buildReport(){
    const parts = [];
    parts.push('VentureSense Idea Report');
    parts.push('=========================');
    parts.push('');
    parts.push(`Idea Strength Score: ${scoreEl.textContent}/100`);
    parts.push(`  Market demand: ${demandEl.textContent}`);
    parts.push(`  Competition level: ${compEl.textContent}`);
    parts.push(`  Monetization potential: ${monetEl.textContent}`);
    parts.push(`  Tech complexity: ${techEl.textContent}`);
    parts.push('');
    parts.push('Competitors:');
    [...compsList.children].forEach(li=> parts.push(`  - ${li.textContent}`));
    parts.push('');
    parts.push(`Gap Finder Insight: ${gapEl.textContent}`);
    parts.push('');
    parts.push('Micro‑Personas:');
    [...personasWrap.children].forEach(div=>{
      const name = div.querySelector('h3')?.textContent || '';
      const meta = div.querySelector('.meta')?.textContent || '';
      const needs = [...div.querySelectorAll('li')].map(li=>li.textContent);
      parts.push(`  - ${name} (${meta})`);
      needs.forEach(n=> parts.push(`      • ${n}`));
    });
    parts.push('');
    parts.push('Monetization:');
    [...monetList.children].forEach(li=> parts.push(`  - ${li.textContent}`));
    parts.push('');
    parts.push('Risk Flags:');
    [...risksList.children].forEach(li=> parts.push(`  - ${li.textContent}`));
    parts.push('');
    parts.push('(Generated by VentureSense)');
    return parts.join('\n');
  }
})();