'use client'
import { EventGroupComponent } from "@/components/EventGroup";
import { PostComponent } from "@/components/Post";
import { get_all_posts, ParsedPost } from "@/server-side/database-handler";
import { useEffect, useState, useMemo, useCallback, useReducer } from "react";
import { FaSyncAlt, FaSearch, FaFilter, FaSortAmountUp, FaCalendarAlt, FaStar, FaNewspaper } from 'react-icons/fa';
import { MdClear, MdOutlineFeed } from 'react-icons/md';

const POSTS_PER_PAGE = 50;
const READ_POSTS_STORAGE_KEY = 'readPosts';

type FilterState = {
  selectedCategory: string | null;
  selectedEvent: string | null;
  searchTerm: string;
  categorySearchTerm: string;
  sortBy: 'date' | 'eventCount';
};

type FilterAction =
  | { type: 'SET_CATEGORY'; payload: string | null }
  | { type: 'SET_EVENT'; payload: string | null }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_CATEGORY_SEARCH_TERM'; payload: string }
  | { type: 'SET_SORT_BY'; payload: 'date' | 'eventCount' }
  | { type: 'RESET_FILTERS' };

const initialFilterState: FilterState = {
  selectedCategory: null,
  selectedEvent: null,
  searchTerm: '',
  categorySearchTerm: '',
  sortBy: 'date',
};

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload, selectedEvent: null, searchTerm: '' };
    case 'SET_EVENT':
      return { ...state, selectedEvent: action.payload, selectedCategory: null, searchTerm: '' };
    case 'SET_SEARCH_TERM':
        return { ...state, searchTerm: action.payload, selectedCategory: null, selectedEvent: null };
    case 'SET_CATEGORY_SEARCH_TERM':
      return { ...state, categorySearchTerm: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'RESET_FILTERS':
      return initialFilterState;
    default:
      return state;
  }
}

