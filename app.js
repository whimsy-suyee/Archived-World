
const state = {
    date: new Date(),   // currently selected date
    type: 'events',     // active filter tab (events / births / deaths / holidays)
    allItems: [],       // raw data returned from the API, keyed by type
    filtered: [],       // the subset of items currently shown (after filter + search)
    page: 1,            // current pagination page
    perPage: 9,         // How many cards to show per page
    searchQuery: '',    // the current keyword typed into the search box
};


const dateInput = document.getElementById('history-date');
const dateBannerText = document.getElementById('date-banner-text');
const filterNav = document.getElementById('filter-nav');
const eventsGrid = document.getElementById('events-grid');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('page-info');
const searchInput = document.getElementById('search-input');
const shuffleBtn = document.getElementById('shuffle-fact');
const heroFactContent = document.getElementById('hero-fact-content');


function pickRandomFact() {
    // combine all types into one flat pool to maximise variety
    const pool = [
        ...(state.allItems.events || []),
        ...(state.allItems.births || []),
        ...(state.allItems.deaths || []),
        ...(state.allItems.holidays || []),
    ];

    // nothing to show if data has not loaded yet
    if (!pool.length) {
        heroFactContent.innerHTML = `<p style="color:rgba(245,237,224,0.65);font-size:0.85rem;">No facts available yet.</p>`;
        return;
    }

    // pick one item at random from the pool
    const item = pool[Math.floor(Math.random() * pool.length)];
    const year = item.year ?? '';
    const text = item.text ?? '';

    // fade out, swap content, then fade back in for a smooth transition
    heroFactContent.style.transition = 'opacity 180ms ease';
    heroFactContent.style.opacity = '0';

    setTimeout(() => {
        heroFactContent.innerHTML = `
            <div class="fact-year">${year}</div>
            <p>${text}</p>
        `;
        heroFactContent.style.opacity = '1';
    }, 190);
}


function showFactSkeleton() {
    //  mirrors the same .skeleton class used by showSkeleton() for the cards
    heroFactContent.innerHTML = `
        <div class="fact-year skeleton" style="width:80px;height:28px;margin-bottom:10px;"></div>
        <p class="skeleton" style="height:16px;margin-bottom:6px;"></p>
        <p class="skeleton" style="height:16px;width:70%;"></p>
    `;
}

//Shuffle button: re-pick a random fact each time the user clicks the icon.
shuffleBtn.addEventListener('click', () => {
    // briefly rotate the icon 180° to give tactile click feedback
    const icon = shuffleBtn.querySelector('img');
    if (icon) {
        icon.style.transition = 'transform 300ms ease';
        icon.style.transform = 'rotate(180deg)';
        setTimeout(() => { icon.style.transform = 'rotate(0deg)'; }, 310);
    }
    // show a new random fact
    pickRandomFact();
});

/**
 Filters an array of event items against the current search query.
 * Matches are checked against both the event text and the year number,
 * so users can search by keyword (e.g. "moon") or by year (e.g. "1969").
 * Returns the full array unchanged when the query is empty.
 *
 * @param {Array} items - The raw array for the active filter type.
 * @returns {Array} Filtered subset, or all items if the query is empty.
 */
function applySearch(items) {
    const q = state.searchQuery.trim().toLowerCase(); // Task 5: normalise the input
    if (!q) return items;                             // Task 5: no query → nothing to filter

    //keep items where text OR year contains the query string
    return items.filter(item => {
        const text = (item.text ?? '').toLowerCase();
        const year = String(item.year ?? '');
        return text.includes(q) || year.includes(q);
    });
}

// Search input: re-filter the grid live on every keystroke.
searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value; // keep state in sync with the input field
    state.page = 1;                     // always go back to page 1 on a new search
    applyFilter();
});


// format a Date as "Monday, January 1, 2025" for the date banner
function formatDisplay(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// convert a Date to "YYYY-MM-DD" to set on the <input type="date">
function toInputValue(date) {
    return date.toISOString().split('T')[0];
}

// return zero-padded { month, day } strings needed in the API URL
function getMonthDay(date) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return { month: m, day: d };
}

// pre-fill the date input and the banner with the current date
function initDate() {
    dateInput.value = toInputValue(state.date);
    dateBannerText.textContent = formatDisplay(state.date);
}


// Extract the Wikipedia URL, thumbnail, and extract text from a page object.

