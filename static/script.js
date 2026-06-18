// Global State
let rawEntries = [];
let updates = [];
let activeFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;
let lastSyncedTime = null;

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const refreshIcon = document.getElementById('refreshIcon');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterTabs = document.getElementById('filterTabs');
const releasesFeed = document.getElementById('releasesFeed');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const retryBtn = document.getElementById('retryBtn');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const lastSyncedTimeEl = document.getElementById('lastSyncedTime');

// Stats Elements
const statFeatures = document.getElementById('statFeatures');
const statChanges = document.getElementById('statChanges');
const statDeprecations = document.getElementById('statDeprecations');
const statFixes = document.getElementById('statFixes');

// Badges Elements
const badgeAll = document.getElementById('badgeAll');
const badgeFeatures = document.getElementById('badgeFeatures');
const badgeChanges = document.getElementById('badgeChanges');
const badgeDeprecations = document.getElementById('badgeDeprecations');
const badgeFixes = document.getElementById('badgeFixes');

// Modal Elements
const tweetModal = document.getElementById('tweetModal');
const tweetContent = document.getElementById('tweetContent');
const charCount = document.getElementById('charCount');
const charWarning = document.getElementById('charWarning');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelTweetBtn = document.getElementById('cancelTweetBtn');
const submitTweetBtn = document.getElementById('submitTweetBtn');

// Toast Element
const toast = document.getElementById('toast');

// Icon map for release types
const TYPE_ICONS = {
    'Feature': 'fa-solid fa-rocket',
    'Change': 'fa-solid fa-gears',
    'Deprecation': 'fa-solid fa-triangle-exclamation',
    'Bug Fix': 'fa-solid fa-bug',
    'General': 'fa-solid fa-circle-info'
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();

    refreshBtn.addEventListener('click', () => fetchReleases(true));
    retryBtn.addEventListener('click', () => fetchReleases(true));
    
    // Search
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // Filters
    filterTabs.addEventListener('click', handleFilterChange);
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Modal
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    submitTweetBtn.addEventListener('click', postTweet);
    tweetContent.addEventListener('input', updateCharCount);

    // Close modal on clicking backdrop
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });
});

// Fetch release notes from backend API
async function fetchReleases(forceRefresh = false) {
    showLoading();
    setRefreshButtonLoading(true);

    const url = forceRefresh ? '/api/releases/refresh' : '/api/releases';

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const resData = await response.json();
        
        if (resData.success) {
            rawEntries = resData.data.entries || [];
            processReleases(rawEntries);
            updateStats();
            filterAndRender();
            
            lastSyncedTime = new Date();
            lastSyncedTimeEl.textContent = lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            if (forceRefresh) {
                showToast('Release notes synchronized successfully!', 'success');
            }
        } else {
            throw new Error(resData.error || 'Unknown server error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
    } finally {
        setRefreshButtonLoading(false);
    }
}

// Enable/Disable loading spinner on refresh button
function setRefreshButtonLoading(isLoading) {
    if (isLoading) {
        refreshBtn.disabled = true;
        refreshIcon.classList.add('fa-spin-fast');
    } else {
        refreshBtn.disabled = false;
        refreshIcon.classList.remove('fa-spin-fast');
    }
}

// Parse feed entries into individual granular updates
function processReleases(entries) {
    updates = [];
    
    entries.forEach(entry => {
        const dateStr = entry.title; // e.g. "June 17, 2026"
        const htmlContent = entry.content;
        const link = entry.link;
        const entryId = entry.id;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Find headings that denote release category
        const headings = doc.querySelectorAll('h2, h3, h4');
        
        if (headings.length === 0) {
            // No sections, parse the whole block
            const textContent = doc.body.textContent.trim();
            updates.push({
                id: entryId,
                date: dateStr,
                type: 'General',
                contentHtml: htmlContent,
                contentText: textContent,
                link: link
            });
        } else {
            headings.forEach((heading, idx) => {
                const typeText = heading.textContent.trim();
                const normalizedType = normalizeType(typeText);
                
                // Collect sibling nodes until the next heading
                let sibling = heading.nextElementSibling;
                let childHTML = '';
                let childText = '';
                
                while (sibling && !['H2', 'H3', 'H4'].includes(sibling.tagName)) {
                    childHTML += sibling.outerHTML;
                    childText += sibling.textContent + ' ';
                    sibling = sibling.nextElementSibling;
                }
                
                // Fallback for sibling text content
                if (!childHTML.trim()) {
                    let nextNode = heading.nextSibling;
                    while (nextNode && nextNode !== sibling) {
                        if (nextNode.nodeType === Node.TEXT_NODE) {
                            childText += nextNode.textContent;
                            childHTML += nextNode.textContent;
                        } else if (nextNode.nodeType === Node.ELEMENT_NODE) {
                            childText += nextNode.textContent;
                            childHTML += nextNode.outerHTML;
                        }
                        nextNode = nextNode.nextSibling;
                    }
                }

                // If content is still empty, skip or default
                if (childHTML.trim() || childText.trim()) {
                    updates.push({
                        id: `${entryId}_${idx}`,
                        date: dateStr,
                        type: normalizedType,
                        contentHtml: childHTML || `<p>${childText}</p>`,
                        contentText: childText.trim().replace(/\s+/g, ' '),
                        link: link
                    });
                }
            });
        }
    });
}

// Normalize heading text into standard types
function normalizeType(typeText) {
    const text = typeText.toLowerCase().trim();
    if (text.includes('feature')) return 'Feature';
    if (text.includes('change')) return 'Change';
    if (text.includes('deprecation')) return 'Deprecation';
    if (text.includes('bug') || text.includes('fix')) return 'Bug Fix';
    return 'General';
}

// Compute stats counts
function updateStats() {
    let features = 0;
    let changes = 0;
    let deprecations = 0;
    let fixes = 0;

    updates.forEach(up => {
        if (up.type === 'Feature') features++;
        else if (up.type === 'Change') changes++;
        else if (up.type === 'Deprecation') deprecations++;
        else if (up.type === 'Bug Fix') fixes++;
    });

    // Animate stats numbers
    animateNumber(statFeatures, features);
    animateNumber(statChanges, changes);
    animateNumber(statDeprecations, deprecations);
    animateNumber(statFixes, fixes);

    // Update filter badges
    badgeAll.textContent = updates.length;
    badgeFeatures.textContent = features;
    badgeChanges.textContent = changes;
    badgeDeprecations.textContent = deprecations;
    badgeFixes.textContent = fixes;
}

// Number animation helper
function animateNumber(element, target) {
    let current = parseInt(element.textContent) || 0;
    if (current === target) return;
    
    const duration = 800; // ms
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing curve (easeOutQuad)
        const ease = progress * (2 - progress);
        const nextValue = Math.floor(current + (target - current) * ease);
        element.textContent = nextValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target;
        }
    }
    requestAnimationFrame(update);
}

