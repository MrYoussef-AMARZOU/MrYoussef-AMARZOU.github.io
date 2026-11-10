document.addEventListener('DOMContentLoaded', () => {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navLinkItems = document.querySelectorAll('.nav-link');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectsGrid = document.getElementById('projectsGrid');
    const projectsStatus = document.getElementById('projectsStatus');
    const contactForm = document.getElementById('contactForm');
    const themeToggle = document.getElementById('themeToggle');
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    const langOptions = document.querySelectorAll('.lang-option');
    const currentLangEl = document.getElementById('currentLang');
    let currentLang = localStorage.getItem('lang') || 'fr';
    let activeFilter = 'all';

    // Theme toggle
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    });

    // Language switcher
    const savedLang = localStorage.getItem('lang') || 'fr';
    setLanguage(savedLang);

    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('active');
    });

    langOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const lang = opt.dataset.lang;
            setLanguage(lang);
            localStorage.setItem('lang', lang);
            langDropdown.classList.remove('active');
        });
    });

    document.addEventListener('click', () => langDropdown.classList.remove('active'));

    function setLanguage(lang) {
        if (!translations[lang]) return;
        const t = translations[lang];
        currentLang = lang;

        // Set RTL for Arabic
        if (lang === 'ar') {
            document.documentElement.setAttribute('dir', 'rtl');
            document.documentElement.setAttribute('lang', 'ar');
            document.body.classList.add('rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
            document.documentElement.setAttribute('lang', lang);
            document.body.classList.remove('rtl');
        }

        // Update all data-i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (t[key]) el.textContent = t[key];
        });

        // Update data-i18n-html elements (with HTML tags)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            if (t[key]) el.innerHTML = t[key];
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (t[key]) el.placeholder = t[key];
        });

        // Update keyword lists rendered as chips (split on ·)
        document.querySelectorAll('[data-i18n-chips]').forEach(el => {
            const key = el.getAttribute('data-i18n-chips');
            if (t[key]) {
                el.innerHTML = t[key].split('·')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map(s => `<span>${escapeHtml(s)}</span>`)
                    .join('');
            }
        });

        // Update lang button
        currentLangEl.textContent = lang.toUpperCase();
        langOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === lang);
        });

        applyFilter();
    }

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 100;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            const link = document.querySelector(`.nav-link[href="#${id}"]`);
            if (link) {
                link.classList.toggle('active', scrollY >= top && scrollY < top + height);
            }
        });
    });

    // Mobile menu
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    navLinkItems.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Live GitHub projects (2 user accounts + the CortexLLMs organization)
    const GITHUB_USERS = ['MrYoussef-AMARZOU', 'Youssef-AMARZOU', 'CortexLLMs'];
    // Not real projects: profile READMEs, GitHub Pages site repos, tutorial clones
    const NON_PROJECT_REPOS = ['MrYoussef-AMARZOU', 'Youssef-AMARZOU', 'Mr-Youssef', 'skills-introduction-to-github'];
    // Own contribution to a fork worth showing anyway
    const CONTRIBUTED_FORKS = ['opencode-ip-rotator'];
    // Extra tags not present in GitHub repo topics
    const EXTRA_TAGS = {
        'pentest-lab': ['Kali Linux']
    };
    // Repos that also belong to the Healthcare / Santé filter
    const HEALTH_REPOS = ['carewatch'];
    let githubCache = [];

    const TOPIC_MAP = {
        ai: ['ai', 'llm', 'agent', 'rag', 'ml', 'machine-learning', 'deep-learning', 'nlp', 'computer-vision', 'pytorch', 'tensorflow', 'langchain', 'genai', 'llama'],
        data: ['data', 'etl', 'pipeline', 'kafka', 'iceberg', 'mongodb', 'sql', 'analytics', 'pandas', 'power-bi', 'data-engineering', 'spark'],
        industry: ['industry', 'iiot', 'iot', 'scada', 'plc', 'opcua', 'modbus', 'hmi', 'matlab', 'automation', 'rpa', 'factory'],
        civil: ['civil', 'structural', 'genie-civil', 'beton', 'concrete', 'eurocode', 'construction', 'building', 'boq', 'bim'],
        web: ['web', 'react', 'nextjs', 'vue', 'angular', 'frontend', 'fullstack', 'dashboard', 'erp', 'saas', 'javascript', 'typescript']
    };

    function detectCategory(repo) {
        const haystack = [
            ...(repo.topics || []),
            repo.name || '',
            repo.description || '',
            repo.language || ''
        ].join(' ').toLowerCase();

        const cats = Object.keys(TOPIC_MAP).filter(cat =>
            TOPIC_MAP[cat].some(topic => haystack.includes(topic))
        );

        if (!cats.length) {
            const lang = (repo.language || '').toLowerCase();
            if (['python', 'typescript', 'javascript', 'rust', 'go'].includes(lang)) cats.push('web');
            else cats.push('data');
        }

        if (HEALTH_REPOS.includes((repo.name || '').toLowerCase()) && !cats.includes('health')) cats.push('health');

        return cats;
    }

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const ICONS = {
        ai: 'fa-robot',
        data: 'fa-database',
        industry: 'fa-industry',
        civil: 'fa-helmet-safety',
        web: 'fa-code',
        health: 'fa-heart-pulse'
    };

    function buildProjectCard(repo) {
        const cats = detectCategory(repo);
        const category = cats.join(' ');
        const primaryIcon = ICONS[cats[0]] || 'fa-code';
        const topics = (repo.topics || []).slice(0, 4);
        const langTag = repo.language ? `<span>${escapeHtml(repo.language)}</span>` : '';
        const topicTags = topics.map(t => `<span>${escapeHtml(t)}</span>`).join('');
        const forkTag = repo.fork ? '<span>Fork</span>' : '';
        const extraTags = (EXTRA_TAGS[repo.name] || []).map(t => `<span>${escapeHtml(t)}</span>`).join('');
        const homepage = repo.homepage
            ? `<a href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener" class="project-link"><i class="fas fa-external-link-alt"></i> <span data-i18n="btn_demo">Demo</span></a>`
            : '';
        const stars = repo.stargazers_count
            ? `<span class="project-stars"><i class="fas fa-star"></i> ${repo.stargazers_count}</span>`
            : '';

        return `
            <article class="project-card" data-category="${category}">
                <div class="project-head">
                    <div class="project-icon"><i class="fas ${primaryIcon}"></i></div>
                    <div class="project-head-text">
                        <h4>${escapeHtml(repo.name)}</h4>
                        ${stars}
                    </div>
                </div>
                <p class="project-desc">${escapeHtml(repo.description || '')}</p>
                <div class="project-tags">${langTag}${forkTag}${extraTags}${topicTags}</div>
                <div class="project-links-row">
                    <a href="${escapeHtml(repo.html_url)}" target="_blank" rel="noopener" class="project-link"><i class="fab fa-github"></i> <span data-i18n="btn_code">Code</span></a>
                    ${homepage}
                </div>
            </article>`;
    }

    // Pinned project (Kaggle) — kept outside the GitHub feed so it survives the live refresh
    const PINNED_CARD = `
            <article class="project-card" data-category="ai data health">
                <div class="project-head">
                    <div class="project-icon"><i class="fas fa-microscope"></i></div>
                    <div class="project-head-text">
                        <h4>RSNA Knee Detection</h4>
                    </div>
                </div>
                <p class="project-type" data-i18n="proj9_type">Compet Kaggle — Détection IRM du genou</p>
                <p class="project-desc" data-i18n="proj9_desc">Prédiction de 12 lésions du genou sur IRM DICOM : DINOv2 + attention MIL, sélection de séquences sur 3 plans, TTA.</p>
                <div class="project-tags"><span>Python</span><span>PyTorch</span><span>DICOM</span><span>MRI</span></div>
                <div class="project-links-row">
                    <a href="https://www.kaggle.com/amarzouyoussef" target="_blank" rel="noopener" class="project-link"><i class="fab fa-kaggle"></i> Kaggle</a>
                </div>
            </article>`;

    // Keep the "Projets GitHub" stat in sync with the live feed
    function updateProjectStat(count) {
        const label = document.querySelector('[data-i18n="stat_projects"]');
        if (!label) return;
        const el = label.parentElement.querySelector('.stat-number');
        if (!el) return;
        el.dataset.count = String(count);
        if (el.dataset.animated) el.textContent = String(count);
    }

    function applyFilter() {
        if (!projectsGrid) return;
        projectsGrid.querySelectorAll('.project-card').forEach(card => {
            const show = activeFilter === 'all' || card.dataset.category.split(' ').includes(activeFilter);
            card.classList.toggle('hidden', !show);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            applyFilter();
        });
    });

    async function fetchProjects() {
        if (!projectsGrid) return;

        const results = await Promise.allSettled(
            GITHUB_USERS.map(user =>
                fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=updated`, {
                    headers: { 'Accept': 'application/vnd.github+json' }
                }).then(res => {
                    if (!res.ok) throw new Error(res.status);
                    return res.json();
                })
            )
        );

        const seen = new Set();
        const repos = results
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value)
            .filter(repo => {
                const name = repo.name || '';
                if (NON_PROJECT_REPOS.includes(name)) return false;   // profile READMEs, tutorial clones
                if (/\.github\.io$/.test(name)) return false;         // site HTML repos
                if (CONTRIBUTED_FORKS.includes(name)) return true;    // shown despite being a fork
                return !repo.fork && !repo.archived;
            })
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            // dedup: the same repo name can exist on both accounts and in the org
            .filter(repo => {
                const key = (repo.name || '').toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });

        if (!repos.length) {
            if (projectsStatus) {
                projectsStatus.textContent = 'GitHub API indisponible (rate limit). Rechargez la page.';
                projectsStatus.hidden = false;
            }
            return;
        }

        githubCache = repos;
        projectsGrid.innerHTML = PINNED_CARD + repos.map(buildProjectCard).join('');
        updateProjectStat(repos.length);
        if (projectsStatus) projectsStatus.hidden = true;
        applyFilter();
        setLanguage(currentLang);
    }

    fetchProjects();

    // Counter animation
    const animateCounter = (el) => {
        const target = parseInt(el.dataset.count);
        const duration = 2000;
        const start = performance.now();
        const update = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('stat-item')) {
                    const counter = entry.target.querySelector('.stat-number');
                    if (counter && !counter.dataset.animated) {
                        counter.dataset.animated = 'true';
                        animateCounter(counter);
                    }
                }
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.skill-card, .timeline-item, .project-card, .stat-item, .contact-link, .about-right, .about-stats, .about-info, .contact-form, .about-left').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Contact form
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.style.background = '#22c55e';
        setTimeout(() => { btn.textContent = originalText; btn.style.background = ''; contactForm.reset(); }, 2000);
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });
});