// build the Wikipedia URL for the first linked page
function getWikiLink(pages) {
    if (!pages || !pages.length) return '#';

    const title = pages[0]?.title;
    if (!title) return '#';

    return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

// return the thumbnail URL for the first linked page (or null if none)
function getThumb(pages) {
    if (!pages || !pages.length) return null;
    return pages[0].thumbnail?.source ?? null;
}

// return the plain-text extract for the first linked page (or empty string)
function getExtract(pages) {
    if (!pages || !pages.length) return '';
    return pages[0].extract ?? '';
}


// =============================================================================
// Slices state.filtered to the current page and injects card HTML into the
// events grid. Also updates the pagination controls.
// =============================================================================
//build and inject all event cards for the current page
function renderCards() {
    //calculate which slice of items belongs on the current page
    const start = (state.page - 1) * state.perPage;
    const slice = state.filtered.slice(start, start + state.perPage);
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));

    // update the "Page X of Y" label
    pageInfo.textContent = `Page ${state.page} of ${totalPages}`;

    // enable / disable the Previous button based on the current page
    if (state.page <= 1) {
        prevBtn.disabled = true;
        prevBtn.classList.add('disabled');
    } else {
        prevBtn.disabled = false;
        prevBtn.classList.remove('disabled');
    }

    // enable / disable the Next button based on the current page
    if (state.page >= totalPages) {
        nextBtn.disabled = true;
        nextBtn.classList.add('disabled');
    } else {
        nextBtn.disabled = false;
        nextBtn.classList.remove('disabled');
    }

    if (!slice.length) {
        let msg = '';
        if (state.type === 'favorites' && !state.searchQuery) {
            msg = "You haven't added any favorites yet! Click the ♡ on any card to save it.";
        } else {
            msg = state.searchQuery
                ? `No results found for "<strong>${state.searchQuery}</strong>".`
                : 'No results found.';
        }
        eventsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">${msg}</p>`;
        return;
    }

    // Generate and inject the card HTML for this page slice
    eventsGrid.innerHTML = slice.map((item, i) => {
        const year = item.year ?? '';
        const text = item.text ?? '';
        const pages = item.pages ?? [];
        const thumb = getThumb(pages);    // Task 4
        const extract = getExtract(pages);  // Task 4
        const link = getWikiLink(pages); // Task 4

        const imgHTML = thumb
            ? `<img class="card-image" src="${thumb}" alt="${text.slice(0, 60)}" loading="lazy">`
            : '';

        const captionHTML = extract
            ? `<div class="card-caption">${extract.slice(0, 140)}${extract.length > 140 ? '…' : ''}</div>`
            : '';

        // Use data-index to look up the item instead of passing raw text
        // through onclick. Text with quotes/apostrophes (e.g. "Russia's invasion")
        // breaks the template literal and causes toggleFavorite() to find nothing.
        const itemIndex = start + i; // absolute index into state.filtered
        return `
            <article class="event-card" style="animation-delay:${i * 60}ms">
                <div class="card-header">
                    <span class="year">${year}</span>
                    <button class="fav-btn ${isFavorite(text, year) ? 'active' : ''}"
                            data-index="${itemIndex}"
                            onclick="event.stopPropagation(); toggleFavoriteByIndex(${itemIndex}, this)">
                        ${isFavorite(text, year) ? '♥' : '♡'}
                    </button>
                </div>
                <div class="card-body">${text}</div>
                ${imgHTML}
                ${captionHTML}
                <a href="${link}" target="_blank" rel="noopener" class="read-more-btn">Read More ↗</a>
            </article>
        `;
    }).join('');
}


function applyFilter() {
    if (state.type === 'favorites') {
        // Pull from LocalStorage for the Favorites tab
        state.filtered = JSON.parse(localStorage.getItem('archived_world_favs')) || [];
    } else {
        // Pull from API data for Events, Births, Deaths, Holidays
        const base = state.allItems[state.type] ?? [];
        state.filtered = applySearch(base);
    }

    state.page = 1;
    renderCards();
}

// Task 4: inject 9 shimmer skeleton cards while data is loading
function showSkeleton() {
    eventsGrid.innerHTML = Array.from({ length: 9 }).map((_, i) => `
        <article class="event-card" style="animation-delay:${i * 60}ms">
            <div class="card-header">
                <span class="skeleton" style="width:48px;height:18px;display:inline-block;border-radius:4px;"></span>
            </div>
            <div class="card-body">
                <div class="skeleton" style="height:13px;margin-bottom:6px;"></div>
                <div class="skeleton" style="height:13px;width:80%;margin-bottom:6px;"></div>
                <div class="skeleton" style="height:13px;width:60%;"></div>
            </div>
            <div class="skeleton" style="width:100%;aspect-ratio:4/3;"></div>
            <div style="margin:8px 14px 14px;">
                <div class="skeleton" style="height:32px;border-radius:6px;"></div>
            </div>
        </article>
    `).join('');
}


