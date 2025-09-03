'use server'
import { GoogleGenAI, Type } from '@google/genai';
import { ParsedPost } from './parser';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function get_category_for_posts(posts: ParsedPost[], avalible_categories: string[]) {
    if (posts.length < 1) {
        return posts.map(post => ({ ...post, category: [] }));
    }

    const postsJsonString = JSON.stringify(posts.slice(0, 500).map(post => ({ title: post.title })));

    console.log('новости на обзор', postsJsonString)

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-lite",
            contents: `Вот твой набор новостей: ${postsJsonString}`,
            config: {
                systemInstruction: `Ты принимаешь набор заголовков новостей и должен объединить их по общим темам. Каждая новость может относиться к одной или нескольким темам/категориям. Когда это возможно, старайся объединять новости по конкретным событиям, а не просто по общим категориям. Ты можешь как использовать уже имеющиеся категории, так и создавать свои (новости должны в идеале группироваться по новостным событиям, иногда привязанным к определенной дате). Из уже доступных событий у тебя есть: ${avalible_categories.map(cat => `${cat}, `)} Твой ответ должен быть массивом объектов, где каждый объект содержит 'title' новости и 'category' (массив строк). Категории должны быть на русском, даже если новость на другом языке.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
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

            try {
                const categories_titles = JSON.parse(geminiOutputText!) as { title: string, category: string[] }[];
                console.log('категории и названия', categories_titles)
                console.log('Успешно')
                return posts.map(post => {
                    const category = categories_titles.find(obj => obj.title === post.title)?.category;
                    return {
                        ...post,
                        category: category || []
                    };
                });
            } catch (parseError) {
                console.error("Failed to parse JSON from Gemini:", parseError);
                console.error("Raw Gemini output:", geminiOutputText);
                return posts.map(post => ({ ...post, category: [] }));
            }
        } else {
            console.warn("Gemini did not return candidates or content in the response.");
            console.log(JSON.stringify(response))
            return posts.map(post => ({ ...post, category: [] }));
        }
    } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        return posts.map(post => ({ ...post, category: [] }));
    }
}