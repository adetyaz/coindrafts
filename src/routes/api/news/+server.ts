import { getNews } from '$lib/server/sosovalue';
import { classifySector } from '$lib/sectors';
import { json } from '@sveltejs/kit';

type RawNewsItem = {
	id: string;
	sourceLink?: string;
	releaseTime?: number;
	author?: string;
	matchedCurrencies?: Array<{ id: string; name?: string }>;
	multilanguageContent?: Array<{ language: string; title: string; content: string }>;
};

export async function GET() {
	try {
		const data = (await getNews()) as { list?: RawNewsItem[] };
		const list = Array.isArray(data?.list) ? data.list : [];

		const items = list
			.map((item) => {
				const en = item.multilanguageContent?.find((c) => c.language === 'en');
				const symbols = (item.matchedCurrencies ?? []).map((c) => c.name ?? '').filter(Boolean);
				return {
					id: item.id,
					title: en?.title ?? '',
					content: en?.content ?? '',
					source: item.author ?? 'SoSoValue',
					date: item.releaseTime ? new Date(item.releaseTime).toISOString() : null,
					url: item.sourceLink ?? null,
					symbols,
					sector: classifySector(symbols)
				};
			})
			// SoSoValue's feed is general market/macro news, not crypto-only —
			// an item with no matched currencies at all (found live: general
			// politics with zero crypto relevance) isn't classifiable into a
			// sector and doesn't belong on a crypto knowledge base regardless.
			.filter((item) => item.symbols.length > 0);

		return json(items);
	} catch (error) {
		console.error('Error fetching news:', error);
		return json({ error: 'Failed to fetch news' }, { status: 500 });
	}
}
