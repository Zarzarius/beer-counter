import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { BeerCatalogEntry } from '../../data/beerCatalog';
import { beerCatalog } from '../../data/beerCatalog';
import { getBeerCatalogInputMode } from '../../lib/beerCatalogInputMode';
import { searchBeerCatalog } from '../../lib/beerCatalogSearch';
import { formatDayLabel, getDateKey, getTodayKey } from '../../lib/dayKeys';
import { supabase } from '../../lib/supabase';

type BeerRow = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  is_paid: boolean;
  created_at: string;
};

type GroupData = {
  name: string;
  notes: string;
  items: BeerRow[];
  is_paid: boolean;
};

function buildGuestEmail(userId: string): string {
  const stableSuffix = userId.replaceAll('-', '').slice(0, 12) || 'user';
  return `guest-${stableSuffix}@guest.local`;
}

function buildGroups(dayBeers: BeerRow[]): GroupData[] {
  const groups: Record<string, GroupData> = {};
  dayBeers.forEach((b) => {
    const key = `${b.name.toLowerCase()}::${b.is_paid}`;
    if (groups[key]) {
      groups[key].items.push(b);
    } else {
      groups[key] = {
        name: b.name,
        notes: b.notes || '',
        items: [b],
        is_paid: b.is_paid,
      };
    }
  });
  return Object.values(groups).sort((a, b) => {
    if (a.is_paid === b.is_paid) return 0;
    return a.is_paid ? 1 : -1;
  });
}

const SEARCH_IDLE =
  'Start typing to search the local beer list. You can still add a custom beer name if nothing matches.';

