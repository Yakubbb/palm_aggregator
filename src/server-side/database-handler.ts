'use server'
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeFile, access } from "fs/promises";
import path from "path";
import { ParsedPost } from './parser';
import { get_category_for_posts } from './gemini-handler';




const uri = process.env.MONGODB_URI as string

const client = new MongoClient(uri);

export async function select_only_new_posts(posts: ParsedPost[]) {
    client.connect()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const database = client.db("rss-parser");
    const collection_items = await database.collection("news").find().toArray();

    const not_existing_posts = posts.filter(post => !collection_items.find(item => post.link_html == item.link_html))

    return not_existing_posts
}

export async function insert_new_posts(posts: ParsedPost[]) {

    if (posts.length < 1) {
        return
    }
    client.connect()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const database = client.db("rss-parser");
    const collection = database.collection("news");


    const avalible_categories = await get_avalible_categories()

    const posts_with_categories = await get_category_for_posts(posts, avalible_categories)

    const posts_to_insert = posts_with_categories!.map(post => {
        return {
            ...post,
            expiresAt: expiresAt
        }
    })


    const data = await collection.insertMany(posts_to_insert)

    return posts_to_insert.map(post => {
        return {
            ...post,
            _id: data.insertedIds[posts_to_insert.indexOf(post)]?.toString()
        }
    })

}

export async function get_all_posts() {

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
    const database = client.db("rss-parser");
    const collection = database.collection("news");

    const all_categories: string[] = []

    const categories = await collection.find().map(c => {
        all_categories.concat(c.category)
    })

    return Array.from(new Set(all_categories))
}
