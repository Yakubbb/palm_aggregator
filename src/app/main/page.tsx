'use client'

import { get_all_posts, ParsedPost } from "@/server-side/database-handler"
import { useEffect, useState } from "react"

function Post(data: ParsedPost) {
    return (
        <div>{data.title}</div>
    )
}



export default function Main() {

    const [posts, setPosts] = useState<ParsedPost[]>()
    const [currentSortMethod, setCurrentSortMethod] = useState<'by_date' | 'by_event_count'>('by_date')
    const [errorMsg, setErrorMsg] = useState()

    const sort_posts_with_sort_method = async (posts: ParsedPost[]) => {
        switch (currentSortMethod) {
            case 'by_date':
           
        }
    }

    const fetch_new_posts = async () => {
        try {
            const posts = await get_all_posts()

            setPosts(posts)

        }
        catch (e) {

        }
    }

    useEffect(() => {
        fetch_new_posts()


    }, [])

    return (
        <div>

        </div>
    )
}