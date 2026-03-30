/* ===== GovAI GTM Dashboard — Main Controller ===== */

(function () {
  'use strict';

  /* ---------- Demo / Fallback Data ---------- */

  const AGENCIES = [
    {
      name: 'Health & Human Services (HHS)',
      abbr: 'HHS',
      score: 87,
      signals: [
        'AI/ML modernization initiative funded in FY25',
        'New CTO appointment signals cloud-first push',
        'Active RFIs for data analytics platforms'
      ],
      activity: 'Posted 3 new solicitations this week'
    },
    {
      name: 'Department of the Treasury',
      abbr: 'Treasury',
      score: 72,
      signals: [
        'Cybersecurity compliance upgrades mandated',
        'IRS modernization phase 2 underway',
        'Expanding zero-trust architecture adoption'
      ],
      activity: 'Awarded $42M in IT contracts last month'
    },
    {
      name: 'Department of Transportation (DoT)',
      abbr: 'DoT',
      score: 64,
      signals: [
        'Smart infrastructure data platform RFP imminent',
        'FAA NextGen technology refresh cycle',
        'DOGE efficiency review impacting procurement timelines'
      ],
      activity: 'Pre-solicitation for IoT highway sensors posted'
    }
  ];

  const DEMO_OPPORTUNITIES = [
    {
      title: 'AI-Powered Fraud Detection Platform',
      agency: 'HHS',
      type: 'RFP',
      posted: '2026-03-15',
      deadline: '2026-04-30',
      score: 92
    },
    {
      title: 'Cloud Migration & DevSecOps Support Services',
      agency: 'Treasury',
      type: 'Combined Synopsis',
      posted: '2026-03-10',
      deadline: '2026-04-15',
      score: 85
    },
    {
      title: 'Zero Trust Network Architecture Implementation',
      agency: 'DoT',
      type: 'Pre-Solicitation',
      posted: '2026-03-08',
      deadline: '2026-05-01',
      score: 78
    },
    {
      title: 'Enterprise Data Analytics & Visualization',
      agency: 'HHS',
      type: 'RFP',
      posted: '2026-03-01',
      deadline: '2026-04-20',
      score: 71
    },
    {
      title: 'Cybersecurity Operations Center (SOC) as a Service',
      agency: 'Treasury',
      type: 'Combined Synopsis',
      posted: '2026-02-28',
      deadline: '2026-04-10',
      score: 45
    },
    {
      title: 'IoT Highway Sensor Data Collection Platform',
      agency: 'DoT',
      type: 'Pre-Solicitation',
      posted: '2026-02-20',
      deadline: '2026-03-31',
      score: 38
    }
  ];

  const CURATED_POLICY = [
    {
      title: 'Executive Order 14179 — Removing Barriers to AI Innovation',
      type: 'executive_order',
      date: '2025-01-23',
      source: 'The White House',
      description: 'Revokes EO 14110 and directs agencies to remove regulatory barriers to American AI leadership while maintaining safety standards.',
      live: false
    },
    {
      title: 'OMB Memorandum M-24-10 — Advancing AI Governance',
      type: 'omb_notice',
      date: '2024-03-28',
      source: 'Office of Management and Budget',
      description: 'Establishes requirements for federal agencies to implement AI governance, risk management, and transparency measures.',
      live: false
    },
    {
      title: 'DOGE Government Efficiency Review — IT Spending Audit',
      type: 'budget_update',
      date: '2026-02-15',
      source: 'Department of Government Efficiency',
      description: 'Comprehensive review of federal IT spending with focus on eliminating redundant contracts and consolidating cloud services.',
      live: true
    },
    {
      title: 'FedRAMP Authorization — Accelerated Process Updates',
      type: 'contractor_intel',
      date: '2026-03-01',
      source: 'GSA / FedRAMP PMO',
      description: 'New streamlined authorization process reduces FedRAMP certification timeline from 12 months to 6 months for qualified vendors.',
      live: true
    },
    {
      title: 'OMB Circular A-130 Update — Data & AI Requirements',
      type: 'omb_notice',
      date: '2026-01-18',
      source: 'Office of Management and Budget',
      description: 'Updated guidance on federal data management requiring agencies to develop AI-ready data strategies by FY26.',
      live: false
    },
    {
      title: 'FY2026 Federal IT Budget — $65B Allocated',
      type: 'budget_update',
      date: '2026-03-20',
      source: 'Congressional Budget Office',
      description: 'Federal IT spending projected at $65 billion in FY2026, with 23% allocated to cybersecurity and 15% to AI/ML initiatives.',
      live: true
    },
    {
      title: 'Major Systems Integrators Win $2.1B Defense Cloud Contract',
      type: 'contractor_intel',
      date: '2026-03-12',
      source: 'DoD / Industry Reports',
      description: 'Joint venture of Booz Allen, Leidos, and Palantir awarded multi-cloud defense platform contract under JWCC ceiling.',
      live: false
    }
  ];

  /* ---------- Dashboard Object ---------- */

  const Dashboard = {
    // State
    opportunities: [],
    oppPage: 0,
    oppPageSize: 10,
    awards: [],
    awardsPage: 0,
    awardsPageSize: 10,
    policyItems: [],
    activeTab: 'overview',
    activePolicyType: 'all',
    chart: null,

    /* --- Init --- */
    init() {
      this.bindTabs();
      this.bindSettings();
      this.bindRefresh();
      this.bindSort();
      this.loadSettings();
      this.renderOverview();
      this.loadAllData();
    },

    /* --- Tab Switching --- */
    bindTabs() {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
          const panel = document.getElementById('panel-' + tab);
          if (panel) panel.classList.add('active');
          this.activeTab = tab;
        });
      });
    },

    /* --- Settings Modal --- */
    bindSettings() {
      const modal = document.getElementById('settingsModal');
      const btnOpen = document.getElementById('btnSettings');
      const btnClose = document.getElementById('modalClose');
      const btnCancel = document.getElementById('modalCancel');
      const btnSave = document.getElementById('modalSave');

      btnOpen.addEventListener('click', () => {
        const key = localStorage.getItem('govai_sam_api_key') || '';
        document.getElementById('samApiKey').value = key;
        const aiKey = localStorage.getItem('govai_openai_api_key') || '';
        document.getElementById('openaiApiKey').value = aiKey;
        modal.classList.add('open');
      });

      const closeModal = () => modal.classList.remove('open');
      btnClose.addEventListener('click', closeModal);
      btnCancel.addEventListener('click', closeModal);
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
      });

      btnSave.addEventListener('click', () => {
        const key = document.getElementById('samApiKey').value.trim();
        if (key) {
          localStorage.setItem('govai_sam_api_key', key);
        } else {
          localStorage.removeItem('govai_sam_api_key');
        }
        const aiKey = document.getElementById('openaiApiKey').value.trim();
        if (aiKey) {
          localStorage.setItem('govai_openai_api_key', aiKey);
        } else {
          localStorage.removeItem('govai_openai_api_key');
        }
        this.updateApiStatus();
        closeModal();
        this.loadOpportunities();
      });
    },

    /* --- Refresh --- */
    bindRefresh() {
      document.getElementById('btnRefresh').addEventListener('click', () => {
        this.loadAllData();
      });
    },

    /* --- Sort --- */
    bindSort() {
      document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sort;
          const table = th.closest('table');
          if (table.id === 'oppTable') {
            this.sortData(this.opportunities, key);
            this.oppPage = 0;
            this.renderOpportunities();
          } else if (table.id === 'awardsTable') {
            this.sortData(this.awards, key);
            this.awardsPage = 0;
            this.renderAwards();
          }
        });
      });
    },

    sortData(arr, key) {
      arr.sort((a, b) => {
        let va = a[key] || '';
        let vb = b[key] || '';
        if (typeof va === 'number') return vb - va;
        return String(va).localeCompare(String(vb));
      });
    },

    /* --- Settings Persistence --- */
    loadSettings() {
      this.updateApiStatus();
    },

    updateApiStatus() {
      const key = localStorage.getItem('govai_sam_api_key');
      const badge = document.getElementById('samStatus');
      if (badge) {
        if (key) {
          badge.textContent = 'Configured';
          badge.className = 'status-badge connected';
        } else {
          badge.textContent = 'Not configured';
          badge.className = 'status-badge';
        }
      }
    },

    updateTimestamp() {
      const el = document.getElementById('lastRefreshed');
      if (el) {
        const now = new Date();
        el.textContent = 'Updated ' + now.toLocaleTimeString();
      }
    },

    /* --- Load All Data --- */
    async loadAllData() {
      this.updateTimestamp();
      await Promise.all([
        this.loadOpportunities(),
        this.loadAwards(),
        this.loadPolicy()
      ]);
      this.updateKPIs();
    },

    /* --- Overview Rendering --- */
    renderOverview() {
      this.renderAgencyCards();
      this.renderChart();
    },

    renderAgencyCards() {
      const grid = document.getElementById('agencyGrid');
      grid.innerHTML = AGENCIES.map(a => {
        const scoreClass = a.score >= 80 ? 'high' : a.score >= 50 ? 'medium' : 'low';
        return `
          <div class="agency-card">
            <div class="agency-card-header">
              <span class="agency-name">${a.name}</span>
              <span class="gtm-score ${scoreClass}">${a.score}%</span>
            </div>
            <ul class="agency-signals">
              ${a.signals.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <div class="agency-activity">${a.activity}</div>
          </div>`;
      }).join('');
    },

    renderChart() {
      const ctx = document.getElementById('trendsChart');
      if (!ctx) return;
      if (this.chart) this.chart.destroy();

      const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'RFPs',
              data: [12, 15, 10, 18, 14, 22],
              backgroundColor: '#3b82f6',
              borderRadius: 4
            },
            {
              label: 'Pre-Solicitations',
              data: [8, 6, 9, 7, 11, 9],
              backgroundColor: '#10b981',
              borderRadius: 4
            },
            {
              type: 'line',
              label: 'Avg Match Score',
              data: [68, 72, 70, 75, 73, 78],
              borderColor: '#f59e0b',
              backgroundColor: 'rgba(245,158,11,.1)',
              yAxisID: 'y1',
              tension: 0.3,
              pointRadius: 4,
              pointBackgroundColor: '#f59e0b'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } }
          },
          scales: {
            y: { beginAtZero: true, title: { display: true, text: 'Count' } },
            y1: {
              position: 'right',
              beginAtZero: true,
              max: 100,
              title: { display: true, text: 'Match Score %' },
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    },

    updateKPIs() {
      const opps = this.opportunities.length || DEMO_OPPORTUNITIES.length;
      document.getElementById('kpiOpportunities').textContent = opps;

      // Pipeline value = sum of random-ish values or a demo figure
      const pipeline = this.opportunities.length > 0
        ? '$' + (this.opportunities.length * 4.2).toFixed(1) + 'M'
        : '$24.6M';
      document.getElementById('kpiPipeline').textContent = pipeline;

      const scores = (this.opportunities.length > 0 ? this.opportunities : DEMO_OPPORTUNITIES);
      const avg = scores.reduce((s, o) => s + (o.score || 0), 0) / scores.length;
      document.getElementById('kpiMatchScore').textContent = avg.toFixed(0) + '%';

      document.getElementById('kpiAgencies').textContent = AGENCIES.length;
    },

    /* ---------- Opportunities ---------- */
    async loadOpportunities() {
      const spinner = document.getElementById('oppSpinner');
      spinner.style.display = 'block';
      this.oppPage = 0;

      const samKey = localStorage.getItem('govai_sam_api_key');
      if (samKey) {
        try {
          const data = await this.fetchSAM(samKey);
          this.opportunities = data;
        } catch (err) {
          console.warn('SAM.gov API error, using demo data:', err);
          this.opportunities = [...DEMO_OPPORTUNITIES];
        }
      } else {
        this.opportunities = [...DEMO_OPPORTUNITIES];
      }

      this.renderOpportunities();
      spinner.style.display = 'none';
      this.bindOppFilter();
      this.bindOppShowMore();
    },

    async fetchSAM(apiKey) {
      const url = 'https://api.sam.gov/opportunities/v2/search?limit=25&api_key=' + encodeURIComponent(apiKey) + '&postedFrom=' + this.dateOffset(-90) + '&postedTo=' + this.dateOffset(0);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('SAM API ' + resp.status);
      const json = await resp.json();
      if (!json.opportunitiesData) return DEMO_OPPORTUNITIES;
      return json.opportunitiesData.map(o => ({
        title: o.title || 'Untitled',
        agency: o.fullParentPathName ? o.fullParentPathName.split('.')[0] : (o.departmentName || 'N/A'),
        type: o.type || 'Solicitation',
        posted: (o.postedDate || '').slice(0, 10),
        deadline: (o.responseDeadLine || '').slice(0, 10),
        score: this.randomScore()
      }));
    },

    renderOpportunities() {
      const tbody = document.getElementById('oppTableBody');
      const filterVal = (document.getElementById('oppFilter') || {}).value || '';
      const filtered = this.filterList(this.opportunities, filterVal);
      const end = (this.oppPage + 1) * this.oppPageSize;
      const visible = filtered.slice(0, end);

      tbody.innerHTML = visible.map(o => `
        <tr>
          <td>${this.escHtml(o.title)}</td>
          <td>${this.escHtml(o.agency)}</td>
          <td>${this.escHtml(o.type)}</td>
          <td>${o.posted}</td>
          <td>${o.deadline}</td>
          <td>${this.scoreBar(o.score)}</td>
        </tr>`).join('');

      const btn = document.getElementById('oppShowMore');
      btn.style.display = end >= filtered.length ? 'none' : '';
    },

    bindOppFilter() {
      const input = document.getElementById('oppFilter');
      if (input._bound) return;
      input._bound = true;
      input.addEventListener('input', () => {
        this.oppPage = 0;
        this.renderOpportunities();
      });
    },

    bindOppShowMore() {
      const btn = document.getElementById('oppShowMore');
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        this.oppPage++;
        this.renderOpportunities();
      });
    },

    /* ---------- Awards ---------- */
    async loadAwards() {
      const spinner = document.getElementById('awardsSpinner');
      spinner.style.display = 'block';
      this.awardsPage = 0;

      try {
        const data = await this.fetchUSASpending();
        this.awards = data;
      } catch (err) {
        console.warn('USASpending API error, using demo data:', err);
        this.awards = this.demoAwards();
      }

      this.renderAwards();
      spinner.style.display = 'none';
      this.bindAwardsFilter();
      this.bindAwardsShowMore();
    },

    async fetchUSASpending() {
      const body = {
        filters: {
          time_period: [{ start_date: this.dateOffset(-180), end_date: this.dateOffset(0) }],
          award_type_codes: ['A', 'B', 'C', 'D']
        },
        fields: ['Award ID', 'Recipient Name', 'Awarding Agency', 'Award Amount', 'Start Date', 'NAICS Code', 'Description'],
        limit: 30,
        page: 1,
        sort: 'Award Amount',
        order: 'desc'
      };

      const resp = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) throw new Error('USASpending API ' + resp.status);
      const json = await resp.json();
      if (!json.results || json.results.length === 0) return this.demoAwards();

      return json.results.map(r => ({
        title: r['Description'] || r['Award ID'] || 'Contract Award',
        recipient: r['Recipient Name'] || 'N/A',
        agency: r['Awarding Agency'] || 'N/A',
        amount: r['Award Amount'] || 0,
        date: (r['Start Date'] || '').slice(0, 10),
        naics: r['NAICS Code'] || '—'
      }));
    },

    demoAwards() {
      return [
        { title: 'Enterprise Cloud Hosting Services', recipient: 'Amazon Web Services GovCloud', agency: 'HHS', amount: 18500000, date: '2026-03-10', naics: '518210' },
        { title: 'Cybersecurity Monitoring & Incident Response', recipient: 'CrowdStrike Federal', agency: 'Treasury', amount: 12300000, date: '2026-02-28', naics: '541512' },
        { title: 'AI/ML Data Analytics Platform', recipient: 'Palantir Technologies', agency: 'DoT', amount: 9800000, date: '2026-02-15', naics: '511210' },
        { title: 'IT Modernization Advisory Services', recipient: 'Booz Allen Hamilton', agency: 'HHS', amount: 7200000, date: '2026-01-20', naics: '541611' },
        { title: 'Zero Trust Identity Management', recipient: 'Okta Federal', agency: 'Treasury', amount: 4500000, date: '2026-01-10', naics: '541519' }
      ];
    },

    renderAwards() {
      const tbody = document.getElementById('awardsTableBody');
      const filterVal = (document.getElementById('awardsFilter') || {}).value || '';
      const filtered = this.filterList(this.awards, filterVal);
      const end = (this.awardsPage + 1) * this.awardsPageSize;
      const visible = filtered.slice(0, end);

      tbody.innerHTML = visible.map(a => `
        <tr>
          <td>${this.escHtml(a.title)}</td>
          <td>${this.escHtml(a.recipient)}</td>
          <td>${this.escHtml(a.agency)}</td>
          <td>${this.formatCurrency(a.amount)}</td>
          <td>${a.date}</td>
          <td>${this.escHtml(a.naics)}</td>
        </tr>`).join('');

      const btn = document.getElementById('awardsShowMore');
      btn.style.display = end >= filtered.length ? 'none' : '';
    },

    bindAwardsFilter() {
      const input = document.getElementById('awardsFilter');
      if (input._bound) return;
      input._bound = true;
      input.addEventListener('input', () => {
        this.awardsPage = 0;
        this.renderAwards();
      });
    },

    bindAwardsShowMore() {
      const btn = document.getElementById('awardsShowMore');
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        this.awardsPage++;
        this.renderAwards();
      });
    },

    /* ---------- Policy & Signals ---------- */
    async loadPolicy() {
      const spinner = document.getElementById('policySpinner');
      spinner.style.display = 'block';

      let liveItems = [];
      try {
        const fedRegItems = await this.fetchFederalRegister();
        liveItems = liveItems.concat(fedRegItems);
      } catch (err) {
        console.warn('Federal Register API error:', err);
      }

      try {
        const gdeltItems = await this.fetchGDELT();
        liveItems = liveItems.concat(gdeltItems);
      } catch (err) {
        console.warn('GDELT API error:', err);
      }

      // Merge live items with curated data, avoid duplicates by title
      const titles = new Set(liveItems.map(i => i.title.toLowerCase()));
      const curated = CURATED_POLICY.filter(c => !titles.has(c.title.toLowerCase()));
      this.policyItems = [...liveItems, ...curated].sort((a, b) => b.date.localeCompare(a.date));

      this.renderPolicy();
      spinner.style.display = 'none';
      this.bindPolicyFilter();
      this.bindPolicyToggles();
    },

    async fetchFederalRegister() {
      const url = 'https://www.federalregister.gov/api/v1/documents.json?per_page=15&order=newest&conditions%5Btype%5D%5B%5D=PRESDOCU&conditions%5Btype%5D%5B%5D=NOTICE&conditions%5Bagencies%5D%5B%5D=executive-office-of-the-president&conditions%5Bagencies%5D%5B%5D=management-and-budget-office';
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Federal Register API ' + resp.status);
      const json = await resp.json();
      if (!json.results) return [];

      return json.results.map(doc => {
        let type = 'executive_order';
        if (doc.type === 'Notice') type = 'omb_notice';
        const daysDiff = (Date.now() - new Date(doc.publication_date)) / (1000 * 60 * 60 * 24);
        return {
          title: doc.title || 'Untitled',
          type: type,
          date: doc.publication_date || '',
          source: (doc.agencies && doc.agencies.length > 0) ? doc.agencies[0].name : 'Federal Register',
          description: doc.abstract || doc.excerpts || 'Federal Register document.',
          live: daysDiff < 14
        };
      });
    },

    async fetchGDELT() {
      const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=federal%20government%20technology%20contract&mode=ArtList&maxrecords=10&format=json';
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('GDELT API ' + resp.status);
      const json = await resp.json();
      if (!json.articles) return [];

      return json.articles.slice(0, 8).map(art => ({
        title: art.title || 'News Signal',
        type: 'contractor_intel',
        date: art.seendate ? art.seendate.slice(0, 10).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : new Date().toISOString().slice(0, 10),
        source: art.domain || 'GDELT',
        description: art.title || 'Competitive intelligence signal from GDELT news monitoring.',
        live: true,
        url: art.url
      }));
    },

    renderPolicy() {
      const feed = document.getElementById('policyFeed');
      const filterVal = (document.getElementById('policyFilter') || {}).value || '';
      const typeFilter = this.activePolicyType;

      let items = this.policyItems;
      if (typeFilter !== 'all') {
        items = items.filter(p => p.type === typeFilter);
      }
      if (filterVal) {
        const kw = filterVal.toLowerCase();
        items = items.filter(p =>
          p.title.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw) ||
          p.source.toLowerCase().includes(kw)
        );
      }

      if (items.length === 0) {
        feed.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:24px;">No policy items match your filters.</p>';
        return;
      }

      feed.innerHTML = items.map(p => `
        <div class="policy-item ${p.type}">
          <div class="policy-item-header">
            <span class="policy-item-title">${this.escHtml(p.title)}</span>
            ${p.live ? '<span class="live-badge">LIVE</span>' : ''}
          </div>
          <div class="policy-item-meta">${p.date} &middot; ${this.escHtml(p.source)}</div>
          <div class="policy-item-desc">${this.escHtml(p.description)}</div>
          ${p.url ? '<a href="' + p.url + '" target="_blank" rel="noopener" style="font-size:.8rem;margin-top:6px;display:inline-block;">Read more &rarr;</a>' : ''}
        </div>`).join('');
    },

    bindPolicyFilter() {
      const input = document.getElementById('policyFilter');
      if (input._bound) return;
      input._bound = true;
      input.addEventListener('input', () => this.renderPolicy());
    },

    bindPolicyToggles() {
      const container = document.getElementById('policyToggles');
      if (container._bound) return;
      container._bound = true;
      container.addEventListener('click', e => {
        const btn = e.target.closest('.toggle-btn');
        if (!btn) return;
        container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activePolicyType = btn.dataset.type;
        this.renderPolicy();
      });
    },

    /* ---------- Helpers ---------- */
    scoreBar(score) {
      const cls = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
      return `<div class="score-bar-wrap">
        <div class="score-bar"><div class="score-bar-fill ${cls}" style="width:${score}%"></div></div>
        <span class="score-text">${score}%</span>
      </div>`;
    },

    formatCurrency(val) {
      if (typeof val !== 'number') return val;
      if (val >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
      if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
      if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
      return '$' + val.toLocaleString();
    },

    filterList(arr, keyword) {
      if (!keyword) return arr;
      const kw = keyword.toLowerCase();
      return arr.filter(item =>
        Object.values(item).some(v =>
          String(v).toLowerCase().includes(kw)
        )
      );
    },

    escHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    dateOffset(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    },

    randomScore() {
      return Math.floor(Math.random() * 50) + 40;
    }
  };

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => Dashboard.init());
})();