export default function Home() {
  const [posts, setPosts] = useState<ParsedPost[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePostsCount, setVisiblePostsCount] = useState(POSTS_PER_PAGE);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [readPosts, setReadPosts] = useState<Set<string>>(new Set());
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);

  useEffect(() => {
    const storedReadPosts = localStorage.getItem(READ_POSTS_STORAGE_KEY);
    if (storedReadPosts) {
      setReadPosts(new Set(JSON.parse(storedReadPosts)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(READ_POSTS_STORAGE_KEY, JSON.stringify(Array.from(readPosts)));
  }, [readPosts]);

  const markPostAsRead = useCallback((link: string) => {
    setReadPosts(prev => {
      if (prev.has(link)) return prev;
      const newReadPosts = new Set(prev);
      newReadPosts.add(link);
      return newReadPosts;
    });
  }, []);

  const fetchPosts = useCallback(async (isInitialLoad: boolean = false) => {
    isInitialLoad ? setInitialLoading(true) : setRefreshing(true);
    setError(null);
    try {
      const new_posts_fetched = await get_all_posts();
      setPosts(prevPosts => {
        const existingLinks = new Set(prevPosts.map(p => p.link_html));
        const newUniquePosts = new_posts_fetched.filter(newPost => !existingLinks.has(newPost.link_html));
        return [...newUniquePosts, ...prevPosts];
      });
      setLastRefreshTime(new Date());
    } catch (e) {
      console.error("Не удалось загрузить RSS-ленты:", e);
      setError("ОШИБКА: Не удалось загрузить ленты. Проверьте логи сервера.");
    } finally {
      isInitialLoad ? setInitialLoading(false) : setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(true);
    const refreshInterval = setInterval(() => fetchPosts(false), 120000);
    return () => clearInterval(refreshInterval);
  }, [fetchPosts]);

  const formatPublicationDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error("Не удалось отформатировать дату:", dateString, e);
      return dateString;
    }
  };

  const formatLastRefreshTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const allCategories = useMemo(() => Array.from(new Set(posts.flatMap(p => p.category || []))).sort(), [posts]);

  const postCountsByCategory = useMemo(() => {
    return posts.reduce((counts, post) => {
      (Array.isArray(post.category) ? post.category : [post.category]).forEach(cat => {
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      });
      return counts;
    }, {} as { [key: string]: number });
  }, [posts]);
    
  const popularEvents = useMemo(() => {
    const eventCounts: { [key: string]: number } = {};
    posts.forEach(post => {
      if (post.event && post.event !== "Без события") {
        eventCounts[post.event] = (eventCounts[post.event] || 0) + 1;
      }
    });
    return Object.entries(eventCounts)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [posts]);

  const popularSources = useMemo(() => {
    const sourceCounts: { [key: string]: number } = {};
    posts.forEach(post => {
      if (post.from) {
        sourceCounts[post.from] = (sourceCounts[post.from] || 0) + 1;
      }
    });
    return Object.entries(sourceCounts)
      .map(([from, count]) => ({ from, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [posts]);

  const filteredCategories = useMemo(() => {
    if (!filters.categorySearchTerm) return allCategories;
    return allCategories.filter(category => category.toLowerCase().includes(filters.categorySearchTerm.toLowerCase()));
  }, [allCategories, filters.categorySearchTerm]);

  const sortedAndFilteredPosts = useMemo(() => {
    let currentPosts = posts.filter(post => {
      if (filters.selectedCategory && !(Array.isArray(post.category) ? post.category.includes(filters.selectedCategory) : post.category === filters.selectedCategory)) return false;
      if (filters.selectedEvent && post.event !== filters.selectedEvent) return false;
      if (filters.searchTerm && !(post.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) || post.from.toLowerCase().includes(filters.searchTerm.toLowerCase()))) return false;
      return true;
    });
    currentPosts.sort((a, b) => new Date(b.pubdate).getTime() - new Date(a.pubdate).getTime());
    return currentPosts;
  }, [posts, filters]);

  const displayedItems = useMemo(() => {
    const eventGroups: { [key: string]: ParsedPost[] } = {};
    const otherItems: ParsedPost[] = [];
    sortedAndFilteredPosts.forEach(post => {
      if (post.event && post.event !== "Без события") {
        if (!eventGroups[post.event]) eventGroups[post.event] = [];
        eventGroups[post.event].push(post);
      } else {
        otherItems.push(post);
      }
    });

    const groups = Object.values(eventGroups).map(postsInGroup => ({
      type: 'group' as const,
      event: postsInGroup[0].event!,
      posts: postsInGroup,
      latestDate: new Date(postsInGroup[0].pubdate).getTime(),
      count: postsInGroup.length,
      isRead: postsInGroup.every(p => readPosts.has(p.link_html)),
    }));

    const singleItems = otherItems.map(post => ({ ...post, isRead: readPosts.has(post.link_html) }));

    const combined = [...groups.filter(g => g.posts.length > 1), ...singleItems, ...groups.filter(g => g.posts.length <= 1).flatMap(g => g.posts.map(p => ({ ...p, isRead: readPosts.has(p.link_html) })))];

    combined.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      const dateA = 'type' in a ? a.latestDate : new Date(a.pubdate).getTime();
      const dateB = 'type' in b ? b.latestDate : new Date(b.pubdate).getTime();
      if (filters.sortBy === 'eventCount') {
        const countA = 'type' in a ? a.count : 1;
        const countB = 'type' in b ? b.count : 1;
        if (countB !== countA) return countB - countA;
      }
      return dateB - dateA;
    });

    return combined;
  }, [sortedAndFilteredPosts, filters.sortBy]);

  const isFilterActive = filters.selectedCategory !== null || filters.selectedEvent !== null || filters.searchTerm !== '' || filters.categorySearchTerm !== '';

  const handleFilterChange = (action: FilterAction) => {
    dispatch(action);
    setVisiblePostsCount(POSTS_PER_PAGE);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        <aside className="w-full lg:w-80 lg:flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-lg p-6 sticky top-8 flex flex-col gap-6 h-full max-h-[calc(100vh-4rem)]">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FaFilter className="text-indigo-500" /> Фильтры
            </h2>
            
            <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-6">
              <div>
                <button
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-full text-base font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-indigo-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md"
                  onClick={() => fetchPosts(false)}
                  disabled={refreshing}
                >
                  <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Обновление..." : "Обновить ленту"}
                </button>
                {lastRefreshTime && <p className="text-xs text-gray-500 text-center mt-2.5">Обновлено: {formatLastRefreshTime(lastRefreshTime)}</p>}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2 px-1">Поиск</h3>
                <div className="relative">
                  <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Название или источник..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800"
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
                  />
                </div>
              </div>

              <div>
                 <h3 className="text-sm font-semibold text-gray-600 mb-2 px-1">Сортировка</h3>
                <div className="flex bg-slate-100 rounded-xl p-1 text-sm">
                  <button
                    onClick={() => handleFilterChange({ type: 'SET_SORT_BY', payload: 'date' })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${filters.sortBy === 'date' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}
                  >
                    <FaCalendarAlt /> Новые
                  </button>
                  <button
                    onClick={() => handleFilterChange({ type: 'SET_SORT_BY', payload: 'eventCount' })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${filters.sortBy === 'eventCount' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-white/60'}`}
                  >
                    <FaSortAmountUp /> Популярные
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2 px-1">Теги</h3>
                <div className="relative mb-3">
                    <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Найти тег..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800"
                      value={filters.categorySearchTerm}
                      onChange={(e) => handleFilterChange({ type: 'SET_CATEGORY_SEARCH_TERM', payload: e.target.value })}
                    />
                </div>
                <div className="space-y-1.5 text-sm max-h-72 overflow-y-auto pr-2">
                  <button
                    className={`w-full text-left px-4 py-2 rounded-lg font-semibold flex justify-between items-center transition-all duration-200 ${!filters.selectedCategory && !filters.selectedEvent && !filters.categorySearchTerm ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
                    onClick={() => handleFilterChange({ type: 'RESET_FILTERS' })}
                  >
                    <span>Все новости</span>
                    <span className={`px-2.5 py-0.5 text-xs rounded-full ${!filters.selectedCategory && !filters.selectedEvent && !filters.categorySearchTerm ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}`}>
                      {posts.length}
                    </span>
                  </button>
                  {filteredCategories.map((category) => (
                    <button
                      key={category}
                      className={`w-full text-left px-4 py-2 rounded-lg flex justify-between items-center transition-all duration-200 ${filters.selectedCategory === category ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-sm' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
                      onClick={() => handleFilterChange({ type: 'SET_CATEGORY', payload: category })}
                    >
                      <span className="truncate mr-2">{category}</span>
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${filters.selectedCategory === category ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}`}>
                        {postCountsByCategory[category] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isFilterActive && (
              <div className="mt-auto pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleFilterChange({ type: 'RESET_FILTERS' })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200"
                  >
                    <MdClear /> Сбросить фильтры
                  </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {initialLoading && (
            <div className="text-center text-xl text-indigo-600 mt-10 p-10 bg-white rounded-2xl shadow-lg">Загрузка новостей...</div>
          )}
          {!initialLoading && error && (
            <div className="text-center text-lg text-red-600 p-10 bg-red-50 rounded-2xl shadow-md border border-red-200">{error}</div>
          )}
          
          {!initialLoading && !error && displayedItems.length > 0 && (
            <div className="space-y-6">
               {displayedItems.slice(0, visiblePostsCount).map((item,index) =>
                'type' in item && item.type === 'group' ? (
                  <EventGroupComponent key={index} event={item.event} posts={item.posts} formatPublicationDate={formatPublicationDate} readPosts={readPosts} markAsRead={markPostAsRead} />
                ) : (
                  <PostComponent
                    key={index}
                    title={(item as ParsedPost).title}
                    link={(item as ParsedPost).link_html}
                    from={(item as ParsedPost).from}
                    category={(item as ParsedPost).category}
                    publication_date={formatPublicationDate((item as ParsedPost).pubdate)}
                    rss_link={(item as ParsedPost).link_xml}
                    event={(item as ParsedPost).event}
                    isRead={readPosts.has((item as ParsedPost).link_html)}
                    markAsRead={markPostAsRead}
                  />)
              )}
            </div>
          )}
          
          {!initialLoading && !error && displayedItems.length === 0 && (
            <div className="text-center text-lg text-gray-600 mt-10 p-12 bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center gap-4">
              <MdOutlineFeed className="w-16 h-16 text-gray-300" />
              <h3 className="text-xl font-bold">Новостей не найдено</h3>
              <p className="max-w-xs">По вашему запросу ничего не найдено. Попробуйте изменить фильтры или обновить ленту.</p>
            </div>
          )}

          {displayedItems.length > visiblePostsCount && (
            <div className="text-center mt-10">
              <button
                onClick={() => setVisiblePostsCount(prev => prev + POSTS_PER_PAGE)}
                className="px-8 py-4 bg-white border-2 border-indigo-500 text-indigo-600 rounded-full font-bold text-lg shadow-lg hover:bg-indigo-50 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
              >
                Загрузить еще
              </button>
            </div>
          )}
        </main>
        
        <aside className="hidden xl:block w-full xl:w-72">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-lg p-6 sticky top-8 space-y-6">
                {popularEvents.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-4">
                            <FaStar className="text-amber-500" /> Популярные события
                        </h2>
                        <div className="space-y-1.5 text-sm">
                            {popularEvents.map(item => (
                               <button
                                  key={item.event}
                                  className={`w-full text-left px-4 py-2 rounded-lg flex justify-between items-center transition-all duration-200 ${filters.selectedEvent === item.event ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold shadow-sm' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                  onClick={() => handleFilterChange({ type: 'SET_EVENT', payload: item.event })}
                                >
                                  <span className="truncate mr-2">{item.event}</span>
                                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${filters.selectedEvent === item.event ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}`}>
                                    {item.count}
                                  </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {popularSources.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3 mb-4">
                            <FaNewspaper className="text-sky-500" /> Популярные источники
                        </h2>
                        <div className="space-y-1.5 text-sm">
                            {popularSources.map(item => (
                               <button
                                  key={item.from}
                                  className={`w-full text-left px-4 py-2 rounded-lg flex justify-between items-center transition-all duration-200 ${filters.searchTerm === item.from ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold shadow-sm' : 'text-gray-700 hover:bg-sky-50 hover:text-sky-600'}`}
                                  onClick={() => handleFilterChange({ type: 'SET_SEARCH_TERM', payload: item.from })}
                                >
                                  <span className="truncate mr-2">{item.from}</span>
                                  <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${filters.searchTerm === item.from ? 'bg-white/20' : 'bg-gray-200 text-gray-700'}`}>
                                    {item.count}
                                  </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </aside>

      </div>
    </div>
  );
}