// Handle Search Event
function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    if (searchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    filterAndRender();
}

// Clear Search Input
function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    filterAndRender();
}

// Handle Filter pill selection
function handleFilterChange(e) {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    // Set active class
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    tab.classList.add('active');

    activeFilter = tab.getAttribute('data-type');
    filterAndRender();
}

// Reset filters and search
function resetFilters() {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-tab[data-type="all"]').classList.add('active');
    activeFilter = 'all';

    filterAndRender();
}

// Filters & updates rendering
function filterAndRender() {
    let filtered = updates;

    // Filter by Tab Type
    if (activeFilter !== 'all') {
        filtered = filtered.filter(up => up.type.toLowerCase() === activeFilter);
    }

    // Filter by Search text query
    if (searchQuery) {
        filtered = filtered.filter(up => {
            return up.type.toLowerCase().includes(searchQuery) ||
                   up.date.toLowerCase().includes(searchQuery) ||
                   up.contentText.toLowerCase().includes(searchQuery);
        });
    }

    renderUpdates(filtered);
}

// Render filtered updates to page feed
function renderUpdates(filteredUpdates) {
    releasesFeed.innerHTML = '';

    if (filteredUpdates.length === 0) {
        showEmpty();
        return;
    }

    hideStates();

    filteredUpdates.forEach(up => {
        const card = document.createElement('article');
        card.className = 'release-card';
        card.id = `card_${up.id}`;

        // Set type color variables
        let badgeColorVar, badgeGlowVar, rgbGlow;
        if (up.type === 'Feature') {
            badgeColorVar = 'var(--color-feature)';
            badgeGlowVar = 'var(--glow-feature)';
            rgbGlow = '16, 185, 129';
        } else if (up.type === 'Change') {
            badgeColorVar = 'var(--color-change)';
            badgeGlowVar = 'var(--glow-change)';
            rgbGlow = '59, 130, 246';
        } else if (up.type === 'Deprecation') {
            badgeColorVar = 'var(--color-deprecation)';
            badgeGlowVar = 'var(--glow-deprecation)';
            rgbGlow = '245, 158, 11';
        } else if (up.type === 'Bug Fix') {
            badgeColorVar = 'var(--color-fix)';
            badgeGlowVar = 'var(--glow-fix)';
            rgbGlow = '236, 72, 153';
        } else {
            badgeColorVar = 'var(--color-general)';
            badgeGlowVar = 'var(--glow-general)';
            rgbGlow = '139, 92, 246';
        }

        card.style.setProperty('--badge-color', badgeColorVar);
        card.style.setProperty('--badge-glow', badgeGlowVar);
        card.style.setProperty('--badge-glow-rgb', rgbGlow);

        const iconClass = TYPE_ICONS[up.type] || TYPE_ICONS['General'];

        card.innerHTML = `
            <div class="release-card-header">
                <div class="card-badge-group">
                    <span class="card-type-badge">
                        <i class="${iconClass}"></i> ${up.type}
                    </span>
                </div>
                <time class="card-date">${up.date}</time>
            </div>
            <div class="release-card-content">
                ${up.contentHtml}
            </div>
            <div class="release-card-actions">
                <button class="action-btn copy-btn" title="Copy text content to clipboard">
                    <i class="fa-regular fa-copy"></i> Copy Text
                </button>
                <a href="${up.link}" target="_blank" class="action-btn link-btn" title="Open official documentation">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> Details
                </a>
                <button class="action-btn tweet-btn" title="Post this update to X (Twitter)">
                    <i class="fa-brands fa-x-twitter"></i> Tweet
                </button>
            </div>
        `;

        // Action Handlers
        const copyBtn = card.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => copyToClipboard(up.contentText, copyBtn));

        const tweetBtn = card.querySelector('.tweet-btn');
        tweetBtn.addEventListener('click', () => openTweetModal(up));

        releasesFeed.appendChild(card);
    });
}

