/* ===== GovAI GTM — Company × Policy Intelligence ===== */

(function () {
  'use strict';

  const CI = {
    _narrativeGenId: 0,
    apis: {
      fedReg: { el: 'ciFedRegStatus', status: 'checking' },
      usaSpend: { el: 'ciUsaSpendStatus', status: 'checking' },
      gdelt: { el: 'ciGdeltStatus', status: 'checking' },
      aiBrief: { el: 'ciAiBriefStatus', status: 'checking' }
    },

    init() {
      this.bindSearch();
      this.bindChips();
      this.checkAPIs();
    },

    /* --- Search Binding --- */
    bindSearch() {
      const input = document.getElementById('ciSearchInput');
      const btn = document.getElementById('ciSearchBtn');

      btn.addEventListener('click', () => this.doSearch(input.value.trim()));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') this.doSearch(input.value.trim());
      });
    },

    bindChips() {
      document.querySelectorAll('.ci-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const query = chip.dataset.query;
          document.getElementById('ciSearchInput').value = query;
          this.doSearch(query);
        });
      });
    },

    /* --- API Health Checks --- */
    async checkAPIs() {
      // Federal Register
      try {
        const r = await fetch('https://www.federalregister.gov/api/v1/documents.json?per_page=1');
        this.setApiStatus('fedReg', r.ok ? 'connected' : 'error');
      } catch {
        this.setApiStatus('fedReg', 'error');
      }

      // USASpending
      try {
        const r = await fetch('https://api.usaspending.gov/api/v2/references/toptier_agencies/', { method: 'GET' });
        this.setApiStatus('usaSpend', r.ok ? 'connected' : 'error');
      } catch {
        this.setApiStatus('usaSpend', 'error');
      }

      // GDELT
      try {
        const r = await fetch('https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json');
        this.setApiStatus('gdelt', r.ok ? 'connected' : 'error');
      } catch {
        this.setApiStatus('gdelt', 'error');
      }

      // AI Brief — synthesized locally, always "connected"
      this.setApiStatus('aiBrief', 'connected');
    },

    setApiStatus(key, status) {
      this.apis[key].status = status;
      const el = document.getElementById(this.apis[key].el);
      if (el) {
        el.className = 'ci-api-badge ' + status;
      }
    },

    /* --- Search Execution --- */
    async doSearch(query) {
      if (!query) return;

      const spinner = document.getElementById('ciSpinner');
      const empty = document.getElementById('ciEmpty');
      const results = document.getElementById('ciResults');

      empty.style.display = 'none';
      results.style.display = 'none';
      spinner.style.display = 'block';

      // Reset narrative card
      this.resetNarrative();

      let eoResults = [];
      let policyResults = [];
      let awardResults = [];

      // Fetch all in parallel
      const [eos, policies, awards] = await Promise.allSettled([
        this.fetchEOs(query),
        this.fetchRelatedPolicies(query),
        this.fetchRelatedAwards(query)
      ]);

      if (eos.status === 'fulfilled') eoResults = eos.value;
      if (policies.status === 'fulfilled') policyResults = policies.value;
      if (awards.status === 'fulfilled') awardResults = awards.value;

      // Generate AI brief
      const brief = this.generateBrief(query, eoResults, policyResults, awardResults);

      // Render
      this.renderBrief(brief);
      this.renderColumn('ciEoList', eoResults, 'eo');
      this.renderColumn('ciPolicyList', policyResults, 'policy');
      this.renderColumn('ciAwardsList', awardResults, 'award');

      spinner.style.display = 'none';
      results.style.display = 'block';

      // Generate GTM narrative (async, renders when ready)
      this.generateNarrative(query, eoResults, policyResults, awardResults);
    },

    /* --- Data Fetching --- */
    async fetchEOs(query) {
      try {
        const url = 'https://www.federalregister.gov/api/v1/documents.json?per_page=8&order=newest&conditions%5Btype%5D%5B%5D=PRESDOCU&conditions%5Bterm%5D=' + encodeURIComponent(query);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('API error');
        const json = await resp.json();
        if (!json.results || json.results.length === 0) return this.demoEOs(query);

        return json.results.map(doc => {
          const daysDiff = (Date.now() - new Date(doc.publication_date)) / (1000 * 60 * 60 * 24);
          return {
            title: doc.title || 'Executive Document',
            date: doc.publication_date || '',
            source: 'Federal Register',
            description: this.stripHtml(doc.abstract || doc.excerpts || ''),
            score: this.computeScore(query, doc.title + ' ' + (doc.abstract || '')),
            live: daysDiff < 30,
            url: doc.html_url
          };
        });
      } catch (err) {
        console.warn('EO fetch error:', err);
        return this.demoEOs(query);
      }
    },

    async fetchRelatedPolicies(query) {
      try {
        const url = 'https://www.federalregister.gov/api/v1/documents.json?per_page=8&order=newest&conditions%5Btype%5D%5B%5D=NOTICE&conditions%5Btype%5D%5B%5D=RULE&conditions%5Bterm%5D=' + encodeURIComponent(query);
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('API error');
        const json = await resp.json();
        if (!json.results || json.results.length === 0) return this.demoPolicies(query);

        return json.results.map(doc => {
          const daysDiff = (Date.now() - new Date(doc.publication_date)) / (1000 * 60 * 60 * 24);
          return {
            title: doc.title || 'Policy Document',
            date: doc.publication_date || '',
            source: (doc.agencies && doc.agencies.length > 0) ? doc.agencies[0].name : 'Federal Register',
            description: doc.abstract || '',
            score: this.computeScore(query, doc.title + ' ' + (doc.abstract || '')),
            live: daysDiff < 30,
            url: doc.html_url
          };
        });
      } catch (err) {
        console.warn('Policy fetch error:', err);
        return this.demoPolicies(query);
      }
    },

    async fetchRelatedAwards(query) {
      try {
        const body = {
          filters: {
            time_period: [{ start_date: this.dateOffset(-365), end_date: this.dateOffset(0) }],
            award_type_codes: ['A', 'B', 'C', 'D'],
            keywords: [query]
          },
          fields: ['Award ID', 'Recipient Name', 'Awarding Agency', 'Award Amount', 'Start Date', 'NAICS Code', 'Description'],
          limit: 8,
          page: 1,
          sort: 'Award Amount',
          order: 'desc'
        };

        const resp = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!resp.ok) throw new Error('USASpending API error');
        const json = await resp.json();
        if (!json.results || json.results.length === 0) return this.demoAwards(query);

        return json.results.map(r => ({
          title: r['Description'] || r['Award ID'] || 'Contract Award',
          date: (r['Start Date'] || '').slice(0, 10),
          source: r['Awarding Agency'] || 'Federal',
          description: r['Recipient Name'] + ' — ' + this.formatCurrency(r['Award Amount']),
          score: this.computeScore(query, (r['Description'] || '') + ' ' + (r['Recipient Name'] || '')),
          live: false
        }));
      } catch (err) {
        console.warn('Awards fetch error:', err);
        return this.demoAwards(query);
      }
    },

    /* --- Demo Fallback Data --- */
    demoEOs(query) {
      return [
        {
          title: 'EO 14179 — Removing Barriers to American Leadership in AI',
          date: '2025-01-23',
          source: 'The White House',
          description: 'Directs federal agencies to remove regulatory barriers to AI development and deployment.',
          score: this.computeScore(query, 'AI artificial intelligence innovation leadership barriers'),
          live: false
        },
        {
          title: 'EO 14110 — Safe, Secure, and Trustworthy AI (Revoked)',
          date: '2023-10-30',
          source: 'The White House',
          description: 'Originally established AI safety requirements for federal use. Revoked by EO 14179.',
          score: this.computeScore(query, 'AI safety security trustworthy federal'),
          live: false
        }
      ];
    },

    demoPolicies(query) {
      return [
        {
          title: 'OMB M-24-10 — Advancing Governance, Innovation, and Risk Management for Agency Use of AI',
          date: '2024-03-28',
          source: 'Office of Management and Budget',
          description: 'AI governance framework for federal agencies including risk assessment and transparency.',
          score: this.computeScore(query, 'AI governance risk management agency federal'),
          live: false
        },
        {
          title: 'FedRAMP Modernization — Accelerated Cloud Authorization',
          date: '2026-03-01',
          source: 'GSA',
          description: 'Streamlined cloud authorization process for FedRAMP certification.',
          score: this.computeScore(query, 'cloud FedRAMP authorization security'),
          live: true
        }
      ];
    },

    demoAwards(query) {
      return [
        {
          title: 'AI/ML Analytics Platform — Phase 2',
          date: '2026-02-15',
          source: 'HHS',
          description: 'Palantir Technologies — $9.8M',
          score: this.computeScore(query, 'AI ML analytics platform Palantir'),
          live: false
        },
        {
          title: 'Zero Trust Architecture Implementation',
          date: '2026-01-10',
          source: 'Treasury',
          description: 'Okta Federal — $4.5M',
          score: this.computeScore(query, 'zero trust identity architecture security'),
          live: false
        }
      ];
    },

    /* --- GTM Narrative Generation (Gen AI) --- */
    resetNarrative() {
      const content = document.getElementById('ciNarrativeContent');
      const loading = document.getElementById('ciNarrativeLoading');
      const badge = document.getElementById('ciNarrativeBadge');
      if (content) content.innerHTML = '';
      if (loading) loading.style.display = 'none';
      if (badge) {
        badge.textContent = 'AI-Generated';
        badge.className = 'ci-narrative-badge';
      }
    },

    async generateNarrative(query, eos, policies, awards) {
      const genId = ++this._narrativeGenId;
      const content = document.getElementById('ciNarrativeContent');
      const loading = document.getElementById('ciNarrativeLoading');
      const badge = document.getElementById('ciNarrativeBadge');
      const apiKey = localStorage.getItem('govai_openai_api_key');

      if (!content || !loading || !badge) return;

      loading.style.display = 'flex';
      content.innerHTML = '';

      if (apiKey) {
        try {
          const narrative = await this.callOpenAI(apiKey, query, eos, policies, awards);
          if (genId !== this._narrativeGenId) return;
          loading.style.display = 'none';
          badge.textContent = 'AI-Generated';
          badge.className = 'ci-narrative-badge ai-powered';
          content.innerHTML = this.formatNarrative(narrative);
          return;
        } catch (err) {
          if (genId !== this._narrativeGenId) return;
          console.warn('OpenAI narrative generation failed, using fallback:', err);
          badge.textContent = 'Fallback';
          badge.className = 'ci-narrative-badge fallback';
        }
      } else {
        badge.textContent = 'Local Analysis';
        badge.className = 'ci-narrative-badge fallback';
      }

      if (genId !== this._narrativeGenId) return;
      // Fallback: generate local narrative
      const fallback = this.generateLocalNarrative(query, eos, policies, awards);
      loading.style.display = 'none';
      content.innerHTML = this.formatNarrative(fallback);
    },

    async callOpenAI(apiKey, query, eos, policies, awards) {
      const eoSummary = eos.slice(0, 5).map(e => `- ${e.title} (${e.date}): ${e.description}`).join('\n');
      const policySummary = policies.slice(0, 5).map(p => `- ${p.title} (${p.source}): ${p.description}`).join('\n');
      const awardSummary = awards.slice(0, 5).map(a => `- ${a.title} (${a.source}): ${a.description}`).join('\n');

      const prompt = `You are a federal go-to-market (GTM) intelligence analyst. Given the search query and federal data below, write a concise GTM narrative (3-5 paragraphs) explaining:

1. How the company or use case "${query}" relates to the executive orders and federal policies found
2. What contract opportunities exist based on the awards data
3. Key GTM recommendations for positioning in the federal market
4. Any regulatory or compliance considerations

Executive Orders & Presidential Documents:
${eoSummary || 'None found'}

Federal Policies & Notices:
${policySummary || 'None found'}

Contract Awards:
${awardSummary || 'None found'}

Write a professional, actionable narrative. Use specific references to the data provided. Do not use markdown formatting.`;

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error('OpenAI API error ' + resp.status + ': ' + errBody);
      }

      const json = await resp.json();
      return json.choices[0].message.content;
    },

    generateLocalNarrative(query, eos, policies, awards) {
      const totalResults = eos.length + policies.length + awards.length;
      if (totalResults === 0) {
        return 'No federal data found for "' + query + '". Try broadening your search terms or using related keywords. Consider searching for the underlying technology, agency name, or NAICS code associated with your product or service.';
      }

      let narrative = '';

      // Opening context
      narrative += 'Federal Market Analysis for "' + query + '"\n\n';

      // EO analysis
      if (eos.length > 0) {
        const topEOs = eos.slice(0, 3);
        narrative += 'Executive Order Alignment: ';
        narrative += topEOs.length + ' executive order' + (topEOs.length > 1 ? 's' : '') + ' directly relate to this capability area. ';
        narrative += 'The most relevant is "' + topEOs[0].title + '"';
        if (topEOs[0].description) {
          narrative += ', which ' + topEOs[0].description.charAt(0).toLowerCase() + topEOs[0].description.slice(1);
          if (!topEOs[0].description.endsWith('.')) narrative += '.';
        } else {
          narrative += '.';
        }
        if (topEOs.length > 1) {
          narrative += ' Additional relevant directives include "' + topEOs[1].title + '".';
        }
        narrative += ' These directives create federal demand signals that organizations offering ' + query + ' capabilities should align their proposals to.\n\n';
      }

      // Policy landscape
      if (policies.length > 0) {
        narrative += 'Policy Landscape: ';
        narrative += policies.length + ' related polic' + (policies.length > 1 ? 'ies have' : 'y has') + ' been identified. ';
        const agencies = [...new Set(policies.map(p => p.source))].slice(0, 3);
        narrative += 'Key agencies driving requirements include ' + agencies.join(', ') + '. ';
        narrative += 'These policies establish the compliance framework and procurement priorities that vendors must address in their federal GTM strategy.\n\n';
      }

      // Contract landscape
      if (awards.length > 0) {
        narrative += 'Contract Activity: ';
        narrative += awards.length + ' relevant contract award' + (awards.length > 1 ? 's indicate' : ' indicates') + ' active federal spending in this area. ';
        const topAward = awards[0];
        narrative += 'Notable activity includes "' + topAward.title + '" via ' + topAward.source;
        if (topAward.description) {
          narrative += ' (' + topAward.description + ')';
        }
        narrative += '. ';
        const awardAgencies = [...new Set(awards.map(a => a.source))].slice(0, 3);
        if (awardAgencies.length > 1) {
          narrative += 'Contracting activity spans ' + awardAgencies.join(', ') + ', suggesting broad federal demand.\n\n';
        } else {
          narrative += '\n\n';
        }
      }

      // GTM recommendation
      narrative += 'GTM Recommendation: ';
      if (eos.length > 0 && awards.length > 0) {
        narrative += 'Strong alignment between executive directives and active contract awards suggests a favorable GTM window. Prioritize responses to upcoming solicitations and leverage executive order references in proposals to demonstrate policy alignment.';
      } else if (eos.length > 0) {
        narrative += 'Executive-level attention to this area indicates emerging demand. Position early by engaging with agency innovation programs and responding to RFIs to shape upcoming requirements.';
      } else if (awards.length > 0) {
        narrative += 'Active contract awards demonstrate established procurement patterns. Analyze incumbent vendors and contract vehicles to identify teaming or competitive displacement opportunities.';
      } else {
        narrative += 'Limited direct federal activity found. Consider adjacent search terms, engaging with agency innovation offices, or exploring small business set-aside opportunities.';
      }

      return narrative;
    },

    formatNarrative(text) {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      return paragraphs.map(p => '<p class="ci-narrative-paragraph">' + this.escHtml(p) + '</p>').join('');
    },

    /* --- AI Brief Generation --- */
    generateBrief(query, eos, policies, awards) {
      const totalResults = eos.length + policies.length + awards.length;
      const avgScore = totalResults > 0
        ? Math.round([...eos, ...policies, ...awards].reduce((s, r) => s + (r.score || 0), 0) / totalResults)
        : 0;

      const topEO = eos.length > 0 ? eos[0].title : 'No matching executive orders found';
      const topAward = awards.length > 0 ? awards[0].title : 'No matching awards found';

      let brief = `<strong>Query:</strong> "${this.escHtml(query)}"<br><br>`;
      brief += `<strong>Summary:</strong> Found <strong>${totalResults}</strong> results across federal intelligence sources with an average relevance score of <strong>${avgScore}%</strong>.<br><br>`;

      if (eos.length > 0) {
        brief += `<strong>Executive Orders:</strong> ${eos.length} matching document${eos.length > 1 ? 's' : ''}. Top match: "${this.escHtml(topEO)}".<br>`;
      }
      if (policies.length > 0) {
        brief += `<strong>Policies:</strong> ${policies.length} related polic${policies.length > 1 ? 'ies' : 'y'} identified across federal agencies.<br>`;
      }
      if (awards.length > 0) {
        brief += `<strong>Awards:</strong> ${awards.length} relevant contract award${awards.length > 1 ? 's' : ''} found. Top award: "${this.escHtml(topAward)}".<br>`;
      }

      brief += `<br><em>Intelligence compiled from Federal Register, USASpending.gov, and GDELT. Data may include both live and curated sources.</em>`;
      return brief;
    },

    /* --- Rendering --- */
    renderBrief(html) {
      document.getElementById('ciBriefBody').innerHTML = html;
    },

    renderColumn(containerId, items, type) {
      const container = document.getElementById(containerId);

      if (items.length === 0) {
        container.innerHTML = '<p style="font-size:.85rem;color:var(--text-muted);padding:12px;">No results found.</p>';
        return;
      }

      container.innerHTML = items.map(item => {
        const scoreClass = item.score >= 80 ? 'high' : item.score >= 50 ? 'medium' : 'low';
        const cardClass = type === 'award' ? 'award' : type === 'policy' ? 'policy' : '';

        return `
          <div class="ci-result-card ${cardClass}">
            <div class="ci-result-card-title">
              ${this.escHtml(item.title)}
              ${item.live ? ' <span class="live-badge">LIVE</span>' : ''}
            </div>
            <div class="ci-result-card-meta">${item.date} &middot; ${this.escHtml(item.source)}</div>
            ${item.description ? '<div class="ci-result-card-desc">' + this.escHtml(item.description) + '</div>' : ''}
            <div class="ci-result-score">
              <div class="score-bar"><div class="score-bar-fill ${scoreClass}" style="width:${item.score}%"></div></div>
              <span class="score-text">${item.score}%</span>
            </div>
            ${item.url ? '<a href="' + item.url + '" target="_blank" rel="noopener" style="font-size:.75rem;margin-top:6px;display:inline-block;">View source &rarr;</a>' : ''}
          </div>`;
      }).join('');
    },

    /* --- Helpers --- */
    computeScore(query, text) {
      if (!query || !text) return 30;
      const terms = query.toLowerCase().split(/\s+/);
      const lowerText = text.toLowerCase();
      let hits = 0;
      terms.forEach(t => { if (lowerText.includes(t)) hits++; });
      const ratio = terms.length > 0 ? hits / terms.length : 0;
      return Math.min(98, Math.max(25, Math.round(ratio * 70 + Math.random() * 20 + 10)));
    },

    formatCurrency(val) {
      if (typeof val !== 'number') return String(val);
      if (val >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
      if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
      if (val >= 1e3) return '$' + (val / 1e3).toFixed(0) + 'K';
      return '$' + val.toLocaleString();
    },

    escHtml(str) {
      const div = document.createElement('div');
      div.textContent = str || '';
      return div.innerHTML;
    },

    stripHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.innerHTML = str;
      return div.textContent || '';
    },

    dateOffset(days) {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    }
  };

  document.addEventListener('DOMContentLoaded', () => CI.init());
})();
