import { AppRoute } from '$lib/constants';
import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
export const prerender = false;

export const load: PageLoad = async ({ params, parent }) => {
  const { user } = await parent();
  if (!user) {
    throw redirect(302, AppRoute.AUTH_LOGIN);
  }

  const tagId = params['tagId'];
  throw redirect(302, `${AppRoute.TAG}/${tagId}`);
};
