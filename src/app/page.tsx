'use client'
import { get_all_posts } from "@/server-side/database-handler";
import { get_category_for_posts } from "@/server-side/gemini-handler";
import { get_actutal_rss, ParsedPost } from "@/server-side/parser";
import { useEffect, useState, useMemo, useCallback } from "react";

const POSTS_PER_PAGE = 50;

// Обновленный интерфейс ParsedPost, чтобы учесть массив категорий
interface ParsedPostWithMultipleCategories extends ParsedPost {
  category: string[]; // Изменено на массив строк
}

export function PostComponent({ title, link, from, category, publication_date, rss_link }:
  { title: string, link: string, from: string, category: string[], publication_date: string, rss_link: string } // Изменено на string[]
) {
  return (
    <div className="block w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px] xl:w-[700px] p-4 border border-green-600 rounded-lg bg-gray-900 font-mono text-green-400 shadow-xl mb-4 flex flex-col justify-between">
      <div className="text-md font-bold text-green-300 mb-2 break-words">
        {title}
      </div>
      <div className="text-sm text-gray-500 truncate">
        <span className="text-green-600">Источник:</span> {from}
      </div>
      <div className="text-xs text-green-700 mt-2 truncate">
        <span className="text-green-600">Дата публикации:</span> {publication_date}
      </div>
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-200 hover:underline mt-2 truncate">
        <span className="text-green-600">URL:</span> {link}
      </a>
      <a href={rss_link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:text-green-200 hover:underline mt-2 truncate">
        <span className="text-green-600">RSS_URL:</span> {rss_link}
      </a>
      <div className="text-xs text-green-700 mt-2"> {/* Удален truncate, чтобы отобразить все категории */}
        <span className="text-green-600">Категории:</span> {category.join(', ')} {/* Объединяем массив категорий в строку */}
      </div>
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState<ParsedPostWithMultipleCategories[]>([]); // Обновлен тип состояния
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visiblePostsCount, setVisiblePostsCount] = useState(POSTS_PER_PAGE);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categorySearchTerm, setCategorySearchTerm] = useState<string>('');

  useEffect(() => {
    const fetch_async = async () => {
      try {
        let fetched_data = await get_all_posts();
        // Предполагаем, что get_all_posts теперь возвращает данные с массивом категорий
        // Если get_all_posts еще возвращает строку, вам нужно будет преобразовать ее здесь
        // Например: fetched_data.map(post => ({ ...post, category: Array.isArray(post.category) ? post.category : [post.category] }))
        setPosts(fetched_data);
      } catch (e) {
        console.error("Failed to fetch RSS feeds:", e);
        setError("ERROR: Failed to load feeds. Check server logs.");
      } finally {
        setLoading(false);
      }
    };
    fetch_async();
  }, []);

  const formatPublicationDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      console.error("Failed to format date:", dateString, e);
      return dateString;
    }
  };

  const allCategories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    posts.forEach(post => {
      if (Array.isArray(post.category)) {
        post.category.forEach(cat => uniqueCategories.add(cat));
      } else {
        uniqueCategories.add(post.category); // На случай, если по какой-то причине категория все еще строка
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [posts]);

  const filteredCategories = useMemo(() => {
    if (!categorySearchTerm) {
      return allCategories;
    }
    return allCategories.filter(category =>
      category.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );
  }, [allCategories, categorySearchTerm]);

  const sortedAndFilteredPosts = useMemo(() => {
    let currentPosts = [...posts];

    currentPosts.sort((a, b) => new Date(b.pubdate).getTime() - new Date(a.pubdate).getTime());

    if (selectedCategory !== null) {
      currentPosts = currentPosts.filter(post =>
        Array.isArray(post.category) ? post.category.includes(selectedCategory) : post.category === selectedCategory
      );
    }

    if (searchTerm) {
      currentPosts = currentPosts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.from.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return currentPosts;
  }, [posts, selectedCategory, searchTerm]);

  const displayedPosts = useMemo(() => {
    return sortedAndFilteredPosts.slice(0, visiblePostsCount);
  }, [sortedAndFilteredPosts, visiblePostsCount]);

  const postCountsByCategory = useMemo(() => {
    const counts: { [key: string]: number } = {};
    posts.forEach(post => {
      if (Array.isArray(post.category)) {
        post.category.forEach(cat => {
          counts[cat] = (counts[cat] || 0) + 1;
        });
      } else {
        counts[post.category] = (counts[post.category] || 0) + 1;
      }
    });
    return counts;
  }, [posts]);

  const topCategories = useMemo(() => {
    const categoryCountsArray = Object.entries(postCountsByCategory).sort(([, countA], [, countB]) => countB - countA);
    return categoryCountsArray.slice(0, 3);
  }, [postCountsByCategory]);

  const loadMorePosts = useCallback(() => {
    setVisiblePostsCount(prevCount => prevCount + POSTS_PER_PAGE);
  }, []);

  const handleCategoryChange = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleCategorySearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCategorySearchTerm(event.target.value);
    setSelectedCategory(null);
    setVisiblePostsCount(POSTS_PER_PAGE);
  }, []);

  const handleRefresh = useCallback(() => {
    const fetch_data = async () => {
      setLoading(true);
      setError(null);
      try {
        const new_posts_fetched = await get_actutal_rss();
        if (new_posts_fetched) {
          // Здесь вам также нужно будет убедиться, что get_actutal_rss возвращает массив категорий
          // или преобразовать его, если он возвращает строку.
          setPosts(prevPosts => {
            const updatedPosts = [...prevPosts, ...new_posts_fetched];
            console.log('Обновлены посты:', updatedPosts.length);
            return updatedPosts as ParsedPostWithMultipleCategories[]; // Приведение типов
          });
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
    <div className="font-mono bg-black text-green-400 p-5 flex flex-col items-center h-screen">
      <div className="w-full max-w-screen-xl flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/4 lg:w-1/5 p-4 border border-green-700 rounded-lg bg-gray-900 shadow-lg md:sticky md:top-4 h-fit">
          <h3 className="text-lg font-bold text-green-300 mb-4">Меню</h3>
          <button
            className="block w-full text-left p-2 rounded mb-2 transition-colors duration-200 hover:bg-green-600 bg-green-800 text-white"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? 'Обновление...' : 'Обновить'}
          </button>
          <h3 className="text-lg font-bold text-green-300 mb-4 mt-4">Поиск по статьям</h3>
          <input
            type="text"
            placeholder="Искать по названию или источнику..."
            className="block w-full p-2 rounded mb-4 bg-gray-800 text-green-400 border border-green-700 focus:outline-none focus:border-green-500"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <h3 className="text-lg font-bold text-green-300 mb-4 mt-4">Поиск по темам</h3>
          <input
            type="text"
            placeholder="Искать темы..."
            className="block w-full p-2 rounded mb-4 bg-gray-800 text-green-400 border border-green-700 focus:outline-none focus:border-green-500"
            value={categorySearchTerm}
            onChange={handleCategorySearchChange}
          />
          <h3 className="text-lg font-bold text-green-300 mb-4">Актуальные темы</h3>
          <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
            <button
              className={`block w-full text-left p-2 rounded mb-2 transition-colors duration-200 ${selectedCategory === null && !categorySearchTerm ? 'bg-green-700 text-white' : 'hover:bg-gray-800'}`}
              onClick={() => handleCategoryChange(null)}
            >
              Все темы ({posts.length})
            </button>
            {filteredCategories.map((category) => (
              <button
                key={category}
                className={`block w-full text-left p-2 rounded mb-2 transition-colors duration-200 ${selectedCategory === category ? 'bg-green-700 text-white' : 'hover:bg-gray-800'}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category} ({postCountsByCategory[category] || 0})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-grow mt-6 sm:mt-8 flex flex-col items-center">
          {loading && <div className="text-center text-lg text-green-500">Загрузка...</div>}
          {error && <div className="text-center text-lg text-red-500">{error}</div>}
          {displayedPosts.length > 0 ? (
            displayedPosts.map((post, index) => (
              <PostComponent
                key={index}
                title={post.title}
                link={post.link_html}
                from={post.from}
                category={post.category} // Теперь передаем массив
                publication_date={formatPublicationDate(post.pubdate)}
                rss_link={post.link_xml}
              />
            ))
          ) : (
            !loading && !error && (
              <div className="text-center text-base sm:text-lg text-gray-500">
                <span className="text-green-600">STATUS:</span> Нет доступных постов по вашему запросу.
              </div>
            )
          )}
          {sortedAndFilteredPosts.length > visiblePostsCount && (
            <button
              onClick={loadMorePosts}
              className="mt-4 p-3 bg-green-700 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
            >
              Загрузить еще {Math.min(POSTS_PER_PAGE, sortedAndFilteredPosts.length - visiblePostsCount)}
            </button>
          )}
        </div>
        <div className="flex flex-col gap-4 w-full md:w-1/4 lg:w-1/5  shadow-lg md:sticky md:top-4 h-fit mt-4 md:mt-0">
          <div className="border border-[#DAA520] rounded-lg bg-gray-900 rounded-lg bg-gray-900 w-full p-4">
            <h3 className="text-lg font-bold text-[#F0E68C] mb-4 ">Топ Темы</h3>
            {topCategories.map(([category, count]) => (
              <div key={category} className="mb-2 text-[#DAA520]">
                <span className="">{category}:</span> {count}
              </div>
            ))}
          </div>
          <div className="border border-[#DAA520] rounded-lg bg-gray-900 rounded-lg bg-gray-900 w-full p-4">
            aaaaaa
          </div>
        </div>
      </div>
    </div>
  );
}