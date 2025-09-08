'use server'
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeFile, access } from "fs/promises";
import path from "path";

export interface ParsedPost {
    from: string,
    title: string,
    pubdate: string,
    link_html: string,
    link_xml: string,
    description?: string,
    img?: string,
    category: string[]
    event?: string
}




const uri = process.env.MONGODB_URI as string

const client = new MongoClient(uri);

export async function select_only_new_posts(posts: ParsedPost[]) {
    client.connect()
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)

    const database = client.db("rss-parser");
    const collection_items = await database.collection("news").find().toArray();

    const not_existing_posts = posts.filter(post => !collection_items.find(item => post.link_html == item.link_html))

    return not_existing_posts
}


export async function get_all_posts() {
    client.connect()
    const database = client.db("rss-parser");
    const collection = database.collection("news");

    return (await collection.find().toArray()).map(post => {
        return {
            ...post,
            _id: post._id.toString()
        };
    }) as any as ParsedPost[] //xd

}

export async function get_avalible_categories(): Promise<string[]> {
    client.connect()
    const database = client.db("rss-parser");
    const collection = database.collection("news");

    let all_categories: string[] = []

    const categories = (await collection.find().toArray()).map(c => {
        console.log(c)
        all_categories = all_categories.concat(c.category)
    })

    return Array.from(new Set(all_categories))
}

export async function get_avalible_events(): Promise<string[]> {
    client.connect()
    const database = client.db("rss-parser");
    const collection = database.collection("news");
    const events: string[] = []

    const categories = (await collection.find().toArray()).map(c => {
        if (c.event) {
            events.push(c.event)
        }
    })

    return Array.from(new Set(events))
}
