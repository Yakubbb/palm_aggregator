'use client'
import { get_all_posts, get_avalible_categories, get_avalible_events } from "@/server-side/database-handler";
import { get_actutal_rss, ParsedPost } from "@/server-side/parser";
import { useEffect, useState, useMemo, useCallback } from "react";

const POSTS_PER_PAGE = 50;

function PostComponent({ title, link, from, category, publication_date, rss_link, isGrouped = false }: {
  title: string,
  link: string,
  from: string,
  category: string[],
  publication_date: string,
  rss_link: string,
  event?: string,
  isGrouped?: boolean
}) {
  const cardClasses = `
    block w-full p-5 bg-white border border-slate-200 rounded-lg shadow-sm
    hover:shadow-lg hover:border-indigo-400 transition-all duration-300
    flex flex-col justify-between text-slate-800
    ${isGrouped ? 'mb-0 border-t-0 first:border-t rounded-t-none' : 'mb-4'}
  `;

  return (
    <div className={cardClasses}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2 break-words">{title}</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 mb-3">
          <span>Источник: <span className="font-medium text-slate-600">{from}</span></span>
          <span>Дата: <span className="font-medium text-slate-600">{publication_date}</span></span>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 mt-3 text-xs">
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-full">
          <span className="text-slate-500">URL:</span> {link}
        </a>
        <a href={rss_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-full">
          <span className="text-slate-500">RSS:</span> {rss_link}
        </a>
      </div>
      {category && category.length > 0 && (
        <div className="text-xs text-slate-500 mt-3 flex flex-wrap gap-2">
          {category.map(cat => (
            <span key={cat} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full">{cat}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function EventGroupComponent({ event, posts, formatPublicationDate }: { event: string, posts: ParsedPost[], formatPublicationDate: (date: string) => string }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleOpen = () => setIsOpen(!isOpen);
  const latestDate = posts.length > 0 ? formatPublicationDate(posts[0].pubdate) : '';

  return (
    <div className="block w-full mb-4 border border-slate-200 rounded-lg shadow-sm bg-white hover:shadow-lg transition-shadow duration-300">
      <button onClick={toggleOpen} className="w-full p-5 text-left flex justify-between items-center hover:bg-slate-50 rounded-t-lg transition-colors">
        <div>
          <h3 className="flex flex-row text-lg font-bold text-indigo-700">{posts[0].title}
            
             </h3>
          <p className="text-sm text-slate-500 mt-1">
            {posts.length} {posts.length === 1 ? 'статья' : (posts.length < 5 ? 'статьи' : 'статей')} • Последнее обновление: {latestDate}
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-6 w-6 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="bg-slate-50/50 rounded-b-lg">
          {posts.map((post, index) => (
            <PostComponent
              key={index}
              title={post.title}
              link={post.link_html}
              from={post.from}
              category={post.category}
              publication_date={formatPublicationDate(post.pubdate)}
              rss_link={post.link_xml}
              isGrouped={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState<ParsedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [visiblePostsCount, setVisiblePostsCount] = useState(POSTS_PER_PAGE);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categorySearchTerm, setCategorySearchTerm] = useState<string>('');

  useEffect(() => {
    const fetch_async = async () => {
      try {
        const fetched_data = await get_all_posts();
        setPosts(fetched_data as ParsedPost[]);
      } catch (e) {
        console.error("Failed to fetch RSS feeds:", e);
        setError("ERROR: Failed to load feeds. Check server logs.");
      } finally {
        setLoading(false);
      }
    };
    fetch_async();
  }, []);

  useEffect(() => {
    const fetchdata = async () => {
      const avalible_categories = await get_avalible_categories()
      const avalible_events = await get_avalible_events()
    }
    fetchdata()
  }, [])

  const formatPublicationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error("Failed to format date:", dateString, e);
      return dateString;
    }
  };

  const allCategories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    posts.forEach(post => {
      const categories = Array.isArray(post.category) ? post.category : [post.category];
      categories.forEach(cat => cat && uniqueCategories.add(cat));
    });
    return Array.from(uniqueCategories).sort();
  }, [posts]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) return allCategories;
    return allCategories.filter(category => category.toLowerCase().includes(categorySearchTerm.toLowerCase()));
  }, [allCategories, categorySearchTerm]);

  const sortedAndFilteredPosts = useMemo(() => {
    let currentPosts = [...posts];
    currentPosts.sort((a, b) => new Date(b.pubdate).getTime() - new Date(a.pubdate).getTime());

    if (selectedCategory !== null) {
      currentPosts = currentPosts.filter(post => Array.isArray(post.category) ? post.category.includes(selectedCategory) : post.category === selectedCategory);
    } else if (selectedEvent !== null) {
      currentPosts = currentPosts.filter(post => post.event === selectedEvent);
    }

    if (searchTerm) {
      currentPosts = currentPosts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.from.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return currentPosts;
  }, [posts, selectedCategory, selectedEvent, searchTerm]);

  const displayedItems = useMemo(() => {
    const eventGroups: { [key: string]: ParsedPost[] } = {};
    const otherItems: (ParsedPost | { type: 'group', event: string, posts: ParsedPost[] })[] = [];

    sortedAndFilteredPosts.forEach(post => {
      if (post.event) {
        if (!eventGroups[post.event]) eventGroups[post.event] = [];
        eventGroups[post.event].push(post);
      } else {
        otherItems.push(post);
      }
    });

    const sortedGroups = Object.entries(eventGroups).map(([event, posts]) => ({
      type: 'group' as const,
      event,
      posts,
      latestDate: new Date(posts[0].pubdate).getTime()
    })).sort((a, b) => b.latestDate - a.latestDate);

    const combined = [...otherItems];
    sortedGroups.forEach(group => {
      const insertIndex = combined.findIndex(item => 'pubdate' in item && new Date(item.pubdate).getTime() < group.latestDate);
      if (insertIndex === -1) combined.push(group);
      else combined.splice(insertIndex, 0, group);
    });

    return combined.slice(0, visiblePostsCount);
  }, [sortedAndFilteredPosts, visiblePostsCount]);

  const postCountsByCategory = useMemo(() => {
    const counts: { [key: string]: number } = {};
    posts.forEach(post => {
      const categories = Array.isArray(post.category) ? post.category : [post.category];
      categories.forEach(cat => {
        if (cat) counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [posts]);

  const topEvents = useMemo(() => {
    const counts: { [key: string]: number } = {};
    posts.forEach(post => {
      if (post.event) {
        counts[post.event] = (counts[post.event] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);
  }, [posts]);

  const topCategories = useMemo(() => {
    return Object.entries(postCountsByCategory)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5);
  }, [postCountsByCategory]);

  const loadMorePosts = useCallback(() => setVisiblePostsCount(prev => prev + POSTS_PER_PAGE), []);

  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setSelectedEvent(null);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleEventChange = useCallback((event: string | null) => {
    setSelectedEvent(event);
    setSelectedCategory(null);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedEvent(null);
    setCategorySearchTerm('');
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleCategorySearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCategorySearchTerm(event.target.value);
    setSelectedCategory(null);
    setSelectedEvent(null);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleRefresh = useCallback(() => {
    const fetch_data = async () => {
      setLoading(true);
      setError(null);
      try {
        const new_posts_fetched = await get_actutal_rss();
        if (new_posts_fetched) {
          setPosts(prevPosts => [...new_posts_fetched, ...prevPosts] as ParsedPost[]);
        }
      } catch (e) {
        console.error("Failed to fetch new RSS feeds on refresh:", e);
        setError("ERROR: Failed to refresh feeds. Check server logs.");
      } finally {
        setLoading(false);
      }
    };
    fetch_data();
  }, []);

  return (
    <div className="bg-slate-100/50 text-slate-900 p-4 sm:p-6 min-h-screen">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-12 gap-8">

        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-6">
            <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col gap-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Меню</h3>
                <button
                  className="w-full text-center p-2.5 rounded-lg transition-all duration-200 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-indigo-300"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? 'Обновление...' : 'Обновить ленту'}
                </button>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Поиск</h3>
                <input
                  type="text"
                  placeholder="Название или источник..."
                  className="block w-full p-2.5 rounded-md bg-slate-100 text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>

              {selectedEvent && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h4 className="font-bold text-sm text-indigo-800">Активное событие:</h4>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-slate-700 truncate pr-2">{selectedEvent}</span>
                    <button onClick={() => handleEventChange(null)} className="text-xs text-red-500 hover:underline flex-shrink-0">Сбросить</button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Теги</h3>
                <input
                  type="text"
                  placeholder="Найти тег..."
                  className="block w-full p-2.5 rounded-md mb-3 bg-slate-100 text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  value={categorySearchTerm}
                  onChange={handleCategorySearchChange}
                />
                <div className="max-h-80 overflow-y-auto pr-2">
                  <button
                    className={`w-full text-left p-2 rounded-md mb-1.5 transition-colors text-sm font-medium flex justify-between ${selectedCategory === null && selectedEvent === null && !categorySearchTerm ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                    onClick={handleClearFilters}
                  >
                    <span>Все новости</span>
                    <span>{posts.length}</span>
                  </button>
                  {filteredCategories.map((category) => (
                    <button
                      key={category}
                      className={`w-full text-left p-2 rounded-md mb-1.5 transition-colors text-sm flex justify-between items-center ${selectedCategory === category ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                      onClick={() => handleCategoryChange(category)}
                    >
                      <span className="truncate pr-2">{category}</span>
                      <span className="bg-slate-200 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">{postCountsByCategory[category] || 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-span-12 lg:col-span-6 flex flex-col items-center">
          {loading && <div className="text-center text-lg text-indigo-600 mt-10">Загрузка новостей...</div>}
          {error && <div className="text-center text-lg text-red-600 p-4 bg-red-100 rounded-lg w-full">{error}</div>}

          {!loading && !error && displayedItems.length > 0 && displayedItems.map((item, index) =>
            'type' in item && item.type === 'group' ? (
              <EventGroupComponent
                key={item.event}
                event={item.event}
                posts={item.posts}
                formatPublicationDate={formatPublicationDate}
              />
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
              />
            )
          )}

          {!loading && !error && displayedItems.length === 0 && (
            <div className="text-center text-lg text-slate-500 mt-10">
              Нет доступных постов по вашему запросу.
            </div>
          )}

          {sortedAndFilteredPosts.length > visiblePostsCount && (
            <button
              onClick={loadMorePosts}
              className="mt-6 p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-semibold"
            >
              Загрузить еще {Math.min(POSTS_PER_PAGE, sortedAndFilteredPosts.length - visiblePostsCount)}
            </button>
          )}
        </main>

        <aside className="col-span-12 lg:col-span-3">
          <div className="sticky top-6">
            <div className="p-4 border border-slate-200 rounded-lg bg-white shadow-sm flex flex-col gap-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Популярные события</h3>
                {topEvents.length > 0 ? topEvents.map(([event, count]) => (
                  <button
                    key={event}
                    onClick={() => handleEventChange(event)}
                    className="w-full text-left p-2 rounded-md mb-1.5 transition-colors text-sm hover:bg-slate-100 flex justify-between items-center gap-2"
                  >
                    <span className="truncate pr-2">{event}</span>
                    <span className="font-bold flex-shrink-0">{count}</span>
                  </button>
                )) : <p className="text-sm text-slate-500">Событий пока нет.</p>}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Популярные теги</h3>
                {topCategories.map(([category, count]) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className="w-full text-left p-2 rounded-md mb-1.5 transition-colors text-sm hover:bg-slate-100 flex justify-between items-center"
                  >
                    <span className="truncate pr-2">{category}</span>
                    <span className="font-bold flex-shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}