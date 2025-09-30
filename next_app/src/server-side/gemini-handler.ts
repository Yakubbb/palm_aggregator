'use server'
import { GoogleGenAI, Type } from '@google/genai';
import { ParsedPost } from './parser';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function get_category_for_posts(posts: ParsedPost[], avalible_categories: string[], avalible_events: string[]) {


    if (posts.length < 1) {
        return posts.map(post => ({ ...post, category: [] }));
    }


    const posts_slice = posts.slice(0, 100)

    const posts_left_count = posts.length - 100

    console.log('новости на обзор', posts_slice)
    console.log('Доступные ивенты', avalible_events)
    console.log('Доступные категории', avalible_categories)

    const postsJsonString = JSON.stringify(posts_slice.map(post => ({ title: post.title, pubdate: post.pubdate })));



    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: `Вот твой набор новостей: ${postsJsonString}`,
            config: {
                systemInstruction: `Ты выступаешь в роли группировщика новостей по категориям и событиям. 
                Ты получаешь набор новостей в формате {title:заголовок новости, pubdate: дата публикации (иногда нужно учитывать при определения события)}
                и ты должен сгруппировать по категориям и привязать их к конкретному событию. Из уже существующих событий есть:
                ${avalible_categories.map(cat => `${cat}, `)} из уже существующих событий есть: ${avalible_events.map(cat => `${cat}, `)}
                В случае если новость не подходит под событие или под категорию, ты можешь создать новую. Категорий у новости может быть несколько,
                но событие одно. Событие нужно для того, чтобы отслеживать разные источники по ОДНОМУ инфоповоду, поэтому событие не должно быть обобщенным,
                оно должно быть конкретным. Если новость состоит из высказывания какого-то спикера, то событие должно включать конкретную тему высказывания.
                В то же время категории могут иметь в себе новости одного типа, но по разным событиям. Если даже новость на английском, событие и категория
                должны быть на русском. От тебя я жду массив формата 
                {title:заголовок новости который ты получил, event?:событие по этой новости, category:[массив категорий новости]}. Нужно всё это для того, 
                чтобы по одному событию можно было получать новости с разных источников. Опять же, событие должно быть конкрентым. Если в заголовке 
                содержатся дата или место проведения события - это должно быть в событии, так как этот фильтр нужен для того чтобы новости 
                относились к КОНКРЕТНОМУ инфоповоду. Если новость не несёт в себе никакого события, то можешь не добавлять поле event, но категория 
                обязательна`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            event: { type: Type.STRING },
                            category: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        },
                        required: ['title', 'category']
                    }
                },
            },
        });


        if (response.candidates && response.candidates[0]?.content?.parts && response.candidates[0].content.parts.length > 0) {
            const geminiOutputText = response.candidates[0].content.parts[0].text;
            console.log('ОТВЕТ ГЕМИНИ', geminiOutputText)
            try {
                const categories_titles = JSON.parse(geminiOutputText!) as { title: string, category: string[], event: string }[];
                console.log('категории и названия', categories_titles)
                console.log('Успешно')
                console.log('Постов осталось', posts_left_count)
                return posts_slice.map(post => {
                    const options = categories_titles.find(obj => obj.title === post.title);
                    return {
                        ...post,
                        category: options?.category || [],
                        event: options?.event
                    };
                });
            } catch (parseError) {
                console.log('Failed to parse JSON from Gemini', geminiOutputText)
                console.error("Failed to parse JSON from Gemini:", parseError);
                console.error("Raw Gemini output:", geminiOutputText);
                return posts_slice.map(post => ({ ...post, category: [] }));
            }
        } else {
            console.warn("Gemini did not return candidates or content in the response.");
            console.log(JSON.stringify(response))
            return posts_slice.map(post => ({ ...post, category: [] }));
        }
    } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        return posts_slice.map(post => ({ ...post, category: [] }));
    }
}