// Copy plain text content to Clipboard
function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied content to clipboard!', 'success');
        
        // Temporarily change button icon to green checkmark
        const icon = buttonEl.querySelector('i');
        const textNode = buttonEl.querySelector('span') || buttonEl;
        
        icon.className = 'fa-solid fa-check';
        icon.style.color = 'var(--color-feature)';
        
        setTimeout(() => {
            icon.className = 'fa-regular fa-copy';
            icon.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy to clipboard', 'error');
    });
}

// Open tweet preview and composer modal
function openTweetModal(update) {
    selectedUpdate = update;
    
    // Construct pre-filled tweet
    const prefix = `📢 BigQuery ${update.type} (${update.date}):\n`;
    const suffix = `\n\nDetails: ${update.link}`;
    let mainContent = update.contentText.trim();
    
    // Clean up content: normalize spaces and markdown-like links
    mainContent = mainContent.replace(/\s+/g, ' ');

    // Calculate maximum available characters for body
    const maxBodyLength = 280 - prefix.length - suffix.length;
    
    if (mainContent.length > maxBodyLength) {
        mainContent = mainContent.substring(0, maxBodyLength - 3) + '...';
    }

    tweetContent.value = `${prefix}${mainContent}${suffix}`;
    tweetModal.style.display = 'flex';
    
    // Use setTimeout to trigger transition
    setTimeout(() => {
        tweetModal.classList.add('active');
        tweetContent.focus();
        updateCharCount();
    }, 10);
}

// Close tweet preview modal
function hideTweetModal() {
    tweetModal.classList.remove('active');
    setTimeout(() => {
        tweetModal.style.display = 'none';
        selectedUpdate = null;
    }, 300);
}

// Update Character Count in modal
function updateCharCount() {
    const textLen = tweetContent.value.length;
    charCount.textContent = textLen;

    const counter = document.querySelector('.char-counter');
    
    if (textLen > 280) {
        counter.className = 'char-counter danger';
        charWarning.style.display = 'block';
        submitTweetBtn.disabled = true;
    } else if (textLen > 250) {
        counter.className = 'char-counter warning';
        charWarning.style.display = 'none';
        submitTweetBtn.disabled = false;
    } else {
        counter.className = 'char-counter';
        charWarning.style.display = 'none';
        submitTweetBtn.disabled = false;
    }
}

// Open Web Intent to Share on Twitter/X
function postTweet() {
    const text = tweetContent.value;
    if (text.length > 280) {
        showToast('Tweet exceeds character limit!', 'error');
        return;
    }
    
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
    
    hideTweetModal();
    showToast('Redirected to X!', 'success');
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');

    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check toast-icon';
        toast.style.borderLeftColor = 'var(--color-feature)';
        toastIcon.style.color = 'var(--color-feature)';
    } else {
        toastIcon.className = 'fa-solid fa-circle-xmark toast-icon';
        toast.style.borderLeftColor = 'var(--color-fix)';
        toastIcon.style.color = 'var(--color-fix)';
    }

    toast.classList.add('active');
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3500);
}

// State Control Helpers
function showLoading() {
    loadingState.style.display = 'flex';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    releasesFeed.style.display = 'none';
}

function showError(msg) {
    loadingState.style.display = 'none';
    errorState.style.display = 'flex';
    emptyState.style.display = 'none';
    releasesFeed.style.display = 'none';
    errorMessage.textContent = msg;
}

function showEmpty() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'flex';
    releasesFeed.style.display = 'none';
}

function hideStates() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    releasesFeed.style.display = 'flex';
}