export default function CustomerApp() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('My Tab');
  const [emailLabel, setEmailLabel] = useState('Loading…');

  const [catalogFromStock, setCatalogFromStock] = useState<BeerCatalogEntry[]>(beerCatalog);
  const [beerName, setBeerName] = useState('');
  const [beerNotes, setBeerNotes] = useState('');
  const [selectedBeer, setSelectedBeer] = useState<BeerCatalogEntry | null>(null);
  const [searchResults, setSearchResults] = useState<BeerCatalogEntry[]>([]);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState(SEARCH_IDLE);
  const searchTimerRef = useRef<number | undefined>(undefined);

  const [allBeers, setAllBeers] = useState<BeerRow[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState('');
  const [listError, setListError] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [busyInline, setBusyInline] = useState<string | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState('');

  const [beerEdit, setBeerEdit] = useState<{
    id: string;
    name: string;
    notes: string;
    is_paid: boolean;
  } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editPaid, setEditPaid] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const beerSearchShellRef = useRef<HTMLDivElement>(null);

  const availableDays = useMemo(() => {
    const daySet = new Set<string>();
    allBeers.forEach((b) => daySet.add(getDateKey(new Date(b.created_at))));
    daySet.add(getTodayKey());
    return Array.from(daySet).sort().reverse();
  }, [allBeers]);

  useEffect(() => {
    if (availableDays.length === 0) return;
    setSelectedDayKey((prev) => {
      if (prev && availableDays.includes(prev)) return prev;
      const today = getTodayKey();
      return availableDays.includes(today) ? today : availableDays[0];
    });
  }, [availableDays]);

  const dayBeers = useMemo(() => {
    if (!selectedDayKey) return [];
    return allBeers.filter((b) => getDateKey(new Date(b.created_at)) === selectedDayKey);
  }, [allBeers, selectedDayKey]);

  const { unpaidGroups, paidGroups } = useMemo(() => {
    const list = buildGroups(dayBeers);
    return {
      unpaidGroups: list.filter((g) => !g.is_paid),
      paidGroups: list.filter((g) => g.is_paid),
    };
  }, [dayBeers]);

  const loadBeerStock = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('beer_stock')
        .select('brewery, name, style, year')
        .eq('is_unavailable', false)
        .order('name', { ascending: true });

      if (error) {
        console.error('[Catalog] Failed to load beer_stock from Supabase, falling back to static catalog.', error);
        setCatalogFromStock(beerCatalog);
        return;
      }

      setCatalogFromStock(
        (data ?? []).map((row) => ({
          brewery: row.brewery ?? '',
          name: row.name ?? '',
          style: row.style ?? '',
          year: row.year ?? 'N/A',
        })),
      );
    } catch (err) {
      console.error('[Catalog] Unexpected error loading beer_stock, falling back to static catalog.', err);
      setCatalogFromStock(beerCatalog);
    }
  }, []);

  const loadBeers = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('beers')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      setListError(true);
      return;
    }
    setListError(false);
    setAllBeers((data ?? []) as BeerRow[]);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/login';
        return;
      }

      const u = session.user;
      setUser(u);
      const fallbackEmail = u.email || buildGuestEmail(u.id);
      setEmailLabel(fallbackEmail);

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', u.id)
        .maybeSingle();

      if (!profile && !profileError) {
        const fallbackName =
          (u.user_metadata?.full_name as string | undefined) ||
          (u.user_metadata?.name as string | undefined) ||
          'Guest';
        const fallbackEmailForProfile = u.email || buildGuestEmail(u.id);

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: u.id,
            email: fallbackEmailForProfile,
            full_name: fallbackName,
            role: 'customer',
          })
          .select()
          .single();

        if (!createError && newProfile) {
          profile = newProfile;
        }
      }

      if (profile?.role === 'manager') {
        window.location.href = '/manager';
        return;
      }

      if (profile?.full_name) {
        setDisplayName(profile.full_name);
      } else {
        setDisplayName('Guest');
      }

      await loadBeerStock();
      await loadBeers(u.id);

      channel = supabase
        .channel(`customer-beers-${u.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'beers',
            filter: `user_id=eq.${u.id}`,
          },
          () => {
            void loadBeers(u.id);
          },
        )
        .subscribe();

      setInitializing(false);
    })();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadBeerStock, loadBeers]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (beerSearchShellRef.current && !beerSearchShellRef.current.contains(t)) {
        setSearchResultsOpen(false);
        setSearchResults([]);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function onBeerNameInput(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    const inputMode = getBeerCatalogInputMode(
      query.trim(),
      e.nativeEvent instanceof InputEvent ? e.nativeEvent.inputType : undefined,
    );

    setBeerName(query);

    if (!selectedBeer || selectedBeer.name !== query.trim()) {
      setSelectedBeer(null);
    }

    if (searchTimerRef.current !== undefined) {
      window.clearTimeout(searchTimerRef.current);
    }

    if (inputMode === 'hide') {
      setSearchResults([]);
      setSearchResultsOpen(false);
      setSearchStatus(SEARCH_IDLE);
      return;
    }

    const q = query.trim();

    if (inputMode === 'immediate') {
      const results = searchBeerCatalog(catalogFromStock, q);
      setSearchResults(results);
      setSearchResultsOpen(results.length > 0);
      setSearchStatus(
        results.length === 0
          ? `No catalog matches for "${q}". You can still add it manually.`
          : `Showing ${results.length} match${results.length === 1 ? '' : 'es'} from the local catalog.`,
      );
      return;
    }

    searchTimerRef.current = window.setTimeout(() => {
      const results = searchBeerCatalog(catalogFromStock, q);
      setSearchResults(results);
      setSearchResultsOpen(results.length > 0);
      setSearchStatus(
        results.length === 0
          ? `No catalog matches for "${q}". You can still add it manually.`
          : `Showing ${results.length} match${results.length === 1 ? '' : 'es'} from the local catalog.`,
      );
    }, 200);
  }

  async function submitAddBeer() {
    const drinkName = selectedBeer?.name ?? beerName.trim();
    if (!user || !drinkName) return;

    setAddSubmitting(true);
    setActionError(null);
    try {
      const { error } = await supabase.from('beers').insert({
        user_id: user.id,
        name: drinkName,
        notes: beerNotes,
      });
      if (error) {
        setActionError(error.message || 'Could not add drink. Please try again.');
        return;
      }
      setBeerName('');
      setBeerNotes('');
      setSelectedBeer(null);
      setSearchResults([]);
      setSearchResultsOpen(false);
      setSearchStatus(SEARCH_IDLE);
      await loadBeers(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setActionError(msg ? `Could not add drink: ${msg}` : 'Could not add drink. Please try again.');
    } finally {
      setAddSubmitting(false);
    }
  }

  function pickSearchResult(index: number) {
    const beer = searchResults[index];
    if (!beer) return;
    setBeerName(beer.name);
    setSelectedBeer(beer);
    setSearchResults([]);
    setSearchResultsOpen(false);
    setSearchStatus('Catalog selection locked in. You can keep typing to switch back to a custom name.');
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  function openProfile() {
    setProfileNameDraft(displayName !== 'My Tab' ? displayName : '');
    setProfileOpen(true);
  }

  async function submitProfile() {
    const newName = profileNameDraft.trim();
    if (!newName || !user) return;

    const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', user.id);

    if (error) {
      setActionError(error.message || 'Could not update profile.');
    } else {
      setActionError(null);
      setDisplayName(newName);
      setProfileOpen(false);
    }
  }

  async function submitBeerEdit() {
    if (!beerEdit || !user) return;

    setActionError(null);
    try {
      const { error } = await supabase
        .from('beers')
        .update({ notes: editNotes, is_paid: editPaid })
        .eq('id', beerEdit.id);
      if (error) {
        setActionError(error.message || 'Could not update drink.');
        return;
      }
      setBeerEdit(null);
      await loadBeers(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setActionError(msg ? `Could not update drink: ${msg}` : 'Could not update drink.');
    }
  }

  async function deleteBeer() {
    if (!beerEdit || !user) return;
    if (!confirm('Are you sure you want to delete this drink?')) return;

    setActionError(null);
    try {
      const { error } = await supabase.from('beers').delete().eq('id', beerEdit.id);
      if (error) {
        setActionError(error.message || 'Could not delete drink.');
        return;
      }
      setBeerEdit(null);
      await loadBeers(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setActionError(msg ? `Could not delete drink: ${msg}` : 'Could not delete drink.');
    }
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  function onGroupHeaderClick(
    groupId: string,
    e: React.MouseEvent | React.KeyboardEvent,
  ) {
    if ((e.target as HTMLElement).closest('.btn-icon, .btn-add-one')) return;
    toggleGroup(groupId);
  }

  function onGroupHeaderKeyDown(groupId: string, e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if ((e.target as HTMLElement)?.closest('.btn-icon, .btn-add-one')) return;
    e.preventDefault();
    toggleGroup(groupId);
  }

  async function addAnotherFromGroup(name: string, notes: string, groupId: string) {
    if (!user) return;
    setBusyInline(`add-${groupId}`);
    setActionError(null);
    try {
      const { error } = await supabase.from('beers').insert({
        user_id: user.id,
        name,
        notes,
      });
      if (error) {
        setActionError(error.message || 'Could not add drink.');
        return;
      }
      await loadBeers(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setActionError(msg ? `Could not add drink: ${msg}` : 'Could not add drink.');
    } finally {
      setBusyInline(null);
    }
  }

  async function repeatBeer(name: string, notes: string, beerId: string) {
    if (!user) return;
    setBusyInline(`rep-${beerId}`);
    setActionError(null);
    try {
      const { error } = await supabase.from('beers').insert({
        user_id: user.id,
        name,
        notes,
      });
      if (error) {
        setActionError(error.message || 'Could not add drink.');
        return;
      }
      await loadBeers(user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setActionError(msg ? `Could not add drink: ${msg}` : 'Could not add drink.');
    } finally {
      setBusyInline(null);
    }
  }

  const dayIdx = availableDays.indexOf(selectedDayKey);
  const dayPrevDisabled = dayIdx >= availableDays.length - 1 || availableDays.length === 0;
  const dayNextDisabled = dayIdx <= 0 || availableDays.length === 0;

  function renderGroup(g: GroupData, groupIndex: number, sectionType: 'unpaid' | 'paid') {
    const groupId = `group-customer-${sectionType}-${groupIndex}`;
    const expanded = !!expandedGroups[groupId];
    const addBusy = busyInline === `add-${groupId}`;

    return (
      <div className="beer-group-container" id={groupId} key={groupId}>
        <div
          className={`beer-item beer-card glass-panel ${g.is_paid ? 'paid' : 'unpaid'} group-header ${expanded ? 'is-expanded' : ''}`}
          data-toggle-group={groupId}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={(e) => onGroupHeaderClick(groupId, e)}
          onKeyDown={(e) => onGroupHeaderKeyDown(groupId, e)}
        >
          <div className="beer-content">
            <div className="beer-info">
              <div className="beer-title-row">
                <h4>{g.name}</h4>
                <div className="header-status">
                  {!g.is_paid ? (
                    <button
                      type="button"
                      className="btn-add-one"
                      disabled={addBusy}
                      aria-busy={addBusy || undefined}
                      title="Add another"
                      aria-label="Add another drink"
                      onClick={(e) => {
                        e.stopPropagation();
                        void addAnotherFromGroup(g.name, g.notes, groupId);
                      }}
                    >
                      {addBusy ? 'Adding…' : '+1'}
                    </button>
                  ) : null}
                  {g.is_paid ? (
                    <span className="badge badge-success">Paid</span>
                  ) : (
                    <span className="badge badge-warning">On Tab</span>
                  )}
                  <svg
                    className="chevron-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
              <div className="group-meta">
                <span className="beer-qty">×{g.items.length}</span>
                <span className="expand-hint">{g.notes || 'Click to see details'}</span>
              </div>
            </div>
          </div>
        </div>
        <div
          className="beer-group-items"
          style={{ display: expanded ? 'flex' : 'none' }}
        >
          {g.items.map((item) => {
            const dateStr =
              new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) +
              ' ' +
              new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const repBusy = busyInline === `rep-${item.id}`;
            return (
              <div className="individual-beer-row glass-panel" key={item.id} data-id={item.id}>
                <div className="item-meta">
                  <span className="item-time">{dateStr}</span>
                </div>
                <div className="item-actions">
                  <button
                    type="button"
                    className="btn-icon btn-edit-beer"
                    aria-label="Edit drink"
                    title="Edit drink"
                    onClick={() => {
                      setBeerEdit({
                        id: item.id,
                        name: item.name,
                        notes: item.notes || '',
                        is_paid: item.is_paid,
                      });
                      setEditNotes(item.notes || '');
                      setEditPaid(item.is_paid);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-repeat"
                    aria-label="Add another drink"
                    title="Add another"
                    disabled={repBusy}
                    aria-busy={repBusy || undefined}
                    onClick={() => void repeatBeer(item.name, item.notes || '', item.id)}
                  >
                    {repBusy ? (
                      '…'
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="container user-dashboard">
      <header className="dashboard-header animate-fade-in">
        <div className="header-left">
          <h2>{displayName}</h2>
          <div className="user-meta-sub">
            <p className="user-email" role="status" aria-live="polite">
              {emailLabel}
            </p>
            <button type="button" className="btn-text-link" onClick={openProfile}>
              Edit Name
            </button>
          </div>
        </div>
        <button type="button" className="btn-secondary btn-sm" onClick={() => void logout()}>
          Sign Out
        </button>
      </header>

      {actionError ? (
        <div
          className="customer-action-error glass-panel"
          role="alert"
          aria-live="assertive"
        >
          <span className="customer-action-error-text">{actionError}</span>
          <button
            type="button"
            className="btn-text-link customer-action-error-dismiss"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {profileOpen ? (
        <div
          className="modal-overlay"
          style={{ display: 'flex' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 id="profile-modal-title">My Profile</h3>
              <button
                type="button"
                className="btn-icon"
                aria-label="Close profile modal"
                onClick={() => setProfileOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form
          className="edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submitProfile();
          }}
        >
              <div className="input-group">
                <label htmlFor="profile-name" className="input-label">
                  Your Name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  className="input-field"
                  placeholder="How should we call you?"
                  required
                  autoComplete="name"
                  value={profileNameDraft}
                  onChange={(e) => setProfileNameDraft(e.target.value)}
                />
              </div>
              <div className="modal-actions">
                <div className="flex-grow" />
                <button type="submit" className="btn-primary btn-sm">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="actions-panel glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h3>Add a Drink</h3>
        <form
          className="add-beer-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submitAddBeer();
          }}
        >
          <div className="input-group beer-search-shell" ref={beerSearchShellRef}>
            <label htmlFor="beer-name" className="input-label">
              What are you drinking?
            </label>
            <input
              id="beer-name"
              type="text"
              className="input-field"
              placeholder="Search the bottle shop list or type your own…"
              autoComplete="off"
              required
              value={beerName}
              onChange={onBeerNameInput}
            />
            {selectedBeer ? (
              <div className="beer-selection-meta">
                {selectedBeer.brewery} · {selectedBeer.style}
                {selectedBeer.year !== 'N/A' ? ` · ${selectedBeer.year}` : ''}
              </div>
            ) : null}

            {searchResultsOpen && searchResults.length > 0 ? (
              <div className="beer-search-results">
                {searchResults.map((beer, index) => (
                  <button
                    key={`${beer.name}-${beer.brewery}-${index}`}
                    type="button"
                    className="beer-search-option"
                    onClick={() => pickSearchResult(index)}
                  >
                    <span className="beer-search-option-title">{beer.name}</span>
                    <span className="beer-search-option-meta">
                      {beer.brewery} · {beer.style}
                      {beer.year !== 'N/A' ? ` · ${beer.year}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            <p className="beer-search-status">{searchStatus}</p>
          </div>

          <div className="input-group">
            <label htmlFor="beer-notes" className="input-label">
              Notes (optional)
            </label>
            <textarea
              id="beer-notes"
              className="input-field"
              placeholder="How is it?"
              autoComplete="off"
              value={beerNotes}
              onChange={(e) => setBeerNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={addSubmitting}
            aria-busy={addSubmitting || undefined}
          >
            {addSubmitting ? 'Adding…' : 'Add to Tab'}
          </button>
        </form>
      </div>

      <div className="history-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="history-header">
          <h3>My Tab</h3>
          {!initializing && availableDays.length > 0 ? (
            <div className="day-navigator">
              <button
                type="button"
                className="day-nav-btn day-prev"
                title="Previous day"
                aria-label="Previous day"
                disabled={dayPrevDisabled}
                onClick={() => {
                  if (dayPrevDisabled) return;
                  const idx = availableDays.indexOf(selectedDayKey);
                  if (idx < availableDays.length - 1) {
                    setSelectedDayKey(availableDays[idx + 1]);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="day-label-wrap">
                <span className="day-label">{formatDayLabel(selectedDayKey)}</span>
                <select
                  className="day-select"
                  aria-label="Select day"
                  value={selectedDayKey}
                  onChange={(e) => setSelectedDayKey(e.target.value)}
                >
                  {availableDays.map((k) => (
                    <option key={k} value={k}>
                      {formatDayLabel(k)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="day-nav-btn day-next"
                title="Next day"
                aria-label="Next day"
                disabled={dayNextDisabled}
                onClick={() => {
                  if (dayNextDisabled) return;
                  const idx = availableDays.indexOf(selectedDayKey);
                  if (idx > 0) {
                    setSelectedDayKey(availableDays[idx - 1]);
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          ) : null}
        </div>

        <div className="beer-list">
          {initializing ? (
            <div className="loading-state" role="status" aria-live="polite">
              Loading your drinks…
            </div>
          ) : listError ? (
            <div className="error-state">Failed to load drinks</div>
          ) : (
            <>
              {unpaidGroups.length > 0 ? (
                <div className="beer-section">
                  <div className="beer-section-label unpaid-label">On Tab</div>
                  {unpaidGroups.map((g, i) => renderGroup(g, i, 'unpaid'))}
                </div>
              ) : null}
              {paidGroups.length > 0 ? (
                <div
                  className={`beer-section ${unpaidGroups.length > 0 ? 'section-divider' : ''}`}
                >
                  <div className="beer-section-label paid-label">Paid</div>
                  {paidGroups.map((g, i) => renderGroup(g, i, 'paid'))}
                </div>
              ) : null}
              {dayBeers.length === 0 ? (
                <div className="empty-state glass-panel text-center">
                  <p>
                    {selectedDayKey === getTodayKey()
                      ? 'Your tab is empty! Time to grab a drink.'
                      : 'No drinks for this day.'}
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {beerEdit ? (
        <div
          className="modal-overlay"
          style={{ display: 'flex' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="beer-edit-modal-title"
        >
          <div className="modal-content glass-panel animate-scale-up">
            <div className="modal-header">
              <h3 id="beer-edit-modal-title">Edit Drink</h3>
              <button
                type="button"
                className="btn-icon"
                aria-label="Close edit drink modal"
                onClick={() => setBeerEdit(null)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form
              className="edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                void submitBeerEdit();
              }}
            >
              <div className="input-group">
                <label htmlFor="edit-beer-name" className="input-label">
                  Drink Name
                </label>
                <input
                  id="edit-beer-name"
                  type="text"
                  className="input-field"
                  readOnly
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                  value={beerEdit.name}
                />
              </div>
              <div className="input-group">
                <label htmlFor="edit-beer-notes" className="input-label">
                  Notes
                </label>
                <textarea
                  id="edit-beer-notes"
                  className="input-field"
                  rows={3}
                  autoComplete="off"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <div className="checkbox-group">
                <input
                  id="edit-beer-paid"
                  type="checkbox"
                  className="checkbox-input"
                  checked={editPaid}
                  onChange={(e) => setEditPaid(e.target.checked)}
                />
                <label htmlFor="edit-beer-paid" className="checkbox-label">
                  Mark as Paid
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-danger-outline btn-sm" onClick={() => void deleteBeer()}>
                  Delete
                </button>
                <div className="flex-grow" />
                <button type="submit" className="btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
