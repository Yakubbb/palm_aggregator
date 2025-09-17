'use client';

import { ParsedPost } from "@/server-side/database-handler";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

export function PostComponent ({ title, link, from, category, publication_date, rss_link, isGrouped = false, isRead, markAsRead }: {
    title: string,
    link: string,
    from: string,
    category: string[],
    publication_date: string,
    rss_link: string,
    event?: string,
    isGrouped?: boolean,
    isRead: boolean,
    markAsRead: (link: string) => void
}) {
    const postRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentRef = postRef.current;
        if (!currentRef || isRead) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
                    markAsRead(link);
                    observer.unobserve(currentRef);
                }
            },
            {
                threshold: 0,
                rootMargin: '0px 0px 0px 0px'
            }
        );

        observer.observe(currentRef);

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [link, markAsRead, isRead]);

    const cardClasses = `
    block w-full p-5 bg-white border border-gray-200 shadow-sm
    hover:shadow-lg hover:border-indigo-400 transition-all duration-300
    flex flex-col justify-between text-gray-800
    ${isGrouped ? 'mb-0 border-t-0 first:border-t rounded-t-none' : 'mb-4 rounded-lg'}
    ${isRead ? 'opacity-75 bg-gray-50' : ''}
  `;

    return (
        <div ref={postRef} className={cardClasses}>
            <div>
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2 break-words pr-2 leading-tight">{title}</h2>
                    {isRead && <span className="text-sm text-gray-400 italic mt-1 ml-2 whitespace-nowrap">прочитано</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mb-3">
                    <span>Источник: <span className="font-medium text-gray-700">{from}</span></span>
                    <span>Дата: <span className="font-medium text-gray-700">{publication_date}</span></span>
                </div>
            </div>
            <div className="flex flex-col items-start gap-1 mt-3 text-xs md:text-sm">
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-full">
                    <span className="text-gray-500">URL:</span> {link}
                </a>
                <a href={rss_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline truncate max-w-full">
                    <span className="text-gray-500">RSS:</span> {rss_link}
                </a>
            </div>
            {category && category.length > 0 && (
                <div className="text-xs text-gray-500 mt-4 flex flex-wrap gap-2">
                    {category.map(cat => (
                        <span key={cat} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">{cat}</span>
                    ))}
                </div>
            )}
        </div>
    );
}



export function EventGroupComponent({ event, posts, formatPublicationDate, readPosts, markAsRead }: {
    event: string,
    posts: ParsedPost[],
    formatPublicationDate: (date: string) => string,
    readPosts: Set<string>,
    markAsRead: (link: string) => void
}) {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen(!isOpen);
    const latestDate = posts.length > 0 ? formatPublicationDate(posts[0].pubdate) : '';

    const isGroupRead = useMemo(() => {
        return posts.every(post => readPosts.has(post.link_html));
    }, [posts, readPosts]);

    const groupClasses = `
    w-full mb-4 border border-gray-200 rounded-lg shadow-md bg-white hover:shadow-lg transition-shadow duration-300
    ${isGroupRead ? 'opacity-90 bg-gray-50' : ''}
  `;

    return (
        <div className={groupClasses}>
            <button
                onClick={toggleOpen}
                className="w-full p-5 text-left flex justify-between items-center hover:bg-gray-50 rounded-lg transition-colors duration-200"
                aria-expanded={isOpen}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <div className="flex flex-col">
                        <div className="flex items-center">
                            <h3 className="text-xl font-bold text-indigo-700 break-words pr-2 leading-tight">{event}</h3>
                            {isGroupRead && <span className="ml-3 text-sm text-gray-400 italic whitespace-nowrap">прочитано</span>}
                        </div>
                        <span className="text-sm text-gray-500 mt-1">Последнее обновление: {latestDate}</span>
                    </div>
                </div>

                <div className="flex items-center gap-x-4 flex-shrink-0">
                    <span className="bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full hidden sm:block">{posts.length}</span>
                    {isOpen ? <FaChevronUp className="h-5 w-5 text-gray-500" /> : <FaChevronDown className="h-5 w-5 text-gray-500" />}
                </div>
            </button>

            {isOpen && (
                <div className="bg-gray-50/50 rounded-b-lg border-t border-gray-200 pt-1">
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
                            isRead={readPosts.has(post.link_html)}
                            markAsRead={markAsRead}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}