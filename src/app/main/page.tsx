'use client'

import { get_all_posts, ParsedPost } from "@/server-side/database-handler"
import { useEffect, useState, useMemo } from "react"

// Компонент Post остается без изменений
function Post({ data, variant = 'default' }: { data: ParsedPost, variant?: 'featured' | 'default' }) {
    
    const isFeatured = variant === 'featured';
    const containerClasses = isFeatured 
        ? "md:flex-row h-full"
        : "flex-col";
    const imageContainerClasses = isFeatured ? "md:w-1/2" : "h-48";
    const titleClasses = isFeatured ? "text-2xl md:text-3xl" : "text-xl";
    const descriptionClamp = "line-clamp-3"; // Упростим, всегда 3 строки

    return (
        <div className={`bg-white/50 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg overflow-hidden transform hover:scale-[1.02] transition-transform duration-300 ease-in-out flex ${containerClasses}`}>
            {data.img && (
                <div className={`w-full ${imageContainerClasses} overflow-hidden flex-shrink-0`}>
                    <img src={data.img} alt={data.title} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="p-6 flex flex-col flex-grow">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {data.category.map((cat, index) => (
                        <span key={index} className="inline-block bg-teal-200 text-teal-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            {cat}
                        </span>
                    ))}
                </div>
                
                <h2 className={`${titleClasses} font-bold text-gray-800 mb-2 line-clamp-2`} title={data.title}>
                    {data.title}
                </h2>

                {data.description && (
                    <p className={`text-gray-600 mb-4 flex-grow ${descriptionClamp}`}>
                        {data.description}
                    </p>
                )}

                <div className="flex justify-between items-center text-sm text-gray-500 mt-auto pt-2 border-t border-gray-200/80">
                    <span>{new Date(data.pubdate).toLocaleDateString()}</span>
                    <a href={data.link_html} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 font-semibold">
                        Читать далее
                    </a>
                </div>
            </div>
        </div>
    );
}


// Новый компонент для группы событий
function EventGroup({ title, posts, isExpanded, onToggle }: { title: string, posts: ParsedPost[], isExpanded: boolean, onToggle: () => void }) {
    return (
        <div className="w-full max-w-4xl bg-white/60 backdrop-blur-sm border border-gray-200/70 rounded-2xl shadow-md overflow-hidden transition-all duration-300">
            {/* Заголовок группы, который работает как кнопка */}
            <button onClick={onToggle} className="w-full flex justify-between items-center p-5 text-left">
                <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                    <span className="bg-indigo-200 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full">{posts.length} новостей</span>
                </div>
                {/* Иконка-стрелка для индикации раскрытия */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" 
                     className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
            </button>
            
            {/* Контейнер с постами, который плавно появляется и исчезает */}
            <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-5 border-t border-gray-200/80 flex flex-wrap justify-center gap-4">
                        {posts.map(post => (
                            <div key={post._id} className="w-full sm:w-80 h-96">
                                <Post data={post} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function Main() {
    const [posts, setPosts] = useState<ParsedPost[]>()
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

    const fetch_new_posts = async () => {
        try {
            const posts = await get_all_posts()
            setPosts(posts)
        } catch (e) {
            // Обработка ошибок
        }
    }

    useEffect(() => {
        fetch_new_posts()
    }, [])

    const { groupedPosts, singlePosts } = useMemo(() => {
        if (!posts) return { groupedPosts: {}, singlePosts: [] };

        const grouped = posts.reduce((acc, post) => {
            if (post.event) {
                if (!acc[post.event]) {
                    acc[post.event] = [];
                }
                acc[post.event].push(post);
            }
            return acc;
        }, {} as Record<string, ParsedPost[]>);

        const singles = posts.filter(post => !post.event);

        return { groupedPosts: grouped, singlePosts: singles };

    }, [posts]);

    const toggleGroup = (eventName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [eventName]: !prev[eventName]
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-12 text-gray-800">Лента новостей</h1>
                
                <div className="flex flex-col items-center gap-8">
                    {/* Рендерим группы событий */}
                    {Object.entries(groupedPosts).map(([eventName, eventPosts]) => (
                        <EventGroup 
                            key={eventName}
                            title={eventName}
                            posts={eventPosts}
                            isExpanded={!!expandedGroups[eventName]}
                            onToggle={() => toggleGroup(eventName)}
                        />
                    ))}

                    {/* Рендерим одиночные посты в обертке flex-wrap */}
                    <div className="flex flex-wrap justify-center gap-4">
                        {singlePosts.map((post) => (
                            <div key={post._id} className="w-full max-w-sm h-96">
                               <Post data={post} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}