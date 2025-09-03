'use server'

import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import Parser from 'rss-parser';
import { randomInt } from 'crypto';
import { insert_new_posts, select_only_new_posts } from './database-handler';

interface OutlineAttributes {
    '@_type'?: string;
    '@_text'?: string;
    '@_title'?: string;
    '@_xmlUrl'?: string;
    '@_htmlUrl'?: string;
}

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



export async function fetch_rss(rss: OutlineAttributes) {
    if (!rss['@_xmlUrl']) {
        return null;
    }

    const parser = new Parser();
    try {
        const ready_rss = await parser.parseURL(rss['@_xmlUrl']);
        return {
            from: rss['@_text'],
            title: ready_rss.title,
            description: ready_rss.description,
            url: ready_rss.link,
            items: ready_rss.items
        };
    } catch (error) {
        console.error(`Ошибка при получении RSS с URL: ${rss['@_xmlUrl']}`);
        return null;
    }
}

export async function get_actutal_rss(): Promise<ParsedPost[] | undefined> {

    const opmlFilePath = path.join(process.cwd(), 'public', 'subscriptions.opml');
    const opmlContent = await fs.readFile(opmlFilePath, 'utf-8');

    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });

    const json_obj = parser.parse(opmlContent);
    const outlines: OutlineAttributes[][] = json_obj?.opml?.body?.outline || [];

    const unfetched_rss = (outlines as any[]).map(o => {
        if (!Array.isArray(o.outline)) {
            o.outline = [o.outline];
        }
        return (o.outline as OutlineAttributes[]).filter(outline => outline['@_type'] === 'rss' && outline['@_xmlUrl']);
    });

    const fetched_groups = await Promise.all(unfetched_rss.map(async rss_group => {
        const group_results = await Promise.all(rss_group.map(rss_item => fetch_rss(rss_item)));
        return group_results.filter(item => item !== null);
    }));

    const fetched_rss = fetched_groups.flat();

    let ready_rss: any[] = []
    const CATEGORIES = ['Праздник 8 марта', 'ДТП на улице такой-то', 'Последнее заявление лукашенко']


    fetched_rss.forEach(rss => {
        rss.items.forEach(item => {
            ready_rss.push({
                from: rss.from,
                title: item.title,
                pubdate: item.pubDate,
                link_html: item.link,
                link_xml: rss.url,
                description: item.summary,
                category: []
            })
        })
    });

    const only_new_rss = await select_only_new_posts(ready_rss)
    const new_inserted_posts_with_id = await insert_new_posts(only_new_rss)


    return new_inserted_posts_with_id;
}

