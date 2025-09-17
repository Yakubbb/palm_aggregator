'use client'
import { PostComponent, EventGroupComponent } from "@/components/posts_elements";
import { get_all_posts, ParsedPost } from "@/server-side/database-handler";
import { useEffect, useState, useMemo, useCallback, useReducer } from "react";
import { FaSyncAlt, FaSearch, FaFilter, FaTimes, FaSortAmountDown, FaSortNumericDownAlt, FaCalendarAlt } from 'react-icons/fa';
import { MdClear } from 'react-icons/md';

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
      return { ...state, selectedCategory: action.payload, selectedEvent: null };
    case 'SET_EVENT':
      return { ...state, selectedEvent: action.payload, selectedCategory: null };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
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
  const allEvents = useMemo(() => Array.from(new Set(posts.map(p => p.event).filter(Boolean as any))).sort(), [posts]);

  const postCountsByCategory = useMemo(() => {
    return posts.reduce((counts, post) => {
      (Array.isArray(post.category) ? post.category : [post.category]).forEach(cat => {
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      });
      return counts;
    }, {} as { [key: string]: number });
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
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col lg:flex-row gap-4">
      <aside className="w-full lg:w-1/4">
        <div className="bg-white rounded-lg shadow-md p-5 sticky top-4 flex flex-col gap-4 h-full max-h-[calc(100vh-2rem)] overflow-y-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FaFilter className="text-indigo-600" /> Меню фильтров
          </h2>

          <div className="border-b border-gray-200 pb-5">
            <button
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-base font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-300 disabled:bg-indigo-400 disabled:cursor-not-allowed"
              onClick={() => fetchPosts(false)}
              disabled={refreshing}
            >
              <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Обновление..." : "Обновить ленту"}
            </button>
            {lastRefreshTime && <p className="text-xs text-gray-500 text-center mt-2">Последнее обновление: {formatLastRefreshTime(lastRefreshTime)}</p>}
          </div>

          <div className="border-b border-gray-200 pb-5">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaSearch className="text-gray-500" /> Поиск по новостям</h3>
            <input
              type="text"
              placeholder="Название или источник..."
              className="w-full px-3 py-2 rounded-md bg-gray-50 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 text-sm"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
            />
          </div>

          <div className="border-b border-gray-200 pb-5">
            <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaSortAmountDown className="text-gray-500" /> Сортировка</h3>
            <div className="flex bg-gray-100 rounded-md p-1 shadow-inner text-sm">
              <button
                onClick={() => handleFilterChange({ type: 'SET_SORT_BY', payload: 'date' })}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all duration-200
                  ${filters.sortBy === 'date' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <FaCalendarAlt /> Новые
              </button>
              <button
                onClick={() => handleFilterChange({ type: 'SET_SORT_BY', payload: 'eventCount' })}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all duration-200
                  ${filters.sortBy === 'eventCount' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <FaSortNumericDownAlt /> Популярные
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2"><FaFilter className="text-gray-500" /> Теги</h3>
            <input
              type="text"
              placeholder="Найти тег..."
              className="w-full px-3 py-2 rounded-md mb-3 bg-gray-50 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 text-sm"
              value={filters.categorySearchTerm}
              onChange={(e) => handleFilterChange({ type: 'SET_CATEGORY_SEARCH_TERM', payload: e.target.value })}
            />
            <div className="max-h-72 overflow-y-auto pr-2 custom-scrollbar text-sm">
              <button
                className={`w-full text-left px-3 py-2 rounded-md mb-1.5 font-medium flex justify-between items-center transition-colors duration-200
                  ${!filters.selectedCategory && !filters.selectedEvent && !filters.categorySearchTerm ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-800 hover:bg-gray-100'}`}
                onClick={() => handleFilterChange({ type: 'RESET_FILTERS' })}
              >
                <span>Все новости</span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${!filters.selectedCategory && !filters.selectedEvent && !filters.categorySearchTerm ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  {posts.length}
                </span>
              </button>
              {filteredCategories.map((category) => (
                <button
                  key={category}
                  className={`w-full text-left px-3 py-2 rounded-md mb-1.5 flex justify-between items-center transition-colors duration-200
                    ${filters.selectedCategory === category ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => handleFilterChange({ type: 'SET_CATEGORY', payload: category })}
                >
                  <span className="truncate mr-2">{category}</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${filters.selectedCategory === category ? 'bg-indigo-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {postCountsByCategory[category] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isFilterActive && (
            <button
              onClick={() => handleFilterChange({ type: 'RESET_FILTERS' })}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-base font-medium bg-red-500 text-white hover:bg-red-600 transition-colors duration-300 shadow-md"
            >
              <MdClear /> Сбросить все фильтры
            </button>
          )}
        </div>
      </aside>

      <main className="w-full lg:w-3/5 flex flex-col">
        {initialLoading && <div className="text-center text-xl text-indigo-600 mt-10 p-5 bg-white rounded-lg shadow-lg">Загрузка новостей...</div>}
        {!initialLoading && error && <div className="text-center text-lg text-red-600 p-5 bg-red-100 rounded-lg shadow-md border border-red-200">{error}</div>}
        {!initialLoading && !error && displayedItems.slice(0, visiblePostsCount).map((item) =>
          'type' in item && item.type === 'group' ? (
            <EventGroupComponent key={item.event} event={item.event} posts={item.posts} formatPublicationDate={formatPublicationDate} readPosts={readPosts} markAsRead={markPostAsRead} />
          ) : (
            <PostComponent
              key={(item as ParsedPost).link_html}
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
        {!initialLoading && !error && displayedItems.length === 0 && (
          <div className="text-center text-lg text-gray-600 mt-10 p-8 bg-white rounded-lg shadow-lg border border-gray-200">
            Нет постов по вашему запросу. Попробуйте изменить фильтры.
          </div>
        )}
        {displayedItems.length > visiblePostsCount && (
          <button
            onClick={() => setVisiblePostsCount(prev => prev + POSTS_PER_PAGE)}
            className="mt-8 mb-4 p-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold text-lg shadow-lg self-center w-full max-w-xs transition-colors duration-300"
          >
            Загрузить еще
          </button>
        )}
      </main>
    </div>
  );
}