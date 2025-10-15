'use server'
import { MongoClient } from 'mongodb';

export interface ParsedPost {
    _id: string,
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

export async function get_all_posts(): Promise<ParsedPost[]> {
    client.connect()
    const database = client.db("rss-parser");
    const collection = database.collection("news");

    const requiredFields = [
        'from',
        'title',
        'pubdate',
        'link_html',
        'link_xml',
        'category'
    ];

    const query = {} as any;
    requiredFields.forEach(field => {
        query[field] = { $exists: true, $ne: null };
    });

    const postsFromDb = await collection.find(query).toArray();


    return postsFromDb.map(post => {
        return {
            ...post,
            _id: post._id.toString()
        };
    }) as any as ParsedPost[]; //xd

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
