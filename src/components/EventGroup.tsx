'use client'
import { ParsedPost } from "@/server-side/database-handler";
import { useMemo, useState } from "react";
import { FaChevronDown, FaLayerGroup, FaNewspaper } from "react-icons/fa";
import { PostComponent } from "./Post";

export function EventGroupComponent({
    event,
    posts,
    formatPublicationDate,
    readPosts,
    markAsRead
}: {
    event: string;
    posts: ParsedPost[];
    formatPublicationDate: (date: string) => string;
    readPosts: Set<string>;
    markAsRead: (link: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const toggleOpen = () => setIsOpen(!isOpen);

    const { latestDate, readCount, totalCount, progress } = useMemo(() => {
        const total = posts.length;
        if (total === 0) {
            return { latestDate: '', readCount: 0, totalCount: 0, progress: 0 };
        }
        const read = posts.filter(post => readPosts.has(post.link_html)).length;

        return {
            latestDate: formatPublicationDate(posts[0].pubdate),
            readCount: read,
            totalCount: total,
            progress: total > 0 ? (read / total) * 100 : 0,
        };
    }, [posts, readPosts, formatPublicationDate]);

    return (
        <section className="w-full mb-6 bg-gradient-to-br from-indigo-50 via-white to-violet-50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="w-full p-2.5">
                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-500 rounded-full"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <button
                onClick={toggleOpen}
                className="w-full p-5 text-left flex justify-between items-center hover:bg-black/5 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-5 min-w-0">
                    <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-full p-3 shadow-md">
                        <FaLayerGroup className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 break-words leading-tight">
                            {event}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1.5">
                            {readCount} из {totalCount} прочитано • Последнее: <time dateTime={posts[0]?.pubdate}>{latestDate}</time>
                        </p>
                        <div className="hidden sm:flex flex-wrap gap-x-4 gap-y-2 mt-2">
                            {
                                Array.from(new Set(posts.map((post) => (post.from)))).slice(0, 3).map((source, index) => (
                                    <div key={index} className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                                        <FaNewspaper />
                                        {source}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-x-4 flex-shrink-0 ml-4">
                    <FaChevronDown className={`h-6 w-6 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <div className={`transition-[max-height] ease-in-out overflow-y-auto ${isOpen ? 'duration-300 max-h-[40rem]' : 'duration-160 max-h-0'}`}>
                <div className="bg-white/50 border-t border-indigo-100">
                    <div className="py-2 pr-2 ">
                        {posts.map((post, index) => (
                            <PostComponent
                                key={index}
                                event={event}
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
                </div>
            </div>
        </section>
    );
}