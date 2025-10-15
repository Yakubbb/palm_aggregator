'use client'
import { useEffect, useRef } from "react";
import { FaLink, FaRss, FaNewspaper, FaCalendarAlt, FaLayerGroup, FaCheckCircle } from "react-icons/fa";

export function PostComponent({
    title,
    link,
    from,
    category,
    publication_date,
    rss_link,
    event,
    isGrouped = false,
    isRead,
    markAsRead
}: {
    title: string;
    link: string;
    from: string;
    category: string[];
    publication_date: string;
    rss_link: string;
    event?: string;
    isGrouped?: boolean;
    isRead: boolean;
    markAsRead: (link: string) => void;
}) {
    const postRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentRef = postRef.current;
        if (!currentRef || isRead) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.75) {
                    markAsRead(link);
                    observer.unobserve(currentRef);
                }
            },
            { threshold: 0.75 }
        );

        observer.observe(currentRef);

        return () => {
            if (currentRef) observer.unobserve(currentRef);
        };
    }, [link, markAsRead, isRead]);

    const cardBaseClasses = "w-full bg-white/80 backdrop-blur-sm transition-all duration-300 relative border-l-4";
    const cardLayoutClasses = isGrouped 
        ? 'border-t border-indigo-100' 
        : 'mb-4 rounded-2xl border-t border-r border-b border-gray-200 shadow-lg hover:shadow-xl';
    const cardStateClasses = isRead 
        ? 'border-gray-300' 
        : 'border-indigo-500 hover:border-indigo-600';

    return (
        <article ref={postRef} className={`${cardBaseClasses} ${cardLayoutClasses} ${cardStateClasses}`}>
            {isRead && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-gray-500">
                    <span>Прочитано</span>
                </div>
            )}
            <div className="p-5 pr-20">
                <header>
                    {event && (
                        <div className="mb-3 flex items-center">
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-800 flex items-center gap-2">
                                <FaLayerGroup />
                                {event}
                            </span>
                        </div>
                    )}
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => markAsRead(link)}
                        className="text-xl font-bold text-gray-900 hover:text-indigo-600 transition-colors break-words leading-tight mb-3 block"
                    >
                        {title}
                    </a>
                </header>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                        <FaNewspaper className="text-gray-400" />
                        <span className="font-medium text-gray-800">{from}</span>
                    </div>
                    <time dateTime={publication_date} className="flex items-center gap-2">
                        <FaCalendarAlt className="text-gray-400" />
                        <span className="font-medium text-gray-800">{publication_date}</span>
                    </time>
                </div>

                {category && category.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {category.map((cat, index) => (
                            <span key={index} className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-100 text-indigo-800">
                                {cat}
                            </span>
                        ))}
                    </div>
                )}

                <footer className="flex items-center gap-5 text-sm mt-4">
                    <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                        <FaLink /> <span>Html</span>
                    </a>
                    <a href={rss_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors font-medium">
                        <FaRss /> <span>RSS</span>
                    </a>
                </footer>
            </div>
        </article>
    );
}