async function loadData(date) {
    showSkeleton();
    showFactSkeleton();
    try {
        const { month, day } = getMonthDay(date);


        const allData = {
            events: await getEvents('events', month, day),
            births: await getEvents('births', month, day),
            deaths: await getEvents('deaths', month, day),
            holidays: await getEvents('holidays', month, day),
        };

        state.allItems = allData; // Task 4: store the raw API results in state
        applyFilter();            // Task 4: render cards for the currently active tab
        pickRandomFact();         // Task 5: auto-display a random fact in the hero section

    } catch (err) {
        // Task 4: show an error message in the card grid if the fetch fails
        eventsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px 0;">Failed to load events.</p>`;
        // Task 5: show an error message in the hero section if the fetch fails
        heroFactContent.innerHTML = `<p style="color:rgba(245,237,224,0.65);font-size:0.85rem;">Could not load facts.</p>`;
        console.error(err);
    }
}


// =============================================================================
// TASK 4 — EVENT LISTENERS
// Wire up the date picker, filter tabs, and pagination buttons.
// =============================================================================

// date picker — reload everything when the user picks a new date
dateInput.addEventListener('change', e => {
    const [y, m, d] = e.target.value.split('-').map(Number);
    state.date = new Date(y, m - 1, d);
    dateBannerText.textContent = formatDisplay(state.date);
    state.searchQuery = '';  // clear the search query so results are not stale
    searchInput.value = ''; // also clear the visible search input field
    loadData(state.date);
});

// filter tabs — switch the active type and re-render
filterNav.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    filterNav.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.type = btn.dataset.type;
    applyFilter();
});

// Previous button — go back one page
prevBtn.addEventListener('click', () => {
    if (state.page > 1) {
        state.page--;
        renderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});

//  Next button — go forward one page
nextBtn.addEventListener('click', () => {
    const total = Math.ceil(state.filtered.length / state.perPage);
    if (state.page < total) {
        state.page++;
        renderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
});




initDate();           //  set the date picker and banner to today's date
loadData(state.date); // fetch and render events for today's date

// Favorites & Polish

function toggleFavoriteByIndex(index, btnEl) {
    const item = state.filtered[index];
    if (!item) return;

    let favorites = JSON.parse(localStorage.getItem('archived_world_favs')) || [];
    const normYear = (item.year === undefined || item.year === null) ? '' : String(item.year);
    const existingIndex = favorites.findIndex(fav => {
        const favYear = (fav.year === undefined || fav.year === null) ? '' : String(fav.year);
        return fav.text === item.text && favYear === normYear;
    });

    if (existingIndex === -1) {
        favorites.push(item);
        if (btnEl) { btnEl.textContent = '♥'; btnEl.classList.add('active'); }
    } else {
        favorites.splice(existingIndex, 1);
        if (btnEl) { btnEl.textContent = '♡'; btnEl.classList.remove('active'); }
    }

    localStorage.setItem('archived_world_favs', JSON.stringify(favorites));

    // If we're on the favorites tab, re-render so removed items disappear
    if (state.type === 'favorites') applyFilter();
}

// Keep original toggleFavorite for any legacy calls
function toggleFavorite(text, year) {
    let favorites = JSON.parse(localStorage.getItem('archived_world_favs')) || [];
    const index = favorites.findIndex(
        fav => fav.text === text && String(fav.year) === String(year)
    );
    if (index === -1) {
        // Search across ALL types so holidays items can be found
        const allTypes = ['events', 'births', 'deaths', 'holidays'];
        let item = null;
        for (const t of allTypes) {
            item = (state.allItems[t] || []).find(
                i => i.text === text && String(i.year) === String(year)
            );
            if (item) break;
        }
        if (!item) return;
        favorites.push(item);
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('archived_world_favs', JSON.stringify(favorites));
    applyFilter();
}

function isFavorite(text, year) {
    const favorites = JSON.parse(localStorage.getItem('archived_world_favs')) || [];
    // Normalise year: holidays have no year (undefined/null) — treat as ''
    const normYear = (year === undefined || year === null) ? '' : String(year);
    return favorites.some(fav => {
        const favYear = (fav.year === undefined || fav.year === null) ? '' : String(fav.year);
        return fav.text === text && favYear === normYear;
    });
}
function loadFavorites() {
    state.favorites = JSON.parse(localStorage.getItem('archived_world_favs')) || [];
}