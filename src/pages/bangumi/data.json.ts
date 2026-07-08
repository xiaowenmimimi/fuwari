import { getBangumiPageData } from "@utils/bangumi-data";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
	const data = await getBangumiPageData();

	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "public, max-age=300",
		},
	});
};
